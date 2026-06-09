import { useState } from 'react';
import { useTenant } from '@/lib/TenantContext';
import PageHeader from '@/components/PageHeader';
import { SlidersHorizontal, ChevronDown, ChevronRight } from 'lucide-react';
import TabelaAuxiliarEditor from '@/components/configuracoes/TabelaAuxiliarEditor';
import { cn } from '@/lib/utils';

// Definição centralizada de todas as tabelas auxiliares agrupadas por módulo
const GRUPOS = [
  {
    label: 'Proposições',
    tabelas: [
      {
        key: 'TipoProposicao',
        label: 'Tipos de Proposição',
        desc: 'Tipos de proposta que podem ser protocoladas pelos autores.',
        campos: ['nome', 'sigla', 'descricao'],
        padroes: ['Projeto de Lei', 'Projeto de Lei Complementar', 'Projeto de Resolução', 'Projeto de Decreto Legislativo', 'Requerimento', 'Indicação', 'Moção', 'Emenda', 'Substitutivo'],
      },
      {
        key: 'TipoAutor',
        label: 'Tipos de Autor',
        desc: 'Categorias de autores que podem apresentar proposições.',
        campos: ['nome', 'descricao'],
        padroes: ['Parlamentar', 'Comissão', 'Mesa Diretora', 'Presidente', 'Prefeito', 'Executivo Municipal', 'Tribunal de Contas', 'Ministério Público', 'Cidadão', 'Entidade', 'Outro'],
      },
    ]
  },
  {
    label: 'Matéria Legislativa',
    tabelas: [
      {
        key: 'TipoMateria',
        label: 'Tipos de Matéria',
        desc: 'Classificação das matérias legislativas tramitantes.',
        campos: ['nome', 'sigla', 'descricao'],
        padroes: [
          { nome: 'Projeto de Lei', sigla: 'PL' },
          { nome: 'Projeto de Lei Complementar', sigla: 'PLC' },
          { nome: 'Projeto de Resolução', sigla: 'PR' },
          { nome: 'Projeto de Decreto Legislativo', sigla: 'PDL' },
          { nome: 'Indicação', sigla: 'IND' },
          { nome: 'Requerimento', sigla: 'REQ' },
          { nome: 'Moção', sigla: 'MOC' },
          { nome: 'Emenda à Lei Orgânica', sigla: 'ELO' },
        ],
      },
      {
        key: 'OrigemMateria',
        label: 'Origens de Matéria',
        desc: 'Origem das matérias submetidas à câmara.',
        campos: ['nome', 'descricao'],
        padroes: ['Legislativo', 'Executivo', 'Comissão', 'Mesa Diretora', 'Popular', 'Judiciário'],
      },
      {
        key: 'RegimeTramitacao',
        label: 'Regimes de Tramitação',
        desc: 'Define a urgência e prioridade no processo de tramitação.',
        campos: ['nome', 'descricao'],
        padroes: ['Ordinário', 'Urgente', 'Urgentíssimo'],
      },
      {
        key: 'TipoDocumento',
        label: 'Tipos de Documento',
        desc: 'Tipos de documentos que podem ser anexados às matérias.',
        campos: ['nome', 'sigla', 'descricao'],
        padroes: ['Parecer', 'Ata', 'Ofício', 'Relatório', 'Memorando', 'Contrato'],
      },
    ]
  },
  {
    label: 'Tramitação',
    tabelas: [
      {
        key: 'StatusTramitacao',
        label: 'Status de Tramitação',
        desc: 'Estados possíveis durante o processo de tramitação de matérias.',
        campos: ['nome', 'cor', 'descricao'],
        padroes: [
          { nome: 'Protocolada', cor: '#6b7280' },
          { nome: 'Recebida', cor: '#3b82f6' },
          { nome: 'Em análise', cor: '#f59e0b' },
          { nome: 'Em comissão', cor: '#8b5cf6' },
          { nome: 'Com parecer', cor: '#06b6d4' },
          { nome: 'Em pauta', cor: '#f97316' },
          { nome: 'Em votação', cor: '#ef4444' },
          { nome: 'Aprovada', cor: '#22c55e' },
          { nome: 'Rejeitada', cor: '#dc2626' },
          { nome: 'Arquivada', cor: '#9ca3af' },
          { nome: 'Sancionada', cor: '#16a34a' },
          { nome: 'Promulgada', cor: '#15803d' },
        ],
      },
      {
        key: 'UnidadeTramitacao',
        label: 'Unidades de Tramitação',
        desc: 'Setores/unidades pelos quais os processos podem tramitar.',
        campos: ['nome', 'sigla', 'descricao'],
        padroes: [
          { nome: 'Secretaria Legislativa', sigla: 'SECLEG' },
          { nome: 'Presidência', sigla: 'PRES' },
          { nome: 'Procuradoria', sigla: 'PROC' },
          { nome: 'Comissão de Constituição e Justiça', sigla: 'CCJ' },
          { nome: 'Comissão de Finanças', sigla: 'CFI' },
          { nome: 'Plenário', sigla: 'PLEN' },
        ],
      },
      {
        key: 'Orgao',
        label: 'Órgãos',
        desc: 'Órgãos internos e externos vinculados à câmara.',
        campos: ['nome', 'sigla', 'descricao'],
        padroes: [
          { nome: 'Mesa Diretora', sigla: 'MESA' },
          { nome: 'Comissão de Constituição e Justiça', sigla: 'CCJ' },
          { nome: 'Comissão de Finanças e Orçamento', sigla: 'CFO' },
          { nome: 'Comissão de Saúde e Educação', sigla: 'CSE' },
        ],
      },
    ]
  },
  {
    label: 'Parlamentares',
    tabelas: [
      {
        key: 'TipoAfastamento',
        label: 'Tipos de Afastamento',
        desc: 'Motivos pelos quais um parlamentar pode se afastar do mandato.',
        campos: ['nome', 'descricao'],
        padroes: ['Licença Saúde', 'Licença Particular', 'Licença Maternidade', 'Afastamento Judicial', 'Cargo no Executivo', 'Renúncia', 'Outros'],
      },
    ]
  },
  {
    label: 'Comissões',
    tabelas: [
      {
        key: 'TipoComissao',
        label: 'Tipos de Comissão',
        desc: 'Categorias de comissões parlamentares.',
        campos: ['nome', 'sigla', 'descricao'],
        padroes: [
          { nome: 'Permanente', sigla: 'PERM' },
          { nome: 'Temporária', sigla: 'TEMP' },
          { nome: 'Especial', sigla: 'ESP' },
          { nome: 'CPI', sigla: 'CPI' },
          { nome: 'Processante', sigla: 'PROC' },
        ],
      },
      {
        key: 'CargoComissao',
        label: 'Cargos em Comissão',
        desc: 'Cargos que os parlamentares podem exercer dentro de comissões.',
        campos: ['nome', 'descricao'],
        padroes: ['Presidente', 'Vice-Presidente', 'Relator', 'Membro', 'Suplente'],
      },
    ]
  },
  {
    label: 'Mesa Diretora',
    tabelas: [
      {
        key: 'CargoMesa',
        label: 'Cargos da Mesa Diretora',
        desc: 'Cargos que compõem a Mesa Diretora da câmara.',
        campos: ['nome', 'descricao'],
        padroes: ['Presidente', 'Vice-Presidente', '1º Secretário', '2º Secretário', '1º Suplente de Secretário', '2º Suplente de Secretário'],
      },
    ]
  },
  {
    label: 'Sessões Plenárias',
    tabelas: [
      {
        key: 'TipoSessao',
        label: 'Tipos de Sessão',
        desc: 'Classificação das sessões plenárias.',
        campos: ['nome', 'descricao'],
        padroes: ['Ordinária', 'Extraordinária', 'Solene', 'Especial', 'Itinerante'],
      },
      {
        key: 'TipoExpediente',
        label: 'Tipos de Expediente',
        desc: 'Fases do expediente durante sessões plenárias.',
        campos: ['nome', 'descricao'],
        padroes: ['Pequeno Expediente', 'Grande Expediente', 'Ordem do Dia', 'Explicação Pessoal'],
      },
      {
        key: 'TipoResultadoVotacao',
        label: 'Resultados de Votação',
        desc: 'Possíveis resultados de uma votação plenária.',
        campos: ['nome', 'descricao'],
        padroes: ['Aprovado', 'Rejeitado', 'Retirado de Pauta', 'Prejudicado', 'Adiado'],
      },
    ]
  },
  {
    label: 'Normas Jurídicas',
    tabelas: [
      {
        key: 'TipoNorma',
        label: 'Tipos de Norma',
        desc: 'Classificação das normas jurídicas publicadas.',
        campos: ['nome', 'sigla', 'descricao'],
        padroes: [
          { nome: 'Lei Ordinária', sigla: 'LO' },
          { nome: 'Lei Complementar', sigla: 'LC' },
          { nome: 'Decreto Legislativo', sigla: 'DL' },
          { nome: 'Resolução', sigla: 'RES' },
          { nome: 'Emenda à Lei Orgânica', sigla: 'ELO' },
          { nome: 'Portaria', sigla: 'PORT' },
        ],
      },
      {
        key: 'TipoVinculoNorma',
        label: 'Tipos de Vínculo entre Normas',
        desc: 'Como uma norma pode se relacionar com outra.',
        campos: ['nome', 'descricao'],
        padroes: ['Revoga', 'Altera', 'Regulamenta', 'Complementa', 'Suspende'],
      },
    ]
  },
  {
    label: 'Documentos Administrativos',
    tabelas: [
      {
        key: 'TipoDocumentoAdministrativo',
        label: 'Tipos de Documento Administrativo',
        desc: 'Classificação dos documentos administrativos internos.',
        campos: ['nome', 'sigla', 'descricao'],
        padroes: [
          { nome: 'Ofício', sigla: 'OF' },
          { nome: 'Memorando', sigla: 'MEM' },
          { nome: 'Contrato', sigla: 'CONT' },
          { nome: 'Edital', sigla: 'EDT' },
          { nome: 'Convite', sigla: 'CONV' },
          { nome: 'Portaria', sigla: 'PORT' },
          { nome: 'Balancete', sigla: 'BAL' },
          { nome: 'Relatório', sigla: 'REL' },
        ],
      },
    ]
  },
];

export default function Configuracoes() {
  const { isAdminCamara } = useTenant();
  const [grupoAberto, setGrupoAberto] = useState(0);
  const [tabelaAtiva, setTabelaAtiva] = useState(GRUPOS[0].tabelas[0]);

  if (!isAdminCamara) {
    return (
      <div className="p-12 text-center">
        <SlidersHorizontal size={40} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground font-medium">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 h-full">
      <PageHeader
        icon={SlidersHorizontal}
        title="Tabelas Auxiliares"
        subtitle="Configure os parâmetros do sistema sem necessidade de alterações no código."
      />

      <div className="flex gap-6 mt-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Sidebar de navegação */}
        <aside className="w-64 flex-shrink-0 space-y-1">
          {GRUPOS.map((grupo, gi) => (
            <div key={gi}>
              <button
                onClick={() => setGrupoAberto(grupoAberto === gi ? -1 : gi)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <span>{grupo.label}</span>
                {grupoAberto === gi ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {grupoAberto === gi && grupo.tabelas.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTabelaAtiva(t)}
                  className={cn(
                    'w-full text-left px-4 py-1.5 rounded-lg text-sm transition-colors ml-2',
                    tabelaAtiva?.key === t.key
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Área de edição */}
        <div className="flex-1 min-w-0">
          {tabelaAtiva ? (
            <TabelaAuxiliarEditor key={tabelaAtiva.key} tabela={tabelaAtiva} />
          ) : (
            <div className="text-center text-muted-foreground p-12">
              Selecione uma tabela no menu ao lado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}