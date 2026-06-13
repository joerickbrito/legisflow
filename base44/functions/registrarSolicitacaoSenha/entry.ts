import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { username } = await req.json();

    if (!username || !username.trim()) {
      return Response.json({ status: 'ok' }, { status: 200 });
    }

    const usernameLower = username.trim().toLowerCase();

    // Buscar o usuário SisLegis (se existir)
    const usuarios = await base44.entities.UsuarioSislegis.filter({ username: usernameLower });

    if (!usuarios || usuarios.length === 0) {
      // Usuário não existe — não registramos nada, mas retornamos OK
      // (não revela se o usuário existe ou não)
      return Response.json({ status: 'ok' }, { status: 200 });
    }

    const usuario = usuarios[0];

    // Se o usuário não tem tenant_id, não tem como registrar
    if (!usuario.tenant_id) {
      return Response.json({ status: 'ok' }, { status: 200 });
    }

    // Verificar se já existe solicitação pendente para este username
    const existentes = await base44.entities.SolicitacoesRecuperacaoSenha.filter({
      username: usernameLower,
      status: 'pendente'
    });

    if (existentes && existentes.length > 0) {
      // Já tem solicitação pendente, não duplica
      return Response.json({ status: 'ok' }, { status: 200 });
    }

    // Buscar nome da câmara (usa asServiceRole pois a chamada é pública)
    let camaraNome = null;
    try {
      const camaras = await base44.asServiceRole.entities.Camara.filter({ id: usuario.tenant_id });
      if (camaras && camaras.length > 0) {
        camaraNome = camaras[0].nome;
      }
    } catch {
      // Ignorar erro ao buscar câmara
    }

    // Registrar solicitação
    await base44.entities.SolicitacoesRecuperacaoSenha.create({
      username: usernameLower,
      tenant_id: usuario.tenant_id,
      camara_nome: camaraNome || null,
      usuario_id: usuario.id,
      usuario_nome: usuario.nome || null,
      usuario_role: usuario.role || null,
      status: 'pendente'
    });

    return Response.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    // Sempre retornar OK para não revelar nada
    return Response.json({ status: 'ok' }, { status: 200 });
  }
});