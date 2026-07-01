/**
 * protocolar — Cria um Protocolo com numeração sequencial e código de rastreio.
 *
 * Usado por:
 *   1. Portal da Transparência (público, SEM login) → origem "Público".
 *   2. Login da Prefeitura (UsuarioSislegis role PROTOCOLO_PREFEITURA) → origem "Prefeitura".
 *
 * Regras (decididas com o cliente):
 *   - Numeração ÚNICA e sequencial por câmara/ano: 001/2026, 002/2026, ...
 *     (imutável; nunca repetida).
 *   - Cada protocolo recebe um código de rastreio aleatório (não-adivinhável),
 *     entregue ao interessado para consulta — assim ninguém vê protocolo de terceiros.
 *   - O código é exibido na tela E enviado por e-mail (se houver e-mail e o
 *     serviço estiver configurado). Falha de e-mail NÃO impede o protocolo.
 *
 * roda asServiceRole (não exige login), mas a ORIGEM é decidida no servidor a
 * partir da autenticação — o cliente não consegue forjar "Prefeitura".
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const TIPOS_VALIDOS = [
  'Ofício', 'Requerimento', 'Projeto de Lei', 'Petição',
  'Memorando', 'Relatório', 'Proposição', 'Recurso', 'Outros',
];

// Alfabeto sem caracteres ambíguos (0/O, 1/I/L) para o código de rastreio.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function bloco(n: number): string {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < n; i++) s += ALFABETO[buf[i] % ALFABETO.length];
  return s;
}

function gerarCodigo(prefixo: string): string {
  return `${prefixo}-${bloco(4)}-${bloco(4)}`;
}

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

/**
 * Envia o e-mail de comprovante do protocolo.
 * Ordem de preferência (a 1ª configurada vence):
 *   1) Resend  — precisa de env RESEND_API_KEY + PROTOCOLO_EMAIL_FROM (dom. autenticado)
 *   2) SendGrid — precisa de env SENDGRID_API_KEY + PROTOCOLO_EMAIL_FROM
 *   3) Base44 SendEmail (fallback genérico; pode cair em spam)
 * PROTOCOLO_EMAIL_FROM no formato: "Câmara Municipal <protocolo@dominio.gov.br>"
 */
async function enviarEmailProtocolo(base44, { to, nomeCamara, numero, codigo, tipo, assunto }) {
  const subject = `Protocolo ${numero} — ${nomeCamara}`;
  const texto =
    `Seu protocolo foi registrado com sucesso.\n\n` +
    `Número: ${numero}\n` +
    `Código de acompanhamento: ${codigo}\n` +
    `Tipo: ${tipo}\n` +
    `Assunto: ${assunto}\n\n` +
    `Guarde o CÓDIGO DE ACOMPANHAMENTO — é com ele que você consulta o ` +
    `andamento do seu protocolo no Portal da Transparência. Não compartilhe esse código.\n\n` +
    `${nomeCamara}`;

  // PROTOCOLO_EMAIL_FROM é GLOBAL (vale para todas as câmaras). Pode ser só o
  // endereço ("protocolo@legiscam.com") ou "Nome <endereço>". Extraímos só o
  // endereço e usamos o NOME DA CÂMARA de cada protocolo como remetente exibido.
  const fromEnv = Deno.env.get('PROTOCOLO_EMAIL_FROM') || '';
  const enderecoMatch = fromEnv.match(/<([^>]+)>/);
  const endereco = (enderecoMatch ? enderecoMatch[1] : fromEnv).trim();
  const from = endereco ? `${nomeCamara} <${endereco}>` : '';
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const sendgridKey = Deno.env.get('SENDGRID_API_KEY');

  // 1) Resend
  if (resendKey && from) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text: texto }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text().catch(() => '')}`);
    return true;
  }

  // 2) SendGrid
  if (sendgridKey && endereco) {
    const fromObj = { name: nomeCamara, email: endereco };
    const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: fromObj,
        subject,
        content: [{ type: 'text/plain', value: texto }],
      }),
    });
    if (!r.ok) throw new Error(`SendGrid ${r.status}: ${await r.text().catch(() => '')}`);
    return true;
  }

  // 3) Fallback: SendEmail nativo do Base44
  await base44.integrations.Core.SendEmail({ to, subject, body: texto });
  return true;
}

async function getUsuario(base44, token) {
  if (!token) return null;
  try {
    const us = await base44.asServiceRole.entities.UsuarioSislegis.filter({ session_token: token });
    return us && us.length ? us[0] : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      camara_id,
      sislegis_token,
      tipo_documento,
      assunto,
      interessado,
      email_interessado,
      telefone_interessado,
      observacoes,
      arquivo_url,
    } = body || {};

    // ── Validação ──
    if (!camara_id) {
      return Response.json({ error: 'Câmara não informada.' }, { status: 400 });
    }
    if (!assunto || !String(assunto).trim()) {
      return Response.json({ error: 'Informe o assunto do protocolo.' }, { status: 400 });
    }
    if (!interessado || !String(interessado).trim()) {
      return Response.json({ error: 'Informe o nome do interessado.' }, { status: 400 });
    }
    const tipo = TIPOS_VALIDOS.includes(tipo_documento) ? tipo_documento : 'Outros';

    // ── Origem decidida no servidor (não confia no cliente) ──
    const usuario = await getUsuario(base44, sislegis_token);
    let origem = 'Público';
    let prefixo = 'PUB';
    let usuario_protocolo = email_interessado || interessado;
    if (usuario && usuario.tenant_id === camara_id) {
      if (usuario.role === 'PROTOCOLO_PREFEITURA') { origem = 'Prefeitura'; prefixo = 'PREF'; }
      else { origem = 'Interno'; prefixo = 'INT'; }
      usuario_protocolo = usuario.nome || usuario.username || usuario_protocolo;
    }

    // Público precisa de e-mail para receber o código.
    if (origem === 'Público' && (!email_interessado || !String(email_interessado).includes('@'))) {
      return Response.json({ error: 'Informe um e-mail válido para receber o número do protocolo.' }, { status: 400 });
    }

    // ── Numeração sequencial única por câmara/ano (com pequena retentativa anti-corrida) ──
    const agora = new Date();
    const ano = agora.getFullYear();
    const filtroAno = { tenant_id: camara_id, ano };

    let criado = null;
    let seq = 0;
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const ultimos = await base44.asServiceRole.entities.Protocolo
        .filter(filtroAno, '-numero_sequencial', 1).catch(() => []);
      const maior = (ultimos && ultimos[0] && Number(ultimos[0].numero_sequencial)) || 0;
      seq = maior + 1 + tentativa; // se colidir, avança
      const numero = `${pad3(seq)}/${ano}`;

      // Garante que esse sequencial ainda não existe (corrida).
      const jaExiste = await base44.asServiceRole.entities.Protocolo
        .filter({ tenant_id: camara_id, ano, numero_sequencial: seq }, '-created_date', 1)
        .catch(() => []);
      if (jaExiste && jaExiste.length) continue;

      const codigo = gerarCodigo(prefixo);
      const dataISO = agora.toISOString().slice(0, 10);
      const hora = agora.toISOString().slice(11, 16);

      criado = await base44.asServiceRole.entities.Protocolo.create({
        tenant_id: camara_id,
        numero,
        numero_sequencial: seq,
        ano,
        tipo: 'Entrada',
        tipo_documento: tipo,
        origem,
        assunto: String(assunto).trim(),
        interessado: String(interessado).trim(),
        email_interessado: email_interessado || '',
        telefone_interessado: telefone_interessado || '',
        codigo_consulta: codigo,
        data_protocolo: dataISO,
        hora_protocolo: hora,
        status: 'Recebido',
        observacoes: observacoes || '',
        arquivo_url: arquivo_url || '',
        usuario_protocolo,
        historico_tramitacao: [
          { status: 'Recebido', data: agora.toISOString(), observacao: 'Protocolo registrado.', por: origem },
        ],
      });
      break;
    }

    if (!criado) {
      return Response.json({ error: 'Não foi possível gerar o número do protocolo. Tente novamente.' }, { status: 500 });
    }

    // ── E-mail (não bloqueante) ──
    let emailEnviado = false;
    if (email_interessado && String(email_interessado).includes('@')) {
      try {
        const nomeCamara = (await base44.asServiceRole.entities.Camara
          .filter({ id: camara_id }, '-created_date', 1).catch(() => []))?.[0]?.nome || 'Câmara Municipal';
        emailEnviado = await enviarEmailProtocolo(base44, {
          to: email_interessado,
          nomeCamara,
          numero: criado.numero,
          codigo: criado.codigo_consulta,
          tipo,
          assunto: criado.assunto,
        });
      } catch (e) {
        // Serviço de e-mail ausente/indisponível — segue só com o código na tela.
        console.error('protocolar: falha ao enviar e-mail:', e?.message);
      }
    }

    return Response.json({
      data: {
        numero: criado.numero,
        codigo_consulta: criado.codigo_consulta,
        ano: criado.ano,
        origem: criado.origem,
        email_enviado: emailEnviado,
      },
    });
  } catch (error) {
    console.error('protocolar erro:', error?.message);
    return Response.json({ error: 'Erro ao registrar o protocolo.' }, { status: 500 });
  }
});
