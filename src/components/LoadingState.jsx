import { Loader2 } from 'lucide-react';

// Indicador de carregamento padrão do site. Use enquanto os dados da tela
// estão sendo buscados, no lugar do estado vazio (evita o "pisca vazio").
export default function LoadingState({ label = 'Carregando...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <Loader2 className="w-7 h-7 text-primary animate-spin mb-3" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
