import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Apenas SUPER_ADMIN pode executar esta função
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado. Faça login.' }, { status: 401 });

    if (user.role !== 'SUPER_ADMIN') {
      return Response.json({ error: 'Acesso negado. Apenas Master Admin pode executar esta verificação.' }, { status: 403 });
    }

    // Buscar todas as Câmaras com admin pendente
    const camarasPendentes = await base44.asServiceRole.entities.Camara.filter({
      admin_configurado: false
    });

    let configurados = 0;

    for (const camara of camarasPendentes) {
      if (!camara.admin_email) continue;

      // Buscar usuário pelo email
      const users = await base44.asServiceRole.entities.User.filter({
        email: camara.admin_email.toLowerCase().trim()
      });

      if (!users || users.length === 0) continue;

      const u = users[0];

      // Pular se já foi configurado (role != user)
      if (u.role !== 'user') {
        await base44.asServiceRole.entities.Camara.update(camara.id, { admin_configurado: true });
        continue;
      }

      await base44.asServiceRole.entities.User.update(u.id, {
        role: 'ADMIN_CAMARA',
        tenant_id: camara.id,
        username: camara.admin_username || u.email?.split('@')[0] || '',
        status: 'Pendente de Ativação',
        senha_temporaria: true,
        camara_nome: camara.nome
      });

      await base44.asServiceRole.entities.Camara.update(camara.id, { admin_configurado: true });
      configurados++;
    }

    return Response.json({ success: true, configurados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});