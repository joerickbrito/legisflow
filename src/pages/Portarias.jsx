import NormaSimples from './NormaSimples.jsx';
import { BookMarked } from 'lucide-react';

export default function Portarias() {
  return (
    <NormaSimples
      tipo="Portaria"
      icon={BookMarked}
      title="Portarias"
      subtitle="Gestão de portarias da câmara"
      addLabel="Nova Portaria"
    />
  );
}