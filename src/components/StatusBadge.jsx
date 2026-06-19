// Semantic status palette: tone-on-tone with subtle dot for visual rhythm.
// Tones: blue (em andamento/info), green (positivo/vigente), amber (pendente),
// red (negativo), violet (transformado), slate (neutro/arquivado), orange (alerta brando).
const tones = {
  blue:   'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100',
  green:  'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100',
  amber:  'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100',
  red:    'bg-red-50 text-red-700 ring-1 ring-inset ring-red-100',
  violet: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-100',
  slate:  'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
  orange: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-100',
};

const statusTone = {
  'Em tramitação': 'blue',
  'Aguardando Votação': 'amber',
  'Aprovada': 'green',
  'Rejeitada': 'red',
  'Arquivada': 'slate',
  'Retirada': 'orange',
  'Transformada em Norma': 'violet',
  'Agendada': 'amber',
  'Aberta': 'green',
  'Em Andamento': 'green',
  'Em Expediente': 'blue',
  'Em Ordem do Dia': 'violet',
  'Encerrada': 'slate',
  'Cancelada': 'red',
  'Suspensa': 'amber',
  'Vigente': 'green',
  'Revogada': 'red',
  'Ativa': 'green',
  'Inativa': 'slate',
  'Recebido': 'blue',
  'Em Análise': 'amber',
  'Respondido': 'green',
  'Rascunho': 'slate',
  'Favorável': 'green',
  'Contrário': 'red',
  'Urgência': 'orange',
  'Urgência Urgentíssima': 'red',
  'Normal': 'slate',
};

export default function StatusBadge({ status, className = '' }) {
  const tone = tones[statusTone[status]] || tones.slate;
  return (
    <span className={`pill pill-dot ${tone} ${className}`}>
      {status}
    </span>
  );
}
