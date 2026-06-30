import GestaoProtocolos from '@/components/protocolo/GestaoProtocolos';

// Protocolos Públicos (admin da câmara): protocolos enviados pelos cidadãos
// pelo Portal da Transparência. O admin apenas visualiza e edita status + observações.
export default function ProtocolosPublicos() {
  return (
    <GestaoProtocolos
      origens={['Público']}
      titulo="Protocolos Públicos"
      descricao="Documentos recebidos pelo Portal da Transparência"
      vazioLabel="protocolo público"
    />
  );
}
