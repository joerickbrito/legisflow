import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Obtém o usuário autenticado via BaaS ou via session_token do SisLegis
async function getAuthenticatedUser(base44) {
  // Tenta autenticação BaaS primeiro
  try {
    const baasUser = await base44.auth.me();
    if (baasUser) {
      // Buscar o UsuarioSislegis correspondente pelo email
      const sislegisUsers = await base44.asServiceRole.entities.UsuarioSislegis.filter({
        email: baasUser.email
      });
      if (sislegisUsers && sislegisUsers.length > 0) {
        return sislegisUsers[0];
      }
      // Se não encontrou no SisLegis, retorna o próprio BaaS user com role inferida
      return { ...baasUser, role: baasUser.role || 'user', tenant_id: baasUser.tenant_id };
    }
  } catch { /* BaaS auth falhou, tenta SisLegis */ }

  // Fallback: session_token do SisLegis
  const token = base44._requestHeaders?.get?.('x-sislegis-token') || '';
  if (!token) return null;

  const usuarios = await base44.asServiceRole.entities.UsuarioSislegis.filter({ session_token: token });
  if (!usuarios || usuarios.length === 0) return null;
  return usuarios[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await getAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'Não autorizado. Faça login.' }, { status: 401 });

    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const isAdminCamara = user.role === 'ADMIN_CAMARA';

    if (!isSuperAdmin && !isAdminCamara) {
      return Response.json({ error: 'Acesso negado. Perfil não autorizado.' }, { status: 403 });
    }

    const body = await req.json();
    const { username } = body || {};
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