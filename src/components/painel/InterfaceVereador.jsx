import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { sislegisEntities } from "@/lib/sislegisApi";
import { CheckCircle2, XCircle, MinusCircle, Vote, Clock } from "lucide-react";

// CORREÇÃO: Adicionado 'tenantId' na desestruturação dos parâmetros abaixo
export default function InterfaceVereador({ votacaoAtiva, user, onRefresh, isPresidente, tenantId }) {
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
    // PRIORIDADE: parlamentar_id vinculado (campo correto)
    // fallback: nome (apenas se parlamentar_id não estiver disponível)
    const entry = (v.votos || []).find(x => {
      if (user.parlamentar_id) {
        return x.parlamentar_id === user.parlamentar_id;
      }
      // fallback por nome quando não há vínculo cadastrado
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
        // Isolamento: ignora votações de outra câmara
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
        // Identificação correta: pelo vínculo parlamentar_id
        ehMeu = v.parlamentar_id === user.parlamentar_id;
      } else {
        // Fallback por nome quando não há vínculo cadastrado
        ehMeu = v.parlamentar_nome === user?.nome ||
                v.parlamentar_nome === (user?.full_name || '');
      }
      if (ehMeu) {
        return { ...v, voto: opcao, hora: new Date().toISOString() };
      }
      return v;
    });

    // Verificação de segurança: se nenhum slot foi encontrado, abortar
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
    
    // CORREÇÃO: Incluído o 'tenant_id' para passar pelas regras de validação de segurança (RLS) do backend
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

  // Sem votação ativa
  if (semVotacao) {
    return (
      <div className="h-dvh min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
          <Vote size={36} className="text-white/30" />
        </div>
        <h2 className="text-white font-heading font-bold text-xl mb-2">Nenhuma votação em andamento</h2>
        <p className="text-white/40 text-sm">Aguarde o operador iniciar uma votação.</p>
      </div>
    );
  }

  // Presidente aguardando (sem empate ainda)
  if (isPresidente && !empate && !aguardandoDesempate && !meuVoto) {
    return (
      <div className="h-dvh min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center text-center p-6">
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
              <div className="text-green-400 text-3xl font-bold tabular-num">{votacao.votos_sim}</div>
              <div className="text-white/40 text-xs mt-0.5">Favoráveis</div>
            </div>
            <div className="text-center">
              <div className="text-red-400 text-3xl font-bold tabular-num">{votacao.votos_nao}</div>
              <div className="text-white/40 text-xs mt-0.5">Contrários</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Já votou — tela de confirmação
  if (meuVoto) {
    const cor = meuVoto === 'Sim' ? 'text-green-400' : meuVoto === 'Não' ? 'text-red-400' : 'text-yellow-400';
    const corBg = meuVoto === 'Sim' ? 'bg-green-500/10 border-green-500/40' : meuVoto === 'Não' ? 'bg-red-500/10 border-red-500/40' : 'bg-yellow-500/10 border-yellow-500/40';
    const corGlow = meuVoto === 'Sim' ? 'shadow-green-500/20' : meuVoto === 'Não' ? 'shadow-red-500/20' : 'shadow-yellow-500/20';
    const icone = meuVoto === 'Sim' ? <CheckCircle2 size={64} /> : meuVoto === 'Não' ? <XCircle size={64} /> : <MinusCircle size={64} />;
    const label = meuVoto === 'Sim' ? 'FAVORÁVEL' : meuVoto === 'Não' ? 'CONTRÁRIO' : 'ABSTENÇÃO';
    return (
      <div className="h-dvh min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center text-center p-8">
        <div className={`w-36 h-36 rounded-[2rem] flex items-center justify-center border-2 mb-6 shadow-2xl ${corBg} ${cor} ${corGlow}`}>
          {icone}
        </div>
        <div className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">Seu voto</div>
        <div className={`text-5xl font-heading font-black mb-4 ${cor}`}>{label}</div>
        <p className="text-white/50 text-sm">Voto registrado com sucesso.</p>
        <p className="text-white/25 text-xs mt-2">Não é possível alterar o voto após confirmar.</p>
      </div>
    );
  }

  // Identificação do votante
  const nomeVotante = user?.nome || user?.full_name || 'Parlamentar';
  const inicialVotante = nomeVotante.charAt(0);

  // Interface de votação (otimizada para celular/tablet)
  return (
    <div className="h-dvh min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col">
      {/* Cabeçalho fixo — status + identificação do votante */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-950/60 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse block" />
          <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Em votação</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white/70 text-xs font-medium truncate max-w-[150px]">{nomeVotante}</span>
          {user?.foto_url ? (
            <img src={user.foto_url} alt={nomeVotante} className="w-7 h-7 rounded-full object-cover border border-white/20" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-primary/30 text-white text-xs font-bold flex items-center justify-center">{inicialVotante}</div>
          )}
        </div>
      </div>

      {/* Conteúdo rolável */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg w-full mx-auto px-4 py-4 space-y-4">
          {/* Alerta de empate para presidente */}
          {isPresidente && (empate || aguardandoDesempate) && (
            <div className="bg-yellow-500/15 border border-yellow-500/40 rounded-2xl p-4 text-center">
              <div className="text-yellow-400 font-bold text-base">⚖️ Empate detectado</div>
              <div className="text-yellow-400/70 text-sm mt-1">Seu voto de desempate é necessário</div>
            </div>
          )}

          {/* Matéria */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="text-white/40 text-[11px] uppercase tracking-wider mb-2">
              {votacao.tipo_votacao} · {votacao.materia_tipo}
            </div>
            <div className="text-white font-medium leading-snug">{votacao.materia_ementa}</div>
          </div>

          {/* Placar ao vivo */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
              <div className="text-green-400 text-2xl font-bold tabular-num">{votacao.votos_sim}</div>
              <div className="text-green-400/60 text-[11px] mt-0.5">Favoráveis</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
              <div className="text-red-400 text-2xl font-bold tabular-num">{votacao.votos_nao}</div>
              <div className="text-red-400/60 text-[11px] mt-0.5">Contrários</div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
              <div className="text-yellow-400 text-2xl font-bold tabular-num">{votacao.abstencoes || 0}</div>
              <div className="text-yellow-400/60 text-[11px] mt-0.5">Abstenções</div>
            </div>
          </div>
        </div>
      </div>

      {/* Botões fixos no rodapé (área de toque grande + safe-area do celular) */}
      <div className="flex-shrink-0 border-t border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="max-w-lg w-full mx-auto px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
          <button
            onClick={() => votar('Sim')}
            disabled={votando || !podeVotar}
            className="w-full py-5 rounded-2xl bg-green-500 hover:bg-green-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-heading font-black text-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-500/25 select-none"
          >
            <CheckCircle2 size={30} /> FAVORÁVEL
          </button>
          <button
            onClick={() => votar('Não')}
            disabled={votando || !podeVotar}
            className="w-full py-5 rounded-2xl bg-red-500 hover:bg-red-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-heading font-black text-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-500/25 select-none"
          >
            <XCircle size={30} /> CONTRÁRIO
          </button>
          <button
            onClick={() => votar('Abstenção')}
            disabled={votando || !podeVotar}
            className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white/70 font-bold text-lg flex items-center justify-center gap-2 transition-all select-none"
          >
            <MinusCircle size={22} /> ABSTENÇÃO
          </button>
        </div>
      </div>
    </div>
  );
}