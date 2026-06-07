import { base44 } from '@/api/base44Client';

/**
 * Registra uma ação de auditoria no sistema.
 * @param {object} params
 * @param {string} params.acao - Ação executada (ex: "CRIAR", "EDITAR", "EXCLUIR")
 * @param {string} params.modulo - Módulo do sistema (ex: "Matéria", "Sessão")
 * @param {string} [params.registro_id] - ID do registro afetado
 * @param {string} [params.descricao] - Descrição da ação
 * @param {object} [params.dados_anteriores] - Dados antes da alteração
 * @param {object} [params.dados_novos] - Dados após a alteração
 * @param {string} [params.tenant_id] - Tenant ID
 * @param {object} [params.user] - Usuário atual
 */
export async function registrarAuditoria({ acao, modulo, registro_id, descricao, dados_anteriores, dados_novos, tenant_id, user }) {
  try {
    await base44.entities.LogAuditoria.create({
      acao,
      modulo,
      registro_id: registro_id || '',
      descricao: descricao || '',
      dados_anteriores: dados_anteriores ? JSON.stringify(dados_anteriores) : '',
      dados_novos: dados_novos ? JSON.stringify(dados_novos) : '',
      tenant_id: tenant_id || '',
      usuario_id: user?.id || '',
      usuario_nome: user?.full_name || '',
    });
  } catch (e) {
    // Auditoria não deve bloquear operações
    console.warn('Falha ao registrar auditoria:', e);
  }
}