import GestaoProtocolos from '@/components/protocolo/GestaoProtocolos';
import { useAuth } from '@/lib/AuthContext';
import { temPermissao } from '@/lib/perfis';

// Protocolo (admin da câmara): protocolos enviados pelo login da Prefeitura
// (e registros internos). Visualiza e edita status + observações; quem tiver a
// ação "Protocolar" também pode registrar um novo protocolo interno.
export default function Protocolo() {
  const { user } = useAuth();
  return (
    <GestaoProtocolos
      origens={['Prefeitura', 'Interno']}
      titulo="Protocolo"
      descricao="Documentos recebidos da Prefeitura"
      vazioLabel="protocolo"
      permiteProtocolar={temPermissao(user, 'protocolo_protocolar')}
    />
  );
}
