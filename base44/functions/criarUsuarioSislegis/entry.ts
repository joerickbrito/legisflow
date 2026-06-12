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

    const isSuperAdmin = caller.role === 'SUPER_ADMIN';
    const isAdminCamara = caller.role === 'ADMIN_CAMARA';
    const callerPermissoes = caller.permissoes || {};

    // Verificar permissão de criar usuários (exceto SUPER_ADMIN que pode tudo)
    if (!isSuperAdmin && !callerPermissoes.usuarios_criar) {
      return Response.json({ error: 'Acesso negado. Sem permissão para criar usuários.' }, { status: 403 });
    }

    const body = await req.json();
    const { username, nome, email, role, tenant_id, camara_id, camara_nome, senha, permissoes, foto_url, cargo, partido_id, partido_sigla, cpf, telefone } = body;

    if (!username || !nome || !role || !senha) {
      return Response.json({ error: 'Campos obrigatórios: username, nome, role, senha.' }, { status: 400 });
    }

    if (senha.length < 6) {
      return Response.json({ error: 'A senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
    }

    // Validação de hierarquia de perfis
    if (!isSuperAdmin && role === 'SUPER_ADMIN') {
      return Response.json({ error: 'Acesso negado. Apenas Master Admin pode criar outro Master Admin.' }, { status: 403 });
    }

    // ADMIN_CAMARA só pode criar usuários na própria câmara
    const effectiveTenantId = isSuperAdmin ? (tenant_id || null) : (caller.tenant_id || null);
    if (isAdminCamara && !isSuperAdmin) {
      if (!effectiveTenantId) {
        return Response.json({ error: 'Admin da Câmara deve ter um tenant_id definido.' }, { status: 400 });
      }
      if (tenant_id && tenant_id !== effectiveTenantId) {
        return Response.json({ error: 'Acesso negado. Só pode criar usuários na sua própria câmara.' }, { status: 403 });
      }
    }

    const usernameLower = username.trim().toLowerCase();

    // Verificar se username já existe
    const existentes = await base44.asServiceRole.entities.UsuarioSislegis.filter({
      username: usernameLower
    });

    if (existentes && existentes.length > 0) {
      return Response.json({ error: 'Nome de usuário já está em uso.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(senha);

    const novoUsuario = await base44.asServiceRole.entities.UsuarioSislegis.create({
      username: usernameLower,
      password_hash: passwordHash,
      nome: nome.trim(),
      email: email?.trim().toLowerCase() || null,
      role: role,
      tenant_id: effectiveTenantId,
      camara_id: camara_id || null,
      camara_nome: camara_nome || null,
      status: 'Pendente de Ativação',
      senha_temporaria: true,
      permissoes: permissoes || {},
      foto_url: foto_url || null,
      cargo: cargo || null,
      partido_id: partido_id || null,
      partido_sigla: partido_sigla || null,
      cpf: cpf || null,
      telefone: telefone || null,
    });

    return Response.json({
      success: true,
      user: {
        id: novoUsuario.id,
        username: novoUsuario.username,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        role: novoUsuario.role,
        tenant_id: novoUsuario.tenant_id,
        camara_nome: novoUsuario.camara_nome,
        status: novoUsuario.status,
        senha_temporaria: true,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});