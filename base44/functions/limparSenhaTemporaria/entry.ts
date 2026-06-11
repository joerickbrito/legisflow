import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email } = body || {};

    if (!email) {
      return Response.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (!users || users.length === 0) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const user = users[0];
    await base44.asServiceRole.entities.User.update(user.id, {
      senha_temporaria: false,
      status: 'Ativo'
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});