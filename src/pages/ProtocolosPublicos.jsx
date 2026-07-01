import GestaoProtocolos from '@/components/protocolo/GestaoProtocolos';
import { useAuth } from '@/lib/AuthContext';
import { temPermissao } from '@/lib/perfis';

// Protocolos Públicos (admin da câmara): protocolos enviados pelos cidadãos
// pelo Portal da Transparência. Visualiza e atualiza tramitação; quem tiver a
// ação "Excluir" pode remover um protocolo público.
export default function ProtocolosPublicos() {
  const { user } = useAuth();
  return (
    <GestaoProtocolos
      origens={['Público']}
      titulo="Protocolos Públicos"
      descricao="Documentos recebidos pelo Portal da Transparência"
      vazioLabel="protocolo público"
      permiteExcluir={temPermissao(user, 'protocolos_publicos_excluir')}
    />
  );
}
