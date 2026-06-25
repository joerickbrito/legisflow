/**
 * sincronizarCronometro — Espelha os cronômetros do painel para o telão.
 *
 * Grava o último comando de cronômetro no próprio registro da Votação
 * (campo cronometro_cmd). Como o telão e o painel já escutam mudanças da
 * Votação em tempo real (subscribe), o comando se propaga para todas as
 * janelas/telas — inclusive em outro monitor ou computador.
 *
 * É uma sincronização de exibição (não é dado crítico), por isso NÃO gera
 * log de auditoria — evita poluir o log a cada clique de timer.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function getAuthenticatedUser(base44, token) {
  if (!token) return null;
  try {
    const us = await base44.asServiceRole.entities.UsuarioSislegis.filter({ session_token: token });
    return (us && us[0]) || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { votacao_id, cmd, sislegis_token } = await req.json().catch(() => ({}));

    const user = await getAuthenticatedUser(base44, sislegis_token);
    if (!user) return Response.json({ error: 'Não autorizado.' }, { status: 401 });

    if (!votacao_id || !cmd) {
      return Response.json({ error: 'votacao_id e cmd são obrigatórios.' }, { status: 400 });
    }

    // Atualiza apenas o campo do cronômetro. asServiceRole ignora o RLS.
    await base44.asServiceRole.entities.Votacao.update(votacao_id, {
      cronometro_cmd: typeof cmd === 'string' ? cmd : JSON.stringify(cmd),
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('sincronizarCronometro erro:', error?.message);
    return Response.json({ error: 'Erro ao sincronizar cronômetro.' }, { status: 500 });
  }
});
