import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Vote, CheckCircle2, XCircle, MinusCircle, Users, BarChart3, Clock, Play, StopCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Votacao() {
  const [votacoes, setVotacoes] = useState([]);
  const [votacaoAtiva, setVotacaoAtiva] = useState(null);
  const [parlamentares, setParlamentares] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [showNovaVotacao, setShowNovaVotacao] = useState(false);
  const [novaVotacao, setNovaVotacao] = useState({ materia_id: '', tipo_votacao: 'Nominal' });
  const [votandoParlamentar, setVotandoParlamentar] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [v, p, m] = await Promise.all([
      base44.entities.Votacao.list('-created_date', 20),
      base44.entities.Parlamentar.filter({ ativo: true }),
      base44.entities.Materia.filter({ status: 'Em tramitação' }),
    ]);
    setVotacoes(v);
    setParlamentares(p);
    setMaterias(m);
    const ativa = v.find(x => x.status === 'Em Votação');
    setVotacaoAtiva(ativa || null);
    setLoading(false);
  }

  async function iniciarVotacao() {
    const mat = materias.find(m => m.id === novaVotacao.materia_id);
    const nova = await base44.entities.Votacao.create({
      materia_id: novaVotacao.materia_id,
      materia_ementa: mat?.ementa || 'Matéria',
      materia_tipo: mat?.tipo || '',
      tipo_votacao: novaVotacao.tipo_votacao,
      status: 'Em Votação',
      votos: [],
      votos_sim: 0,
      votos_nao: 0,
      abstencoes: 0,
      resultado: 'Em votação',
      data_hora: new Date().toISOString(),
    });
    setVotacaoAtiva(nova);
    setShowNovaVotacao(false);
    loadData();
  }

  async function registrarVoto(voto) {
    if (!votacaoAtiva || !votandoParlamentar) return;
    const jaVotou = (votacaoAtiva.votos || []).find(v => v.parlamentar_id === votandoParlamentar.id);
    if (jaVotou) return;
    const novosVotos = [...(votacaoAtiva.votos || []), {
      parlamentar_id: votandoParlamentar.id,
      parlamentar_nome: votandoParlamentar.nome,
      voto,
      hora: format(new Date(), 'HH:mm:ss'),
    }];
    const updated = await base44.entities.Votacao.update(votacaoAtiva.id, {
      votos: novosVotos,
      votos_sim: novosVotos.filter(v => v.voto === 'Sim').length,
      votos_nao: novosVotos.filter(v => v.voto === 'Não').length,
      abstencoes: novosVotos.filter(v => v.voto === 'Abstenção').length,
    });
    setVotacaoAtiva(updated);
    setVotandoParlamentar(null);
  }

  async function encerrarVotacao() {
    if (!votacaoAtiva) return;
    const sim = votacaoAtiva.votos_sim || 0;
    const nao = votacaoAtiva.votos_nao || 0;
    const resultado = sim > nao ? 'Aprovada' : nao > sim ? 'Rejeitada' : 'Rejeitada';
    await base44.entities.Votacao.update(votacaoAtiva.id, { status: 'Encerrada', resultado });
    setVotacaoAtiva(null);
    loadData();
  }

  const votos = votacaoAtiva?.votos || [];
  const sim = votos.filter(v => v.voto === 'Sim').length;
  const nao = votos.filter(v => v.voto === 'Não').length;
  const abstencao = votos.filter(v => v.voto === 'Abstenção').length;
  const total = parlamentares.length || 1;
  const votaram = votos.length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <Vote className="text-primary" size={30} /> Votação
          </h1>
          <p className="text-muted-foreground mt-1">Painel de votação em tempo real</p>
        </div>
        {!votacaoAtiva && (
          <Button onClick={() => setShowNovaVotacao(true)} className="gap-2 shadow-lg shadow-primary/20">
            <Plus size={18} /> Nova Votação
          </Button>
        )}
      </div>

      {/* Painel de votação ativa */}
      {votacaoAtiva ? (
        <div className="space-y-6">
          {/* Matéria em votação */}
          <div className="bg-primary text-primary-foreground rounded-3xl p-6 shadow-xl shadow-primary/25">
            <div className="flex items-center gap-2 text-sm opacity-80 mb-2 font-semibold uppercase tracking-wider">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Em Votação · {votacaoAtiva.tipo_votacao}
            </div>
            <div className="text-xl md:text-2xl font-heading font-bold leading-snug">{votacaoAtiva.materia_ementa}</div>
            {votacaoAtiva.materia_tipo && (
              <div className="mt-2 text-sm opacity-70">{votacaoAtiva.materia_tipo}</div>
            )}
          </div>

          {/* Placar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 text-center">
              <div className="text-5xl font-heading font-bold text-green-600">{sim}</div>
              <div className="text-green-600 font-semibold mt-1 flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> SIM
              </div>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 text-center">
              <div className="text-5xl font-heading font-bold text-red-600">{nao}</div>
              <div className="text-red-600 font-semibold mt-1 flex items-center justify-center gap-2">
                <XCircle size={16} /> NÃO
              </div>
            </div>
            <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-5 text-center">
              <div className="text-5xl font-heading font-bold text-gray-500">{abstencao}</div>
              <div className="text-gray-500 font-semibold mt-1 flex items-center justify-center gap-2">
                <MinusCircle size={16} /> ABSTENÇÃO
              </div>
            </div>
          </div>

          {/* Progresso */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>{votaram} de {total} parlamentares votaram</span>
              <span>{Math.round((votaram / total) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${(votaram / total) * 100}%` }} />
            </div>
          </div>

          {/* Lista de parlamentares para votar */}
          {votacaoAtiva.tipo_votacao === 'Nominal' && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-heading font-semibold">Votos dos Parlamentares</h3>
              </div>
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {parlamentares.map((p) => {
                  const voto = votos.find(v => v.parlamentar_id === p.id);
                  return (
                    <div key={p.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <div className="font-medium text-sm text-foreground">{p.nome}</div>
                        <div className="text-xs text-muted-foreground">{p.partido}</div>
                      </div>
                      {voto ? (
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          voto.voto === 'Sim' ? 'bg-green-100 text-green-700' :
                          voto.voto === 'Não' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{voto.voto}</span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setVotandoParlamentar(p)} className="text-xs">
                          Registrar Voto
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Encerrar */}
          <div className="flex justify-end">
            <Button onClick={encerrarVotacao} variant="destructive" className="gap-2">
              <StopCircle size={18} /> Encerrar Votação
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Vote size={36} className="text-muted-foreground" />
          </div>
          <h3 className="font-heading font-semibold text-foreground text-lg">Nenhuma votação em andamento</h3>
          <p className="text-muted-foreground mt-2 text-sm">Clique em "Nova Votação" para iniciar uma votação.</p>
        </div>
      )}

      {/* Histórico */}
      {votacoes.filter(v => v.status === 'Encerrada').length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-heading font-semibold">Histórico de Votações</h2>
          </div>
          <div className="divide-y divide-border">
            {votacoes.filter(v => v.status === 'Encerrada').map((v) => (
              <div key={v.id} className="flex items-center gap-4 px-6 py-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${v.resultado === 'Aprovada' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {v.resultado === 'Aprovada' ? <CheckCircle2 size={18} className="text-green-600" /> : <XCircle size={18} className="text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{v.materia_ementa}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {v.votos_sim} sim · {v.votos_nao} não · {v.abstencoes} abstenções
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${v.resultado === 'Aprovada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {v.resultado}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal nova votação */}
      <Dialog open={showNovaVotacao} onOpenChange={setShowNovaVotacao}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Iniciar Nova Votação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Matéria em pauta</label>
              <Select onValueChange={(v) => setNovaVotacao(p => ({ ...p, materia_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a matéria..." /></SelectTrigger>
                <SelectContent>
                  {materias.map(m => (
                    <SelectItem key={m.id} value={m.id} className="whitespace-normal">
                      <span className="font-medium">{m.tipo}</span> — {m.ementa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Tipo de votação</label>
              <Select defaultValue="Nominal" onValueChange={(v) => setNovaVotacao(p => ({ ...p, tipo_votacao: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Simbólica">Simbólica</SelectItem>
                  <SelectItem value="Nominal">Nominal</SelectItem>
                  <SelectItem value="Secreta">Secreta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovaVotacao(false)}>Cancelar</Button>
            <Button onClick={iniciarVotacao} disabled={!novaVotacao.materia_id} className="gap-2">
              <Play size={16} /> Iniciar Votação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal registrar voto */}
      <Dialog open={!!votandoParlamentar} onOpenChange={() => setVotandoParlamentar(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Registrar Voto</DialogTitle>
          </DialogHeader>
          {votandoParlamentar && (
            <div className="space-y-4 py-2">
              <div className="bg-muted rounded-xl p-4 text-center">
                <div className="font-semibold text-foreground">{votandoParlamentar.nome}</div>
                <div className="text-sm text-muted-foreground">{votandoParlamentar.partido}</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => registrarVoto('Sim')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-green-50 border-2 border-green-200 hover:border-green-400 hover:bg-green-100 transition-all"
                >
                  <CheckCircle2 size={28} className="text-green-600" />
                  <span className="font-bold text-green-700">SIM</span>
                </button>
                <button
                  onClick={() => registrarVoto('Não')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-red-50 border-2 border-red-200 hover:border-red-400 hover:bg-red-100 transition-all"
                >
                  <XCircle size={28} className="text-red-600" />
                  <span className="font-bold text-red-700">NÃO</span>
                </button>
                <button
                  onClick={() => registrarVoto('Abstenção')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-100 transition-all"
                >
                  <MinusCircle size={28} className="text-gray-500" />
                  <span className="font-bold text-gray-600">ABSTENção</span>
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}