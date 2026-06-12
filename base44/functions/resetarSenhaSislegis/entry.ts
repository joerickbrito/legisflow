import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const saltArray = Array.from(salt);
  return JSON.stringify({ salt: saltArray, hash: hashArray });
}

// Obtém o usuário autenticado via BaaS ou via session_token do SisLegis
async function getAuthenticatedUser(base44) {
  try {
    const baasUser = await base44.auth.me();
    if (baasUser) {
      const sislegisUsers = await base44.asServiceRole.entities.UsuarioSislegis.filter({
        email: baasUser.email
      });
      if (sislegisUsers && sislegisUsers.length > 0) {
        return sislegisUsers[0];
      }
      return { ...baasUser, role: baasUser.role || 'user', tenant_id: baasUser.tenant_id };
    }
  } catch { /* BaaS auth falhou, tenta SisLegis */ }

  const token = base44._requestHeaders?.get?.('x-sislegis-token') || '';
  if (!token) return null;

  const usuarios = await base44.asServiceRole.entities.UsuarioSislegis.filter({ session_token: token });
  if (!usuarios || usuarios.length === 0) return null;
  return usuarios[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await getAuthenticatedUser(base44);
    if (!caller) return Response.json({ error: 'Não autorizado. Faça login.' }, { status: 401 });

    const { usuario_id, nova_senha } = await req.json();

    if (!usuario_id || !nova_senha || nova_senha.length < 6) {
      return Response.json({ error: 'ID do usuário e nova senha (mín. 6 caracteres) são obrigatórios.' }, { status: 400 });
    }

    const isSuperAdmin = caller.role === 'SUPER_ADMIN';
    const isAdminCamara = caller.role === 'ADMIN_CAMARA';

    // Apenas SUPER_ADMIN e ADMIN_CAMARA podem resetar senhas
    if (!isSuperAdmin && !isAdminCamara) {
      return Response.json({ error: 'Acesso negado. Apenas administradores podem resetar senhas.' }, { status: 403 });
    }

    // Buscar o usuário alvo
    const usuarios = await base44.asServiceRole.entities.UsuarioSislegis.filter({ id: usuario_id });
    if (!usuarios || usuarios.length === 0) {
      return Response.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const targetUser = usuarios[0];

    // ADMIN_CAMARA só pode resetar senha de usuários da própria câmara
    if (isAdminCamara && !isSuperAdmin) {
      if (!targetUser.tenant_id || targetUser.tenant_id !== caller.tenant_id) {
        return Response.json({ error: 'Acesso negado. Usuário de outra câmara.' }, { status: 403 });
      }
      // ADMIN_CAMARA não pode resetar senha de outro ADMIN_CAMARA ou SUPER_ADMIN
      if (targetUser.role === 'SUPER_ADMIN' || (targetUser.role === 'ADMIN_CAMARA' && targetUser.id !== caller.id)) {
        return Response.json({ error: 'Acesso negado. Não pode resetar senha deste perfil.' }, { status: 403 });
      }
    }

    const passwordHash = await hashPassword(nova_senha);

    await base44.asServiceRole.entities.UsuarioSislegis.update(usuario_id, {
      password_hash: passwordHash,
      senha_temporaria: true,
      status: 'Pendente de Ativação',
      session_token: null,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});