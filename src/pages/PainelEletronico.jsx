import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Monitor, Play, StopCircle, Plus, Settings, ExternalLink } from "lucide-react";
import TelaoVotacao from "@/components/painel/TelaoVotacao";
import InterfaceVereador from "@/components/painel/InterfaceVereador";
import { format } from "date-fns";

export default function PainelEletronico() {
  const { tenantId, userRole, camara } = useTenant();
  const { user } = useAuth();
  const [votacaoAtiva, setVotacaoAtiva] = useState(null);
  const [sessoes, setSessoes] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [modeTelao, setModeTelao] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({
    sessao_id: '', materia_id: '', tipo_votacao: 'Nominal',
    timer_discurso: 180, timer_aparte: 60, timer_questao: 120, timer_consideracoes: 60,
  });
  const timerRef = useRef(null);

  const isOperador = ['SUPER_ADMIN', 'ADMIN_CAMARA', 'SECRETARIA_LEGISLATIVA'].includes(userRole);
  const isVereador = userRole === 'VEREADOR';
  const isPresidente = userRole === 'PRESIDENTE';

  useEffect(() => {
    loadData();
    // Subscribe to votacao changes
    const unsub = base44.entities.Votacao.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create') {
        loadVotacaoAtiva();
      }
    });
    return () => unsub();
  }, [tenantId]);

  async function loadData() {
    const filter = tenantId ? { tenant_id: tenantId } : {};
    const [sess, mat, parl] = await Promise.all([
      base44.entities.Sessao.filter({ ...filter, status: 'Aberta' }, '-data', 10),
      base44.entities.Materia.filter({ ...filter, status: 'Em tramitação' }, '-created_date', 50),
      base44.entities.Parlamentar.filter({ ...filter, ativo: true }, 'nome', 100),
    ]);
    setSessoes(sess);
    setMaterias(mat);
    setParlamentares(parl);
    await loadVotacaoAtiva();
    setLoading(false);
  }

  async function loadVotacaoAtiva() {
    const filter = tenantId ? { tenant_id: tenantId } : {};
    const ativas = await base44.entities.Votacao.filter({ ...filter, status: 'Em Votação' }, '-created_date', 1);
    setVotacaoAtiva(ativas[0] || null);
  }

  async function iniciarVotacao() {
    const mat = materias.find(m => m.id === config.materia_id);
    const sessao = sessoes.find(s => s.id === config.sessao_id);
    // Mark presentes from sessao
    const presentes = sessao?.presencas?.filter(p => p.presente).map(p => p.parlamentar_id) || parlamentares.map(p => p.id);
    const parlamentaresPresentes = parlamentares.filter(p => presentes.includes(p.id));

    const nova = await base44.entities.Votacao.create({
      tenant_id: tenantId || '',
      sessao_id: config.sessao_id,
      sessao_numero: sessao?.numero || '',
      materia_id: config.materia_id,
      materia_ementa: mat?.ementa || '',
      materia_tipo: mat?.tipo || '',
      materia_numero: mat?.numero || '',
      tipo_votacao: config.tipo_votacao,
      status: 'Em Votação',
      votos: parlamentaresPresentes.map(p => ({
        parlamentar_id: p.id,
        parlamentar_nome: p.nome,
        partido_sigla: p.partido_sigla || p.partido || '',
        foto_url: p.foto_url || '',
        voto: null,
        hora: null,
      })),
      votos_sim: 0, votos_nao: 0, abstencoes: 0, ausentes: 0,
      resultado: 'Em votação',
      data_hora_inicio: new Date().toISOString(),
      timer_discurso: config.timer_discurso,
      timer_aparte: config.timer_aparte,
    });
    setVotacaoAtiva(nova);
    setShowConfig(false);
  }

  async function encerrarVotacao() {
    if (!votacaoAtiva) return;
    const sim = votacaoAtiva.votos_sim || 0;
    const nao = votacaoAtiva.votos_nao || 0;
    let resultado = sim > nao ? 'Aprovada' : nao > sim ? 'Rejeitada' : 'Empate';

    await base44.entities.Votacao.update(votacaoAtiva.id, {
      status: 'Encerrada',
      resultado,
      data_hora_fim: new Date().toISOString(),
    });

    // Atualiza status da matéria
    if (votacaoAtiva.materia_id && resultado !== 'Empate') {
      await base44.entities.Materia.update(votacaoAtiva.materia_id, {
        status: resultado === 'Aprovada' ? 'Aprovada' : 'Rejeitada',
      });
    }

    setVotacaoAtiva(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Interface do Vereador no dispositivo pessoal
  if (isVereador || isPresidente) {
    return <InterfaceVereador votacaoAtiva={votacaoAtiva} user={user} tenantId={tenantId} onRefresh={loadVotacaoAtiva} isPresidente={isPresidente} />;
  }

  // Modo telão (fullscreen)
  if (modeTelao && votacaoAtiva) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950">
        <TelaoVotacao votacaoAtiva={votacaoAtiva} camara={camara} parlamentares={parlamentares} onRefresh={loadVotacaoAtiva} />
        <button
          onClick={() => setModeTelao(false)}
          className="absolute top-4 right-4 text-white/30 hover:text-white text-xs bg-white/10 px-3 py-1.5 rounded-lg"
        >ESC / Sair do Telão</button>
      </div>
    );
  }

  // Interface do Operador
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <Monitor size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Painel Eletrônico</h1>
            <p className="text-sm text-muted-foreground">Controle de votações em tempo real</p>
          </div>
        </div>
        <div className="flex gap-2">
          {votacaoAtiva && (
            <Button variant="outline" onClick={() => setModeTelao(true)} className="gap-2">
              <ExternalLink size={15} /> Abrir Telão
            </Button>
          )}
          {isOperador && !votacaoAtiva && (
            <Button onClick={() => setShowConfig(true)} className="gap-2 shadow-lg shadow-primary/20">
              <Plus size={18} /> Iniciar Votação
            </Button>
          )}
          {isOperador && votacaoAtiva && (
            <Button onClick={encerrarVotacao} variant="destructive" className="gap-2">
              <StopCircle size={16} /> Encerrar Votação
            </Button>
          )}
        </div>
      </div>

      {/* Preview do telão embutido */}
      {votacaoAtiva ? (
        <div className="rounded-2xl overflow-hidden border border-border shadow-xl">
          <div className="bg-gray-950 text-white/50 text-xs px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Votação em andamento · Modo preview
          </div>
          <div style={{ height: '75vh' }}>
            <TelaoVotacao votacaoAtiva={votacaoAtiva} camara={camara} parlamentares={parlamentares} onRefresh={loadVotacaoAtiva} embedded />
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-3xl p-16 text-center">
          <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Monitor size={36} className="text-muted-foreground" />
          </div>
          <h3 className="font-heading font-semibold text-foreground text-lg">Nenhuma votação em andamento</h3>
          <p className="text-muted-foreground mt-2 text-sm mb-6">Configure e inicie uma votação para exibir o painel.</p>
          {isOperador && (
            <Button onClick={() => setShowConfig(true)} className="gap-2">
              <Play size={16} /> Iniciar Votação
            </Button>
          )}
        </div>
      )}

      {/* Modal configuração */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Settings size={18} /> Configurar Votação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Sessão Plenária</label>
              <Select value={config.sessao_id} onValueChange={v => setConfig(c => ({ ...c, sessao_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a sessão..." /></SelectTrigger>
                <SelectContent>
                  {sessoes.length === 0 && <SelectItem value="none" disabled>Nenhuma sessão aberta</SelectItem>}
                  {sessoes.map(s => <SelectItem key={s.id} value={s.id}>Sessão {s.numero} — {s.tipo} — {s.data}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Matéria em Pauta *</label>
              <Select value={config.materia_id} onValueChange={v => setConfig(c => ({ ...c, materia_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a matéria..." /></SelectTrigger>
                <SelectContent>
                  {materias.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.tipo} {m.numero && `nº ${m.numero}`} — {m.ementa?.slice(0, 60)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tipo de Votação</label>
              <Select value={config.tipo_votacao} onValueChange={v => setConfig(c => ({ ...c, tipo_votacao: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nominal">Nominal (pública — identifica cada voto)</SelectItem>
                  <SelectItem value="Sigilosa">Sigilosa (exibe apenas totais)</SelectItem>
                  <SelectItem value="Simbólica">Simbólica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Discurso (seg.)</label>
                <Input type="number" value={config.timer_discurso} onChange={e => setConfig(c => ({ ...c, timer_discurso: +e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Aparte (seg.)</label>
                <Input type="number" value={config.timer_aparte} onChange={e => setConfig(c => ({ ...c, timer_aparte: +e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Questão de Ordem (seg.)</label>
                <Input type="number" value={config.timer_questao} onChange={e => setConfig(c => ({ ...c, timer_questao: +e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Considerações Finais (seg.)</label>
                <Input type="number" value={config.timer_consideracoes} onChange={e => setConfig(c => ({ ...c, timer_consideracoes: +e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfig(false)}>Cancelar</Button>
            <Button onClick={iniciarVotacao} disabled={!config.materia_id} className="gap-2">
              <Play size={15} /> Iniciar Votação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}