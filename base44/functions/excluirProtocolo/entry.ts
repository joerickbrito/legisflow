/**
 * excluirProtocolo — Exclui um protocolo (apenas usuário da câmara com permissão).
 *
 * Regras:
 *   - Exige sessão (sislegis_token).
 *   - O protocolo precisa ser da MESMA câmara do usuário (tenant).
 *   - Permitido para ADMIN_CAMARA/SUPER_ADMIN, ou para quem tiver a ação de
 *     excluir do tipo correspondente:
 *       origem "Público"  → permissoes.protocolos_publicos_excluir
 *       demais            → permissoes.protocolo_excluir
 *   roda asServiceRole para efetuar a exclusão após a checagem.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
    const { sislegis_token, protocolo_id } = body || {};

    if (!protocolo_id) {
      return Response.json({ error: 'Protocolo não informado.' }, { status: 400 });
    }

    const usuario = await getUsuario(base44, sislegis_token);
    if (!usuario) {
      return Response.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
    }

    // Busca o protocolo e confere o tenant.
    let proto = null;
    try { proto = await base44.asServiceRole.entities.Protocolo.get(protocolo_id); } catch { /* ignore */ }
    if (!proto) {
      return Response.json({ error: 'Protocolo não encontrado.' }, { status: 404 });
    }
    if (proto.tenant_id && usuario.tenant_id && proto.tenant_id !== usuario.tenant_id) {
      return Response.json({ error: 'Sem permissão para excluir este protocolo.' }, { status: 403 });
    }

    // Checagem de permissão.
    const isAdmin = usuario.role === 'ADMIN_CAMARA' || usuario.role === 'SUPER_ADMIN';
    const perms = usuario.permissoes || {};
    const chave = proto.origem === 'Público' ? 'protocolos_publicos_excluir' : 'protocolo_excluir';
    const permitido = isAdmin || !!perms[chave];
    if (!permitido) {
      return Response.json({ error: 'Você não tem permissão para excluir protocolos.' }, { status: 403 });
    }

    await base44.asServiceRole.entities.Protocolo.delete(protocolo_id);
    return Response.json({ data: { ok: true } });
  } catch (error) {
    console.error('excluirProtocolo erro:', error?.message);
    return Response.json({ error: 'Erro ao excluir o protocolo.' }, { status: 500 });
  }
});
