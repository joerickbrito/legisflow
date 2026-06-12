import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Entidades permitidas para operação via esta função
const ALLOWED_ENTITIES = [
  'Camara', 'CasaLegislativa', 'Parlamentar', 'Partido', 'Legislatura',
  'MesaDiretora', 'Comissao', 'Materia', 'Proposicao', 'Tramitacao',
  'Parecer', 'Sessao', 'Votacao', 'PautaSessao', 'AtaSessao',
  'NormaJuridica', 'Emenda', 'EmendaImpositiva', 'AudienciaPublica',
  'DocumentoAdministrativo', 'Oficio', 'Quorum', 'Relatoria',
  'ReuniaoComissao', 'Protocolo', 'LogAuditoria', 'UsuarioSislegis',
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

// Retorna o usuário autenticado a partir do session_token
async function getAuthenticatedUser(base44) {
  try {
    const baasUser = await base44.auth.me();
    if (baasUser) {
      const sislegisUsers = await base44.asServiceRole.entities.UsuarioSislegis.filter({
        email: baasUser.email
      });
      if (sislegisUsers && sislegisUsers.length > 0) {
        return sislegisUsers[0];
      }
      return { ...baasUser, role: baasUser.role || 'user', tenant_id: baasUser.tenant_id };
    }
  } catch { /* BaaS auth falhou, tenta SisLegis */ }

  const token = base44._requestHeaders?.get?.('x-sislegis-token') || '';
  if (!token) return null;

  const usuarios = await base44.asServiceRole.entities.UsuarioSislegis.filter({
    session_token: token
  });
  if (!usuarios || usuarios.length === 0) return null;
  return usuarios[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await getAuthenticatedUser(base44);

    if (!user) {
      return Response.json({ error: 'Não autorizado. Faça login.' }, { status: 401 });
    }

    const { entity, operation, params } = await req.json();

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
    const canWrite = isSuperAdmin || isAdminCamara || isOperadorGeral;

    // Operações restritas exigem perfil administrativo
    if (RESTRICTED_OPERATIONS.includes(operation) && !canWrite) {
      return Response.json({ error: 'Acesso negado. Perfil sem permissão de escrita.' }, { status: 403 });
    }

    // Apenas SUPER_ADMIN pode excluir registros
    if (operation === 'delete' && !isSuperAdmin) {
      return Response.json({ error: 'Acesso negado. Apenas Master Admin pode excluir registros.' }, { status: 403 });
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
        return Response.json({ data: results });
      }

      case 'filter': {
        const query = params?.query || {};
        const sort = params?.sort || '-created_date';
        const limit = params?.limit || 200;
        if (!isSuperAdmin) {
          query.tenant_id = user.tenant_id;
        }
        const results = await base44.asServiceRole.entities[entity].filter(query, sort, limit);
        return Response.json({ data: results });
      }

      case 'get': {
        const record = await base44.asServiceRole.entities[entity].get(params.id);
        if (!record) {
          return Response.json({ error: 'Registro não encontrado.' }, { status: 404 });
        }
        // Verificar isolamento de tenant
        if (!isSuperAdmin && record.tenant_id && record.tenant_id !== user.tenant_id) {
          return Response.json({ error: 'Acesso negado. Registro de outra câmara.' }, { status: 403 });
        }
        return Response.json({ data: record });
      }

      case 'create': {
        const data = { ...params.data };
        if (!isSuperAdmin && user.tenant_id) {
          data.tenant_id = user.tenant_id;
        }
        const created = await base44.asServiceRole.entities[entity].create(data);
        return Response.json({ data: created });
      }

      case 'update': {
        const existing = await base44.asServiceRole.entities[entity].get(params.id);
        if (!existing) {
          return Response.json({ error: 'Registro não encontrado.' }, { status: 404 });
        }
        // Verificar tenant antes de atualizar
        if (!isSuperAdmin && existing.tenant_id && existing.tenant_id !== user.tenant_id) {
          return Response.json({ error: 'Acesso negado. Registro de outra câmara.' }, { status: 403 });
        }
        const updated = await base44.asServiceRole.entities[entity].update(params.id, params.data);
        return Response.json({ data: updated });
      }

      case 'delete': {
        // SUPER_ADMIN já validado acima
        const existing = await base44.asServiceRole.entities[entity].get(params.id);
        if (!existing) {
          return Response.json({ error: 'Registro não encontrado.' }, { status: 404 });
        }
        await base44.asServiceRole.entities[entity].delete(params.id);
        return Response.json({ data: { id: params.id, deleted: true } });
      }

      default:
        return Response.json({ error: `Operação desconhecida: ${operation}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});