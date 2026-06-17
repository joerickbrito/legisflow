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

function gerarSenhaAleatoria() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; // sem I,l,O,0,1 ambíguos
  let senha = "";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (let i = 0; i < 10; i++) {
    senha += chars[bytes[i] % chars.length];
  }
  return senha;
}

// Retorna o usuário autenticado
// NOVA ORDEM DE PRIORIDADE:
// 1. PRIMEIRO: sislegis_token (body) → UsuarioSislegis (100% das chamadas reais do frontend)
// 2. SEGUNDO (fallback): BaaS auth.me() → Master Admin legado via ConfiguracaoSistema
async function getAuthenticatedUser(base44, sislegis_token) {
  // 1. PRIMEIRO: SisLegis session token (caminho usado por 100% das chamadas reais)
  if (sislegis_token) {
    try {
      const usuarios = await base44.asServiceRole.entities.UsuarioSislegis.filter({
        session_token: sislegis_token
      });
      if (usuarios && usuarios.length > 0) return usuarios[0];
    } catch { /* fallthrough para BaaS */ }
  }

  // 2. SEGUNDO (fallback): BaaS native auth — apenas Master Admin legado
  try {
    const baasUser = await base44.auth.me();
    if (baasUser) {
      const sislegisUsers = await base44.asServiceRole.entities.UsuarioSislegis.filter({
        email: baasUser.email
      });
      if (sislegisUsers && sislegisUsers.length > 0) {
        return sislegisUsers[0];
      }
      // Verificar se é o Master Admin registrado via ConfiguracaoSistema
      const configs = await base44.asServiceRole.entities.ConfiguracaoSistema.filter({ chave: 'master_admin' });
      if (configs && configs.length > 0 && configs[0].master_admin_id === baasUser.id) {
        return { ...baasUser, role: 'SUPER_ADMIN', tenant_id: null };
      }
      return { ...baasUser, role: baasUser.role || 'user', tenant_id: baasUser.tenant_id };
    }
  } catch { /* BaaS auth falhou */ }

  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { usuario_id, nova_senha, sislegis_token } = body || {};

    const caller = await getAuthenticatedUser(base44, sislegis_token);
    if (!caller) return Response.json({ error: 'Não autorizado. Faça login.' }, { status: 401 });

    if (!usuario_id) {
      return Response.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
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

    // Se fornecida, valida tamanho mínimo; senão, gera aleatória
    let senhaFinal;
    if (nova_senha && nova_senha.length >= 6) {
      senhaFinal = nova_senha;
    } else {
      senhaFinal = gerarSenhaAleatoria();
    }

    const passwordHash = await hashPassword(senhaFinal);

    await base44.asServiceRole.entities.UsuarioSislegis.update(usuario_id, {
      password_hash: passwordHash,
      senha_temporaria: true,
      status: 'Pendente de Ativação',
      session_token: null,
    });

    return Response.json({ success: true, senha_temporaria: senhaFinal });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});