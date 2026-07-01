import NormaSimples from './NormaSimples.jsx';
import { Stamp } from 'lucide-react';

export default function Decretos() {
  return (
    <NormaSimples
      tipo="Decreto Legislativo"
      icon={Stamp}
      title="Decretos Legislativos"
      subtitle="Gestão de decretos legislativos"
      addLabel="Novo Decreto"
      permKey="decretos"
    />
  );
}