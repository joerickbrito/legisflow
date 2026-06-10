import NormaSimples from './NormaSimples.jsx';
import { ScrollText } from 'lucide-react';

export default function Resolucoes() {
  return (
    <NormaSimples
      tipo="Resolução"
      icon={ScrollText}
      title="Resoluções"
      subtitle="Gestão de resoluções da câmara"
      addLabel="Nova Resolução"
    />
  );
}