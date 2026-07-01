import { useEffect, useState } from 'react';
import { fmtData } from '@/lib/datas';
import { sislegisEntities } from '@/lib/sislegisApi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, AlertCircle } from 'lucide-react';

export default function TramitacaoTimeline({ materiaId }) {
  const [tramitacoes, setTramitacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!materiaId) return;
    sislegisEntities.Tramitacao.filter({ materia_id: materiaId }, 'created_date', 50).then(data => {
      setTramitacoes(data);
      setLoading(false);
    });
  }, [materiaId]);

  if (loading) return <div className="text-xs text-muted-foreground py-4 text-center">Carregando tramitação...</div>;
  if (tramitacoes.length === 0) return <div className="text-xs text-muted-foreground py-4 text-center">Nenhuma tramitação registrada.</div>;

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
      <div className="space-y-0">
        {tramitacoes.map((t, i) => (
          <div key={t.id} className="relative flex items-start gap-4 pb-6">
            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${t.urgente ? 'bg-red-500 border-red-500' : i === tramitacoes.length - 1 ? 'bg-primary border-primary' : 'bg-background border-border'}`}>
              {t.urgente ? <AlertCircle size={13} className="text-white" /> : (
                <span className="text-[10px] font-bold text-muted-foreground">{i + 1}</span>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-foreground">
                  {t.unidade_tramitacao_origem && <>{t.unidade_tramitacao_origem} <ArrowRight size={10} className="inline" /> </>}
                  {t.unidade_tramitacao_destino}
                </span>
                {t.urgente && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold uppercase">Urgente</span>}
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{t.turno}</span>
              </div>
              {t.texto_acao && <p className="text-xs text-muted-foreground mt-1">{t.texto_acao}</p>}
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {fmtData(t.data)} {t.hora} {t.usuario_nome && `· ${t.usuario_nome}`}
              </p>
            </div>
            <div className="flex-shrink-0 pt-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${t.status === 'Aprovada' ? 'bg-green-100 text-green-700' : t.status === 'Rejeitada' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                {t.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}