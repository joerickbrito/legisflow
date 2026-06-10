import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, MinusCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function Cronometro({ segundos, label, cor }) {
  const [restante, setRestante] = useState(segundos);
  const [ativo, setAtivo] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (ativo && restante > 0) {
      ref.current = setInterval(() => setRestante(r => r - 1), 1000);
    } else {
      clearInterval(ref.current);
      if (restante === 0) setAtivo(false);
    }
    return () => clearInterval(ref.current);
  }, [ativo, restante]);

  const mins = Math.floor(restante / 60);
  const secs = restante % 60;
  const pct = (restante / segundos) * 100;

  return (
    <div className="text-center">
      <div className={`text-2xl font-mono font-bold ${restante < 30 ? 'text-red-400 animate-pulse' : cor}`}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
      <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{label}</div>
      <div className="w-full h-1 bg-white/10 rounded mt-1.5 overflow-hidden">
        <div className={`h-full rounded transition-all duration-1000 ${restante < 30 ? 'bg-red-500' : 'bg-white/40'}`}
          style={{ width: `${pct}%` }} />
      </div>
      <button
        onClick={() => ativo ? setAtivo(false) : (restante > 0 ? setAtivo(true) : (setRestante(segundos), setAtivo(true)))}
        className="text-[9px] text-white/30 hover:text-white/60 mt-1 uppercase tracking-wider"
      >
        {ativo ? 'Pausar' : restante === 0 ? 'Reiniciar' : 'Iniciar'}
      </button>
    </div>
  );
}

function CardVereador({ voto, tipo_votacao }) {
  const status = voto.voto;
  const bg = status === 'Sim' ? 'bg-green-500/20 border-green-500/60' :
    status === 'Não' ? 'bg-red-500/20 border-red-500/60' :
    status === 'Abstenção' ? 'bg-yellow-500/20 border-yellow-500/60' :
    'bg-white/5 border-white/10';
  const textColor = status === 'Sim' ? 'text-green-300' : status === 'Não' ? 'text-red-300' : status === 'Abstenção' ? 'text-yellow-300' : 'text-white/30';

  return (
    <div className={`border rounded-xl p-2.5 flex flex-col items-center gap-1.5 transition-all duration-500 ${bg}`}>
      {voto.foto_url ? (
        <img src={voto.foto_url} alt={voto.parlamentar_nome} className="w-10 h-10 rounded-full object-cover border-2 border-white/20" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40 font-bold text-sm">
          {voto.parlamentar_nome?.[0]}
        </div>
      )}
      {tipo_votacao !== 'Sigilosa' ? (
        <>
          <div className="text-white text-[10px] font-semibold text-center leading-tight">{voto.parlamentar_nome?.split(' ').slice(0, 2).join(' ')}</div>
          {voto.partido_sigla && <div className="text-[9px] text-white/40">{voto.partido_sigla}</div>}
        </>
      ) : (
        <div className="text-white/20 text-[10px]">—</div>
      )}
      {status && (
        <div className={`text-[9px] font-bold uppercase tracking-wider ${textColor}`}>
          {status === 'Sim' ? '✓ FAVORÁVEL' : status === 'Não' ? '✗ CONTRÁRIO' : '— ABSTENÇÃO'}
        </div>
      )}
    </div>
  );
}

export default function TelaoVotacao({ votacaoAtiva, camara, parlamentares, onRefresh, embedded }) {
  const [realtimeVotacao, setRealtimeVotacao] = useState(votacaoAtiva);
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    setRealtimeVotacao(votacaoAtiva);
  }, [votacaoAtiva]);

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!votacaoAtiva?.id) return;
    const unsub = base44.entities.Votacao.subscribe((event) => {
      if (event.id === votacaoAtiva.id) {
        setRealtimeVotacao(event.data);
        if (event.data.status !== 'Em Votação') onRefresh?.();
      }
    });
    return () => unsub();
  }, [votacaoAtiva?.id]);

  const v = realtimeVotacao || votacaoAtiva;
  if (!v) return null;

  const votos = v.votos || [];
  const sim = votos.filter(x => x.voto === 'Sim').length;
  const nao = votos.filter(x => x.voto === 'Não').length;
  const abstencao = votos.filter(x => x.voto === 'Abstenção').length;
  const aguardando = votos.filter(x => !x.voto).length;
  const totalPresentes = votos.length;

  const isEncerrada = v.status === 'Encerrada';
  const isAprovada = v.resultado === 'Aprovada';
  const isEmpate = v.resultado === 'Empate';

  return (
    <div className="bg-gray-950 text-white h-full flex flex-col" style={{ minHeight: embedded ? '75vh' : '100vh' }}>
      {/* Topo */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          {camara?.brasao_url && (
            <img src={camara.brasao_url} alt="Brasão" className="h-10 w-10 object-contain" />
          )}
          <div>
            <div className="text-white font-heading font-bold text-sm">{camara?.nome || 'Câmara Municipal'}</div>
            <div className="text-white/40 text-xs">{camara?.municipio}{camara?.estado ? ` — ${camara.estado}` : ''}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-white font-mono text-lg font-bold">{format(agora, 'HH:mm:ss')}</div>
          <div className="text-white/40 text-xs capitalize">{format(agora, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</div>
        </div>
      </div>

      {/* Conteúdo principal — 3 colunas */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* COLUNA ESQUERDA — Parlamentares */}
        <div className="col-span-4 border-r border-white/10 p-4 overflow-y-auto">
          <div className="text-xs text-white/40 uppercase tracking-widest mb-3 font-semibold">Parlamentares — {totalPresentes} presentes</div>
          <div className="grid grid-cols-2 gap-2">
            {votos.map((voto) => (
              <CardVereador key={voto.parlamentar_id} voto={voto} tipo_votacao={v.tipo_votacao} />
            ))}
          </div>
        </div>

        {/* COLUNA CENTRAL — Informações */}
        <div className="col-span-4 border-r border-white/10 p-6 flex flex-col items-center justify-between">
          <div className="text-center">
            {v.sessao_numero && (
              <div className="text-white/40 text-xs uppercase tracking-widest mb-2">
                {v.sessao_numero}ª Sessão
              </div>
            )}
            {!isEncerrada && (
              <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/40 text-green-400 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-widest mb-4">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Em Votação
              </div>
            )}
            <div className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-2">{v.tipo_votacao}</div>
            <div className="text-white/80 text-xs mb-4 bg-white/5 rounded-lg px-3 py-1 inline-block">{v.materia_tipo} {v.materia_numero && `nº ${v.materia_numero}`}</div>
            <div className="text-white font-heading font-bold text-xl leading-snug text-center max-w-xs mx-auto">
              {v.materia_ementa}
            </div>
          </div>

          {/* Cronômetros */}
          {!isEncerrada && (
            <div className="grid grid-cols-2 gap-4 w-full mt-6">
              <Cronometro segundos={v.timer_discurso || 180} label="Discurso" cor="text-blue-300" />
              <Cronometro segundos={v.timer_aparte || 60} label="Aparte" cor="text-purple-300" />
            </div>
          )}

          {/* Progresso */}
          {!isEncerrada && (
            <div className="w-full mt-4">
              <div className="flex justify-between text-xs text-white/40 mb-1.5">
                <span>{totalPresentes - aguardando} votaram</span>
                <span>{aguardando} aguardando</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000"
                  style={{ width: totalPresentes ? `${((totalPresentes - aguardando) / totalPresentes) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA — Resultado */}
        <div className="col-span-4 p-6 flex flex-col items-center justify-center gap-6">
          {isEncerrada ? (
            <div className={`w-full rounded-2xl p-8 text-center border-2 ${
              isAprovada ? 'bg-green-500/10 border-green-500/40' :
              isEmpate ? 'bg-yellow-500/10 border-yellow-500/40' :
              'bg-red-500/10 border-red-500/40'
            }`}>
              <div className={`text-5xl font-heading font-black mb-2 ${
                isAprovada ? 'text-green-400' : isEmpate ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {isAprovada ? (sim === totalPresentes ? 'APROVADO POR UNANIMIDADE' : 'APROVADO') : isEmpate ? 'EMPATE' : 'REPROVADO'}
              </div>
              <div className="text-white/40 text-sm">{sim} votos a favor · {nao} votos contra</div>
            </div>
          ) : (
            <>
              <div className="w-full rounded-2xl bg-green-500/10 border border-green-500/30 p-5 text-center">
                <div className="text-green-400 text-6xl font-heading font-black">{sim}</div>
                <div className="text-green-400/80 font-bold mt-1 flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} /> FAVORÁVEIS
                </div>
              </div>
              <div className="w-full rounded-2xl bg-red-500/10 border border-red-500/30 p-5 text-center">
                <div className="text-red-400 text-6xl font-heading font-black">{nao}</div>
                <div className="text-red-400/80 font-bold mt-1 flex items-center justify-center gap-2">
                  <XCircle size={16} /> CONTRÁRIOS
                </div>
              </div>
              <div className="w-full rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-4 text-center">
                <div className="text-yellow-400 text-4xl font-heading font-bold">{abstencao}</div>
                <div className="text-yellow-400/80 font-semibold text-sm mt-1 flex items-center justify-center gap-1.5">
                  <MinusCircle size={14} /> ABSTENÇÕES
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}