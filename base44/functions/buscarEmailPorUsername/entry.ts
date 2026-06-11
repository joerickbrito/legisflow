import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { username } = body || {};
    if (!username) return Response.json({ error: 'Nome de usuário é obrigatório' }, { status: 400 });

    // Buscar usuário por username usando service role
    const users = await base44.asServiceRole.entities.User.filter({ username });
    if (!users || users.length === 0) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const user = users[0];
    return Response.json({
      email: user.email,
      tenant_id: user.tenant_id,
      status: user.status,
      senha_temporaria: user.senha_temporaria,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});