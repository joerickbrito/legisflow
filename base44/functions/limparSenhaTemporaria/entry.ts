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
    const { email, usuario_id, sislegis_token } = body || {};

    const caller = await getAuthenticatedUser(base44, sislegis_token);
    if (!caller) return Response.json({ error: 'Não autorizado. Faça login.' }, { status: 401 });

    if (!email && !usuario_id) {
      return Response.json({ error: 'Email ou ID do usuário é obrigatório' }, { status: 400 });
    }

    const isSuperAdmin = caller.role === 'SUPER_ADMIN';
    const isAdminCamara = caller.role === 'ADMIN_CAMARA';

    // Determinar o usuário alvo
    let targetUser;
    if (usuario_id) {
      // Buscar por ID no UsuarioSislegis
      const usuarios = await base44.asServiceRole.entities.UsuarioSislegis.filter({ id: usuario_id });
      if (usuarios && usuarios.length > 0) {
        targetUser = usuarios[0];
      }
    }

    if (!targetUser && email) {
      // Buscar por email no User (BaaS)
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users && users.length > 0) {
        targetUser = users[0];
      }
    }

    if (!targetUser) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar permissão:
    // - O próprio usuário pode limpar sua flag
    // - SUPER_ADMIN pode limpar de qualquer um
    // - ADMIN_CAMARA pode limpar de usuários da própria câmara
    const isSelf = targetUser.id === caller.id ||
     (!!targetUser.email && !!caller.email && targetUser.email === caller.email);
    const isSameTenant = targetUser.tenant_id && targetUser.tenant_id === caller.tenant_id;

    if (!isSelf && !isSuperAdmin && !(isAdminCamara && isSameTenant)) {
      return Response.json({ error: 'Acesso negado. Sem permissão para alterar este usuário.' }, { status: 403 });
    }

    // Atualizar o usuário
    const targetEntity = usuario_id ? 'UsuarioSislegis' : 'User';
    const updateData = usuario_id
      ? { senha_temporaria: false, status: 'Ativo' }
      : { senha_temporaria: false, status: 'Ativo' };

    await base44.asServiceRole.entities[targetEntity].update(targetUser.id, updateData);

    return Response.json({ success: true });
  } catch (error) {
    console.error('limparSenhaTemporaria erro:', error?.message);
    return Response.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 });
  }
});