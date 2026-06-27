// Página do Telão — abre numa janela separada (popup) para ser projetada na TV /
// segundo monitor. Mostra SÓ o telão de votação (sem barra lateral nem nada do admin).
// Carrega a votação ativa da câmara e atualiza ao vivo via subscribe.

import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { sislegisEntities } from '@/lib/sislegisApi';
import TelaoVotacao from '@/components/painel/TelaoVotacao';
import { painelEscuro, useTema } from '@/lib/theme';
import { Monitor } from 'lucide-react';

export default function TelaoPage() {
  const { tenantId, withTenant, canQuery, camara } = useTenant();
  const tema = useTema();
  const [votacaoAtiva, setVotacaoAtiva] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadVotacaoAtiva() {
    const filter = withTenant({});
    if (!filter) { setLoading(false); return; }
    try {
      const ativas = await sislegisEntities.Votacao.filter({ ...filter, status: 'Em Votação' }, '-created_date', 1);
      if (ativas.length) { setVotacaoAtiva(ativas[0]); setLoading(false); return; }
      const desempate = await sislegisEntities.Votacao.filter({ ...filter, status: 'Aguardando Desempate' }, '-created_date', 1);
      setVotacaoAtiva(desempate[0] || null);
    } catch (e) {
      // mantém o estado anterior em caso de erro de rede momentâneo
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (canQuery) loadVotacaoAtiva(); }, [tenantId, canQuery]);

  // Atualização ao vivo — só reage a votações da própria câmara
  useEffect(() => {
    const unsub = base44.entities.Votacao.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create') {
        if (event.data?.tenant_id && tenantId && event.data.tenant_id !== tenantId) return;
        loadVotacaoAtiva();
      }
    });
    return () => unsub();
  }, [tenantId]);

  if (loading) {
    return (
      <div className={painelEscuro(tema) ? 'dark' : ''}>
        <div className="h-screen w-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Sem votação ativa — tela de espera (já vale como "fundo" pra projetar na TV)
  if (!votacaoAtiva) {
    return (
      <div className={painelEscuro(tema) ? 'dark' : ''}>
        <div className="h-screen w-screen flex flex-col items-center justify-center text-center p-8 bg-background text-foreground">
          {camara?.brasao_url && (
            <img src={camara.brasao_url} alt="Brasão" className="w-24 h-24 object-contain mb-6 opacity-90" />
          )}
          <h2 className="font-heading font-bold text-2xl mb-3 text-foreground">{camara?.nome || 'Câmara Municipal'}</h2>
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-3">
            <Monitor size={30} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Aguardando o início de uma votação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen overflow-hidden ${painelEscuro(tema) ? 'dark' : ''}`}>
      <TelaoVotacao
        votacaoAtiva={votacaoAtiva}
        camara={camara}
        onRefresh={loadVotacaoAtiva}
      />
    </div>
  );
}
