import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Monitor, Play, StopCircle, Plus, Settings, ExternalLink, Users } from "lucide-react";
import TelaoVotacao from "@/components/painel/TelaoVotacao";
import InterfaceVereador from "@/components/painel/InterfaceVereador";

export default function PainelEletronico() {
  const { tenantId, withTenant, canQuery, userRole, camara, isOperadorGeral } = useTenant();
  const { user } = useAuth();
  const [votacaoAtiva, setVotacaoAtiva] = useState(null);
  const [sessoes, setSessoes] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [modeTelao, setModeTelao] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({
    sessao_id: '',
    materia_id: '',
    tipo_votacao: 'Nominal',
    timer_discurso: 180,
    timer_aparte: 60,
    timer_questao: 120,
    timer_consideracoes: 60,
  });

  const isVereador = userRole === 'VEREADOR';
  const isPresidente = userRole === 'PRESIDENTE';

  useEffect(() => {
    if (canQuery) loadData();
  }, [tenantId, canQuery]);

  useEffect(() => {
    const unsub = base44.entities.Votacao.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create') {
        loadVotacaoAtiva();
      }
    });
    return () => unsub();
  }, [tenantId]);

  async function loadData() {
    const filter = withTenant({});
    const [sess, mat, parl] = await Promise.all([
      base44.entities.Sessao.filter({ ...filter, status: 'Em Andamento' }, '-data', 20),
      base44.entities.Materia.filter({ ...filter, status: 'Em tramitação' }, '-created_date', 100),
      base44.entities.Parlamentar.filter({ ...filter, ativo: true }, 'nome', 100),
    ]);
    setSessoes(sess);
    setMaterias(mat);
    setParlamentares(parl);
    await loadVotacaoAtiva();
    setLoading(false);
  }

  async function loadVotacaoAtiva() {
    const filter = withTenant({});
    const ativas = await base44.entities.Votacao.filter({ ...filter, status: 'Em Votação' }, '-created_date', 1);
    if (ativas.length) { setVotacaoAtiva(ativas[0]); return; }
    const desempate = await base44.entities.Votacao.filter({ ...filter, status: 'Aguardando Desempate' }, '-created_date', 1);
    setVotacaoAtiva(desempate[0] || null);
  }

  async function iniciarVotacao() {
    const mat = materias.find(m => m.id === config.materia_id);
    const sessao = sessoes.find(s => s.id === config.sessao_id);

    // Usa presenças da sessão, ou todos os parlamentares
    const presentes = sessao?.presencas?.filter(p => p.presente) || [];
    const parlamentaresPresentes = presentes.length
      ? parlamentares.filter(p => presentes.find(pr => pr.parlamentar_id === p.id))
      : parlamentares;

    // Monta votos (presidente não vota normalmente)
    const votos = parlamentaresPresentes.map(p => ({
      parlamentar_id: p.id,
      parlamentar_nome: p.nome_parlamentar || p.nome,
      partido_sigla: p.partido_sigla || '',
      foto_url: p.foto_url || '',
      voto: null,
      hora: null,
      is_presidente: p.role === 'PRESIDENTE' || userRole === 'PRESIDENTE' && p.id === user?.id,
    }));

    const sessaoDescricao = sessao
      ? [
          sessao.numero ? `${sessao.numero}ª Sessão ${sessao.tipo}` : `Sessão ${sessao.tipo}`,
          sessao.sessao_legislativa_numero ? `${sessao.sessao_legislativa_numero}ª Sessão Legislativa` : null,
          sessao.legislatura_numero ? `${sessao.legislatura_numero}ª Legislatura` : null,
        ].filter(Boolean).join(' · ')
      : '';

    await base44.entities.Votacao.create({
      tenant_id: tenantId || '',
      sessao_id: config.sessao_id,
      sessao_numero: sessao?.numero || '',
      sessao_descricao: sessaoDescricao,
      materia_id: config.materia_id,
      materia_ementa: mat?.ementa || '',
      materia_tipo: mat?.tipo || '',
      materia_numero: mat?.numero || '',
      tipo_votacao: config.tipo_votacao,
      status: 'Em Votação',
      votos,
      votos_sim: 0, votos_nao: 0, abstencoes: 0, ausentes: 0,
      resultado: 'Em votação',
      data_hora_inicio: new Date().toISOString(),
      timer_discurso: config.timer_discurso,
      timer_aparte: config.timer_aparte,
      timer_questao: config.timer_questao,
      timer_consideracoes: config.timer_consideracoes,
    });
    setShowConfig(false);
    loadVotacaoAtiva();
  }

  async function encerrarVotacao() {
    if (!votacaoAtiva) return;
    const votos = votacaoAtiva.votos || [];
    // Contar apenas votos não-presidente para resultado base
    const votosNormais = votos.filter(v => !v.is_presidente);
    const sim = votosNormais.filter(v => v.voto === 'Sim').length + (votos.find(v => v.is_presidente && v.voto === 'Sim') ? 1 : 0);
    const nao = votosNormais.filter(v => v.voto === 'Não').length + (votos.find(v => v.is_presidente && v.voto === 'Não') ? 1 : 0);
    const totalVotantes = votos.filter(v => v.voto).length;

    let resultado;
    if (sim > nao) {
      resultado = totalVotantes === votos.length && sim === votos.length ? 'Aprovada por Unanimidade' : 'Aprovada';
    } else if (nao > sim) {
      resultado = 'Rejeitada';
    } else {
      resultado = 'Empate';
    }

    await base44.entities.Votacao.update(votacaoAtiva.id, {
      status: 'Encerrada',
      resultado,
      votos_sim: sim,
      votos_nao: nao,
      data_hora_fim: new Date().toISOString(),
    });

    // Atualiza status da matéria
    if (votacaoAtiva.materia_id && resultado !== 'Empate') {
      const novoStatus = resultado.startsWith('Aprovada') ? 'Aprovada' : 'Rejeitada';
      const campoData = novoStatus === 'Aprovada' ? { data_aprovacao: new Date().toISOString().slice(0, 10) } : { data_rejeicao: new Date().toISOString().slice(0, 10) };
      await base44.entities.Materia.update(votacaoAtiva.materia_id, {
        status: novoStatus,
        ...campoData,
      });
    }

    setVotacaoAtiva(null);
  }

  const sessaoSelecionada = sessoes.find(s => s.id === config.sessao_id);
  const presentes = sessaoSelecionada?.presencas?.filter(p => p.presente).length || parlamentares.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Interface Vereador / Presidente
  if (isVereador || isPresidente) {
    return (
      <InterfaceVereador
        votacaoAtiva={votacaoAtiva}
        user={user}
        tenantId={tenantId}
        onRefresh={loadVotacaoAtiva}
        isPresidente={isPresidente}
      />
    );
  }

  // Modo telão fullscreen
  if (modeTelao && votacaoAtiva) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950">
        <TelaoVotacao
          votacaoAtiva={votacaoAtiva}
          camara={camara}
          onRefresh={loadVotacaoAtiva}
        />
        <button
          onClick={() => setModeTelao(false)}
          className="absolute top-4 right-4 text-white/30 hover:text-white text-xs bg-white/10 px-3 py-1.5 rounded-lg"
        >
          ESC / Sair do Telão
        </button>
      </div>
    );
  }

  // Interface do Operador
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
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
          {isOperadorGeral && !votacaoAtiva && (
            <Button onClick={() => setShowConfig(true)} className="gap-2 shadow-lg shadow-primary/20">
              <Plus size={18} /> Iniciar Votação
            </Button>
          )}
          {isOperadorGeral && votacaoAtiva && (
            <Button onClick={encerrarVotacao} variant="destructive" className="gap-2">
              <StopCircle size={16} /> Encerrar Votação
            </Button>
          )}
        </div>
      </div>

      {/* Preview embutido */}
      {votacaoAtiva ? (
        <div className="rounded-2xl overflow-hidden border border-border shadow-xl">
          <div className="bg-gray-950 text-white/50 text-xs px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Votação em andamento · {votacaoAtiva.tipo_votacao} · Modo preview
          </div>
          <div style={{ height: '75vh' }}>
            <TelaoVotacao
              votacaoAtiva={votacaoAtiva}
              camara={camara}
              onRefresh={loadVotacaoAtiva}
              embedded
            />
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-3xl p-16 text-center">
          <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Monitor size={36} className="text-muted-foreground" />
          </div>
          <h3 className="font-heading font-semibold text-foreground text-lg">Nenhuma votação em andamento</h3>
          <p className="text-muted-foreground mt-2 text-sm mb-6">Configure e inicie uma votação para exibir o painel.</p>
          {isOperadorGeral && (
            <Button onClick={() => setShowConfig(true)} className="gap-2">
              <Play size={16} /> Iniciar Votação
            </Button>
          )}
        </div>
      )}

      {/* Modal configuração */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Settings size={18} /> Configurar Votação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Sessão */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Sessão Plenária</label>
              <Select value={config.sessao_id} onValueChange={v => setConfig(c => ({ ...c, sessao_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a sessão em andamento..." /></SelectTrigger>
                <SelectContent>
                  {sessoes.length === 0 && <SelectItem value="none" disabled>Nenhuma sessão Em Andamento</SelectItem>}
                  {sessoes.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.numero ? `${s.numero}ª` : ''} Sessão {s.tipo} — {s.data}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sessaoSelecionada && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users size={12} />
                  {presentes} parlamentares presentes
                </div>
              )}
            </div>

            {/* Matéria */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Matéria em Pauta *</label>
              <Select value={config.materia_id} onValueChange={v => setConfig(c => ({ ...c, materia_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a matéria..." /></SelectTrigger>
                <SelectContent>
                  {materias.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.tipo}{m.numero ? ` nº ${m.numero}` : ''} — {m.ementa?.slice(0, 60)}{m.ementa?.length > 60 ? '...' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de votação */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tipo de Votação</label>
              <Select value={config.tipo_votacao} onValueChange={v => setConfig(c => ({ ...c, tipo_votacao: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nominal">Nominal — exibe foto, nome e partido de cada vereador</SelectItem>
                  <SelectItem value="Sigilosa">Sigilosa — exibe apenas totais (favoráveis / contrários)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cronômetros */}
            <div>
              <label className="text-sm font-medium mb-2 block">Cronômetros (segundos)</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Discurso</label>
                  <Input type="number" min={0} value={config.timer_discurso} onChange={e => setConfig(c => ({ ...c, timer_discurso: +e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Aparte</label>
                  <Input type="number" min={0} value={config.timer_aparte} onChange={e => setConfig(c => ({ ...c, timer_aparte: +e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Questão de Ordem</label>
                  <Input type="number" min={0} value={config.timer_questao} onChange={e => setConfig(c => ({ ...c, timer_questao: +e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Considerações Finais</label>
                  <Input type="number" min={0} value={config.timer_consideracoes} onChange={e => setConfig(c => ({ ...c, timer_consideracoes: +e.target.value }))} />
                </div>
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