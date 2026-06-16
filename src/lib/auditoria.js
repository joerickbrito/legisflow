import { sislegisEntities } from '@/lib/sislegisApi';

/**
 * Tenta obter o IP do cliente via serviço público.
 * Falha silenciosamente — auditoria nunca deve bloquear operações.
 */
let cachedIp = null;
async function getClientIp() {
  if (cachedIp) return cachedIp;
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) });
    const json = await res.json();
    cachedIp = json.ip || '';
    return cachedIp;
  } catch {
    return '';
  }
}

/**
 * Registra uma ação de auditoria no sistema.
 *
 * @param {object} params
 * @param {string} params.acao        - Ação executada: "CRIAR" | "EDITAR" | "EXCLUIR" | "VISUALIZAR" | "LOGIN" | "LOGOUT" | "EXPORTAR" | "INICIAR_VOTACAO" | "ENCERRAR_VOTACAO" | "REGISTRAR_VOTO" | "PROTOCOLAR" | "TRAMITAR" | "OUTRA"
 * @param {string} params.modulo      - Módulo do sistema (ex: "Matéria", "Sessão", "Votação")
 * @param {string} [params.registro_id]     - ID do registro afetado
 * @param {string} [params.descricao]       - Descrição legível da ação
 * @param {object} [params.dados_anteriores] - Estado antes da alteração (para EDITAR/EXCLUIR)
 * @param {object} [params.dados_novos]     - Estado após a alteração (para CRIAR/EDITAR)
 * @param {string} [params.tenant_id]       - Tenant ID da câmara
 * @param {object} [params.user]            - Objeto do usuário atual { id, full_name, email }
 */
export async function registrarAuditoria({
  acao,
  modulo,
  registro_id,
  descricao,
  dados_anteriores,
  dados_novos,
  tenant_id,
  user,
}) {
  try {
    const ip = await getClientIp();
    const data_hora = new Date().toISOString();
    const user_agent = navigator?.userAgent?.slice(0, 200) || '';

    await sislegisEntities.LogAuditoria.create({
      acao,
      modulo,
      registro_id: registro_id || '',
      descricao: descricao || '',
      dados_anteriores: dados_anteriores ? JSON.stringify(dados_anteriores) : '',
      dados_novos: dados_novos ? JSON.stringify(dados_novos) : '',
      tenant_id: tenant_id || '',
      usuario_id: user?.id || '',
      usuario_nome: user?.full_name || '',
      usuario_email: user?.email || '',
      ip,
      data_hora,
      user_agent,
    });
  } catch (e) {
    // Auditoria nunca deve bloquear operações críticas
    console.warn('[Auditoria] Falha ao registrar:', e?.message || e);
  }
}

/**
 * Hook factory: retorna uma função `audit(acao, modulo, extras?)` pré-preenchida
 * com tenant_id e user do contexto atual.
 *
 * Uso:
 *   const audit = createAuditor(tenantId, user);
 *   await audit('CRIAR', 'Matéria', { registro_id: m.id, descricao: m.ementa });
 */
export function createAuditor(tenant_id, user) {
  return function audit(acao, modulo, extras = {}) {
    return registrarAuditoria({ acao, modulo, tenant_id, user, ...extras });
  };
}