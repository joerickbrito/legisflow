import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { sislegisEntities } from "@/lib/sislegisApi";
import { CheckCircle2, XCircle, MinusCircle, Vote, Clock, Scale } from "lucide-react";

/* ───────────────────────────────────────────────────────────────────────────
   InterfaceVereador — REDESIGN VISUAL (Senado Moderno)
   • Lógica, props, efeitos e função votar() preservados integralmente.
   • Tokens semânticos (bg-background, bg-card, primary, accent, favor/against/
     abstain) — funciona em LIGHT e DARK.
   • Tipografia: Inter (sans) · Source Serif 4 (matéria) · JetBrains Mono (números).
─────────────────────────────────────────────────────────────────────────── */

export default function InterfaceVereador({ votacaoAtiva, user, onRefresh, isPresidente, tenantId }) {
  const [votacao, setVotacao] = useState(votacaoAtiva);
  const [meuVoto, setMeuVoto] = useState(null);
  const [votando, setVotando] = useState(false);

  const detectarEmpate = (v) => {
    if (!isPresidente || !v) return false;
    const votos = v.votos || [];
    const votosNormais = votos.filter((x) => !x.is_presidente);
    const todosVotaram = votosNormais.every((x) => x.voto);
    if (!todosVotaram) return false;
    const sim = votosNormais.filter((x) => x.voto === "Sim").length;
    const nao = votosNormais.filter((x) => x.voto === "Não").length;
    return sim === nao && sim > 0;
  };

  const getMeuVoto = (v) => {
    if (!v || !user) return null;
    const entry = (v.votos || []).find((x) => {
      if (user.parlamentar_id) return x.parlamentar_id === user.parlamentar_id;
      return x.parlamentar_nome === user.nome || x.parlamentar_nome === (user.full_name || "");
    });
    return entry?.voto || null;
  };

  useEffect(() => {
    setVotacao(votacaoAtiva);
    setMeuVoto(getMeuVoto(votacaoAtiva));
  }, [votacaoAtiva]);

  useEffect(() => {
    const unsub = base44.entities.Votacao.subscribe((event) => {
      if (event.type === "update" || event.type === "create") {
        if (event.data?.tenant_id && tenantId && event.data.tenant_id !== tenantId) return;
        setVotacao(event.data);
        setMeuVoto(getMeuVoto(event.data));
      }
    });
    return () => unsub();
  }, [user?.id, tenantId]);

  async function votar(opcao) {
    if (!votacao || meuVoto || votando) return;
    setVotando(true);
    const novosVotos = (votacao.votos || []).map((v) => {
      let ehMeu = false;
      if (user?.parlamentar_id) {
        ehMeu = v.parlamentar_id === user.parlamentar_id;
      } else {
        ehMeu = v.parlamentar_nome === user?.nome || v.parlamentar_nome === (user?.full_name || "");
      }
      if (ehMeu) return { ...v, voto: opcao, hora: new Date().toISOString() };
      return v;
    });

    const slotEncontrado = novosVotos.some((v, i) => {
      const original = (votacao.votos || [])[i];
      return v.voto !== original?.voto;
    });
    if (!slotEncontrado) {
      console.error("ERRO: Slot de voto não encontrado para o usuário:", user?.nome, "parlamentar_id:", user?.parlamentar_id);
      setVotando(false);
      return;
    }
    const sim = novosVotos.filter((v) => !v.is_presidente && v.voto === "Sim").length;
    const nao = novosVotos.filter((v) => !v.is_presidente && v.voto === "Não").length;
    const abstencoes = novosVotos.filter((v) => v.voto === "Abstenção").length;

    await sislegisEntities.Votacao.update(votacao.id, {
      tenant_id: tenantId || "",
      votos: novosVotos,
      votos_sim: sim,
      votos_nao: nao,
      abstencoes,
    });

    setMeuVoto(opcao);
    setVotando(false);
    onRefresh?.();
  }

  const semVotacao = !votacao || (votacao.status !== "Em Votação" && votacao.status !== "Aguardando Desempate");
  const empate = detectarEmpate(votacao);
  const aguardandoDesempate = votacao?.status === "Aguardando Desempate";
  const podeVotar = !isPresidente || empate || aguardandoDesempate;

  const nomeVotante = user?.nome || user?.full_name || "Parlamentar";
  const inicialVotante = nomeVotante.charAt(0);

  /* ─── Cabeçalho compartilhado ─── */
  const STATUS = {
    favor:   { dot: "bg-[var(--favor)]",   text: "text-[var(--favor)]" },
    abstain: { dot: "bg-[var(--abstain)]", text: "text-[var(--abstain)]" },
    against: { dot: "bg-[var(--against)]", text: "text-[var(--against)]" },
    gold:    { dot: "bg-accent",            text: "text-accent" },
    muted:   { dot: "bg-muted-foreground/60", text: "text-muted-foreground" },
  };
  const Header = ({ statusLabel = "Em votação", statusColor = "favor" }) => {
    const c = STATUS[statusColor] || STATUS.favor;
    return (
      <header className="shrink-0 px-5 py-3 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between gap-4 relative">
        <span className="absolute inset-x-0 top-0 h-px bg-accent/60" />
        <div className="flex items-center gap-2 min-w-0">
          <div className={`size-2 rounded-full ${c.dot} animate-pulse shrink-0`} />
          <span className={`text-[10px] font-mono font-bold uppercase tracking-[0.2em] ${c.text} truncate`}>
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-right min-w-0">
            <p className="text-[12px] font-semibold text-foreground leading-tight truncate">{nomeVotante}</p>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Online</span>
          </div>
          {user?.foto_url ? (
            <img
              src={user.foto_url}
              alt={nomeVotante}
              className="size-9 rounded-full object-cover ring-1 ring-accent/50 shrink-0"
            />
          ) : (
            <div className="size-9 rounded-full bg-secondary ring-1 ring-accent/50 flex items-center justify-center text-foreground font-heading font-semibold text-sm shrink-0">
              {inicialVotante}
            </div>
          )}
        </div>
      </header>
    );
  };

  /* ─── Estado: sem votação ─── */
  if (semVotacao) {
    return (
      <div className="h-dvh min-h-screen bg-background text-foreground flex flex-col">
        <Header statusLabel="Aguardando sessão" statusColor="muted" />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
          <div className="size-20 rounded-2xl bg-card border border-border flex items-center justify-center">
            <Clock className="size-9 text-muted-foreground" />
          </div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Nenhuma votação em andamento</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Aguarde o operador iniciar uma votação. Esta tela atualiza automaticamente.
          </p>
        </div>
      </div>
    );
  }

  /* ─── Estado: presidente aguardando ─── */
  if (isPresidente && !empate && !aguardandoDesempate && !meuVoto) {
    return (
      <div className="h-dvh min-h-screen bg-background text-foreground flex flex-col">
        <Header statusLabel="Presidência · Aguardando" statusColor="gold" />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
          <div className="size-20 rounded-2xl bg-card border border-accent/40 flex items-center justify-center">
            <Vote className="size-9 text-accent" />
          </div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Votação em andamento</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Seu voto será solicitado apenas em caso de empate.
          </p>

          <div className="mt-6 w-full max-w-xl bg-card border border-border rounded-2xl p-5 text-left">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              Em votação
            </span>
            <p className="mt-2 text-base font-heading text-foreground leading-snug">
              {votacao.materia_ementa}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-[var(--favor-soft)] border border-[var(--favor)]/30 rounded-lg p-3 text-center">
                <div className="text-[var(--favor)] text-2xl font-mono font-semibold tabular-nums">
                  {String(votacao.votos_sim).padStart(2, "0")}
                </div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-medium mt-0.5">
                  Favoráveis
                </div>
              </div>
              <div className="bg-[var(--against-soft)] border border-[var(--against)]/30 rounded-lg p-3 text-center">
                <div className="text-[var(--against)] text-2xl font-mono font-semibold tabular-nums">
                  {String(votacao.votos_nao).padStart(2, "0")}
                </div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-medium mt-0.5">
                  Contrários
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Estado: já votou (confirmação) ─── */
  if (meuVoto) {
    const CONFIRM = {
      Sim:         { color: "favor",   label: "FAVORÁVEL", Icon: CheckCircle2 },
      "Não":       { color: "against", label: "CONTRÁRIO", Icon: XCircle },
      "Abstenção": { color: "abstain", label: "ABSTENÇÃO", Icon: MinusCircle },
    };
    const conf = CONFIRM[meuVoto] || CONFIRM.Sim;
    const { Icon } = conf;
    return (
      <div className="h-dvh min-h-screen bg-background text-foreground flex flex-col">
        <Header statusLabel="Voto registrado" statusColor={conf.color} />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
          <div
            className="size-28 rounded-3xl border flex items-center justify-center shadow-xl"
            style={{
              backgroundColor: `var(--${conf.color}-soft)`,
              borderColor: `var(--${conf.color})`,
            }}
          >
            <Icon className="size-14" style={{ color: `var(--${conf.color})` }} />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
              Seu voto
            </p>
            <h2
              className="font-heading text-4xl sm:text-5xl font-bold tracking-tight"
              style={{ color: `var(--${conf.color})` }}
            >
              {conf.label}
            </h2>
          </div>
          <p className="text-sm text-foreground">Voto registrado com sucesso.</p>
          <p className="text-xs text-muted-foreground">Não é possível alterar o voto após confirmar.</p>
        </div>
      </div>
    );
  }

  /* ─── Estado principal: votando ─── */
  return (
    <div className="h-dvh min-h-screen bg-background text-foreground flex flex-col">
      <Header statusLabel="Em votação nominal" statusColor="favor" />

      <div
        className="flex-1 grid grid-cols-1 landscape:grid-cols-[1.1fr_1fr] sm:grid-cols-[1.1fr_1fr] gap-0"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* ESQUERDA — matéria + placar ao vivo */}
        <section className="overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 border-b sm:border-b-0 sm:border-r border-border flex flex-col gap-6">
          {isPresidente && (empate || aguardandoDesempate) && (
            <div className="rounded-xl border border-[var(--abstain)]/40 bg-[var(--abstain-soft)] px-4 py-3 flex items-start gap-3">
              <Scale className="size-5 text-[var(--abstain)] shrink-0 mt-0.5" />
              <div>
                <p className="text-[var(--abstain)] font-heading font-bold text-sm">Empate detectado</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Seu voto de desempate é necessário.
                </p>
              </div>
            </div>
          )}

          {/* Matéria */}
          <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden">
            <span className="absolute left-0 top-5 bottom-5 w-1 bg-accent rounded-r" />
            <div className="flex items-center gap-2 mb-3 pl-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-accent">
                {votacao.tipo_votacao}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/60">·</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                {votacao.materia_tipo}
              </span>
            </div>
            <h2 className="font-heading text-xl sm:text-[26px] font-semibold leading-tight tracking-tight text-foreground pl-1">
              {votacao.materia_ementa}
            </h2>
          </div>

          {/* Placar ao vivo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                Placar ao vivo
              </span>
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70">
                Atualiza em tempo real
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[var(--favor-soft)] border border-[var(--favor)]/30 rounded-xl p-3 text-center">
                <div className="text-[var(--favor)] text-3xl font-mono font-semibold tabular-nums leading-none">
                  {String(votacao.votos_sim).padStart(2, "0")}
                </div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-medium mt-2">
                  Favoráveis
                </div>
              </div>
              <div className="bg-[var(--against-soft)] border border-[var(--against)]/30 rounded-xl p-3 text-center">
                <div className="text-[var(--against)] text-3xl font-mono font-semibold tabular-nums leading-none">
                  {String(votacao.votos_nao).padStart(2, "0")}
                </div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-medium mt-2">
                  Contrários
                </div>
              </div>
              <div className="bg-[var(--abstain-soft)] border border-[var(--abstain)]/30 rounded-xl p-3 text-center">
                <div className="text-[var(--abstain)] text-3xl font-mono font-semibold tabular-nums leading-none">
                  {String(votacao.abstencoes || 0).padStart(2, "0")}
                </div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-medium mt-2">
                  Abstenções
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DIREITA — botões de voto */}
        <section className="px-6 py-6 sm:px-8 sm:py-8 flex flex-col gap-3 justify-center bg-secondary/30">
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-muted-foreground text-center mb-1">
            Confirme sua manifestação
          </p>

          {/* FAVORÁVEL — dominante */}
          <button
            onClick={() => votar("Sim")}
            disabled={votando || !podeVotar}
            className="w-full min-w-0 px-4 min-h-[120px] sm:min-h-[160px] rounded-2xl bg-[var(--favor)] hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-heading font-bold tracking-tight transition-all shadow-xl flex items-center justify-center gap-3 select-none"
          >
            <CheckCircle2 className="size-8 sm:size-10 shrink-0" strokeWidth={2.5} />
            <span className="text-2xl sm:text-3xl lg:text-4xl truncate min-w-0">FAVORÁVEL</span>
          </button>

          {/* CONTRÁRIO — secundário */}
          <button
            onClick={() => votar("Não")}
            disabled={votando || !podeVotar}
            className="w-full min-w-0 px-4 min-h-[68px] sm:min-h-[80px] rounded-2xl bg-[var(--against)] hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-heading font-bold tracking-tight transition-all shadow-lg flex items-center justify-center gap-3 select-none"
          >
            <XCircle className="size-6 sm:size-7 shrink-0" strokeWidth={2.5} />
            <span className="text-lg sm:text-xl lg:text-2xl truncate min-w-0">CONTRÁRIO</span>
          </button>

          {/* ABSTENÇÃO — discreta */}
          <button
            onClick={() => votar("Abstenção")}
            disabled={votando || !podeVotar}
            className="w-full min-w-0 px-4 min-h-[52px] sm:min-h-[60px] rounded-2xl bg-card hover:bg-secondary border border-border active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-foreground font-semibold transition-all flex items-center justify-center gap-2 select-none"
          >
            <MinusCircle className="size-5 shrink-0" />
            <span className="text-base sm:text-lg uppercase tracking-[0.14em] truncate min-w-0">Abstenção</span>
          </button>

          <p className="text-[10px] font-mono text-muted-foreground/80 text-center mt-2 uppercase tracking-[0.2em]">
            O voto não pode ser alterado após a confirmação
          </p>
        </section>
      </div>
    </div>
  );
}