import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, MinusCircle, Vote, Clock } from "lucide-react";

export default function InterfaceVereador({ votacaoAtiva, user, tenantId, onRefresh, isPresidente }) {
  const [votacao, setVotacao] = useState(votacaoAtiva);
  const [meuVoto, setMeuVoto] = useState(null);
  const [votando, setVotando] = useState(false);
  const [empate, setEmpate] = useState(false);

  useEffect(() => {
    setVotacao(votacaoAtiva);
    if (votacaoAtiva) {
      const meu = (votacaoAtiva.votos || []).find(v => v.parlamentar_id === user?.id || v.parlamentar_nome === user?.full_name);
      setMeuVoto(meu?.voto || null);
      // Detectar empate para presidente
      if (isPresidente) {
        const sim = votacaoAtiva.votos_sim || 0;
        const nao = votacaoAtiva.votos_nao || 0;
        const aguardando = (votacaoAtiva.votos || []).filter(v => !v.voto && v.parlamentar_id !== user?.id).length;
        setEmpate(sim === nao && aguardando === 0 && sim > 0);
      }
    }
  }, [votacaoAtiva]);

  useEffect(() => {
    const unsub = base44.entities.Votacao.subscribe((event) => {
      if (event.type === 'update') {
        setVotacao(event.data);
        const meu = (event.data.votos || []).find(v => v.parlamentar_id === user?.id || v.parlamentar_nome === user?.full_name);
        setMeuVoto(meu?.voto || null);
        if (isPresidente) {
          const sim = event.data.votos_sim || 0;
          const nao = event.data.votos_nao || 0;
          const aguardando = (event.data.votos || []).filter(v => !v.voto && v.parlamentar_id !== user?.id).length;
          setEmpate(sim === nao && aguardando === 0 && sim > 0);
        }
      }
    });
    return () => unsub();
  }, [user?.id]);

  async function votar(opcao) {
    if (!votacao || meuVoto || votando) return;
    setVotando(true);
    const novosVotos = (votacao.votos || []).map(v => {
      if (v.parlamentar_id === user?.id || v.parlamentar_nome === user?.full_name) {
        return { ...v, voto: opcao, hora: new Date().toISOString() };
      }
      return v;
    });
    const sim = novosVotos.filter(v => v.voto === 'Sim').length;
    const nao = novosVotos.filter(v => v.voto === 'Não').length;
    const abstencoes = novosVotos.filter(v => v.voto === 'Abstenção').length;
    await base44.entities.Votacao.update(votacao.id, {
      votos: novosVotos, votos_sim: sim, votos_nao: nao, abstencoes,
    });
    setMeuVoto(opcao);
    setVotando(false);
    onRefresh?.();
  }

  // Sem votação ativa
  if (!votacao || votacao.status !== 'Em Votação') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
          <Vote size={36} className="text-white/30" />
        </div>
        <h2 className="text-white font-heading font-bold text-xl mb-2">Nenhuma votação em andamento</h2>
        <p className="text-white/30 text-sm">Aguarde o operador iniciar uma votação.</p>
      </div>
    );
  }

  // Presidente em modo de espera (sem empate ainda)
  if (isPresidente && !empate && !meuVoto) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center mb-4">
          <Clock size={36} className="text-primary" />
        </div>
        <h2 className="text-white font-heading font-bold text-xl mb-2">Votação em andamento</h2>
        <p className="text-white/50 text-sm mb-4">Seu voto será solicitado em caso de empate.</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-sm">
          <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Em votação</div>
          <div className="text-white font-medium text-sm leading-snug">{votacao.materia_ementa}</div>
          <div className="mt-3 flex justify-center gap-6">
            <div className="text-center">
              <div className="text-green-400 text-2xl font-bold">{votacao.votos_sim}</div>
              <div className="text-white/30 text-xs">Favoráveis</div>
            </div>
            <div className="text-center">
              <div className="text-red-400 text-2xl font-bold">{votacao.votos_nao}</div>
              <div className="text-white/30 text-xs">Contrários</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Já votou
  if (meuVoto) {
    const corBg = meuVoto === 'Sim' ? 'bg-green-500/10 border-green-500/30' : meuVoto === 'Não' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30';
    const corTexto = meuVoto === 'Sim' ? 'text-green-400' : meuVoto === 'Não' ? 'text-red-400' : 'text-yellow-400';
    const icone = meuVoto === 'Sim' ? <CheckCircle2 size={48} /> : meuVoto === 'Não' ? <XCircle size={48} /> : <MinusCircle size={48} />;
    const label = meuVoto === 'Sim' ? 'FAVORÁVEL' : meuVoto === 'Não' ? 'CONTRÁRIO' : 'ABSTENÇÃO';
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center p-8">
        <div className={`w-28 h-28 rounded-3xl flex items-center justify-center border-2 mb-6 ${corBg} ${corTexto}`}>
          {icone}
        </div>
        <div className={`text-4xl font-heading font-black mb-2 ${corTexto}`}>{label}</div>
        <p className="text-white/30 text-sm">Seu voto foi registrado com sucesso.</p>
        <div className="mt-6 text-white/20 text-xs">Você não pode alterar seu voto após confirmar.</div>
      </div>
    );
  }

  // Interface de votação
  const podeVotar = !isPresidente || empate;
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        <span className="text-green-400 text-sm font-semibold uppercase tracking-wider">Votação em andamento</span>
      </div>

      {isPresidente && empate && (
        <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-4 mb-6 text-center">
          <div className="text-yellow-400 font-bold text-sm">⚖️ EMPATE DETECTADO</div>
          <div className="text-yellow-400/70 text-xs mt-1">Aguardando voto de desempate do Presidente</div>
        </div>
      )}

      {/* Matéria */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
        <div className="text-white/40 text-xs uppercase tracking-wider mb-2">{votacao.tipo_votacao} · {votacao.materia_tipo}</div>
        <div className="text-white font-medium leading-snug">{votacao.materia_ementa}</div>
      </div>

      {/* Placar atual */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <div className="text-green-400 text-2xl font-bold">{votacao.votos_sim}</div>
          <div className="text-green-400/60 text-xs">Favoráveis</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <div className="text-red-400 text-2xl font-bold">{votacao.votos_nao}</div>
          <div className="text-red-400/60 text-xs">Contrários</div>
        </div>
      </div>

      {/* Botões de voto */}
      <div className="flex flex-col gap-4 mt-auto">
        <button
          onClick={() => votar('Sim')}
          disabled={votando || !podeVotar}
          className="w-full py-6 rounded-2xl bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-heading font-black text-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-green-500/25"
        >
          <CheckCircle2 size={32} /> FAVORÁVEL
        </button>
        <button
          onClick={() => votar('Não')}
          disabled={votando || !podeVotar}
          className="w-full py-6 rounded-2xl bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-heading font-black text-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-red-500/25"
        >
          <XCircle size={32} /> CONTRÁRIO
        </button>
        <button
          onClick={() => votar('Abstenção')}
          disabled={votando || !podeVotar}
          className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white/60 font-semibold text-lg flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <MinusCircle size={22} /> ABSTENÇÃO
        </button>
      </div>
    </div>
  );
}