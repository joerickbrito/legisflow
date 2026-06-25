/**
 * portalPublico — Leitura pública do Portal da Transparência.
 *
 * Esta função existe para que o portal público NÃO precise ler as entidades
 * diretamente do navegador. Ela roda no servidor (asServiceRole) e devolve
 * APENAS campos públicos, removendo dados pessoais (CPF, RG, endereço, etc.).
 *
 * É o pré-requisito para fechar o RLS das entidades sem quebrar o portal:
 * uma vez que o portal consome esta função (e não mais base44.entities.*),
 * o acesso direto às entidades pode ser bloqueado no banco.
 *
 * Não exige login (é público), mas só expõe o que pode ser público.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Campos claramente pessoais que NUNCA podem sair para o portal público.
// Aplicado como rede de segurança em todas as entidades retornadas.
const DENY_FIELDS = [
  'cpf', 'rg', 'titulo_eleitor', 'data_nascimento', 'endereco',
  'password_hash', 'session_token', 'token_emitido_em',
  'vereador_email', 'vereador_telefone',
];

// Parlamentar: liberamos apenas estes campos (whitelist estrita).
const PARLAMENTAR_PUBLIC = [
  'id', 'tenant_id', 'nome', 'nome_parlamentar', 'foto_url',
  'partido_id', 'partido_sigla', 'legislatura_id', 'legislatura_numero',
  'cargo', 'situacao', 'tipo', 'gabinete', 'biografia', 'data_posse', 'ativo',
];

// Câmara: apenas dados institucionais públicos.
const CAMARA_PUBLIC = [
  'id', 'nome', 'sigla', 'municipio', 'estado',
  'brasao_url', 'logotipo_url', 'cor_institucional', 'site',
];

function pick(obj, fields) {
  const out = {};
  if (!obj) return out;
  for (const f of fields) if (obj[f] !== undefined) out[f] = obj[f];
  return out;
}

function stripDeny(obj) {
  if (!obj) return obj;
  const clean = { ...obj };
  for (const f of DENY_FIELDS) delete clean[f];
  return clean;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { camara_id, listar } = body || {};

    // Modo "listar": devolve as câmaras ativas (campos públicos) para o seletor do portal.
    if (listar) {
      const camaras = await base44.asServiceRole.entities.Camara
        .filter({ status: 'Ativa' }, 'nome', 100)
        .catch(() => []);
      return Response.json({
        data: (camaras || []).map((c) => pick(c, CAMARA_PUBLIC)),
      });
    }

    if (!camara_id) {
      return Response.json({ error: 'camara_id é obrigatório.' }, { status: 400 });
    }

    const filter = { tenant_id: camara_id };

    const [parlamentares, materias, normas, sessoes, atas, pautas, emendas, camaras] = await Promise.all([
      base44.asServiceRole.entities.Parlamentar.filter({ ...filter, ativo: true }, 'nome', 200).catch(() => []),
      base44.asServiceRole.entities.Materia.filter(filter, '-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.NormaJuridica.filter(filter, '-data_publicacao', 500).catch(() => []),
      base44.asServiceRole.entities.Sessao.filter(filter, '-data', 200).catch(() => []),
      base44.asServiceRole.entities.AtaSessao.filter(filter, '-data', 200).catch(() => []),
      base44.asServiceRole.entities.PautaSessao.filter(filter, '-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.EmendaImpositiva.filter(filter, '-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Camara.filter({ id: camara_id }, '-created_date', 1).catch(() => []),
    ]);

    return Response.json({
      data: {
        parlamentares: (parlamentares || []).map((p) => pick(p, PARLAMENTAR_PUBLIC)),
        materias: (materias || []).map(stripDeny),
        normas: (normas || []).map(stripDeny),
        sessoes: (sessoes || []).map(stripDeny),
        atas: (atas || []).map(stripDeny),
        pautas: (pautas || []).map(stripDeny),
        emendas: (emendas || []).map(stripDeny),
        camara: camaras && camaras[0] ? pick(camaras[0], CAMARA_PUBLIC) : null,
      },
    });
  } catch (error) {
    console.error('portalPublico erro:', error?.message);
    return Response.json({ error: 'Erro ao carregar dados do portal.' }, { status: 500 });
  }
});
