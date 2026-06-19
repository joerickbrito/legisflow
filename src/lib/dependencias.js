// Utilitário reutilizável de verificação de vínculos antes de excluir um registro.
// Para cada entidade "pai", lista as entidades que a referenciam (com o campo de
// chave estrangeira e um rótulo amigável). Antes de excluir, chamamos verificarVinculos
// para descobrir se há registros dependentes e, em caso afirmativo, bloquear a exclusão
// mostrando exatamente onde o registro está vinculado.
//
// Observação sobre "caminho de exclusão": a verificação aqui é DIRETA (mostra o que
// depende imediatamente do registro). O caminho completo emerge naturalmente conforme
// o usuário vai excluindo cada dependente — ao tentar excluir um dependente, a própria
// tela dele mostrará os vínculos do próximo nível. Assim nunca se cria registro órfão.

import { sislegisEntities } from '@/lib/sislegisApi';

export const DEPENDENCIAS = {
  Legislatura: [
    { entity: 'SessaoLegislativa', field: 'legislatura_id', label: 'Sessão(ões) Legislativa(s)', onde: 'Legislaturas' },
    { entity: 'Sessao', field: 'legislatura_id', label: 'Sessão(ões) Plenária(s)', onde: 'Sessões Plenárias' },
    { entity: 'Materia', field: 'legislatura_id', label: 'Matéria(s)', onde: 'Matérias Legislativas' },
    { entity: 'Parlamentar', field: 'legislatura_id', label: 'Parlamentar(es)', onde: 'Parlamentares' },
    { entity: 'Mandato', field: 'legislatura_id', label: 'Mandato(s)', onde: 'Parlamentares' },
    { entity: 'MesaDiretora', field: 'legislatura_id', label: 'Mesa(s) Diretora(s)', onde: 'Mesa Diretora' },
    { entity: 'Comissao', field: 'legislatura_id', label: 'Comissão(ões)', onde: 'Comissões' },
    { entity: 'Bancada', field: 'legislatura_id', label: 'Bancada(s)', onde: 'Partidos' },
  ],
  SessaoLegislativa: [
    { entity: 'Sessao', field: 'sessao_legislativa_id', label: 'Sessão(ões) Plenária(s)', onde: 'Sessões Plenárias' },
    { entity: 'Materia', field: 'sessao_legislativa_id', label: 'Matéria(s)', onde: 'Matérias Legislativas' },
  ],
};

// Verifica quais registros dependentes apontam para `id`.
// Retorna apenas os tipos com count > 0: [{ entity, field, label, onde, count }]
export async function verificarVinculos(entityName, id, withTenant) {
  const deps = DEPENDENCIAS[entityName] || [];
  if (!id || deps.length === 0) return [];

  const resultados = await Promise.all(
    deps.map(async (dep) => {
      try {
        const filtroBase = { [dep.field]: id };
        const filter = withTenant ? withTenant(filtroBase) : filtroBase;
        if (!filter) return { ...dep, count: 0 };
        const registros = await sislegisEntities[dep.entity]
          .filter(filter, null, 500)
          .catch(() => []);
        return { ...dep, count: Array.isArray(registros) ? registros.length : 0 };
      } catch {
        return { ...dep, count: 0 };
      }
    })
  );

  return resultados.filter((r) => r.count > 0);
}
