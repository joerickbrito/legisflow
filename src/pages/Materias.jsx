import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Search, FileText, Filter, ChevronDown, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

const TIPOS = ['Projeto de Lei', 'Projeto de Lei Complementar', 'Projeto de Resolução', 'Requerimento', 'Indicação', 'Moção', 'Emenda à Lei Orgânica'];
const STATUS = ['Em tramitação', 'Aprovada', 'Rejeitada', 'Arquivada', 'Retirada', 'Transformada em Norma'];
const REGIMES = ['Normal', 'Urgência', 'Urgência Urgentíssima'];

export default function Materias() {
  const [materias, setMaterias] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ tipo: 'Projeto de Lei', ementa: '', autor_id: '', status: 'Em tramitação', regime_tramitacao: 'Normal', data_apresentacao: '', observacoes: '', texto_integral: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [m, p] = await Promise.all([
      base44.entities.Materia.list('-created_date', 100),
      base44.entities.Parlamentar.filter({ ativo: true }),
    ]);
    setMaterias(m);
    setParlamentares(p);
    setLoading(false);
  }

  function openNew() {
    setEditando(null);
    setForm({ tipo: 'Projeto de Lei', ementa: '', autor_id: '', status: 'Em tramitação', regime_tramitacao: 'Normal', data_apresentacao: '', observacoes: '', texto_integral: '' });
    setShowForm(true);
  }

  function openEdit(m) {
    setEditando(m);
    setForm({ tipo: m.tipo, ementa: m.ementa, autor_id: m.autor_id || '', status: m.status, regime_tramitacao: m.regime_tramitacao || 'Normal', data_apresentacao: m.data_apresentacao || '', observacoes: m.observacoes || '', texto_integral: m.texto_integral || '' });
    setShowForm(true);
  }

  async function salvar() {
    const autor = parlamentares.find(p => p.id === form.autor_id);
    const data = { ...form, autor_nome: autor?.nome || '' };
    if (editando) {
      await base44.entities.Materia.update(editando.id, data);
    } else {
      await base44.entities.Materia.create({ ...data, ano: new Date().getFullYear() });
    }
    setShowForm(false);
    loadData();
  }

  const filtradas = materias.filter(m => {
    const matchBusca = m.ementa?.toLowerCase().includes(busca.toLowerCase()) || m.autor_nome?.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || m.status === filtroStatus;
    const matchTipo = filtroTipo === 'todos' || m.tipo === filtroTipo;
    return matchBusca && matchStatus && matchTipo;
  });

  const statusColor = {
    'Em tramitação': 'bg-blue-100 text-blue-700',
    'Aprovada': 'bg-green-100 text-green-700',
    'Rejeitada': 'bg-red-100 text-red-700',
    'Arquivada': 'bg-gray-100 text-gray-600',
    'Retirada': 'bg-yellow-100 text-yellow-700',
    'Transformada em Norma': 'bg-purple-100 text-purple-700',
  };

  const regimeColor = {
    'Normal': '',
    'Urgência': 'bg-orange-100 text-orange-700',
    'Urgência Urgentíssima': 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Matérias Legislativas</h1>
          <p className="text-muted-foreground mt-1">{materias.length} matéria(s) cadastrada(s)</p>
        </div>
        <Button onClick={openNew} className="gap-2 shadow-lg shadow-primary/20">
          <Plus size={18} /> Nova Matéria
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por ementa ou autor..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : filtradas.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma matéria encontrada.</p>
            <Button onClick={openNew} variant="outline" className="mt-4 gap-2"><Plus size={16} /> Cadastrar matéria</Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtradas.map((m) => (
              <div key={m.id} className="flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => openEdit(m)}>
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-muted-foreground">{m.tipo}</span>
                    {m.regime_tramitacao && m.regime_tramitacao !== 'Normal' && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${regimeColor[m.regime_tramitacao]}`}>{m.regime_tramitacao.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-foreground mt-0.5 line-clamp-2">{m.ementa}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {m.autor_nome && `Autor: ${m.autor_nome}`}
                    {m.data_apresentacao && ` · ${m.data_apresentacao}`}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColor[m.status] || 'bg-muted text-muted-foreground'}`}>{m.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editando ? 'Editar Matéria' : 'Nova Matéria Legislativa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tipo *</label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Regime de Tramitação</label>
                <Select value={form.regime_tramitacao} onValueChange={v => setForm(f => ({ ...f, regime_tramitacao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REGIMES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Ementa *</label>
              <Textarea value={form.ementa} onChange={e => setForm(f => ({ ...f, ementa: e.target.value }))} placeholder="Descreva o objeto da matéria..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Autor</label>
                <Select value={form.autor_id} onValueChange={v => setForm(f => ({ ...f, autor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o autor..." /></SelectTrigger>
                  <SelectContent>{parlamentares.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Data de Apresentação</label>
                <Input type="date" value={form.data_apresentacao} onChange={e => setForm(f => ({ ...f, data_apresentacao: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Texto Integral</label>
              <Textarea value={form.texto_integral} onChange={e => setForm(f => ({ ...f, texto_integral: e.target.value }))} placeholder="Texto completo da matéria..." rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Observações</label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!form.ementa}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}