import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Entidades permitidas para operação via esta função
const ALLOWED_ENTITIES = [
  'Camara', 'CasaLegislativa', 'Parlamentar', 'Partido', 'Legislatura',
  'MesaDiretora', 'Comissao', 'Materia', 'Proposicao', 'Tramitacao',
  'Parecer', 'Sessao', 'Votacao', 'PautaSessao', 'AtaSessao',
  'NormaJuridica', 'Emenda', 'EmendaImpositiva', 'AudienciaPublica',
  'DocumentoAdministrativo', 'Oficio', 'Quorum', 'Relatoria',
  'ReuniaoComissao', 'Protocolo', 'LogAuditoria', 'UsuarioSislegis',
  'SolicitacoesRecuperacaoSenha', 'ConfiguracaoSistema',
  // Entidades auxiliares
  'SessaoLegislativa', 'Mandato', 'Bancada', 'CargoMesa', 'TipoComissao',
  'UnidadeTramitacao', 'Orgao', 'FrentesParlamentares',
  'TipoResultadoVotacao', 'TipoExpediente', 'RegimeTramitacao',
  'TipoSessao', 'TipoAfastamento', 'OrigemMateria', 'CargoComissao',
  'TipoVinculoNorma', 'TipoProposicao', 'TipoDocumentoAdministrativo',
  'StatusTramitacao', 'TipoMateria', 'TipoAutor', 'TipoNorma', 'TipoDocumento'
];

// Operações que exigem perfil ADMIN_CAMARA ou superior
const RESTRICTED_OPERATIONS = ['create', 'update', 'delete'];

// Campos sensíveis que NUNCA devem ser enviados ao cliente (segurança)
const SENSITIVE_FIELDS = ['password_hash', 'session_token', 'token_emitido_em'];

// Validade do token de sessão (expiração). Após esse prazo, exige novo login.
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
function sanitizeRecord(entity, record) {
  if (!record || entity !== 'UsuarioSislegis') return record;
  const clean = { ...record };
  for (const f of SENSITIVE_FIELDS) delete clean[f];
  return clean;
}
function sanitizeResult(entity, data) {
  if (entity !== 'UsuarioSislegis' || !data) return data;
  return Array.isArray(data) ? data.map((r) => sanitizeRecord(entity, r)) : sanitizeRecord(entity, data);
}

// Retorna o usuário autenticado
// NOVA ORDEM DE PRIORIDADE:
// 1. PRIMEIRO: sislegis_token (body) → UsuarioSislegis (100% das chamadas reais do frontend)
// 2. SEGUNDO (fallback): BaaS auth.me() → Master Admin legado via ConfiguracaoSistema
async function getAuthenticatedUser(base44, sislegis_token) {
  // 1. PRIMEIRO: SisLegis session token (caminho usado por 100% das chamadas reais)
  if (sislegis_token) {
    try {
      const usuarios = await base44.asServiceRole.entities.UsuarioSislegis.filter({
        session_token: sislegis_token
      });
      if (usuarios && usuarios.length > 0) return usuarios[0];
    } catch { /* fallthrough para BaaS */ }
  }

  // 2. SEGUNDO (fallback): BaaS native auth — apenas Master Admin legado
  try {
    const baasUser = await base44.auth.me();
    if (baasUser) {
      const sislegisUsers = await base44.asServiceRole.entities.UsuarioSislegis.filter({
        email: baasUser.email
      });
      if (sislegisUsers && sislegisUsers.length > 0) {
        return sislegisUsers[0];
      }
      // Verificar se é o Master Admin registrado via ConfiguracaoSistema
      const configs = await base44.asServiceRole.entities.ConfiguracaoSistema.filter({ chave: 'master_admin' });
      if (configs && configs.length > 0 && configs[0].master_admin_id === baasUser.id) {
        return { ...baasUser, role: 'SUPER_ADMIN', tenant_id: null };
      }
      return { ...baasUser, role: baasUser.role || 'user', tenant_id: baasUser.tenant_id };
    }
  } catch { /* BaaS auth falhou */ }

  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { entity, operation, params, sislegis_token } = body;

    const user = await getAuthenticatedUser(base44, sislegis_token);

    if (!user) {
      return Response.json({ error: 'Não autorizado. Faça login.' }, { status: 401 });
    }

    // Expiração de sessão: só se aplica ao login por session_token (não ao
    // fallback do Master Admin nativo) e somente quando há data de emissão
    // (sessões antigas, sem a data, continuam válidas até o próximo login).
    if (sislegis_token && user.token_emitido_em) {
      const idadeMs = Date.now() - new Date(user.token_emitido_em).getTime();
      if (idadeMs > TOKEN_TTL_MS) {
        return Response.json(
          { error: 'Sessão expirada. Faça login novamente.', code: 'SESSION_EXPIRED' },
          { status: 401 }
        );
      }
    }

    if (!entity || !operation) {
      return Response.json({ error: 'entity e operation são obrigatórios.' }, { status: 400 });
    }

    // Validar que a entidade está na lista permitida
    if (!ALLOWED_ENTITIES.includes(entity)) {
      return Response.json({ error: `Entidade não permitida: ${entity}` }, { status: 403 });
    }

    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const isAdminCamara = user.role === 'ADMIN_CAMARA';
    const isOperadorGeral = user.role === 'OPERADOR_GERAL';
    const isVereador = user.role === 'VEREADOR';
    const isPresidente = user.role === 'PRESIDENTE';
    const canWrite = isSuperAdmin || isAdminCamara || isOperadorGeral;

    // Exceção: VEREADOR e PRESIDENTE podem fazer update APENAS na entidade Votacao
    // (para registrar o próprio voto durante uma sessão)
    const isParlamentarVotando = (isVereador || isPresidente) && operation === 'update' && entity === 'Votacao';

    // Operações restritas exigem perfil administrativo
    // (exceto a exceção de voto acima)
    if (RESTRICTED_OPERATIONS.includes(operation) && !canWrite && !isParlamentarVotando) {
      return Response.json({ error: 'Acesso negado. Perfil sem permissão de escrita.' }, { status: 403 });
    }

    // Apenas SUPER_ADMIN e ADMIN_CAMARA podem excluir registros
    if (operation === 'delete' && !isSuperAdmin && !isAdminCamara) {
      return Response.json({ error: 'Acesso negado. Sem permissão para excluir registros.' }, { status: 403 });
    }

    switch (operation) {
      case 'list': {
        const sort = params?.sort || '-created_date';
        const limit = params?.limit || 200;
        let results;
        if (isSuperAdmin) {
          results = await base44.asServiceRole.entities[entity].list(sort, limit);
        } else {
          results = await base44.asServiceRole.entities[entity].filter(
            { tenant_id: user.tenant_id },
            sort,
            limit
          );
        }
        return Response.json({ data: sanitizeResult(entity, results) });
      }

      case 'filter': {
        const query = params?.query || {};
        const sort = params?.sort || '-created_date';
        const limit = params?.limit || 200;
        if (!isSuperAdmin) {
          query.tenant_id = user.tenant_id;
        }
        const results = await base44.asServiceRole.entities[entity].filter(query, sort, limit);
        return Response.json({ data: sanitizeResult(entity, results) });
      }

      case 'get': {
        const results = await base44.asServiceRole.entities[entity].filter({ id: params.id }, null, 1);
        if (!results || results.length === 0) {
          return Response.json({ error: 'Registro não encontrado.' }, { status: 404 });
        }
        const record = results[0];
        if (!isSuperAdmin && record.tenant_id && record.tenant_id !== user.tenant_id) {
          return Response.json({ error: 'Acesso negado. Registro de outra câmara.' }, { status: 403 });
        }
        return Response.json({ data: sanitizeResult(entity, record) });
      }

      case 'create': {
        const data = { ...params.data };
        if (!isSuperAdmin && user.tenant_id) {
          data.tenant_id = user.tenant_id;
        }
        const created = await base44.asServiceRole.entities[entity].create(data);
        return Response.json({ data: sanitizeResult(entity, created) });
      }

      case 'update': {
        const results = await base44.asServiceRole.entities[entity].filter({ id: params.id }, null, 1);
        if (!results || results.length === 0) {
          return Response.json({ error: 'Registro não encontrado.' }, { status: 404 });
        }
        const existing = results[0];
        if (!isSuperAdmin && existing.tenant_id && existing.tenant_id !== user.tenant_id) {
          return Response.json({ error: 'Acesso negado. Registro de outra câmara.' }, { status: 403 });
        }
        const updated = await base44.asServiceRole.entities[entity].update(params.id, params.data);
        return Response.json({ data: sanitizeResult(entity, updated) });
      }

      case 'delete': {
        // Localiza o registro pelo id (get é o método canônico do Base44), com fallback por filter.
        let existing = null;
        try {
          existing = await base44.asServiceRole.entities[entity].get(params.id);
        } catch (_) {
          try {
            const results = await base44.asServiceRole.entities[entity].filter({ id: params.id }, null, 1);
            existing = results && results.length > 0 ? results[0] : null;
          } catch (_) { existing = null; }
        }

        if (existing) {
          // Encontrou: ADMIN_CAMARA só exclui registro da própria câmara
          if (!isSuperAdmin && existing.tenant_id && existing.tenant_id !== user.tenant_id) {
            return Response.json({ error: 'Acesso negado. Registro de outra câmara.' }, { status: 403 });
          }
        } else if (!isSuperAdmin) {
          // Não localizou diretamente (o filter por id do SDK pode falhar): antes de excluir,
          // confirma que o id pertence ao tenant do usuário — evita vazamento entre câmaras.
          let pertence = false;
          try {
            const doTenant = await base44.asServiceRole.entities[entity].filter({ tenant_id: user.tenant_id }, null, 500);
            pertence = (doTenant || []).some(r => r.id === params.id);
          } catch (_) { pertence = false; }
          if (!pertence) {
            return Response.json({ error: 'Registro não encontrado.' }, { status: 404 });
          }
        }

        await base44.asServiceRole.entities[entity].delete(params.id);
        return Response.json({ data: { id: params.id, deleted: true } });
      }


      default:
        return Response.json({ error: `Operação desconhecida: ${operation}` }, { status: 400 });
    }
  } catch (error) {
    console.error('operarEntidade erro:', error?.message);
    return Response.json({ error: 'Erro interno ao processar a operação. Tente novamente.' }, { status: 500 });
  }
});