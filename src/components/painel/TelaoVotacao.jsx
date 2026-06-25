import { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { sincronizarCronometro } from "@/lib/sislegisApi";
import { CheckCircle2, XCircle, MinusCircle, Lock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ─── Cronômetro individual ───────────────────────────────────────────────
   Sincronizado entre TODAS as janelas/telas pelo registro da votação:
   o clique grava o comando (via backend) e o tempo real (subscribe) o
   propaga. Funciona mesmo em outro monitor/computador.                      */
function Cronometro({ id, segundos, label, cor, cmd, onCmd }) {
  const [restante, setRestante] = useState(segundos);
  const [ativo, setAtivo] = useState(false);
  const tickRef = useRef(null);
  const endRef = useRef(null); // timestamp em que o cronômetro deve zerar
  const lastTsRef = useRef(0); // último comando aplicado (evita reaplicar)

  // Contagem regressiva baseada em timestamp — mantém todas as janelas no mesmo tempo
  useEffect(() => {
    if (ativo) {
      tickRef.current = setInterval(() => {
        const rem = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
        setRestante(rem);
        if (rem <= 0) setAtivo(false);
      }, 250);
    }
    return () => clearInterval(tickRef.current);
  }, [ativo]);

  // Aplica um comando (de clique local OU vindo de outra janela/tela)
  function aplicar(c) {
    if (c.action === 'start') {
      endRef.current = c.endsAt;
      setRestante(Math.max(0, Math.round((c.endsAt - Date.now()) / 1000)));
      setAtivo(true);
    } else if (c.action === 'pause' || c.action === 'reset') {
      setAtivo(false);
      setRestante(c.remaining ?? segundos);
    }
  }

  // Comando vindo de outra janela/tela (propagado pelo registro da votação)
  useEffect(() => {
    if (cmd && cmd.id === id && cmd.ts && cmd.ts > lastTsRef.current) {
      lastTsRef.current = cmd.ts;
      aplicar(cmd);
    }
  }, [cmd, id]);

  // Clique local → aplica aqui e grava o comando para espelhar nas outras telas
  function onClickBtn() {
    let c;
    if (ativo) c = { id, action: 'pause', remaining: restante };
    else if (restante > 0) c = { id, action: 'start', endsAt: Date.now() + restante * 1000 };
    else c = { id, action: 'start', endsAt: Date.now() + segundos * 1000 };
    c.ts = Date.now();
    lastTsRef.current = c.ts;
    aplicar(c);
    onCmd?.(c);
  }

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
        onClick={onClickBtn}
        className="text-[9px] text-white/30 hover:text-white/60 uppercase tracking-wider"
      >
        {ativo ? 'Pausar' : restante === 0 ? 'Reiniciar' : 'Iniciar'}
      </button>
    </div>
  );
}

/* ─── Paleta semântica do voto ─── */
function votoEstilo(status) {
  if (status === 'Sim') return { bg: 'bg-green-500/15', border: 'border-green-500/50', ring: 'ring-green-400/70', text: 'text-green-300', label: '✓ Favorável' };
  if (status === 'Não') return { bg: 'bg-red-500/15', border: 'border-red-500/50', ring: 'ring-red-400/70', text: 'text-red-300', label: '✗ Contrário' };
  if (status === 'Abstenção') return { bg: 'bg-yellow-500/15', border: 'border-yellow-500/50', ring: 'ring-yellow-400/70', text: 'text-yellow-300', label: '— Abstenção' };
  return { bg: 'bg-white/[0.03]', border: 'border-white/10', ring: 'ring-white/15', text: 'text-white/30', label: 'Aguardando' };
}

/* ─── Card do vereador (somente voto nominal) ─── */
function CardVereador({ voto }) {
  const votou = !!voto.voto;
  const e = votoEstilo(voto.voto);

  return (
    <div className={`border rounded-xl p-3 flex flex-col items-center gap-2 transition-all duration-500 ${e.bg} ${e.border} ${votou ? '' : 'opacity-60'}`}>
      {voto.foto_url ? (
        <img src={voto.foto_url} alt={voto.parlamentar_nome} className={`w-12 h-12 rounded-full object-cover ring-2 ${e.ring} ${votou ? '' : 'grayscale'} transition-all duration-500`} />
      ) : (
        <div className={`w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold ring-2 ${e.ring}`}>
          {voto.parlamentar_nome?.[0]}
        </div>
      )}
      <div className="text-white text-[11px] font-semibold text-center leading-tight">
        {voto.parlamentar_nome?.split(' ').slice(0, 2).join(' ')}
      </div>
      {voto.partido_sigla && <div className="text-[9px] text-white/40 -mt-1">{voto.partido_sigla}</div>}
      <div className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${votou ? `border ${e.border} ${e.text}` : 'text-white/25'}`}>
        {e.label}
      </div>
    </div>
  );
}

/* ─── Telão principal ─── */
export default function TelaoVotacao({ votacaoAtiva, camara, onRefresh, embedded }) {
  const [v, setV] = useState(votacaoAtiva);
  const [agora, setAgora] = useState(new Date());

  useEffect(() => { setV(votacaoAtiva); }, [votacaoAtiva]);

  // Comando de cronômetro atual (gravado na votação e propagado em tempo real).
  const cronometroCmd = useMemo(() => {
    if (!v?.cronometro_cmd) return null;
    try {
      return typeof v.cronometro_cmd === 'string' ? JSON.parse(v.cronometro_cmd) : v.cronometro_cmd;
    } catch {
      return null;
    }
  }, [v?.cronometro_cmd]);

  // Grava o comando do cronômetro para espelhar em todas as telas.
  function enviarCronometro(cmd) {
    if (v?.id) sincronizarCronometro(v.id, cmd);
  }

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
  const votaram = total - aguardando;
  const pctVotaram = total ? Math.round((votaram / total) * 100) : 0;

  const sigiloso = v.tipo_votacao === 'Sigilosa';
  const encerrada = v.status === 'Encerrada';
  const empate = v.status === 'Aguardando Desempate' || v.resultado === 'Empate';
  const aprovada = v.resultado === 'Aprovada' || v.resultado === 'Aprovada por Unanimidade';
  const unanimidade = v.resultado === 'Aprovada por Unanimidade';

  const sessaoLabel = [
    v.sessao_numero ? `${v.sessao_numero}ª Sessão` : null,
    v.sessao_descricao || null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="bg-gradient-to-b from-slate-950 to-slate-900 text-white flex flex-col" style={{ minHeight: embedded ? '100%' : '100vh', height: embedded ? '100%' : '100vh' }}>
      {/* Topo */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          {camara?.brasao_url && (
            <img src={camara.brasao_url} alt="Brasão" className="h-11 w-11 object-contain" />
          )}
          <div>
            <div className="text-white font-heading font-bold text-base leading-tight">{camara?.nome || 'Câmara Municipal'}</div>
            <div className="text-white/40 text-xs">{camara?.municipio}{camara?.estado ? ` — ${camara.estado}` : ''}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-white font-mono text-xl font-bold tabular-num">{format(agora, 'HH:mm:ss')}</div>
          <div className="text-white/40 text-xs capitalize">{format(agora, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</div>
        </div>
      </div>

      {/* Empate banner */}
      {empate && !encerrada && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/40 px-6 py-2 text-center flex-shrink-0">
          <span className="text-yellow-400 font-bold text-sm tracking-wider uppercase">
            ⚖️ Empate detectado — Aguardando voto de desempate do Presidente
          </span>
        </div>
      )}

      {/* 3 colunas */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* ESQUERDA — Parlamentares (nominal) ou agregado (sigiloso) */}
        <div className="col-span-4 border-r border-white/10 p-4 overflow-y-auto scrollbar-sidebar">
          {sigiloso ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 ring-1 ring-inset ring-white/10 flex items-center justify-center mb-5">
                <Lock size={28} className="text-white/40" />
              </div>
              <div className="text-white/50 text-[11px] uppercase tracking-[0.22em] mb-3">Votação Secreta</div>
              <div className="text-white font-heading font-black tabular-num leading-none text-6xl">
                {votaram}<span className="text-white/25 text-3xl">/{total}</span>
              </div>
              <div className="text-white/40 text-sm mt-3">parlamentares já votaram</div>
              <div className="w-full max-w-[260px] h-2 bg-white/10 rounded-full overflow-hidden mt-5">
                <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${pctVotaram}%` }} />
              </div>
              <p className="text-white/25 text-[11px] mt-5 max-w-[260px] leading-relaxed">
                Os votos individuais não são exibidos para preservar o sigilo da votação.
              </p>
            </div>
          ) : (
            <>
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-3 font-semibold">
                Parlamentares — {total} presentes
              </div>
              <div className="grid grid-cols-2 gap-2">
                {votos.map((voto) => (
                  <CardVereador key={voto.parlamentar_id} voto={voto} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* CENTRAL — Matéria + progresso + cronômetros */}
        <div className="col-span-4 border-r border-white/10 px-6 py-6 flex flex-col overflow-y-auto scrollbar-sidebar">
          <div className="text-center">
            {sessaoLabel && (
              <div className="text-white/40 text-[11px] uppercase tracking-[0.2em] mb-3">{sessaoLabel}</div>
            )}
            {!encerrada && (
              <div className="inline-flex items-center gap-2 bg-green-500/15 border border-green-500/40 text-green-400 text-[11px] px-3 py-1.5 rounded-full font-bold uppercase tracking-widest mb-4">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Em Votação · {v.tipo_votacao}
              </div>
            )}
            <div className="text-white/50 text-xs bg-white/5 ring-1 ring-inset ring-white/10 rounded-full px-3 py-1 inline-block mb-4">
              {v.materia_tipo}{v.materia_numero ? ` nº ${v.materia_numero}` : ''}
            </div>
            <div className="text-white font-heading font-bold text-2xl xl:text-3xl leading-snug">
              {v.materia_ementa}
            </div>
          </div>

          {/* Progresso + cronômetros (empurrados para a base, preenchendo o espaço) */}
          {!encerrada && (
            <div className="mt-auto pt-8">
              {/* Progresso geral */}
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="text-white font-heading font-bold tabular-num leading-none text-3xl">
                    {votaram}<span className="text-white/30 text-xl">/{total}</span>
                  </div>
                  <div className="text-white/40 text-[11px] uppercase tracking-wider mt-1">parlamentares votaram</div>
                </div>
                <div className="text-white/50 text-lg font-semibold tabular-num">{pctVotaram}%</div>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${pctVotaram}%` }} />
              </div>

              {/* Cronômetros */}
              <div className="mt-7">
                <div className="text-[10px] text-white/30 uppercase tracking-widest text-center mb-3">Cronômetros</div>
                <div className="grid grid-cols-2 gap-4">
                  <Cronometro id={`${v.id}_discurso`} cmd={cronometroCmd} onCmd={enviarCronometro} segundos={v.timer_discurso || 180} label="Discurso" cor="text-blue-300" />
                  <Cronometro id={`${v.id}_aparte`} cmd={cronometroCmd} onCmd={enviarCronometro} segundos={v.timer_aparte || 60} label="Aparte" cor="text-purple-300" />
                  <Cronometro id={`${v.id}_questao`} cmd={cronometroCmd} onCmd={enviarCronometro} segundos={v.timer_questao || 120} label="Questão de Ordem" cor="text-cyan-300" />
                  <Cronometro id={`${v.id}_consideracoes`} cmd={cronometroCmd} onCmd={enviarCronometro} segundos={v.timer_consideracoes || 60} label="Considerações Finais" cor="text-orange-300" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DIREITA — Placar */}
        <div className="col-span-4 p-6 flex flex-col justify-center gap-4">
          {encerrada ? (
            <div className={`w-full rounded-3xl p-8 text-center border-2 ${
              aprovada ? 'bg-green-500/10 border-green-500/50' :
              empate ? 'bg-yellow-500/10 border-yellow-500/50' :
              'bg-red-500/10 border-red-500/50'
            }`}>
              <div className="text-white/40 text-[11px] uppercase tracking-[0.2em] mb-3">Resultado</div>
              <div className={`font-heading font-black leading-tight text-4xl xl:text-5xl ${
                aprovada ? 'text-green-400' : empate ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {unanimidade ? 'APROVADO POR UNANIMIDADE' :
                 aprovada ? 'APROVADO' :
                 empate ? 'EMPATE' : 'REPROVADO'}
              </div>
              <div className="text-white/50 text-sm mt-4 tabular-num">
                {sim} a favor · {nao} contra · {abstencao} abstenções
              </div>
            </div>
          ) : (
            <>
              {/* Favoráveis */}
              <div className={`w-full rounded-2xl bg-green-500/10 border p-5 flex items-center gap-5 transition-all ${sim > nao && (sim + nao) > 0 ? 'border-green-500/60 ring-1 ring-green-500/30' : 'border-green-500/25'}`}>
                <div className="text-green-400 font-heading font-black tabular-num leading-none text-6xl xl:text-7xl min-w-[1.6ch] text-center">{sim}</div>
                <div className="flex items-center gap-2 text-green-400/90 font-bold uppercase tracking-wide text-lg">
                  <CheckCircle2 size={20} /> Favoráveis
                </div>
              </div>
              {/* Contrários */}
              <div className={`w-full rounded-2xl bg-red-500/10 border p-5 flex items-center gap-5 transition-all ${nao > sim && (sim + nao) > 0 ? 'border-red-500/60 ring-1 ring-red-500/30' : 'border-red-500/25'}`}>
                <div className="text-red-400 font-heading font-black tabular-num leading-none text-6xl xl:text-7xl min-w-[1.6ch] text-center">{nao}</div>
                <div className="flex items-center gap-2 text-red-400/90 font-bold uppercase tracking-wide text-lg">
                  <XCircle size={20} /> Contrários
                </div>
              </div>
              {/* Abstenções */}
              <div className="w-full rounded-2xl bg-yellow-500/10 border border-yellow-500/25 p-4 flex items-center gap-5">
                <div className="text-yellow-400 font-heading font-bold tabular-num leading-none text-4xl xl:text-5xl min-w-[1.6ch] text-center">{abstencao}</div>
                <div className="flex items-center gap-2 text-yellow-400/90 font-semibold uppercase tracking-wide">
                  <MinusCircle size={16} /> Abstenções
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
