// Utilitário reutilizável de verificação de vínculos antes de excluir um registro.
// Para cada entidade "pai", lista as entidades que a referenciam (campo de chave
// estrangeira + rótulo amigável + tela onde gerenciar). Antes de excluir, chamamos
// verificarVinculos para descobrir se há registros dependentes e, em caso afirmativo,
// bloquear a exclusão mostrando exatamente onde o registro está vinculado.
//
// "Caminho de exclusão": a verificação aqui é DIRETA (mostra o que depende imediatamente
// do registro). O caminho completo emerge conforme o usuário exclui cada dependente —
// ao excluí-lo, a própria tela mostrará os vínculos do próximo nível. Assim nunca se
// cria registro órfão e não há impasse de "um culpa o outro".
//
// Um dependente pode referenciar o pai por mais de um campo (ex.: MesaDiretora aponta
// para Parlamentar via presidente_id, vice_presidente_id, etc.). Nesses casos use `fields`.

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
  Materia: [
    { entity: 'Tramitacao', field: 'materia_id', label: 'Tramitação(ões)', onde: 'Tramitações' },
    { entity: 'Parecer', field: 'materia_id', label: 'Parecer(es)', onde: 'Pareceres' },
    { entity: 'Relatoria', field: 'materia_id', label: 'Relatoria(s)', onde: 'Pareceres' },
    { entity: 'Emenda', field: 'materia_id', label: 'Emenda(s)', onde: 'Emendas' },
    { entity: 'Votacao', field: 'materia_id', label: 'Votação(ões)', onde: 'Painel Eletrônico' },
    { entity: 'Sessao', field: 'materia_id', label: 'Sessão(ões) Plenária(s)', onde: 'Sessões Plenárias' },
    { entity: 'ReuniaoComissao', field: 'materia_id', label: 'Reunião(ões) de Comissão', onde: 'Reuniões de Comissão' },
    { entity: 'Proposicao', field: 'materia_id', label: 'Proposição(ões)', onde: 'Proposições' },
    { entity: 'Protocolo', field: 'materia_id', label: 'Protocolo(s)', onde: 'Protocolo' },
    { entity: 'NormaJuridica', field: 'materia_origem_id', label: 'Norma(s) Jurídica(s)', onde: 'Normas Jurídicas' },
  ],
  NormaJuridica: [
    { entity: 'Materia', field: 'norma_id', label: 'Matéria(s) de origem', onde: 'Matérias Legislativas' },
  ],
  Parlamentar: [
    { entity: 'UsuarioSislegis', field: 'parlamentar_id', label: 'Usuário(s) de acesso', onde: 'Usuários da Câmara' },
    { entity: 'Mandato', field: 'parlamentar_id', label: 'Mandato(s)', onde: 'Parlamentares' },
    { entity: 'Votacao', field: 'parlamentar_id', label: 'Voto(s) em votação', onde: 'Painel Eletrônico' },
    { entity: 'Quorum', field: 'parlamentar_id', label: 'Registro(s) de presença', onde: 'Controle de Presença' },
    { entity: 'Comissao', field: 'parlamentar_id', label: 'Comissão(ões)', onde: 'Comissões' },
    { entity: 'Bancada', field: 'parlamentar_id', label: 'Bancada(s)', onde: 'Partidos' },
    { entity: 'FrentesParlamentares', field: 'parlamentar_id', label: 'Frente(s) Parlamentar(es)', onde: 'Parlamentares' },
    { entity: 'ReuniaoComissao', field: 'parlamentar_id', label: 'Reunião(ões) de Comissão', onde: 'Reuniões de Comissão' },
    { entity: 'Materia', field: 'parlamentar_id', label: 'Matéria(s) como autor', onde: 'Matérias Legislativas' },
    { entity: 'Proposicao', field: 'parlamentar_id', label: 'Proposição(ões)', onde: 'Proposições' },
    { entity: 'MesaDiretora', fields: ['presidente_id', 'vice_presidente_id', 'primeiro_secretario_id', 'segundo_secretario_id'], label: 'Cargo(s) na Mesa Diretora', onde: 'Mesa Diretora' },
  ],
  Partido: [
    { entity: 'Parlamentar', field: 'partido_id', label: 'Parlamentar(es)', onde: 'Parlamentares' },
    { entity: 'Mandato', field: 'partido_id', label: 'Mandato(s)', onde: 'Parlamentares' },
    { entity: 'UsuarioSislegis', field: 'partido_id', label: 'Usuário(s)', onde: 'Usuários da Câmara' },
  ],
  Comissao: [
    { entity: 'Parecer', field: 'comissao_id', label: 'Parecer(es)', onde: 'Pareceres' },
    { entity: 'Relatoria', field: 'comissao_id', label: 'Relatoria(s)', onde: 'Pareceres' },
    { entity: 'ReuniaoComissao', field: 'comissao_id', label: 'Reunião(ões)', onde: 'Reuniões de Comissão' },
  ],
  Sessao: [
    { entity: 'AtaSessao', field: 'sessao_id', label: 'Ata(s)', onde: 'Atas das Sessões' },
    { entity: 'PautaSessao', field: 'sessao_id', label: 'Pauta(s)', onde: 'Pautas' },
    { entity: 'Votacao', field: 'sessao_id', label: 'Votação(ões)', onde: 'Painel Eletrônico' },
    { entity: 'Quorum', field: 'sessao_id', label: 'Registro(s) de presença', onde: 'Controle de Presença' },
  ],
  Protocolo: [
    { entity: 'DocumentoAdministrativo', field: 'protocolo_id', label: 'Documento(s) Administrativo(s)', onde: 'Documentos Administrativos' },
    { entity: 'Oficio', field: 'protocolo_id', label: 'Ofício(s)', onde: 'Ofícios' },
    { entity: 'Materia', field: 'protocolo_id', label: 'Matéria(s)', onde: 'Matérias Legislativas' },
    { entity: 'Proposicao', field: 'protocolo_id', label: 'Proposição(ões)', onde: 'Proposições' },
  ],
  Proposicao: [
    { entity: 'Materia', field: 'proposicao_id', label: 'Matéria(s)', onde: 'Matérias Legislativas' },
    { entity: 'Protocolo', field: 'proposicao_id', label: 'Protocolo(s)', onde: 'Protocolo' },
  ],
  // Câmara: exclusão pelo Super Admin NÃO é bloqueada por vínculos (a pedido).
  // Excluir uma câmara é uma ação destrutiva, mas o Super Admin deve poder fazê-la
  // sem precisar apagar antes todos os dados — apenas com confirmação explícita.
  Camara: [],

  // Entidades sem dependentes conhecidos — exclusão sempre liberada,
  // mas ainda passa pela confirmação padrão.
  AtaSessao: [],
  PautaSessao: [],
  EmendaImpositiva: [],
  Emenda: [],
  Tramitacao: [],
  Parecer: [],
  Relatoria: [],
  ReuniaoComissao: [],
  DocumentoAdministrativo: [],
  Oficio: [],
  AudienciaPublica: [],
  Mandato: [],
  Bancada: [],
  UsuarioSislegis: [],
};

async function contarDependentes(dep, id, withTenant) {
  const fields = dep.fields || [dep.field];
  let total = 0;
  for (const f of fields) {
    if (!f) continue;
    const base = { [f]: id };
    const filter = withTenant ? withTenant(base) : base;
    if (!filter) continue;
    const regs = await sislegisEntities[dep.entity].filter(filter, null, 500).catch(() => []);
    total += Array.isArray(regs) ? regs.length : 0;
  }
  return total;
}

// Verifica quais registros dependentes apontam para `id`.
// Retorna apenas os tipos com count > 0: [{ entity, label, onde, count }]
export async function verificarVinculos(entityName, id, withTenant) {
  const deps = DEPENDENCIAS[entityName] || [];
  if (!id || deps.length === 0) return [];

  const resultados = await Promise.all(
    deps.map(async (dep) => {
      try {
        const count = await contarDependentes(dep, id, withTenant);
        return { entity: dep.entity, label: dep.label, onde: dep.onde, count };
      } catch {
        return { entity: dep.entity, label: dep.label, onde: dep.onde, count: 0 };
      }
    })
  );

  return resultados.filter((r) => r.count > 0);
}
