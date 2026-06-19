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
  SUPER_ADMIN: 'SUPER_ADMIN',
};

export const PERFIL_LABELS = {
  ADMIN_CAMARA: 'Admin da Câmara',
  OPERADOR_GERAL: 'Operador Geral',
  PRESIDENTE: 'Presidente',
  VEREADOR: 'Vereador',
  ASSESSOR: 'Assessor',
  SECRETARIO_LEGISLATIVO: 'Secretário Legislativo',
  SUPER_ADMIN: 'Master Admin',
};

export const PERFIL_DESCRIPTIONS = {
  ADMIN_CAMARA: 'Gerencia estrutura, usuários, configurações e permissões da câmara.',
  OPERADOR_GERAL: 'Operação legislativa diária, cria e controla sessões, votações, documentos e tramitações.',
  PRESIDENTE: 'Acesso de vereador acrescido de abertura e encerramento de sessão e voto de desempate.',
  VEREADOR: 'Acessa pautas, projetos, participa de votações e consulta seu histórico.',
  ASSESSOR: 'Acesso de consulta e apoio documental conforme permissões atribuídas, não vota.',
  SECRETARIO_LEGISLATIVO: 'Responsável por registros formais, atas, protocolos e publicações oficiais.',
  SUPER_ADMIN: 'Administrador global da plataforma — acesso total a todas as câmaras.',
};

// Grupos de permissão para renderização no formulário
export const PERMISSION_GROUPS = [
  {
    label: 'PROJETOS DE LEI',
    keys: [
      { key: 'projetos_lei_visualizar', label: 'Visualizar projetos de lei' },
      { key: 'projetos_lei_criar', label: 'Criar projetos de lei' },
      { key: 'projetos_lei_editar', label: 'Editar projetos de lei' },
      { key: 'projetos_lei_excluir', label: 'Excluir projetos de lei' },
      { key: 'projetos_lei_tramitar', label: 'Atualizar situação de tramitação' },
    ],
  },
  {
    label: 'LEIS',
    keys: [
      { key: 'leis_visualizar', label: 'Visualizar leis' },
      { key: 'leis_criar', label: 'Criar leis' },
      { key: 'leis_editar', label: 'Editar leis' },
      { key: 'leis_excluir', label: 'Excluir leis' },
    ],
  },
  {
    label: 'RESOLUÇÕES',
    keys: [
      { key: 'resolucoes_visualizar', label: 'Visualizar resoluções' },
      { key: 'resolucoes_criar', label: 'Criar resoluções' },
      { key: 'resolucoes_editar', label: 'Editar resoluções' },
      { key: 'resolucoes_excluir', label: 'Excluir resoluções' },
    ],
  },
  {
    label: 'DECRETOS',
    keys: [
      { key: 'decretos_visualizar', label: 'Visualizar decretos' },
      { key: 'decretos_criar', label: 'Criar decretos' },
      { key: 'decretos_editar', label: 'Editar decretos' },
      { key: 'decretos_excluir', label: 'Excluir decretos' },
    ],
  },
  {
    label: 'PORTARIAS',
    keys: [
      { key: 'portarias_visualizar', label: 'Visualizar portarias' },
      { key: 'portarias_criar', label: 'Criar portarias' },
      { key: 'portarias_editar', label: 'Editar portarias' },
      { key: 'portarias_excluir', label: 'Excluir portarias' },
    ],
  },
  {
    label: 'EMENDAS IMPOSITIVAS',
    keys: [
      { key: 'emendas_visualizar', label: 'Visualizar emendas' },
      { key: 'emendas_criar', label: 'Criar emendas' },
      { key: 'emendas_editar', label: 'Editar emendas' },
      { key: 'emendas_excluir', label: 'Excluir emendas' },
    ],
  },
  {
    label: 'SESSÕES PLENÁRIAS',
    keys: [
      { key: 'sessoes_visualizar', label: 'Visualizar sessões' },
      { key: 'sessoes_criar', label: 'Criar sessões' },
      { key: 'sessoes_editar', label: 'Editar sessões' },
      { key: 'sessoes_encerrar', label: 'Encerrar sessões' },
      { key: 'sessoes_presenca', label: 'Controlar presença em sessões' },
    ],
  },
  {
    label: 'PAINEL ELETRÔNICO',
    keys: [
      { key: 'painel_operar', label: 'Operar painel — abrir e encerrar votações' },
      { key: 'painel_votar', label: 'Participar como votante' },
      { key: 'painel_desempate', label: 'Votar em desempate — exclusivo do Presidente' },
    ],
  },
  {
    label: 'PAUTAS',
    keys: [
      { key: 'pautas_visualizar', label: 'Visualizar pautas' },
      { key: 'pautas_criar', label: 'Criar pautas' },
      { key: 'pautas_editar', label: 'Editar pautas' },
      { key: 'pautas_excluir', label: 'Excluir pautas' },
    ],
  },
  {
    label: 'ATAS',
    keys: [
      { key: 'atas_visualizar', label: 'Visualizar atas' },
      { key: 'atas_criar', label: 'Criar atas' },
      { key: 'atas_editar', label: 'Editar atas' },
      { key: 'atas_excluir', label: 'Excluir atas' },
    ],
  },
  {
    label: 'AUDIÊNCIAS PÚBLICAS',
    keys: [
      { key: 'audiencias_visualizar', label: 'Visualizar audiências' },
      { key: 'audiencias_criar', label: 'Criar audiências' },
      { key: 'audiencias_editar', label: 'Editar audiências' },
    ],
  },
  {
    label: 'DOCUMENTOS ADMINISTRATIVOS',
    keys: [
      { key: 'documentos_visualizar', label: 'Visualizar documentos' },
      { key: 'documentos_criar', label: 'Criar documentos' },
      { key: 'documentos_editar', label: 'Editar documentos' },
      { key: 'documentos_excluir', label: 'Excluir documentos' },
    ],
  },
  {
    label: 'ESTRUTURA DA CÂMARA',
    keys: [
      { key: 'estrutura_visualizar', label: 'Visualizar estrutura da câmara' },
    ],
  },
  {
    label: 'TRANSPARÊNCIA',
    keys: [
      { key: 'transparencia_visualizar', label: 'Visualizar portal de transparência' },
    ],
  },
  {
    label: 'USUÁRIOS E PERMISSÕES',
    keys: [
      { key: 'usuarios_visualizar', label: 'Visualizar usuários' },
      { key: 'usuarios_criar', label: 'Criar usuários' },
      { key: 'usuarios_editar', label: 'Editar usuários' },
      { key: 'usuarios_gerenciar_permissoes', label: 'Gerenciar permissões de usuários' },
    ],
  },
  {
    label: 'RELATÓRIOS E AUDITORIA',
    keys: [
      { key: 'relatorios_acessar', label: 'Acessar relatórios internos' },
      { key: 'auditoria_logs', label: 'Visualizar logs de auditoria' },
    ],
  },
];

// Conjunto padrão de permissões por perfil
// true = concedido por padrão, false = não concedido
function todas(on) {
  const obj = {};
  PERMISSION_GROUPS.forEach(g => g.keys.forEach(k => { obj[k.key] = on; }));
  return obj;
}

const VISUALIZAR_TUDO = {};
PERMISSION_GROUPS.forEach(g => {
  g.keys.forEach(k => {
    VISUALIZAR_TUDO[k.key] = k.key.endsWith('_visualizar') || k.key === 'painel_votar' || k.key === 'relatorios_acessar';
  });
});

// ADMIN_CAMARA: tudo
const ADMIN = todas(true);

// OPERADOR_GERAL: tudo exceto gerenciar permissões e auditoria
const OPERADOR = { ...todas(true) };
OPERADOR.usuarios_gerenciar_permissoes = false;
OPERADOR.auditoria_logs = false;

// PRESIDENTE: vereador base + sessoes_encerrar + sessoes_presenca + painel_operar + painel_desempate
const PRESIDENTE_PERMS = { ...VISUALIZAR_TUDO };
PRESIDENTE_PERMS.projetos_lei_criar = true;
PRESIDENTE_PERMS.projetos_lei_editar = true;
PRESIDENTE_PERMS.emendas_criar = true;
PRESIDENTE_PERMS.emendas_editar = true;
PRESIDENTE_PERMS.sessoes_encerrar = true;
PRESIDENTE_PERMS.sessoes_presenca = true;
PRESIDENTE_PERMS.painel_operar = true;
PRESIDENTE_PERMS.painel_votar = true;
PRESIDENTE_PERMS.painel_desempate = true;
PRESIDENTE_PERMS.documentos_criar = true;
PRESIDENTE_PERMS.documentos_editar = true;

// VEREADOR: visualizar + criar projetos e emendas + votar
const VEREADOR_PERMS = { ...VISUALIZAR_TUDO };
VEREADOR_PERMS.projetos_lei_criar = true;
VEREADOR_PERMS.projetos_lei_editar = true;
VEREADOR_PERMS.emendas_criar = true;
VEREADOR_PERMS.emendas_editar = true;
VEREADOR_PERMS.painel_votar = true;
VEREADOR_PERMS.documentos_criar = true;

// ASSESSOR: apenas visualizar
const ASSESSOR_PERMS = { ...VISUALIZAR_TUDO };
ASSESSOR_PERMS.painel_votar = false;

// SECRETARIO_LEGISLATIVO: visualizar + atas, documentos, pautas, protocolos
const SECRETARIO_PERMS = { ...VISUALIZAR_TUDO };
SECRETARIO_PERMS.atas_criar = true;
SECRETARIO_PERMS.atas_editar = true;
SECRETARIO_PERMS.atas_excluir = true;
SECRETARIO_PERMS.documentos_criar = true;
SECRETARIO_PERMS.documentos_editar = true;
SECRETARIO_PERMS.documentos_excluir = true;
SECRETARIO_PERMS.pautas_criar = true;
SECRETARIO_PERMS.pautas_editar = true;
SECRETARIO_PERMS.pautas_excluir = true;
SECRETARIO_PERMS.audiencias_criar = true;
SECRETARIO_PERMS.audiencias_editar = true;
SECRETARIO_PERMS.audiencias_visualizar = true;
SECRETARIO_PERMS.relatorios_acessar = true;
SECRETARIO_PERMS.auditoria_logs = false;
SECRETARIO_PERMS.painel_votar = false;

// SUPER_ADMIN: tudo
const SUPER_PERMS = todas(true);

export const DEFAULT_PERMISSIONS = {
  ADMIN_CAMARA: ADMIN,
  OPERADOR_GERAL: OPERADOR,
  PRESIDENTE: PRESIDENTE_PERMS,
  VEREADOR: VEREADOR_PERMS,
  ASSESSOR: ASSESSOR_PERMS,
  SECRETARIO_LEGISLATIVO: SECRETARIO_PERMS,
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
];

// Perfis que exigem partido
export const PERFIS_PARTIDO_OBRIGATORIO = ['VEREADOR', 'PRESIDENTE'];

// Perfis que exigem foto
export const PERFIS_FOTO_OBRIGATORIA = ['VEREADOR', 'PRESIDENTE'];

// ============================================================
// MAPEAMENTO MENU → PERMISSÃO
// Cada rota do menu lateral mapeia para a chave de permissão
// necessária para exibi-la. Rotas sem mapeamento = sempre visíveis.
// SUPER_ADMIN ignora este filtro e vê tudo.
// ============================================================
export const MENU_PERMISSION_MAP = {
  // Estrutura
  '/legislaturas': 'estrutura_visualizar',
  '/parlamentares': 'estrutura_visualizar',
  '/partidos': 'estrutura_visualizar',
  '/mesa-diretora': 'estrutura_visualizar',
  '/comissoes': 'estrutura_visualizar',

  // Administração
  '/gerenciar-usuarios': 'usuarios_visualizar',
  '/casa-legislativa': 'estrutura_visualizar',
  '/configuracoes': 'usuarios_gerenciar_permissoes',
  '/auditoria': 'auditoria_logs',

  // Processo Legislativo
  '/proposicoes': 'projetos_lei_visualizar',
  '/materias': 'projetos_lei_visualizar',
  '/tramitacoes': 'projetos_lei_visualizar',
  '/pareceres': 'projetos_lei_visualizar',
  '/projetos-lei': 'projetos_lei_visualizar',
  '/leis': 'leis_visualizar',
  '/resolucoes': 'resolucoes_visualizar',
  '/decretos': 'decretos_visualizar',
  '/portarias': 'portarias_visualizar',
  '/emendas-impositivas': 'emendas_visualizar',
  '/emendas': 'emendas_visualizar',

  // Documentos
  '/atas-sessoes': 'atas_visualizar',
  '/pautas-sessoes': 'pautas_visualizar',

  // Sessões e Votação
  '/sessoes': 'sessoes_visualizar',
  '/quorum': 'sessoes_presenca',
  '/painel-eletronico': 'painel_votar',
  '/reuniao-comissao': 'sessoes_visualizar',

  // Outros
  '/audiencias': 'audiencias_visualizar',
  '/protocolo': 'documentos_visualizar',
  '/documentos': 'documentos_visualizar',
  '/oficios': 'documentos_visualizar',
  '/transparencia': 'estrutura_visualizar',

  '/normas': 'leis_visualizar',
  '/relatorios': 'relatorios_acessar',
};

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

  // Usa permissoes do usuário; se não definidas, fallback para o padrão do perfil
  const permissoes = user.permissoes || DEFAULT_PERMISSIONS[user.role] || {};
  return !!permissoes[permKey];
}