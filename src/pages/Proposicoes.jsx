import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { useAuth } from '@/lib/AuthContext';
import { registrarAuditoria } from '@/lib/auditoria';
import { FolderOpen, Plus, Search, ArrowRight, CheckCircle2, XCircle, Clock, Send, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIPOS_DEFAULT = ['Projeto de Lei', 'Projeto de Lei Complementar', 'Projeto de Resolução', 'Projeto de Decreto Legislativo', 'Indicação', 'Requerimento', 'Moção', 'Emenda'];
const STATUS_OPTS = ['Rascunho', 'Protocolada', 'Recebida', 'Rejeitada', 'Transformada em Matéria Legislativa'];

const STATUS_CONFIG = {
  'Rascunho': { color: 'bg-slate-100 text-slate-600', icon: Clock },
  'Protocolada': { color: 'bg-blue-100 text-blue-700', icon: Send },
  'Recebida': { color: 'bg-yellow-100 text-yellow-700', icon: FileText },
  'Rejeitada': { color: 'bg-red-100 text-red-700', icon: XCircle },
  'Transformada em Matéria Legislativa': { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

export default function Proposicoes() {
  const { tenantId, withTenant, canQuery, hasPermission, ROLES, userRole } = useTenant();
  const { user } = useAuth();
  const [proposicoes, setProposicoes] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);
  const [tiposMateria, setTiposMateria] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [showReceber, setShowReceber] = useState(false);
  const [selecionada, setSelecionada] = useState(null);
  const [editando, setEditando] = useState(null);
  const [receberForm, setReceberForm] = useState({ acao: 'receber', motivo: '' });
  const [form, setForm] = useState({ tipo: 'Projeto de Lei', ementa: '', justificativa: '', texto: '', autor_id: '', autor_nome: '', data_apresentacao: format(new Date(), 'yyyy-MM-dd') });

  const canReceive = ['SUPER_ADMIN', 'ADMIN_CAMARA', 'SECRETARIA_LEGISLATIVA', 'PROTOCOLO'].includes(userRole);
  const canCreate = !['CONSULTA_PUBLICA'].includes(userRole);

  useEffect(() => { if (canQuery) load(); }, [tenantId, canQuery]);

  async function load() {
    const filter = withTenant({});
    const [p, parl, tipos] = await Promise.all([
      base44.entities.Proposicao.filter(filter, '-created_date', 100),
      base44.entities.Parlamentar.filter({ ...filter, ativo: true }),
      base44.entities.TipoMateria.filter({ ...filter, ativo: true }, 'ordem', 50),
    ]);
    setProposicoes(p);
    setParlamentares(parl);
    setTiposMateria(tipos.length > 0 ? tipos.map(t => t.nome) : TIPOS_DEFAULT);
  }

  async function salvar() {
    const autor = parlamentares.find(p => p.id === form.autor_id);
    const payload = { ...form, autor_nome: autor?.nome || form.autor_nome, tenant_id: tenantId || '', status: 'Rascunho' };
    if (editando) {
      await base44.entities.Proposicao.update(editando.id, payload);
    } else {
      await base44.entities.Proposicao.create(payload);
    }
    await registrarAuditoria({ acao: editando ? 'EDITAR' : 'CRIAR', modulo: 'Proposicao', descricao: `Proposição: ${form.ementa.substring(0, 60)}`, tenant_id: tenantId, user });
    setShowForm(false);
    load();
  }

  async function protocolar(p) {
    const numero = `${String(proposicoes.filter(x => x.status !== 'Rascunho').length + 1).padStart(4, '0')}/${new Date().getFullYear()}`;
    await base44.entities.Proposicao.update(p.id, { status: 'Protocolada', numero_protocolo: numero, data_protocolo: format(new Date(), 'yyyy-MM-dd') });
    // Criar registro de protocolo
    await base44.entities.Protocolo.create({
      tenant_id: tenantId || '',
      numero,
      ano: new Date().getFullYear(),
      tipo: 'Entrada',
      tipo_documento: 'Proposição',
      assunto: p.ementa,
      interessado: p.autor_nome || '—',
      remetente: p.autor_nome || '—',
      data_protocolo: format(new Date(), 'yyyy-MM-dd'),
      hora_protocolo: format(new Date(), 'HH:mm'),
      status: 'Recebido',
      proposicao_id: p.id,
    });
    await registrarAuditoria({ acao: 'PROTOCOLAR', modulo: 'Proposicao', registro_id: p.id, descricao: `Protocolada como ${numero}`, tenant_id: tenantId, user });
    load();
  }

  async function processarRecepcao() {
    if (receberForm.acao === 'receber') {
      await base44.entities.Proposicao.update(selecionada.id, { status: 'Recebida', obs_recepcao: receberForm.motivo });
    } else if (receberForm.acao === 'rejeitar') {
      await base44.entities.Proposicao.update(selecionada.id, { status: 'Rejeitada', obs_recepcao: receberForm.motivo });
    } else if (receberForm.acao === 'transformar') {
      // Transformar em matéria legislativa
      const novaMateria = await base44.entities.Materia.create({
        tenant_id: tenantId || '',
        tipo: selecionada.tipo,
        ementa: selecionada.ementa,
        justificativa: selecionada.justificativa || '',
        texto_integral: selecionada.texto || '',
        autor_id: selecionada.autor_id || '',
        autor_nome: selecionada.autor_nome || '',
        status: 'Em tramitação',
        regime_tramitacao: 'Normal',
        data_apresentacao: selecionada.data_apresentacao || format(new Date(), 'yyyy-MM-dd'),
        proposicao_id: selecionada.id,
        protocolo_id: selecionada.protocolo_id || '',
        ano: new Date().getFullYear(),
      });
      await base44.entities.Proposicao.update(selecionada.id, { status: 'Transformada em Matéria Legislativa', materia_id: novaMateria.id });
      // Registrar primeira tramitação
      await base44.entities.Tramitacao.create({
        tenant_id: tenantId || '',
        materia_id: novaMateria.id,
        materia_ementa: novaMateria.ementa,
        unidade_tramitacao_origem: 'Protocolo',
        unidade_tramitacao_destino: 'Secretaria Legislativa',
        data: format(new Date(), 'yyyy-MM-dd'),
        hora: format(new Date(), 'HH:mm'),
        status: 'Em Tramitação',
        texto_acao: 'Proposição recebida e transformada em matéria legislativa',
        turno: 'Único',
        usuario_nome: user?.full_name || '',
      });
      await registrarAuditoria({ acao: 'TRANSFORMAR', modulo: 'Proposicao', registro_id: selecionada.id, descricao: `Transformada em Matéria Legislativa: ${novaMateria.id}`, tenant_id: tenantId, user });
    }
    setShowReceber(false);
    load();
  }

  const filtradas = proposicoes.filter(p => {
    const matchBusca = p.ementa?.toLowerCase().includes(busca.toLowerCase()) || p.autor_nome?.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        icon={FolderOpen}
        title="Proposições"
        subtitle="Fluxo: Proposição → Protocolo → Recebimento → Matéria Legislativa"
        action={canCreate && (
          <Button onClick={() => { setEditando(null); setForm({ tipo: 'Projeto de Lei', ementa: '', justificativa: '', texto: '', autor_id: '', autor_nome: '', data_apresentacao: format(new Date(), 'yyyy-MM-dd') }); setShowForm(true); }} className="gap-2">
            <Plus size={16} /> Nova Proposição
          </Button>
        )}
      />

      {/* Fluxo visual */}
      <div className="bg-accent/40 border border-border rounded-xl px-5 py-3 flex items-center gap-2 flex-wrap text-xs font-medium text-muted-foreground">
        {['Rascunho', '→', 'Protocolada', '→', 'Recebida', '→', 'Matéria Legislativa'].map((s, i) => (
          <span key={i} className={s === '→' ? 'text-muted-foreground/40' : 'bg-background border border-border px-2 py-1 rounded-md text-foreground'}>{s}</span>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por ementa ou autor..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Todos os status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_OPTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {STATUS_OPTS.map(s => {
          const count = proposicoes.filter(p => p.status === s).length;
          const cfg = STATUS_CONFIG[s];
          return (
            <button key={s} onClick={() => setFiltroStatus(filtroStatus === s ? 'todos' : s)}
              className={`text-center p-2.5 rounded-xl border transition-all ${filtroStatus === s ? 'ring-2 ring-primary' : 'hover:bg-muted/50'} bg-card border-border`}>
              <p className="text-lg font-bold">{count}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{s}</p>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Nenhuma proposição encontrada" onAdd={canCreate ? () => setShowForm(true) : undefined} addLabel="Nova Proposição" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {filtradas.map(p => {
              const cfg = STATUS_CONFIG[p.status] || { color: 'bg-muted text-muted-foreground', icon: Clock };
              const Icon = cfg.icon;
              return (
                <div key={p.id} className="flex items-start gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-semibold text-muted-foreground">{p.tipo}</span>
                      {p.numero_protocolo && <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">Nº {p.numero_protocolo}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.color}`}>{p.status}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground line-clamp-2">{p.ementa}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {p.autor_nome && <span>Autor: {p.autor_nome}</span>}
                      {p.data_apresentacao && <span>{p.data_apresentacao}</span>}
                      {p.data_protocolo && <span>Protocolada: {p.data_protocolo}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {p.status === 'Rascunho' && canCreate && (
                      <>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => { setEditando(p); setForm({ tipo: p.tipo, ementa: p.ementa, justificativa: p.justificativa || '', texto: p.texto || '', autor_id: p.autor_id || '', autor_nome: p.autor_nome || '', data_apresentacao: p.data_apresentacao || '' }); setShowForm(true); }}>
                          Editar
                        </Button>
                        <Button size="sm" className="text-xs gap-1" onClick={() => protocolar(p)}>
                          <Send size={11} /> Protocolar
                        </Button>
                      </>
                    )}
                    {p.status === 'Protocolada' && canReceive && (
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { setSelecionada(p); setReceberForm({ acao: 'receber', motivo: '' }); setShowReceber(true); }}>
                        <FileText size={11} /> Analisar
                      </Button>
                    )}
                    {p.status === 'Recebida' && canReceive && (
                      <Button size="sm" className="text-xs gap-1" onClick={() => { setSelecionada(p); setReceberForm({ acao: 'transformar', motivo: '' }); setShowReceber(true); }}>
                        <ArrowRight size={11} /> Transformar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Nova/Editar Proposição */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">{editando ? 'Editar' : 'Nova'} Proposição</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tipo *</label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Array.isArray(tiposMateria) ? tiposMateria : TIPOS_DEFAULT).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Autor</label>
                <Select value={form.autor_id} onValueChange={v => { const p = parlamentares.find(x => x.id === v); setForm(f => ({ ...f, autor_id: v, autor_nome: p?.nome || '' })); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{parlamentares.map(p => <SelectItem key={p.id} value={p.id}>{p.nome_parlamentar || p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {!form.autor_id && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome do Autor (livre)</label>
                <Input value={form.autor_nome} onChange={e => setForm(f => ({ ...f, autor_nome: e.target.value }))} placeholder="Ex: Executivo Municipal, Comissão..." />
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Ementa *</label>
              <Textarea value={form.ementa} onChange={e => setForm(f => ({ ...f, ementa: e.target.value }))} rows={3} placeholder="Dispõe sobre..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Justificativa</label>
              <Textarea value={form.justificativa} onChange={e => setForm(f => ({ ...f, justificativa: e.target.value }))} rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Texto da Proposição</label>
              <Textarea value={form.texto} onChange={e => setForm(f => ({ ...f, texto: e.target.value }))} rows={5} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Data de Apresentação</label>
              <Input type="date" value={form.data_apresentacao} onChange={e => setForm(f => ({ ...f, data_apresentacao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!form.ementa || !form.tipo}>Salvar Rascunho</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Recebimento/Análise */}
      <Dialog open={showReceber} onOpenChange={setShowReceber}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Analisar Proposição</DialogTitle>
          </DialogHeader>
          {selecionada && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{selecionada.tipo}</p>
                <p className="text-sm font-medium mt-0.5 line-clamp-2">{selecionada.ementa}</p>
                {selecionada.numero_protocolo && <p className="text-xs text-muted-foreground mt-1">Protocolo: {selecionada.numero_protocolo}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ação *</label>
                <Select value={receberForm.acao} onValueChange={v => setReceberForm(f => ({ ...f, acao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receber">Receber (análise pendente)</SelectItem>
                    <SelectItem value="transformar">Transformar em Matéria Legislativa</SelectItem>
                    <SelectItem value="rejeitar">Rejeitar / Devolver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {receberForm.acao === 'transformar' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700">
                  <strong>Atenção:</strong> Será criada automaticamente uma Matéria Legislativa e o primeiro registro de tramitação (Protocolo → Secretaria Legislativa).
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Observação / Motivo</label>
                <Textarea value={receberForm.motivo} onChange={e => setReceberForm(f => ({ ...f, motivo: e.target.value }))} rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceber(false)}>Cancelar</Button>
            <Button onClick={processarRecepcao} className={receberForm.acao === 'transformar' ? 'bg-green-600 hover:bg-green-700' : receberForm.acao === 'rejeitar' ? 'bg-destructive hover:bg-destructive/90' : ''}>
              {receberForm.acao === 'transformar' ? '✓ Transformar em Matéria' : receberForm.acao === 'rejeitar' ? 'Rejeitar' : 'Confirmar Recebimento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}