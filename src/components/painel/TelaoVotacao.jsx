import { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { sincronizarCronometro } from "@/lib/sislegisApi";
import { CheckCircle2, XCircle, MinusCircle, Lock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ───────────────────────────────────────────────────────────────────────────
   TelaoVotacao — REDESIGN VISUAL (Command Center Tactical)
   • Lógica, props, sincronização e nomes de campos PRESERVADOS.
   • Paleta: slate-950 + emerald/red/amber + Geist Mono para numerais.
   • Layout 12-col: ESQUERDA (col-span-7) grid de parlamentares.
                    DIREITA  (col-span-5) matéria + placar + cronômetros.
   • Footer: barra de progresso "X/N parlamentares votaram".
─────────────────────────────────────────────────────────────────────────── */

/* ─── Cronômetro individual (sincronizado entre janelas) ─── */
function Cronometro({ id, segundos, label, cmd, onCmd, destaque = false }) {
  const [restante, setRestante] = useState(segundos);
  const [ativo, setAtivo] = useState(false);
  const tickRef = useRef(null);
  const endRef = useRef(null);
  const lastTsRef = useRef(0);

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

  useEffect(() => {
    if (cmd && cmd.id === id && cmd.ts && cmd.ts > lastTsRef.current) {
      lastTsRef.current = cmd.ts;
      aplicar(cmd);
    }
  }, [cmd, id]);

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

  const numCor = alerta ? 'text-amber-400' : ativo ? 'text-emerald-400' : destaque ? 'text-amber-500' : 'text-slate-300';
  const borderL = destaque ? 'border-l-4 border-l-amber-500' : '';

  return (
    <div className={`bg-slate-900 border border-slate-800 ${borderL} rounded-xl p-3 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono uppercase tracking-widest ${destaque ? 'text-amber-500' : 'text-slate-500'}`}>{label}</span>
        <button
          onClick={onClickBtn}
          className="text-[9px] font-mono uppercase tracking-widest text-slate-400 hover:text-slate-100 transition-colors px-2 py-0.5 rounded border border-slate-700/60 hover:border-slate-600"
        >
          {ativo ? 'Pausar' : restante === 0 ? 'Reiniciar' : 'Iniciar'}
        </button>
      </div>
      <div className={`text-3xl font-mono font-bold tabular-num ${numCor} leading-none`}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${alerta ? 'bg-amber-500' : ativo ? 'bg-emerald-500' : 'bg-slate-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Paleta semântica do voto ─── */
function votoEstilo(status) {
  if (status === 'Sim')        return { dot: 'bg-emerald-500', text: 'text-emerald-500', label: 'Favorável', card: 'border-slate-800' };
  if (status === 'Não')        return { dot: 'bg-red-500',     text: 'text-red-500',     label: 'Contrário', card: 'border-slate-800' };
  if (status === 'Abstenção')  return { dot: 'bg-amber-500',   text: 'text-amber-500',   label: 'Abstenção', card: 'border-slate-800' };
  return                            { dot: 'bg-slate-600 animate-pulse', text: 'text-slate-500', label: 'Aguardando', card: 'border-slate-800/50 opacity-60' };
}

/* ─── Card do vereador (voto nominal) ─── */
function CardVereador({ voto }) {
  const e = votoEstilo(voto.voto);
  const nomeCurto = voto.parlamentar_nome?.split(' ').slice(0, 2).join(' ').toUpperCase();

  return (
    <div className={`bg-slate-900 border ${e.card} p-3 rounded-xl flex items-center gap-3`}>
      {voto.foto_url ? (
        <img src={voto.foto_url} alt={voto.parlamentar_nome} className="size-12 rounded-lg object-cover bg-slate-800 shrink-0" />
      ) : (
        <div className="size-12 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center text-slate-400 font-bold">
          {voto.parlamentar_nome?.[0]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-100 truncate">
          {nomeCurto}
          {voto.partido_sigla && <span className="text-slate-500 font-normal"> · {voto.partido_sigla}</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <div className={`size-1.5 rounded-full ${e.dot}`} />
          <span className={`text-[10px] font-mono uppercase tracking-wider ${e.text}`}>{e.label}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Telão principal ─── */
export default function TelaoVotacao({ votacaoAtiva, camara, onRefresh, embedded }) {
  const [v, setV] = useState(votacaoAtiva);
  const [agora, setAgora] = useState(new Date());

  useEffect(() => { setV(votacaoAtiva); }, [votacaoAtiva]);

  const cronometroCmd = useMemo(() => {
    if (!v?.cronometro_cmd) return null;
    try {
      return typeof v.cronometro_cmd === 'string' ? JSON.parse(v.cronometro_cmd) : v.cronometro_cmd;
    } catch { return null; }
  }, [v?.cronometro_cmd]);

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
  const unanimidade = v.resultado === 'Aprovada por Unanimidade';
  const aprovada = v.resultado === 'Aprovada' || unanimidade;

  const sessaoLabel = [
    v.sessao_numero ? `${v.sessao_numero}ª Sessão` : null,
    v.sessao_descricao || null,
  ].filter(Boolean).join(' · ');

  return (
    <div className={`w-full ${embedded ? "h-full" : "min-h-screen"} bg-slate-950 text-slate-100 font-body p-6 lg:p-8 flex flex-col gap-6 overflow-hidden relative`}>
      {/* TOPO */}
      <header className="flex items-center justify-between gap-6 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-4 min-w-0">
          {camara?.brasao_url ? (
            <div className="size-16 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
              <img src={camara.brasao_url} alt="Brasão" className="size-12 object-contain" />
            </div>
          ) : (
            <div className="size-16 bg-slate-900 border border-slate-800 rounded-xl shrink-0" />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-heading font-extrabold uppercase tracking-tight truncate">
              {camara?.nome || 'Câmara Municipal'}
            </h1>
            <p className="text-slate-500 font-mono text-xs uppercase tracking-widest truncate">
              {camara?.municipio}{camara?.estado ? ` — ${camara.estado}` : ''}
              {sessaoLabel && ` · ${sessaoLabel}`}
            </p>
          </div>
        </div>

        {!encerrada && (
          <div className="flex items-center bg-emerald-500/10 border border-emerald-500/20 px-5 py-2 rounded-full gap-3 shrink-0">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
            </span>
            <span className="font-mono text-sm font-semibold text-emerald-500 uppercase tracking-widest">
              Em Votação · {v.tipo_votacao}
            </span>
          </div>
        )}

        <div className="text-right shrink-0">
          <div className="text-3xl font-mono font-medium tabular-num">{format(agora, 'HH:mm:ss')}</div>
          <div className="text-slate-500 font-mono text-xs uppercase tracking-widest">
            {format(agora, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        </div>
      </header>

      {/* EMPATE BANNER */}
      {empate && !encerrada && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl px-6 py-4 flex items-center gap-4">
          <div className="size-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xl shrink-0">⚖</div>
          <div>
            <p className="font-heading font-bold text-amber-300 text-lg">Empate detectado</p>
            <p className="text-amber-200/80 text-sm">Aguardando voto de desempate do Presidente.</p>
          </div>
        </div>
      )}

      {/* RESULTADO FINAL (votação encerrada) */}
      {encerrada && (
        <div className={`rounded-2xl border px-6 py-5 flex items-center justify-between gap-6 ${
          aprovada ? 'bg-emerald-500/10 border-emerald-500/40' :
          empate ? 'bg-amber-500/10 border-amber-500/40' :
          'bg-red-500/10 border-red-500/40'
        }`}>
          <div className="flex items-center gap-4 min-w-0">
            <div className={`size-14 rounded-2xl flex items-center justify-center shrink-0 ${
              aprovada ? 'bg-emerald-500 text-slate-950' :
              empate ? 'bg-amber-500 text-slate-950' :
              'bg-red-500 text-white'
            }`}>
              {aprovada ? <CheckCircle2 className="size-8" strokeWidth={2.5} />
               : empate ? <span className="text-2xl font-bold">⚖</span>
               : <XCircle className="size-8" strokeWidth={2.5} />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-400">Resultado</p>
              <h2 className={`font-heading font-black tracking-tight leading-tight text-3xl xl:text-4xl ${
                aprovada ? 'text-emerald-400' : empate ? 'text-amber-400' : 'text-red-400'
              }`}>
                {unanimidade ? 'Aprovado por unanimidade' : aprovada ? 'Aprovado' : empate ? 'Empate' : 'Reprovado'}
              </h2>
            </div>
          </div>
          <div className="text-right font-mono tabular-num text-slate-300 text-sm shrink-0">
            <span className="text-emerald-400 font-bold">{sim}</span> a favor
            <span className="text-slate-600"> · </span>
            <span className="text-red-400 font-bold">{nao}</span> contra
            <span className="text-slate-600"> · </span>
            <span className="text-amber-400 font-bold">{abstencao}</span> abstenções
          </div>
        </div>
      )}

      {/* MAIN GRID — 12 cols */}
      <main className="flex-1 grid grid-cols-12 gap-6 lg:gap-8 min-h-0">

        {/* ESQUERDA — Parlamentares (ou agregado sigiloso) */}
        <section className="col-span-7 flex flex-col min-h-0">
          {sigiloso ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-4 h-full">
              <div className="size-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                <Lock className="size-9 text-slate-400" />
              </div>
              <h2 className="font-heading text-2xl font-extrabold tracking-tight">Votação Secreta</h2>
              <div className="text-6xl font-mono font-bold text-slate-100 tabular-num">{votaram}/{total}</div>
              <p className="text-slate-400">parlamentares já votaram</p>
              <div className="w-full max-w-md h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${pctVotaram}%` }} />
              </div>
              <p className="text-xs text-slate-500 max-w-md mt-2">
                Os votos individuais não são exibidos para preservar o sigilo da votação.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  Parlamentares — {total} presentes
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
                  {votaram}/{total} votaram
                </span>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 content-start overflow-y-auto pr-1">
                {votos.map((voto, i) => (
                  <CardVereador key={voto.parlamentar_id || voto.parlamentar_nome || i} voto={voto} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* DIREITA — Matéria + Placar + Cronômetros */}
        <section className="col-span-5 flex flex-col gap-5 min-h-0">

          {/* MATÉRIA */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="bg-slate-800 text-slate-400 px-2 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-tighter">
                {v.materia_tipo || 'Matéria'}
              </span>
              {v.materia_numero && (
                <span className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">
                  nº {v.materia_numero}
                </span>
              )}
            </div>
            <h2 className="text-xl xl:text-2xl font-heading font-bold leading-tight text-slate-100">
              {v.materia_ementa}
            </h2>
          </div>

          {/* PLACAR */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-center">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-500/80 mb-1">Favoráveis</div>
              <div className="text-5xl font-extrabold font-mono text-emerald-500 tabular-num leading-none">{String(sim).padStart(2,'0')}</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-center">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-500/80 mb-1">Contrários</div>
              <div className="text-5xl font-extrabold font-mono text-red-500 tabular-num leading-none">{String(nao).padStart(2,'0')}</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-center">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-500/80 mb-1">Abstenções</div>
              <div className="text-5xl font-extrabold font-mono text-amber-500 tabular-num leading-none">{String(abstencao).padStart(2,'0')}</div>
            </div>
          </div>

          {/* CRONÔMETROS 2x2 */}
          <div className="grid grid-cols-2 gap-3 flex-1">
            <Cronometro id="discurso"      segundos={v.timer_discurso || 300} label="Discurso"          cmd={cronometroCmd} onCmd={enviarCronometro} />
            <Cronometro id="aparte"        segundos={v.timer_aparte || 60}  label="Aparte"            cmd={cronometroCmd} onCmd={enviarCronometro} destaque />
            <Cronometro id="questao_ordem" segundos={v.timer_questao || 120} label="Questão de Ordem"  cmd={cronometroCmd} onCmd={enviarCronometro} />
            <Cronometro id="consid_finais" segundos={v.timer_consideracoes || 60}  label="Considerações Finais" cmd={cronometroCmd} onCmd={enviarCronometro} />
          </div>
        </section>
      </main>

      {/* FOOTER — barra de progresso */}
      {!sigiloso && (
        <footer className="border-t border-slate-800 pt-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-mono text-xs uppercase tracking-widest">Votação Registrada</span>
              <span className="text-slate-200 font-mono text-sm font-bold tabular-num">{votaram} / {total} Parlamentares</span>
            </div>
            <div className="text-slate-200 font-mono text-sm font-bold tabular-num">{pctVotaram}% Concluído</div>
          </div>
          <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all duration-500"
              style={{ width: `${pctVotaram}%` }}
            />
          </div>
        </footer>
      )}
    </div>
  );
}