import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
    const { username, sislegis_token } = body || {};

    const user = await getAuthenticatedUser(base44, sislegis_token);
    if (!user) return Response.json({ error: 'Não autorizado. Faça login.' }, { status: 401 });

    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const isAdminCamara = user.role === 'ADMIN_CAMARA';

    if (!isSuperAdmin && !isAdminCamara) {
      return Response.json({ error: 'Acesso negado. Perfil não autorizado.' }, { status: 403 });
    }

    if (!username) return Response.json({ error: 'Nome de usuário é obrigatório' }, { status: 400 });

    // Buscar usuário por username
    const users = await base44.asServiceRole.entities.User.filter({ username });
    if (!users || users.length === 0) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const foundUser = users[0];

    // ADMIN_CAMARA só pode consultar usuários da própria câmara
    if (isAdminCamara && !isSuperAdmin) {
      if (foundUser.tenant_id !== user.tenant_id) {
        return Response.json({ error: 'Acesso negado. Usuário de outra câmara.' }, { status: 403 });
      }
    }

    return Response.json({
      email: foundUser.email,
      tenant_id: foundUser.tenant_id,
      status: foundUser.status,
      senha_temporaria: foundUser.senha_temporaria,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});