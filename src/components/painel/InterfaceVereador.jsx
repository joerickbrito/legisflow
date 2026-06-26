import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { sislegisEntities } from "@/lib/sislegisApi";
import { CheckCircle2, XCircle, MinusCircle, Vote, Clock } from "lucide-react";

/* ───────────────────────────────────────────────────────────────────────────
   InterfaceVereador — REDESIGN VISUAL (Tactical Dashboard)
   • Lógica, props, efeitos e função votar() preservados integralmente.
   • Otimizado para TABLET em PAISAGEM (uso principal):
       - sm/landscape: 2 colunas (esquerda = matéria + placar, direita = botões).
       - mobile portrait: empilhado (placar acima, botões fixos no rodapé).
   • Botão FAVORÁVEL com presença dominante; Contrário menor; Abstenção discreta.
   • Paleta: grafite navy + verde/vermelho/âmbar, tipografia mono para números.
─────────────────────────────────────────────────────────────────────────── */

export default function InterfaceVereador({ votacaoAtiva, user, onRefresh, isPresidente, tenantId }) {
  const [votacao, setVotacao] = useState(votacaoAtiva);
  const [meuVoto, setMeuVoto] = useState(null);
  const [votando, setVotando] = useState(false);

  const detectarEmpate = (v) => {
    if (!isPresidente || !v) return false;
    const votos = v.votos || [];
    const votosNormais = votos.filter(x => !x.is_presidente);
    const todosVotaram = votosNormais.every(x => x.voto);
    if (!todosVotaram) return false;
    const sim = votosNormais.filter(x => x.voto === 'Sim').length;
    const nao = votosNormais.filter(x => x.voto === 'Não').length;
    return sim === nao && sim > 0;
  };

  const getMeuVoto = (v) => {
    if (!v || !user) return null;
    const entry = (v.votos || []).find(x => {
      if (user.parlamentar_id) return x.parlamentar_id === user.parlamentar_id;
      return x.parlamentar_nome === user.nome ||
             x.parlamentar_nome === (user.full_name || '');
    });
    return entry?.voto || null;
  };

  useEffect(() => {
    setVotacao(votacaoAtiva);
    setMeuVoto(getMeuVoto(votacaoAtiva));
  }, [votacaoAtiva]);

  useEffect(() => {
    const unsub = base44.entities.Votacao.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create') {
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
    const novosVotos = (votacao.votos || []).map(v => {
      let ehMeu = false;
      if (user?.parlamentar_id) {
        ehMeu = v.parlamentar_id === user.parlamentar_id;
      } else {
        ehMeu = v.parlamentar_nome === user?.nome ||
                v.parlamentar_nome === (user?.full_name || '');
      }
      if (ehMeu) return { ...v, voto: opcao, hora: new Date().toISOString() };
      return v;
    });

    const slotEncontrado = novosVotos.some((v, i) => {
      const original = (votacao.votos || [])[i];
      return v.voto !== original?.voto;
    });
    if (!slotEncontrado) {
      console.error('ERRO: Slot de voto não encontrado para o usuário:', user?.nome, 'parlamentar_id:', user?.parlamentar_id);
      setVotando(false);
      return;
    }
    const sim = novosVotos.filter(v => !v.is_presidente && v.voto === 'Sim').length;
    const nao = novosVotos.filter(v => !v.is_presidente && v.voto === 'Não').length;
    const abstencoes = novosVotos.filter(v => v.voto === 'Abstenção').length;

    await sislegisEntities.Votacao.update(votacao.id, {
      tenant_id: tenantId || '',
      votos: novosVotos,
      votos_sim: sim,
      votos_nao: nao,
      abstencoes,
    });

    setMeuVoto(opcao);
    setVotando(false);
    onRefresh?.();
  }

  const semVotacao = !votacao || (votacao.status !== 'Em Votação' && votacao.status !== 'Aguardando Desempate');
  const empate = detectarEmpate(votacao);
  const aguardandoDesempate = votacao?.status === 'Aguardando Desempate';
  const podeVotar = !isPresidente || empate || aguardandoDesempate;

  const nomeVotante = user?.nome || user?.full_name || 'Parlamentar';
  const inicialVotante = nomeVotante.charAt(0);

  /* ─── Cabeçalho compartilhado (identificação do votante + status) ─── */
  const STATUS_COLORS = {
    emerald: { dot: 'bg-emerald-400', text: 'text-emerald-400' },
    amber:   { dot: 'bg-amber-400',   text: 'text-amber-400' },
    red:     { dot: 'bg-red-400',     text: 'text-red-400' },
    slate:   { dot: 'bg-slate-400',   text: 'text-slate-400' },
  };
  const Header = ({ statusLabel = 'Em votação', statusColor = 'emerald' }) => {
    const c = STATUS_COLORS[statusColor] || STATUS_COLORS.emerald;
    return (
    <header className="shrink-0 px-5 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`size-2 rounded-full ${c.dot} animate-pulse shrink-0`} />
        <span className={`text-[10px] font-mono font-bold uppercase tracking-[0.18em] ${c.text} truncate`}>
          {statusLabel}
        </span>
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-right min-w-0">
          <p className="text-[11px] font-semibold text-slate-100 leading-none truncate">{nomeVotante}</p>
          <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Online</span>
        </div>
        {user?.foto_url ? (
          <img src={user.foto_url} alt={nomeVotante} className="size-9 rounded-full object-cover border border-slate-700/60 shrink-0" />
        ) : (
          <div className="size-9 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 font-bold text-sm shrink-0">
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
      <div className="h-dvh min-h-screen bg-slate-950 text-slate-100 font-body flex flex-col">
        <Header statusLabel="Aguardando sessão" statusColor="slate" />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
          <div className="size-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
            <Clock className="size-9 text-slate-500" />
          </div>
          <h2 className="font-heading text-2xl font-extrabold tracking-tight">Nenhuma votação em andamento</h2>
          <p className="text-sm text-slate-400 max-w-md">Aguarde o operador iniciar uma votação. Esta tela atualiza automaticamente.</p>
        </div>
      </div>
    );
  }

  /* ─── Estado: presidente aguardando ─── */
  if (isPresidente && !empate && !aguardandoDesempate && !meuVoto) {
    return (
      <div className="h-dvh min-h-screen bg-slate-950 text-slate-100 font-body flex flex-col">
        <Header statusLabel="Presidência · Aguardando" statusColor="amber" />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
          <div className="size-20 rounded-2xl bg-slate-900 border border-amber-500/30 flex items-center justify-center">
            <Vote className="size-9 text-amber-400" />
          </div>
          <h2 className="font-heading text-2xl font-extrabold tracking-tight">Votação em andamento</h2>
          <p className="text-sm text-slate-400 max-w-md">Seu voto será solicitado apenas em caso de empate.</p>

          <div className="mt-6 w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Em votação</span>
            <p className="mt-2 text-sm text-slate-200 leading-snug">{votacao.materia_ementa}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-slate-950 border border-emerald-500/20 rounded-lg p-3 text-center">
                <div className="text-emerald-400 text-2xl font-mono font-bold tabular-num">{String(votacao.votos_sim).padStart(2,'0')}</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-medium mt-0.5">Favoráveis</div>
              </div>
              <div className="bg-slate-950 border border-red-500/20 rounded-lg p-3 text-center">
                <div className="text-red-400 text-2xl font-mono font-bold tabular-num">{String(votacao.votos_nao).padStart(2,'0')}</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-medium mt-0.5">Contrários</div>
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
      Sim:        { cor: 'emerald', label: 'FAVORÁVEL', Icon: CheckCircle2, box: 'bg-emerald-500/10 border-emerald-500/40 shadow-emerald-500/10', icon: 'text-emerald-400', text: 'text-emerald-400' },
      'Não':      { cor: 'red',     label: 'CONTRÁRIO', Icon: XCircle,      box: 'bg-red-500/10 border-red-500/40 shadow-red-500/10',         icon: 'text-red-400',     text: 'text-red-400' },
      'Abstenção':{ cor: 'amber',   label: 'ABSTENÇÃO', Icon: MinusCircle,  box: 'bg-amber-500/10 border-amber-500/40 shadow-amber-500/10',   icon: 'text-amber-400',   text: 'text-amber-400' },
    };
    const conf = CONFIRM[meuVoto] || CONFIRM.Sim;
    const { Icon } = conf;
    return (
      <div className="h-dvh min-h-screen bg-slate-950 text-slate-100 font-body flex flex-col">
        <Header statusLabel="Voto registrado" statusColor={conf.cor} />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
          <div className={`size-28 rounded-3xl border flex items-center justify-center shadow-2xl ${conf.box}`}>
            <Icon className={`size-14 ${conf.icon}`} />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-slate-500">Seu voto</p>
            <h2 className={`font-heading text-4xl sm:text-5xl font-black tracking-tight ${conf.text}`}>{conf.label}</h2>
          </div>
          <p className="text-sm text-slate-300">Voto registrado com sucesso.</p>
          <p className="text-xs text-slate-500">Não é possível alterar o voto após confirmar.</p>
        </div>
      </div>
    );
  }

  /* ─── Estado principal: votando (tablet landscape primário) ─── */
  return (
    <div className="h-dvh min-h-screen bg-slate-950 text-slate-100 font-body flex flex-col">
      <Header statusLabel="Em votação nominal" statusColor="emerald" />

      <div
        className="flex-1 grid grid-cols-1 landscape:grid-cols-[1.1fr_1fr] sm:grid-cols-[1.1fr_1fr] gap-0"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* ESQUERDA — matéria + placar ao vivo */}
        <section className="overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 border-b sm:border-b-0 sm:border-r border-slate-800 flex flex-col gap-6">
          {/* Alerta de empate para presidente */}
          {isPresidente && (empate || aguardandoDesempate) && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
              <p className="text-amber-300 font-heading font-bold text-sm">⚖️ Empate detectado</p>
              <p className="text-amber-200/80 text-xs mt-0.5">Seu voto de desempate é necessário.</p>
            </div>
          )}

          {/* Matéria */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-emerald-400">
                {votacao.tipo_votacao}
              </span>
              <span className="text-[10px] font-mono text-slate-600">·</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-400">
                {votacao.materia_tipo}
              </span>
            </div>
            <h2 className="font-heading text-xl sm:text-2xl font-extrabold leading-tight tracking-tight text-slate-50">
              {votacao.materia_ementa}
            </h2>
          </div>

          {/* Placar ao vivo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Placar ao vivo</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Atualiza em tempo real</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-3 text-center">
                <div className="text-emerald-400 text-3xl font-mono font-bold tabular-num leading-none">{String(votacao.votos_sim).padStart(2,'0')}</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-medium mt-2">Favoráveis</div>
              </div>
              <div className="bg-slate-900 border border-red-500/20 rounded-xl p-3 text-center">
                <div className="text-red-400 text-3xl font-mono font-bold tabular-num leading-none">{String(votacao.votos_nao).padStart(2,'0')}</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-medium mt-2">Contrários</div>
              </div>
              <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-3 text-center">
                <div className="text-amber-400 text-3xl font-mono font-bold tabular-num leading-none">{String(votacao.abstencoes || 0).padStart(2,'0')}</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-medium mt-2">Abstenções</div>
              </div>
            </div>
          </div>
        </section>

        {/* DIREITA — botões de voto (FAVORÁVEL dominante) */}
        <section className="px-6 py-6 sm:px-8 sm:py-8 flex flex-col gap-3 justify-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500 text-center mb-1">
            Confirme sua manifestação
          </p>

          {/* FAVORÁVEL — dominante */}
          <button
            onClick={() => votar('Sim')}
            disabled={votando || !podeVotar}
            className="w-full min-h-[120px] sm:min-h-[160px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-heading font-black tracking-tight transition-all shadow-2xl shadow-emerald-500/25 flex items-center justify-center gap-4 select-none"
          >
            <CheckCircle2 className="size-9 sm:size-12" strokeWidth={2.5} />
            <span className="text-3xl sm:text-5xl">FAVORÁVEL</span>
          </button>

          {/* CONTRÁRIO — secundário (menor) */}
          <button
            onClick={() => votar('Não')}
            disabled={votando || !podeVotar}
            className="w-full min-h-[68px] sm:min-h-[80px] rounded-2xl bg-red-500 hover:bg-red-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-heading font-extrabold tracking-tight transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-3 select-none"
          >
            <XCircle className="size-6 sm:size-7" strokeWidth={2.5} />
            <span className="text-xl sm:text-2xl">CONTRÁRIO</span>
          </button>

          {/* ABSTENÇÃO — discreta */}
          <button
            onClick={() => votar('Abstenção')}
            disabled={votando || !podeVotar}
            className="w-full min-h-[52px] sm:min-h-[60px] rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 font-bold transition-all flex items-center justify-center gap-2 select-none"
          >
            <MinusCircle className="size-5" />
            <span className="text-base sm:text-lg uppercase tracking-wider">Abstenção</span>
          </button>

          <p className="text-[10px] font-mono text-slate-600 text-center mt-2 uppercase tracking-widest">
            O voto não pode ser alterado após a confirmação
          </p>
        </section>
      </div>
    </div>
  );
}