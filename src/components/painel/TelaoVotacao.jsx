import { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { sincronizarCronometro } from "@/lib/sislegisApi";
import { CheckCircle2, XCircle, MinusCircle, Lock, Scale } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ───────────────────────────────────────────────────────────────────────────
   TelaoVotacao — REDESIGN VISUAL (Senado Moderno)
   • Lógica, props, sincronização e nomes de campos PRESERVADOS.
   • Paleta institucional: azul profundo + areia + dourado discreto.
   • Tokens semânticos (bg-background, bg-card, text-foreground, accent,
     favor/against/abstain) — funciona em LIGHT e DARK.
   • Tipografia: Inter (sans) · Source Serif 4 (ementa) · JetBrains Mono (números).
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

  const numCor = alerta
    ? "text-[var(--abstain)]"
    : ativo
    ? "text-[var(--favor)]"
    : destaque
    ? "text-accent"
    : "text-foreground";

  return (
    <div className={`relative bg-card border border-border rounded-xl p-2.5 flex flex-col gap-1.5 ${destaque ? "ring-1 ring-accent/40" : ""}`}>
      {destaque && <span className="absolute top-0 left-3 right-3 h-px bg-accent/60" />}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono uppercase tracking-[0.18em] ${destaque ? "text-accent" : "text-muted-foreground"}`}>
          {label}
        </span>
        <button
          onClick={onClickBtn}
          className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded border border-border hover:border-accent/60"
        >
          {ativo ? "Pausar" : restante === 0 ? "Reiniciar" : "Iniciar"}
        </button>
      </div>
      <div className={`text-2xl font-mono font-semibold tabular-nums leading-none ${numCor}`}>
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </div>
      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            alerta ? "bg-[var(--abstain)]" : ativo ? "bg-[var(--favor)]" : "bg-muted-foreground/40"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Paleta semântica do voto ─── */
function votoEstilo(status) {
  if (status === "Sim")
    return { dot: "bg-[var(--favor)]", text: "text-[var(--favor)]", label: "Favorável", soft: "bg-[var(--favor-soft)]", border: "border-[var(--favor)]/55", ring: "ring-[var(--favor)]/70" };
  if (status === "Não")
    return { dot: "bg-[var(--against)]", text: "text-[var(--against)]", label: "Contrário", soft: "bg-[var(--against-soft)]", border: "border-[var(--against)]/55", ring: "ring-[var(--against)]/70" };
  if (status === "Abstenção")
    return { dot: "bg-[var(--abstain)]", text: "text-[var(--abstain)]", label: "Abstenção", soft: "bg-[var(--abstain-soft)]", border: "border-[var(--abstain)]/55", ring: "ring-[var(--abstain)]/70" };
  return { dot: "bg-muted-foreground/50 animate-pulse", text: "text-muted-foreground", label: "Aguardando", soft: "", border: "border-border", ring: "ring-border" };
}

/* ─── Card do vereador ─── */
function CardVereador({ voto }) {
  const e = votoEstilo(voto.voto);
  const votou = !!voto.voto;
  const nomeCurto = voto.parlamentar_nome?.split(" ").slice(0, 2).join(" ");

  return (
    <div className={`border rounded-xl p-4 flex items-center gap-4 transition-colors duration-300 ${votou ? `${e.soft} ${e.border}` : "bg-card border-border opacity-80"}`}>
      {voto.foto_url ? (
        <img
          src={voto.foto_url}
          alt={voto.parlamentar_nome}
          className={`size-16 rounded-xl object-cover bg-muted shrink-0 ring-2 transition-all duration-300 ${votou ? e.ring : "ring-border"} ${votou ? "" : "grayscale"}`}
        />
      ) : (
        <div className={`size-16 rounded-xl bg-muted shrink-0 flex items-center justify-center text-muted-foreground font-heading font-bold text-2xl ring-2 transition-all duration-300 ${votou ? e.ring : "ring-border"}`}>
          {voto.parlamentar_nome?.[0]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-base font-semibold text-foreground truncate leading-tight">
          {nomeCurto}
        </div>
        {voto.partido_sigla && (
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground mt-0.5">
            {voto.partido_sigla}
          </div>
        )}
        <div className="flex items-center gap-1.5 mt-2">
          <div className={`size-2 rounded-full ${e.dot}`} />
          <span className={`text-[11px] font-mono font-bold uppercase tracking-[0.12em] ${e.text}`}>
            {e.label}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Telão principal ─── */
export default function TelaoVotacao({ votacaoAtiva, camara, onRefresh, embedded }) {
  const [v, setV] = useState(votacaoAtiva);
  const [agora, setAgora] = useState(null);

  useEffect(() => {
    setV(votacaoAtiva);
  }, [votacaoAtiva]);

  const cronometroCmd = useMemo(() => {
    if (!v?.cronometro_cmd) return null;
    try {
      return typeof v.cronometro_cmd === "string" ? JSON.parse(v.cronometro_cmd) : v.cronometro_cmd;
    } catch {
      return null;
    }
  }, [v?.cronometro_cmd]);

  function enviarCronometro(cmd) {
    if (v?.id) sincronizarCronometro(v.id, cmd);
  }

  useEffect(() => {
    setAgora(new Date());
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!votacaoAtiva?.id) return;
    const unsub = base44.entities.Votacao.subscribe((event) => {
      if (event.id === votacaoAtiva.id) {
        setV(event.data);
        if (event.data?.status !== "Em Votação") onRefresh?.();
      }
    });
    return () => unsub();
  }, [votacaoAtiva?.id]);

  if (!v) return null;

  const votos = v.votos || [];
  const sim = votos.filter((x) => x.voto === "Sim").length;
  const nao = votos.filter((x) => x.voto === "Não").length;
  const abstencao = votos.filter((x) => x.voto === "Abstenção").length;
  const aguardando = votos.filter((x) => !x.voto).length;
  const total = votos.length;
  const votaram = total - aguardando;
  const pctVotaram = total ? Math.round((votaram / total) * 100) : 0;

  const sigiloso = v.tipo_votacao === "Sigilosa";
  const encerrada = v.status === "Encerrada";
  const empate = v.status === "Aguardando Desempate" || v.resultado === "Empate";
  const unanimidade = v.resultado === "Aprovada por Unanimidade";
  const aprovada = v.resultado === "Aprovada" || unanimidade;

  const sessaoLabel = [
    v.sessao_numero ? `${v.sessao_numero}ª Sessão` : null,
    v.sessao_descricao || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={`w-full bg-background text-foreground flex flex-col relative ${embedded ? "h-full overflow-y-auto p-4 gap-4" : "min-h-screen overflow-hidden p-6 lg:p-8 gap-6"}`}>
      {/* faixa dourada institucional no topo */}
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-80" />

      {/* TOPO */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-4 min-w-0">
          {camara?.brasao_url ? (
            <div className="size-16 bg-card border border-border rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
              <img src={camara.brasao_url} alt="Brasão" className="size-12 object-contain" />
            </div>
          ) : (
            <div className="size-16 bg-card border border-border rounded-xl shrink-0 flex items-center justify-center">
              <div className="size-8 rounded-full border-2 border-accent/60" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-heading font-bold tracking-tight truncate">
              {camara?.nome || "Câmara Municipal"}
            </h1>
            <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em] truncate mt-1">
              {camara?.municipio}
              {camara?.estado ? ` — ${camara.estado}` : ""}
              {sessaoLabel && ` · ${sessaoLabel}`}
            </p>
          </div>
        </div>

        {!encerrada && (
          <div className="flex items-center bg-[var(--favor-soft)] border border-[var(--favor)]/30 px-5 py-2 rounded-full gap-3 shrink-0">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex size-full rounded-full bg-[var(--favor)] opacity-60" />
              <span className="relative inline-flex rounded-full size-2 bg-[var(--favor)]" />
            </span>
            <span className="font-mono text-sm font-semibold text-[var(--favor)] uppercase tracking-[0.18em]">
              Em Votação · {v.tipo_votacao}
            </span>
          </div>
        )}

        <div className="text-right shrink-0">
          <div className="text-3xl font-mono font-medium tabular-nums">
            {agora ? format(agora, "HH:mm:ss") : "--:--:--"}
          </div>
          <div className="text-muted-foreground font-mono text-xs uppercase tracking-[0.18em] mt-1">
            {agora ? format(agora, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : ""}
          </div>
        </div>
      </header>

      {/* EMPATE BANNER */}
      {empate && !encerrada && (
        <div className="bg-[var(--abstain-soft)] border border-[var(--abstain)]/40 rounded-2xl px-6 py-4 flex items-center gap-4">
          <div className="size-10 rounded-full bg-[var(--abstain)] text-background flex items-center justify-center shrink-0">
            <Scale className="size-5" />
          </div>
          <div>
            <p className="font-heading font-bold text-[var(--abstain)] text-lg">Empate detectado</p>
            <p className="text-muted-foreground text-sm">
              Aguardando voto de desempate do Presidente.
            </p>
          </div>
        </div>
      )}

      {/* RESULTADO FINAL (votação encerrada) */}
      {encerrada && (
        <div className={`rounded-2xl border px-6 py-5 flex items-center justify-between gap-6 ${
          aprovada ? "bg-[var(--favor-soft)] border-[var(--favor)]/40" :
          empate ? "bg-[var(--abstain-soft)] border-[var(--abstain)]/40" :
          "bg-[var(--against-soft)] border-[var(--against)]/40"
        }`}>
          <div className="flex items-center gap-4 min-w-0">
            <div className={`size-14 rounded-2xl flex items-center justify-center shrink-0 text-background ${
              aprovada ? "bg-[var(--favor)]" : empate ? "bg-[var(--abstain)]" : "bg-[var(--against)]"
            }`}>
              {aprovada ? <CheckCircle2 className="size-8" /> : empate ? <Scale className="size-7" /> : <XCircle className="size-8" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">Resultado</p>
              <h2 className={`font-heading font-bold tracking-tight leading-tight text-3xl xl:text-4xl ${
                aprovada ? "text-[var(--favor)]" : empate ? "text-[var(--abstain)]" : "text-[var(--against)]"
              }`}>
                {unanimidade ? "Aprovado por unanimidade" : aprovada ? "Aprovado" : empate ? "Empate" : "Reprovado"}
              </h2>
            </div>
          </div>
          <div className="text-right font-mono tabular-nums text-muted-foreground text-sm shrink-0">
            <span className="text-[var(--favor)] font-bold">{sim}</span> a favor
            <span className="opacity-40"> · </span>
            <span className="text-[var(--against)] font-bold">{nao}</span> contra
            <span className="opacity-40"> · </span>
            <span className="text-[var(--abstain)] font-bold">{abstencao}</span> abstenções
          </div>
        </div>
      )}

      {/* MAIN GRID — 12 cols */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 min-h-0">
        {/* ESQUERDA — Parlamentares */}
        <section className="lg:col-span-5 flex flex-col min-h-0">
          {sigiloso ? (
            <div className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-4 h-full">
              <div className="size-20 rounded-2xl bg-secondary border border-border flex items-center justify-center">
                <Lock className="size-9 text-accent" />
              </div>
              <h2 className="font-heading text-2xl font-bold tracking-tight">Votação Secreta</h2>
              <div className="text-6xl font-mono font-semibold text-foreground tabular-nums">
                {votaram}/{total}
              </div>
              <p className="text-muted-foreground">parlamentares já votaram</p>
              <div className="w-full max-w-md h-2 bg-muted rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-[var(--favor)] transition-all duration-500"
                  style={{ width: `${pctVotaram}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground max-w-md mt-2">
                Os votos individuais não são exibidos para preservar o sigilo da votação.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                  Parlamentares — {total} presentes
                </span>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70">
                  {votaram}/{total} votaram
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start overflow-y-auto pr-1">
                {votos.map((voto, i) => (
                  <CardVereador key={voto.parlamentar_id || voto.parlamentar_nome || i} voto={voto} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* DIREITA — Matéria + Placar + Cronômetros */}
        <section className="lg:col-span-7 flex flex-col gap-5 min-h-0">
          {/* MATÉRIA */}
          <div className="bg-card border border-border p-6 rounded-2xl relative overflow-hidden">
            <span className="absolute left-0 top-6 bottom-6 w-1 bg-accent rounded-r" />
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-[0.16em]">
                {v.materia_tipo || "Matéria"}
              </span>
              {v.materia_numero && (
                <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.2em]">
                  nº {v.materia_numero}
                </span>
              )}
            </div>
            <h2 className="text-xl xl:text-[26px] font-heading font-semibold leading-tight text-foreground">
              {v.materia_ementa}
            </h2>
          </div>

          {/* PLACAR — preenche o espaço, números grandes */}
          <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
            <div className="bg-[var(--favor-soft)] border border-[var(--favor)]/30 rounded-2xl flex flex-col items-center justify-center text-center p-4">
              <div className="text-xs xl:text-sm font-mono uppercase tracking-[0.22em] text-[var(--favor)] mb-4">
                Favoráveis
              </div>
              <div className="text-7xl xl:text-8xl 2xl:text-9xl font-bold font-mono text-[var(--favor)] tabular-nums leading-none">
                {String(sim).padStart(2, "0")}
              </div>
            </div>
            <div className="bg-[var(--against-soft)] border border-[var(--against)]/30 rounded-2xl flex flex-col items-center justify-center text-center p-4">
              <div className="text-xs xl:text-sm font-mono uppercase tracking-[0.22em] text-[var(--against)] mb-4">
                Contrários
              </div>
              <div className="text-7xl xl:text-8xl 2xl:text-9xl font-bold font-mono text-[var(--against)] tabular-nums leading-none">
                {String(nao).padStart(2, "0")}
              </div>
            </div>
            <div className="bg-[var(--abstain-soft)] border border-[var(--abstain)]/30 rounded-2xl flex flex-col items-center justify-center text-center p-4">
              <div className="text-xs xl:text-sm font-mono uppercase tracking-[0.22em] text-[var(--abstain)] mb-4">
                Abstenções
              </div>
              <div className="text-7xl xl:text-8xl 2xl:text-9xl font-bold font-mono text-[var(--abstain)] tabular-nums leading-none">
                {String(abstencao).padStart(2, "0")}
              </div>
            </div>
          </div>

          {/* CRONÔMETROS — linha compacta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-shrink-0">
            <Cronometro id="discurso" segundos={v.timer_discurso || 300} label="Discurso" cmd={cronometroCmd} onCmd={enviarCronometro} />
            <Cronometro id="aparte" segundos={v.timer_aparte || 60} label="Aparte" cmd={cronometroCmd} onCmd={enviarCronometro} destaque />
            <Cronometro id="questao_ordem" segundos={v.timer_questao || 120} label="Questão de Ordem" cmd={cronometroCmd} onCmd={enviarCronometro} />
            <Cronometro id="consid_finais" segundos={v.timer_consideracoes || 60} label="Considerações Finais" cmd={cronometroCmd} onCmd={enviarCronometro} />
          </div>
        </section>
      </main>

      {/* FOOTER — barra de progresso */}
      {!sigiloso && (
        <footer className="border-t border-border pt-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em]">
                Votação Registrada
              </span>
              <span className="text-foreground font-mono text-sm font-bold tabular-nums">
                {votaram} / {total} Parlamentares
              </span>
            </div>
            <div className="text-foreground font-mono text-sm font-bold tabular-nums">
              {pctVotaram}% Concluído
            </div>
          </div>
          <div className="h-3 w-full bg-secondary rounded-full overflow-hidden border border-border p-0.5">
            <div
              className="h-full bg-[var(--favor)] rounded-full transition-all duration-500"
              style={{ width: `${pctVotaram}%` }}
            />
          </div>
        </footer>
      )}
    </div>
  );
}