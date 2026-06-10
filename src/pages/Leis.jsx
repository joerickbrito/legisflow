import NormaSimples from './NormaSimples.jsx';
import { Landmark } from 'lucide-react';

export default function Leis() {
  return (
    <NormaSimples
      tipo="Lei Ordinária"
      icon={Landmark}
      title="Leis"
      subtitle="Gestão de leis ordinárias e complementares"
      addLabel="Nova Lei"
    />
  );
}