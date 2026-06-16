import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { sislegisEntities } from "@/lib/sislegisApi";
import { CheckCircle2, XCircle, MinusCircle, Vote, Clock } from "lucide-react";

export default function InterfaceVereador({ votacaoAtiva, user, onRefresh, isPresidente }) {
  const [votacao, setVotacao] = useState(votacaoAtiva);
  const [meuVoto, setMeuVoto] = useState(null);
  const [votando, setVotando] = useState(false);

  // Detecta empate: todos votaram (exceto presidente se ele não está nos votos normais) e sim === nao
  const detectarEmpate = (v) => {
    if (!isPresidente || !v) return false;
    const votos = v.votos || [];
    // Votos dos não-presidentes
    const votosNormais = votos.filter(x => !x.is_presidente);
    const todosVotaram = votosNormais.every(x => x.voto);
    if (!todosVotaram) return false;
    const sim = votosNormais.filter(x => x.voto === 'Sim').length;
    const nao = votosNormais.filter(x => x.voto === 'Não').length;
    return sim === nao && sim > 0;
  };

  const getMeuVoto = (v) => {
    if (!v || !user) return null;
    const entry = (v.votos || []).find(x => x.parlamentar_id === user.id || x.parlamentar_nome === user.full_name);
    return entry?.voto || null;
  };

  useEffect(() => {
    setVotacao(votacaoAtiva);
    setMeuVoto(getMeuVoto(votacaoAtiva));
  }, [votacaoAtiva]);

  useEffect(() => {
    const unsub = base44.entities.Votacao.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create') {
        setVotacao(event.data);
        setMeuVoto(getMeuVoto(event.data));
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
    const sim = novosVotos.filter(v => !v.is_presidente && v.voto === 'Sim').length;
    const nao = novosVotos.filter(v => !v.is_presidente && v.voto === 'Não').length;
    const abstencoes = novosVotos.filter(v => v.voto === 'Abstenção').length;
    await sislegisEntities.Votacao.update(votacao.id, {
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

  // Sem votação ativa
  if (semVotacao) {
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

  // Presidente aguardando (sem empate ainda)
  if (isPresidente && !empate && !aguardandoDesempate && !meuVoto) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center mb-4">
          <Clock size={36} className="text-primary" />
        </div>
        <h2 className="text-white font-heading font-bold text-xl mb-2">Votação em andamento</h2>
        <p className="text-white/50 text-sm mb-6">Seu voto será solicitado apenas em caso de empate.</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-sm w-full">
          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">Em votação</div>
          <div className="text-white font-medium text-sm leading-snug mb-4">{votacao.materia_ementa}</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-green-400 text-3xl font-bold">{votacao.votos_sim}</div>
              <div className="text-white/30 text-xs mt-0.5">Favoráveis</div>
            </div>
            <div className="text-center">
              <div className="text-red-400 text-3xl font-bold">{votacao.votos_nao}</div>
              <div className="text-white/30 text-xs mt-0.5">Contrários</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Já votou — tela de confirmação
  if (meuVoto) {
    const cor = meuVoto === 'Sim' ? 'text-green-400' : meuVoto === 'Não' ? 'text-red-400' : 'text-yellow-400';
    const corBg = meuVoto === 'Sim' ? 'bg-green-500/10 border-green-500/30' : meuVoto === 'Não' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30';
    const icone = meuVoto === 'Sim' ? <CheckCircle2 size={52} /> : meuVoto === 'Não' ? <XCircle size={52} /> : <MinusCircle size={52} />;
    const label = meuVoto === 'Sim' ? 'FAVORÁVEL' : meuVoto === 'Não' ? 'CONTRÁRIO' : 'ABSTENÇÃO';
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center p-8">
        <div className={`w-32 h-32 rounded-3xl flex items-center justify-center border-2 mb-6 ${corBg} ${cor}`}>
          {icone}
        </div>
        <div className={`text-4xl font-heading font-black mb-3 ${cor}`}>{label}</div>
        <p className="text-white/40 text-sm">Voto registrado com sucesso.</p>
        <p className="text-white/20 text-xs mt-2">Não é possível alterar seu voto após confirmar.</p>
      </div>
    );
  }

  // Interface de votação
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse block" />
        <span className="text-green-400 text-sm font-semibold uppercase tracking-wider">Votação em andamento</span>
      </div>

      {/* Alerta de empate para presidente */}
      {isPresidente && (empate || aguardandoDesempate) && (
        <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-4 mb-5 text-center">
          <div className="text-yellow-400 font-bold text-base">⚖️ EMPATE DETECTADO</div>
          <div className="text-yellow-400/70 text-sm mt-1">Seu voto de desempate é necessário</div>
        </div>
      )}

      {/* Matéria */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
        <div className="text-white/40 text-xs uppercase tracking-wider mb-2">
          {votacao.tipo_votacao} · {votacao.materia_tipo}
        </div>
        <div className="text-white font-medium leading-snug text-sm">{votacao.materia_ementa}</div>
      </div>

      {/* Placar ao vivo */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <div className="text-green-400 text-2xl font-bold">{votacao.votos_sim}</div>
          <div className="text-green-400/60 text-xs mt-0.5">Favoráveis</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <div className="text-red-400 text-2xl font-bold">{votacao.votos_nao}</div>
          <div className="text-red-400/60 text-xs mt-0.5">Contrários</div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
          <div className="text-yellow-400 text-2xl font-bold">{votacao.abstencoes || 0}</div>
          <div className="text-yellow-400/60 text-xs mt-0.5">Abstenções</div>
        </div>
      </div>

      {/* Botões */}
      <div className="flex flex-col gap-4 mt-auto">
        <button
          onClick={() => votar('Sim')}
          disabled={votando || !podeVotar}
          className="w-full py-6 rounded-2xl bg-green-500 hover:bg-green-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-heading font-black text-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-500/25"
        >
          <CheckCircle2 size={30} /> FAVORÁVEL
        </button>
        <button
          onClick={() => votar('Não')}
          disabled={votando || !podeVotar}
          className="w-full py-6 rounded-2xl bg-red-500 hover:bg-red-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-heading font-black text-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-500/25"
        >
          <XCircle size={30} /> CONTRÁRIO
        </button>
        <button
          onClick={() => votar('Abstenção')}
          disabled={votando || !podeVotar}
          className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white/60 font-semibold text-lg flex items-center justify-center gap-2 transition-all"
        >
          <MinusCircle size={22} /> ABSTENÇÃO
        </button>
      </div>
    </div>
  );
}