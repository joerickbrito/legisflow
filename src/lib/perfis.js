// Perfis Fixos e Permissões do Sistema
// Cada perfil tem um conjunto padrão de permissões, que podem ser
// sobrescritas individualmente por usuário.

export const PERFIS = {
  ADMIN_CAMARA: 'ADMIN_CAMARA',
  OPERADOR_GERAL: 'OPERADOR_GERAL',
  PRESIDENTE: 'PRESIDENTE',
  VEREADOR: 'VEREADOR',
  ASSESSOR: 'ASSESSOR',
  SECRETARIO_LEGISLATIVO: 'SECRETARIO_LEGISLATIVO',
  PROTOCOLO_PREFEITURA: 'PROTOCOLO_PREFEITURA',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

export const PERFIL_LABELS = {
  ADMIN_CAMARA: 'Admin da Câmara',
  OPERADOR_GERAL: 'Operador Geral',
  PRESIDENTE: 'Presidente',
  VEREADOR: 'Vereador',
  ASSESSOR: 'Assessor',
  SECRETARIO_LEGISLATIVO: 'Secretário Legislativo',
  PROTOCOLO_PREFEITURA: 'Protocolo — Prefeitura',
  SUPER_ADMIN: 'Master Admin',
};

export const PERFIL_DESCRIPTIONS = {
  ADMIN_CAMARA: 'Gerencia estrutura, usuários, configurações e permissões da câmara.',
  OPERADOR_GERAL: 'Operação legislativa diária, cria e controla sessões, votações, documentos e tramitações.',
  PRESIDENTE: 'Acesso de vereador acrescido de abertura e encerramento de sessão e voto de desempate.',
  VEREADOR: 'Acessa pautas, projetos, participa de votações e consulta seu histórico.',
  ASSESSOR: 'Acesso de consulta e apoio documental conforme permissões atribuídas, não vota.',
  SECRETARIO_LEGISLATIVO: 'Responsável por registros formais, atas, protocolos e publicações oficiais.',
  PROTOCOLO_PREFEITURA: 'Login da Prefeitura. Acessa apenas a tela de protocolar documentos (ofícios, requerimentos, projetos de lei, etc.) à câmara.',
  SUPER_ADMIN: 'Administrador global da plataforma — acesso total a todas as câmaras.',
};

// Ações possíveis por item (rótulos para a UI)
export const ACAO_LABEL = {
  visualizar: 'Visualizar',
  criar: 'Criar',
  editar: 'Editar',
  excluir: 'Excluir',
  tramitar: 'Atualizar tramitação',
  protocolar: 'Protocolar',
  encerrar: 'Encerrar',
  presenca: 'Controlar presença',
  operar: 'Operar votação',
  votar: 'Votar',
  desempate: 'Voto de desempate',
  gerenciar_permissoes: 'Gerenciar permissões',
};

// ============================================================
// PERMISSÕES organizadas EXATAMENTE como as seções da sidebar:
//   Seção → itens (cada rota) → ações disponíveis naquele item.
// A chave de cada permissão é `${item.id}_${acao}` (ex.: parlamentares_criar).
// No formulário dá pra marcar a seção inteira, itens isolados, ou ações por item.
// ============================================================
export const PERMISSION_SECTIONS = [
  {
    label: 'Principal',
    itens: [
      { id: 'dashboard', label: 'Dashboard da Câmara', path: '/', acoes: ['visualizar'] },
    ],
  },
  {
    label: 'Estrutura',
    itens: [
      { id: 'legislaturas', label: 'Legislaturas', path: '/legislaturas', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
      { id: 'parlamentares', label: 'Parlamentares', path: '/parlamentares', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
      { id: 'partidos', label: 'Partidos', path: '/partidos', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
      { id: 'mesa_diretora', label: 'Mesa Diretora', path: '/mesa-diretora', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
      { id: 'comissoes', label: 'Comissões', path: '/comissoes', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
    ],
  },
  {
    label: 'Processo Legislativo',
    itens: [
      { id: 'projetos_lei', label: 'Projetos de Lei', path: '/projetos-lei', acoes: ['visualizar', 'criar', 'editar', 'excluir', 'tramitar'] },
      { id: 'leis', label: 'Leis', path: '/leis', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
      { id: 'resolucoes', label: 'Resoluções', path: '/resolucoes', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
      { id: 'decretos', label: 'Decretos', path: '/decretos', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
      { id: 'portarias', label: 'Portarias', path: '/portarias', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
      { id: 'emendas_impositivas', label: 'Emendas Impositivas', path: '/emendas-impositivas', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
      { id: 'proposicoes', label: 'Proposições', path: '/proposicoes', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
      { id: 'materias', label: 'Matérias Legislativas', path: '/materias', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
      { id: 'tramitacoes', label: 'Tramitações', path: '/tramitacoes', acoes: ['visualizar', 'criar', 'editar'] },
      { id: 'pareceres', label: 'Pareceres', path: '/pareceres', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
      { id: 'emendas', label: 'Emendas', path: '/emendas', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
    ],
  },
  {
    label: 'Sessões e Votação',
    itens: [
      { id: 'sessoes', label: 'Sessões Plenárias', path: '/sessoes', acoes: ['visualizar', 'criar', 'editar', 'excluir', 'encerrar'] },
      { id: 'painel', label: 'Painel Eletrônico', path: '/painel-eletronico', acoes: ['votar', 'operar', 'desempate'] },
      { id: 'quorum', label: 'Controle de Presença', path: '/quorum', acoes: ['visualizar', 'presenca'] },
      { id: 'reuniao_comissao', label: 'Reuniões de Comissão', path: '/reuniao-comissao', acoes: ['visualizar', 'criar', 'editar'] },
      { id: 'pautas', label: 'Pautas das Sessões', path: '/pautas-sessoes', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
      { id: 'atas', label: 'Atas das Sessões', path: '/atas-sessoes', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
    ],
  },
  {
    label: 'Documentos',
    itens: [
      { id: 'audiencias', label: 'Audiências Públicas', path: '/audiencias', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
      { id: 'protocolo', label: 'Protocolo', path: '/protocolo', acoes: ['visualizar', 'protocolar', 'tramitar', 'excluir'] },
      { id: 'protocolos_publicos', label: 'Protocolos Públicos', path: '/protocolos-publicos', acoes: ['visualizar', 'tramitar', 'excluir'] },
    ],
  },
  {
    label: 'Administração',
    itens: [
      { id: 'usuarios', label: 'Usuários da Câmara', path: '/gerenciar-usuarios', acoes: ['visualizar', 'criar', 'editar', 'gerenciar_permissoes'] },
      { id: 'casa_legislativa', label: 'Casa Legislativa', path: '/casa-legislativa', acoes: ['visualizar', 'editar'] },
      { id: 'relatorios', label: 'Relatórios', path: '/relatorios', acoes: ['visualizar'] },
      { id: 'auditoria', label: 'Auditoria da Câmara', path: '/auditoria', acoes: ['visualizar'] },
    ],
  },
  {
    label: 'Outros',
    itens: [
      { id: 'transparencia', label: 'Portal de Transparência', path: '/transparencia', acoes: ['visualizar'] },
    ],
  },
];

// Lista achatada de todas as chaves (`item_acao`).
export const ALL_PERM_KEYS = PERMISSION_SECTIONS.flatMap(
  (s) => s.itens.flatMap((it) => it.acoes.map((a) => `${it.id}_${a}`))
);

// Compatibilidade: alguns lugares ainda importam PERMISSION_GROUPS (label/keys).
export const PERMISSION_GROUPS = PERMISSION_SECTIONS.map((s) => ({
  label: s.label.toUpperCase(),
  keys: s.itens.flatMap((it) => it.acoes.map((a) => ({
    key: `${it.id}_${a}`,
    label: `${ACAO_LABEL[a] || a} — ${it.label}`,
  }))),
}));

// ============================================================
// Conjuntos padrão de permissões por perfil
// ============================================================
function todas(on) {
  const obj = {};
  ALL_PERM_KEYS.forEach((k) => { obj[k] = on; });
  return obj;
}

// Consulta ampla: todas as ações "visualizar" (exceto auditoria) + votar.
const VISUALIZAR_TUDO = {};
ALL_PERM_KEYS.forEach((k) => {
  VISUALIZAR_TUDO[k] = (k.endsWith('_visualizar') && k !== 'auditoria_visualizar') || k === 'painel_votar';
});

function comAcoes(base, chaves) {
  const o = { ...base };
  chaves.forEach((k) => { o[k] = true; });
  return o;
}

// ADMIN_CAMARA: tudo
const ADMIN = todas(true);

// OPERADOR_GERAL: tudo exceto gerenciar permissões e auditoria
const OPERADOR = { ...todas(true) };
OPERADOR.usuarios_gerenciar_permissoes = false;
OPERADOR.auditoria_visualizar = false;

// PRESIDENTE: consulta ampla + criação legislativa + operação de sessão/painel
const PRESIDENTE_PERMS = comAcoes(VISUALIZAR_TUDO, [
  'projetos_lei_criar', 'projetos_lei_editar',
  'emendas_criar', 'emendas_editar',
  'emendas_impositivas_criar', 'emendas_impositivas_editar',
  'sessoes_encerrar', 'quorum_presenca',
  'painel_operar', 'painel_votar', 'painel_desempate',
  'documentos_criar', 'documentos_editar',
]);

// VEREADOR: consulta + criar projetos/emendas + votar
const VEREADOR_PERMS = comAcoes(VISUALIZAR_TUDO, [
  'projetos_lei_criar', 'projetos_lei_editar',
  'emendas_criar', 'emendas_editar',
  'emendas_impositivas_criar', 'emendas_impositivas_editar',
  'painel_votar', 'documentos_criar',
]);

// ASSESSOR: apenas visualizar (não vota)
const ASSESSOR_PERMS = { ...VISUALIZAR_TUDO };
ASSESSOR_PERMS.painel_votar = false;

// SECRETARIO_LEGISLATIVO: consulta + atas, documentos, pautas, audiências, protocolos
const SECRETARIO_PERMS = comAcoes(VISUALIZAR_TUDO, [
  'atas_criar', 'atas_editar', 'atas_excluir',
  'documentos_criar', 'documentos_editar', 'documentos_excluir',
  'pautas_criar', 'pautas_editar', 'pautas_excluir',
  'audiencias_criar', 'audiencias_editar',
  'protocolo_protocolar', 'protocolo_tramitar', 'protocolos_publicos_tramitar',
]);
SECRETARIO_PERMS.painel_votar = false;

// SUPER_ADMIN: tudo
const SUPER_PERMS = todas(true);

// PROTOCOLO_PREFEITURA: nada do sistema, apenas protocolar documentos à câmara.
const PREFEITURA_PERMS = { ...todas(false), protocolar_prefeitura: true };

export const DEFAULT_PERMISSIONS = {
  ADMIN_CAMARA: ADMIN,
  OPERADOR_GERAL: OPERADOR,
  PRESIDENTE: PRESIDENTE_PERMS,
  VEREADOR: VEREADOR_PERMS,
  ASSESSOR: ASSESSOR_PERMS,
  SECRETARIO_LEGISLATIVO: SECRETARIO_PERMS,
  PROTOCOLO_PREFEITURA: PREFEITURA_PERMS,
  SUPER_ADMIN: SUPER_PERMS,
};

// Lista de todos os perfis para dropdowns (ordem fixa)
export const PERFIS_ORDER = [
  'ADMIN_CAMARA',
  'OPERADOR_GERAL',
  'PRESIDENTE',
  'VEREADOR',
  'ASSESSOR',
  'SECRETARIO_LEGISLATIVO',
  'PROTOCOLO_PREFEITURA',
];

// Perfis que exigem partido
export const PERFIS_PARTIDO_OBRIGATORIO = ['VEREADOR', 'PRESIDENTE'];

// Perfis que exigem foto
export const PERFIS_FOTO_OBRIGATORIA = ['VEREADOR', 'PRESIDENTE'];

// ============================================================
// MAPEAMENTO MENU → PERMISSÃO (gerado a partir das seções acima)
// Cada rota usa a ação "visualizar" do seu item (ou a 1ª ação, ex.: painel→votar).
// Dashboard ('/') fica sempre visível. SUPER_ADMIN/ADMIN_CAMARA ignoram o filtro.
// ============================================================
export const MENU_PERMISSION_MAP = {};
PERMISSION_SECTIONS.forEach((s) => {
  s.itens.forEach((it) => {
    if (!it.path || it.path === '/') return;
    const acao = it.acoes.includes('visualizar') ? 'visualizar' : it.acoes[0];
    MENU_PERMISSION_MAP[it.path] = `${it.id}_${acao}`;
  });
});
// Configurações usa a permissão de gerenciar permissões de usuários.
MENU_PERMISSION_MAP['/configuracoes'] = 'usuarios_gerenciar_permissoes';

/**
 * Verifica se um item do menu deve ser exibido.
 * @param {object} user — objeto do usuário (deve conter .role e .permissoes)
 * @param {string} path — rota do item
 * @returns {boolean}
 */
export function canShowMenuItem(user, path) {
  if (!user) return false;
  // SUPER_ADMIN e ADMIN_CAMARA veem tudo
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_CAMARA') return true;

  const permKey = MENU_PERMISSION_MAP[path];
  if (!permKey) return true; // sem mapeamento = sempre visível

  // Usa a permissão explícita do usuário; se aquela chave não existir no registro
  // (ex.: usuários antigos, criados antes desta chave), cai no padrão do perfil.
  // Isso garante compatibilidade ao introduzir/renomear permissões.
  const permissoes = user.permissoes || {};
  const val = permissoes[permKey];
  if (val !== undefined) return !!val;
  return !!(DEFAULT_PERMISSIONS[user.role] || {})[permKey];
}

/**
 * Verifica uma permissão de AÇÃO específica (ex.: 'protocolo_protocolar').
 * Mesma lógica de fallback do canShowMenuItem: admin vê tudo; chave ausente
 * herda o padrão do perfil.
 */
export function temPermissao(user, key) {
  if (!user) return false;
  // Apenas o master global tem acesso irrestrito. Os demais (inclusive
  // ADMIN_CAMARA) respeitam as permissões marcadas: usa o valor explícito;
  // se a chave não existir no registro, cai no padrão do perfil.
  if (user.role === 'SUPER_ADMIN') return true;
  const p = user.permissoes || {};
  if (p[key] !== undefined) return !!p[key];
  return !!(DEFAULT_PERMISSIONS[user.role] || {})[key];
}
