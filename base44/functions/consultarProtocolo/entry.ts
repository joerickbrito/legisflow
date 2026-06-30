/**
 * consultarProtocolo — Consulta pública de um protocolo pelo CÓDIGO de rastreio.
 *
 * Público (sem login). Só retorna o protocolo cujo codigo_consulta bate exatamente.
 * Como o código é aleatório e longo, não é possível enumerar/adivinhar protocolos
 * de terceiros. Devolve apenas campos de acompanhamento (status/tramitação),
 * nunca dados internos sensíveis nem anexos administrativos.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { camara_id, codigo } = body || {};

    if (!codigo || !String(codigo).trim()) {
      return Response.json({ error: 'Informe o código do protocolo.' }, { status: 400 });
    }

    const cod = String(codigo).trim().toUpperCase();
    const filtro: Record<string, unknown> = { codigo_consulta: cod };
    if (camara_id) filtro.tenant_id = camara_id;

    const achados = await base44.asServiceRole.entities.Protocolo
      .filter(filtro, '-created_date', 1).catch(() => []);

    if (!achados || !achados.length) {
      return Response.json({ error: 'Protocolo não encontrado. Verifique o código informado.' }, { status: 404 });
    }

    const p = achados[0];
    return Response.json({
      data: {
        numero: p.numero,
        ano: p.ano,
        tipo_documento: p.tipo_documento,
        assunto: p.assunto,
        interessado: p.interessado,
        status: p.status,
        data_protocolo: p.data_protocolo,
        hora_protocolo: p.hora_protocolo,
        observacoes: p.observacoes || '',
        historico_tramitacao: Array.isArray(p.historico_tramitacao) ? p.historico_tramitacao : [],
      },
    });
  } catch (error) {
    console.error('consultarProtocolo erro:', error?.message);
    return Response.json({ error: 'Erro ao consultar o protocolo.' }, { status: 500 });
  }
});
