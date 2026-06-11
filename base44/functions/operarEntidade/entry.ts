import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Retorna o usuário autenticado a partir do session_token
async function getAuthenticatedUser(base44) {
  // Extrair session_token do header customizado
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
      return Response.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { entity, operation, params } = await req.json();

    if (!entity || !operation) {
      return Response.json({ error: 'entity e operation são obrigatórios.' }, { status: 400 });
    }

    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    switch (operation) {
      case 'list': {
        const sort = params?.sort || '-created_date';
        const limit = params?.limit || 200;
        let results;
        if (isSuperAdmin) {
          results = await base44.asServiceRole.entities[entity].list(sort, limit);
        } else {
          // Para não-SUPER_ADMIN, filtrar sempre pelo tenant_id
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
        // Verificar isolamento de tenant
        if (!isSuperAdmin && record.tenant_id && record.tenant_id !== user.tenant_id) {
          return Response.json({ error: 'Acesso negado.' }, { status: 403 });
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
        // Verificar tenant antes de atualizar
        const existing = await base44.asServiceRole.entities[entity].get(params.id);
        if (!isSuperAdmin && existing.tenant_id && existing.tenant_id !== user.tenant_id) {
          return Response.json({ error: 'Acesso negado.' }, { status: 403 });
        }
        const updated = await base44.asServiceRole.entities[entity].update(params.id, params.data);
        return Response.json({ data: updated });
      }

      case 'delete': {
        const existing = await base44.asServiceRole.entities[entity].get(params.id);
        if (!isSuperAdmin && existing.tenant_id && existing.tenant_id !== user.tenant_id) {
          return Response.json({ error: 'Acesso negado.' }, { status: 403 });
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