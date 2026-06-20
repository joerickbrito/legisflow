import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import { useAuth } from "@/lib/AuthContext";
import { sislegisEntities } from "@/lib/sislegisApi";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Monitor, Play, StopCircle, Plus, Settings, ExternalLink, Users, Trash2 } from "lucide-react";
import TelaoVotacao from "@/components/painel/TelaoVotacao";
import InterfaceVereador from "@/components/painel/InterfaceVereador";
import { useExclusaoSegura } from "@/components/ExclusaoSegura";

export default function PainelEletronico() {
  const { tenantId, withTenant, canQuery, userRole, camara, isOperadorGeral } = useTenant();
  const { user } = useAuth();
  const [votacaoAtiva, setVotacaoAtiva] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [normas, setNormas] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
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

  const { pedirExclusao, dialogExclusao } = useExclusaoSegura({ withTenant, onExcluido: () => loadHistorico() });

  useEffect(() => {
    if (canQuery) loadData();
  }, [tenantId, canQuery]);

  useEffect(() => {
    const unsub = base44.entities.Votacao.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create') {
        // Isolamento: só reage a votações da própria câmara
        if (event.data?.tenant_id && tenantId && event.data.tenant_id !== tenantId) return;
        loadVotacaoAtiva();
        loadHistorico();
      }
    });
    return () => unsub();
  }, [tenantId]);

  async function loadData() {
    const filter = withTenant({});
    const [sess, mat, normasList, parl] = await Promise.all([
      sislegisEntities.Sessao.filter({ ...filter, status: 'Em Andamento' }, '-data', 20),
      sislegisEntities.Materia.filter({ ...filter, status: 'Em tramitação' }, '-created_date', 100),
      sislegisEntities.NormaJuridica.filter({ ...filter, situacao: 'Vigente' }, '-created_date', 50).catch(() => []),
      sislegisEntities.Parlamentar.filter({ ...filter, ativo: true }, 'nome', 100),
    ]);
    setSessoes(sess);
    setMaterias(mat);
    setNormas(normasList);
    setParlamentares(parl);
    await loadVotacaoAtiva();
    await loadHistorico();
    setLoading(false);
  }

  async function loadHistorico() {
    const filter = withTenant({});
    if (!filter) return;
    const todas = await sislegisEntities.Votacao.filter(filter, '-created_date', 100).catch(() => []);
    setHistorico(todas || []);
  }

  async function loadVotacaoAtiva() {
    const filter = withTenant({});
    const ativas = await sislegisEntities.Votacao.filter({ ...filter, status: 'Em Votação' }, '-created_date', 1);
    if (ativas.length) { setVotacaoAtiva(ativas[0]); return; }
    const desempate = await sislegisEntities.Votacao.filter({ ...filter, status: 'Aguardando Desempate' }, '-created_date', 1);
    setVotacaoAtiva(desempate[0] || null);
  }

  async function iniciarVotacao() {
    setSaving(true);
    setErrorMsg('');
    try {
    const mat = materias.find(m => m.id === config.materia_id) || normas.find(n => n.id === config.materia_id);
    const sessao = sessoes.find(s => s.id === config.sessao_id);

    // Usa presenças da sessão, ou todos os parlamentares
    const presentes = sessao?.presencas?.filter(p => p.presente) || [];
    const parlamentaresPresentes = presentes.length
      ? parlamentares.filter(p => presentes.find(pr => pr.parlamentar_id === p.id))
      : parlamentares;

    // Busca usuários da câmara para identificar quem é Presidente
    // (o campo role do Parlamentar não existe — o role fica no UsuarioSislegis)
    let usuariosCamara = [];
    try {
      const filter = withTenant({});
      usuariosCamara = await sislegisEntities.UsuarioSislegis.filter(filter, 'nome', 200);
    } catch (e) {
      console.warn('Não foi possível carregar usuários para identificar Presidente:', e);
    }

    // Monta votos — marca is_presidente baseado no role do UsuarioSislegis vinculado
    const votos = parlamentaresPresentes.map(p => {
      const usuarioVinculado = usuariosCamara.find(u => u.parlamentar_id === p.id);
      const isPresidenteSlot = usuarioVinculado?.role === 'PRESIDENTE';
      return {
        parlamentar_id: p.id,
        parlamentar_nome: p.nome_parlamentar || p.nome,
        partido_sigla: p.partido_sigla || '',
        foto_url: p.foto_url || '',
        voto: null,
        hora: null,
        is_presidente: isPresidenteSlot,
      };
    });

    const sessaoDescricao = sessao
      ? [
          sessao.numero ? `${sessao.numero}ª Sessão ${sessao.tipo}` : `Sessão ${sessao.tipo}`,
          sessao.sessao_legislativa_numero ? `${sessao.sessao_legislativa_numero}ª Sessão Legislativa` : null,
          sessao.legislatura_numero ? `${sessao.legislatura_numero}ª Legislatura` : null,
        ].filter(Boolean).join(' · ')
      : '';

    await sislegisEntities.Votacao.create({
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
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao iniciar votação.');
    } finally {
      setSaving(false);
    }
  }

  async function encerrarVotacao() {
    if (!votacaoAtiva) return;
    setSaving(true);
    setErrorMsg('');
    try {
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

    await sislegisEntities.Votacao.update(votacaoAtiva.id, {
      status: 'Encerrada',
      resultado,
      votos_sim: sim,
      votos_nao: nao,
      data_hora_fim: new Date().toISOString(),
    });

    // Atualiza status da matéria ou norma
    if (votacaoAtiva.materia_id && resultado !== 'Empate') {
      const novoStatus = resultado.startsWith('Aprovada') ? 'Aprovada' : 'Rejeitada';
      const campoData = novoStatus === 'Aprovada' ? { data_publicacao: new Date().toISOString().slice(0, 10) } : {};
      try {
        await sislegisEntities.Materia.update(votacaoAtiva.materia_id, {
          status: novoStatus,
          ...(novoStatus === 'Aprovada' ? { data_aprovacao: new Date().toISOString().slice(0, 10) } : { data_rejeicao: new Date().toISOString().slice(0, 10) }),
        });
      } catch (e) { /* materia pode já ter sido excluída */ }
      // Também atualiza NormaJuridica (Leis, Resoluções, Decretos, Portarias)
      try {
        const novaSituacao = novoStatus === 'Aprovada' ? 'Vigente' : 'Não Vigente';
        await sislegisEntities.NormaJuridica.update(votacaoAtiva.materia_id, {
          situacao: novaSituacao,
          ...(novoStatus === 'Aprovada' ? campoData : {}),
        });
      } catch (e) { /* pode não ser uma NormaJuridica */ }
    }

    setVotacaoAtiva(null);
    loadHistorico();
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao encerrar votação.');
    } finally {
      setSaving(false);
    }
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
            <Button onClick={encerrarVotacao} variant="destructive" className="gap-2" disabled={saving}>
              {saving ? 'Encerrando...' : <><StopCircle size={16} /> Encerrar Votação</>}
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

      {/* Histórico de votações */}
      {historico.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-heading font-semibold">Histórico de Votações</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Votações registradas nesta câmara</p>
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto scrollbar-slim">
            {historico.map(v => {
              const cor = v.resultado?.startsWith('Aprovada') ? 'bg-green-100 text-green-700'
                : v.resultado === 'Rejeitada' ? 'bg-red-100 text-red-700'
                : v.resultado === 'Empate' ? 'bg-yellow-100 text-yellow-700'
                : 'bg-blue-100 text-blue-700';
              return (
                <div key={v.id} className="flex items-center gap-3 px-5 py-3 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.materia_ementa || v.materia_tipo || 'Votação'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {v.tipo_votacao} · {v.votos_sim ?? 0} sim · {v.votos_nao ?? 0} não · {v.abstencoes ?? 0} abst.
                      {v.data_hora_inicio ? ` · ${new Date(v.data_hora_inicio).toLocaleDateString('pt-BR')}` : ''}
                    </p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${cor}`}>{v.resultado || v.status}</span>
                  {isOperadorGeral && v.status !== 'Em Votação' && (
                    <button
                      onClick={() => pedirExclusao('Votacao', v, v.materia_ementa || `Votação ${v.materia_tipo || ''}`)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Excluir votação"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
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

            {/* Matéria / Norma */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Matéria em Pauta *</label>
              <Select value={config.materia_id} onValueChange={v => setConfig(c => ({ ...c, materia_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a matéria ou norma..." /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {materias.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Matérias em Tramitação</div>
                      {materias.map(m => (
                        <SelectItem key={`mat-${m.id}`} value={m.id}>
                          {m.tipo}{m.numero ? ` nº ${m.numero}` : ''} — {m.ementa?.slice(0, 60)}{m.ementa?.length > 60 ? '...' : ''}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {normas.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Normas Vigentes</div>
                      {normas.map(n => (
                        <SelectItem key={`norma-${n.id}`} value={n.id}>
                          {n.tipo} nº {n.numero}/{n.ano} — {n.ementa?.slice(0, 60)}{n.ementa?.length > 60 ? '...' : ''}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {materias.length === 0 && normas.length === 0 && (
                    <SelectItem value="none" disabled>Nenhuma matéria ou norma disponível</SelectItem>
                  )}
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
          {errorMsg && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md mt-2">{errorMsg}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowConfig(false); setErrorMsg(''); }}>Cancelar</Button>
            <Button onClick={iniciarVotacao} disabled={!config.materia_id || saving} className="gap-2">
              {saving ? 'Iniciando...' : <><Play size={15} /> Iniciar Votação</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {dialogExclusao}
    </div>
  );
}