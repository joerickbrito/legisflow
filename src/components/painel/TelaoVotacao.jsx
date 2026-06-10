import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ─── Cronômetro individual ─── */
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
  const pct = segundos > 0 ? (restante / segundos) * 100 : 0;
  const alerta = restante <= 30 && restante > 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`text-xl font-mono font-bold ${alerta ? 'text-red-400 animate-pulse' : cor}`}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
      <div className="text-[9px] text-white/40 uppercase tracking-wider">{label}</div>
      <div className="w-full h-1 bg-white/10 rounded overflow-hidden">
        <div className={`h-full rounded transition-all duration-1000 ${alerta ? 'bg-red-500' : 'bg-white/30'}`} style={{ width: `${pct}%` }} />
      </div>
      <button
        onClick={() => ativo ? setAtivo(false) : (restante > 0 ? setAtivo(true) : (setRestante(segundos), setAtivo(true)))}
        className="text-[9px] text-white/30 hover:text-white/60 uppercase tracking-wider"
      >
        {ativo ? 'Pausar' : restante === 0 ? 'Reiniciar' : 'Iniciar'}
      </button>
    </div>
  );
}

/* ─── Card do vereador ─── */
function CardVereador({ voto, tipo_votacao }) {
  const status = voto.voto;
  const bg =
    status === 'Sim' ? 'bg-green-500/20 border-green-500/60' :
    status === 'Não' ? 'bg-red-500/20 border-red-500/60' :
    status === 'Abstenção' ? 'bg-yellow-500/20 border-yellow-500/60' :
    'bg-white/5 border-white/10';
  const textCor =
    status === 'Sim' ? 'text-green-300' :
    status === 'Não' ? 'text-red-300' :
    status === 'Abstenção' ? 'text-yellow-300' : 'text-white/30';

  const sigiloso = tipo_votacao === 'Sigilosa';

  return (
    <div className={`border rounded-xl p-2.5 flex flex-col items-center gap-1.5 transition-all duration-500 ${bg}`}>
      {!sigiloso ? (
        <>
          {voto.foto_url ? (
            <img src={voto.foto_url} alt={voto.parlamentar_nome} className="w-10 h-10 rounded-full object-cover border-2 border-white/20" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/50 font-bold text-sm">
              {voto.parlamentar_nome?.[0]}
            </div>
          )}
          <div className="text-white text-[10px] font-semibold text-center leading-tight">
            {voto.parlamentar_nome?.split(' ').slice(0, 2).join(' ')}
          </div>
          {voto.partido_sigla && <div className="text-[9px] text-white/40">{voto.partido_sigla}</div>}
        </>
      ) : (
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-white/20" />
        </div>
      )}
      {status ? (
        <div className={`text-[9px] font-bold uppercase tracking-wider ${textCor}`}>
          {status === 'Sim' ? '✓ FAVORÁVEL' : status === 'Não' ? '✗ CONTRÁRIO' : '— ABSTENÇÃO'}
        </div>
      ) : (
        <div className="text-[9px] text-white/20 uppercase">Aguardando</div>
      )}
    </div>
  );
}

/* ─── Telão principal ─── */
export default function TelaoVotacao({ votacaoAtiva, camara, onRefresh, embedded }) {
  const [v, setV] = useState(votacaoAtiva);
  const [agora, setAgora] = useState(new Date());

  useEffect(() => { setV(votacaoAtiva); }, [votacaoAtiva]);

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!votacaoAtiva?.id) return;
    const unsub = base44.entities.Votacao.subscribe((event) => {
      if (event.id === votacaoAtiva.id) {
        setV(event.data);
        if (event.data?.status !== 'Em Votação') onRefresh?.();
      }
    });
    return () => unsub();
  }, [votacaoAtiva?.id]);

  if (!v) return null;

  const votos = v.votos || [];
  const sim = votos.filter(x => x.voto === 'Sim').length;
  const nao = votos.filter(x => x.voto === 'Não').length;
  const abstencao = votos.filter(x => x.voto === 'Abstenção').length;
  const aguardando = votos.filter(x => !x.voto).length;
  const total = votos.length;

  const encerrada = v.status === 'Encerrada';
  const empate = v.status === 'Aguardando Desempate' || v.resultado === 'Empate';
  const aprovada = v.resultado === 'Aprovada' || v.resultado === 'Aprovada por Unanimidade';
  const unanimidade = v.resultado === 'Aprovada por Unanimidade';

  const sessaoLabel = [
    v.sessao_numero ? `${v.sessao_numero}ª Sessão` : null,
    v.sessao_descricao || null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="bg-gray-950 text-white flex flex-col" style={{ minHeight: embedded ? '75vh' : '100vh', height: embedded ? '75vh' : '100vh' }}>
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

      {/* Empate banner */}
      {empate && !encerrada && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/40 px-6 py-2 text-center">
          <span className="text-yellow-400 font-bold text-sm tracking-wider uppercase">
            ⚖️ Empate detectado — Aguardando voto de desempate do Presidente
          </span>
        </div>
      )}

      {/* 3 colunas */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* ESQUERDA — Parlamentares */}
        <div className="col-span-4 border-r border-white/10 p-4 overflow-y-auto">
          <div className="text-[10px] text-white/40 uppercase tracking-widest mb-3 font-semibold">
            {v.tipo_votacao === 'Sigilosa' ? 'Votantes' : 'Parlamentares'} — {total} presentes
          </div>
          <div className="grid grid-cols-2 gap-2">
            {votos.map((voto) => (
              <CardVereador key={voto.parlamentar_id} voto={voto} tipo_votacao={v.tipo_votacao} />
            ))}
          </div>
        </div>

        {/* CENTRAL — Informações */}
        <div className="col-span-4 border-r border-white/10 p-6 flex flex-col items-center justify-between overflow-y-auto">
          <div className="text-center w-full">
            {sessaoLabel && (
              <div className="text-white/40 text-xs uppercase tracking-widest mb-2">{sessaoLabel}</div>
            )}
            {!encerrada && (
              <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/40 text-green-400 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-widest mb-4">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Em Votação · {v.tipo_votacao}
              </div>
            )}
            <div className="text-white/50 text-xs bg-white/5 rounded px-3 py-1 inline-block mb-3">
              {v.materia_tipo}{v.materia_numero ? ` nº ${v.materia_numero}` : ''}
            </div>
            <div className="text-white font-heading font-bold text-lg leading-snug text-center">
              {v.materia_ementa}
            </div>
          </div>

          {/* Cronômetros — apenas quando não encerrada */}
          {!encerrada && (
            <div className="w-full mt-6">
              <div className="text-[10px] text-white/30 uppercase tracking-widest text-center mb-3">Cronômetros</div>
              <div className="grid grid-cols-2 gap-4">
                <Cronometro segundos={v.timer_discurso || 180} label="Discurso" cor="text-blue-300" />
                <Cronometro segundos={v.timer_aparte || 60} label="Aparte" cor="text-purple-300" />
                <Cronometro segundos={v.timer_questao || 120} label="Questão de Ordem" cor="text-cyan-300" />
                <Cronometro segundos={v.timer_consideracoes || 60} label="Considerações Finais" cor="text-orange-300" />
              </div>
              {/* Progresso */}
              <div className="mt-5">
                <div className="flex justify-between text-xs text-white/30 mb-1.5">
                  <span>{total - aguardando} votaram</span>
                  <span>{aguardando} aguardando</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-1000"
                    style={{ width: total ? `${((total - aguardando) / total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DIREITA — Resultado */}
        <div className="col-span-4 p-6 flex flex-col items-center justify-center gap-5">
          {encerrada ? (
            <div className={`w-full rounded-2xl p-8 text-center border-2 ${
              aprovada ? 'bg-green-500/10 border-green-500/50' :
              empate ? 'bg-yellow-500/10 border-yellow-500/50' :
              'bg-red-500/10 border-red-500/50'
            }`}>
              <div className={`text-4xl font-heading font-black mb-3 leading-tight ${
                aprovada ? 'text-green-400' : empate ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {unanimidade ? 'APROVADO POR UNANIMIDADE' :
                 aprovada ? 'APROVADO' :
                 empate ? 'EMPATE' : 'REPROVADO'}
              </div>
              <div className="text-white/40 text-sm mt-2">{sim} votos a favor · {nao} votos contra · {abstencao} abstenções</div>
            </div>
          ) : (
            <>
              <div className="w-full rounded-2xl bg-green-500/10 border border-green-500/30 p-5 text-center">
                <div className="text-green-400 text-6xl font-heading font-black">{sim}</div>
                <div className="text-green-400/80 font-bold mt-1 flex items-center justify-center gap-2 text-sm">
                  <CheckCircle2 size={15} /> FAVORÁVEIS
                </div>
              </div>
              <div className="w-full rounded-2xl bg-red-500/10 border border-red-500/30 p-5 text-center">
                <div className="text-red-400 text-6xl font-heading font-black">{nao}</div>
                <div className="text-red-400/80 font-bold mt-1 flex items-center justify-center gap-2 text-sm">
                  <XCircle size={15} /> CONTRÁRIOS
                </div>
              </div>
              <div className="w-full rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-4 text-center">
                <div className="text-yellow-400 text-4xl font-heading font-bold">{abstencao}</div>
                <div className="text-yellow-400/80 font-semibold text-sm mt-1 flex items-center justify-center gap-1.5">
                  <MinusCircle size={13} /> ABSTENÇÕES
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}