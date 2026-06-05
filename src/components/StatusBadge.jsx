const colorMap = {
  'Em tramitação': 'bg-blue-100 text-blue-700',
  'Aguardando Votação': 'bg-yellow-100 text-yellow-700',
  'Aprovada': 'bg-green-100 text-green-700',
  'Rejeitada': 'bg-red-100 text-red-700',
  'Arquivada': 'bg-gray-100 text-gray-600',
  'Retirada': 'bg-orange-100 text-orange-700',
  'Transformada em Norma': 'bg-purple-100 text-purple-700',
  'Agendada': 'bg-yellow-100 text-yellow-700',
  'Aberta': 'bg-green-100 text-green-700',
  'Em Andamento': 'bg-green-100 text-green-700',
  'Em Expediente': 'bg-blue-100 text-blue-700',
  'Em Ordem do Dia': 'bg-purple-100 text-purple-700',
  'Encerrada': 'bg-gray-100 text-gray-600',
  'Cancelada': 'bg-red-100 text-red-600',
  'Suspensa': 'bg-yellow-100 text-yellow-700',
  'Vigente': 'bg-green-100 text-green-700',
  'Revogada': 'bg-red-100 text-red-700',
  'Ativa': 'bg-green-100 text-green-700',
  'Inativa': 'bg-gray-100 text-gray-600',
  'Recebido': 'bg-blue-100 text-blue-700',
  'Em Análise': 'bg-yellow-100 text-yellow-700',
  'Respondido': 'bg-green-100 text-green-700',
  'Rascunho': 'bg-gray-100 text-gray-600',
  'Favorável': 'bg-green-100 text-green-700',
  'Contrário': 'bg-red-100 text-red-700',
  'Urgência': 'bg-orange-100 text-orange-700',
  'Urgência Urgentíssima': 'bg-red-100 text-red-700',
  'Normal': 'bg-gray-100 text-gray-600',
};

export default function StatusBadge({ status, className = '' }) {
  const color = colorMap[status] || 'bg-muted text-muted-foreground';
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${color} ${className}`}>
      {status}
    </span>
  );
}