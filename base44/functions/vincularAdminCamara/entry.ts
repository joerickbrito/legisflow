import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const email = user.email;
    if (!email) return Response.json({ skipped: true, reason: 'Usuário sem email' });

    // Se já está configurado, não precisa fazer nada
    if (user.role === 'ADMIN_CAMARA' && user.tenant_id) {
      return Response.json({ skipped: true, reason: 'Usuário já configurado' });
    }

    // Buscar Câmara com admin_email pendente
    const camaras = await base44.asServiceRole.entities.Camara.filter({
      admin_email: email.toLowerCase().trim(),
      admin_configurado: false
    });

    if (!camaras || camaras.length === 0) {
      return Response.json({ skipped: true, reason: 'Nenhuma câmara pendente para este email' });
    }

    const camara = camaras[0];

    // Configurar o usuário
    await base44.asServiceRole.entities.User.update(user.id, {
      role: 'ADMIN_CAMARA',
      tenant_id: camara.id,
      username: camara.admin_username || email.split('@')[0],
      status: 'Pendente de Ativação',
      senha_temporaria: true,
      camara_nome: camara.nome
    });

    // Marcar câmara como configurada
    await base44.asServiceRole.entities.Camara.update(camara.id, {
      admin_configurado: true
    });

    return Response.json({ success: true, camara: camara.nome });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});