import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado. Faça login.' }, { status: 401 });

    // Apenas SUPER_ADMIN pode executar esta função
    if (user.role !== 'SUPER_ADMIN') {
      return Response.json({ error: 'Acesso negado. Apenas Master Admin pode configurar admin de câmara.' }, { status: 403 });
    }

    const body = await req.json();
    const { event, data } = body || {};
    if (!data || event?.type !== 'create') {
      return Response.json({ skipped: true, reason: 'Apenas eventos de criação de usuário' });
    }

    const novoUsuarioEmail = data.email;
    if (!novoUsuarioEmail) {
      return Response.json({ skipped: true, reason: 'Usuário sem email' });
    }

    // Buscar Câmaras com admin_email pendente que corresponda a este usuário
    const camaras = await base44.asServiceRole.entities.Camara.filter({
      admin_email: novoUsuarioEmail.toLowerCase().trim(),
      admin_configurado: false
    });

    if (!camaras || camaras.length === 0) {
      return Response.json({ skipped: true, reason: 'Nenhuma câmara pendente para este email' });
    }

    const camara = camaras[0];

    // Validar que a câmara existe e tem tenant_id
    if (!camara.id) {
      return Response.json({ error: 'Câmara inválida.' }, { status: 400 });
    }

    // Configurar o usuário como ADMIN_CAMARA
    await base44.asServiceRole.entities.User.update(data.id, {
      role: 'ADMIN_CAMARA',
      tenant_id: camara.id,
      username: camara.admin_username || data.email?.split('@')[0] || '',
      status: 'Pendente de Ativação',
      senha_temporaria: true,
      camara_nome: camara.nome
    });

    // Marcar câmara como admin configurado
    await base44.asServiceRole.entities.Camara.update(camara.id, {
      admin_configurado: true
    });

    return Response.json({ success: true, camara: camara.nome, userId: data.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});