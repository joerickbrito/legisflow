import GestaoProtocolos from '@/components/protocolo/GestaoProtocolos';

// Protocolo (admin da câmara): protocolos enviados pelo login da Prefeitura
// (e registros internos). O admin apenas visualiza e edita status + observações.
export default function Protocolo() {
  return (
    <GestaoProtocolos
      origens={['Prefeitura', 'Interno']}
      titulo="Protocolo"
      descricao="Documentos recebidos da Prefeitura"
      vazioLabel="protocolo"
    />
  );
}
