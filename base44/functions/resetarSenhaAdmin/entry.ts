import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'SUPER_ADMIN') return Response.json({ error: 'Apenas Master Admin' }, { status: 403 });

    const body = await req.json();
    const { email } = body || {};
    if (!email) return Response.json({ error: 'Email é obrigatório' }, { status: 400 });

    // Dispara o reset de senha por e-mail
    await base44.auth.resetPasswordRequest(email);

    // Atualiza status do usuário
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (users && users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        senha_temporaria: true,
        status: 'Pendente de Ativação'
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});