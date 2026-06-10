import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { Plus, ScrollText, Search, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/PageHeader';

const TIPOS = ['Lei Ordinária', 'Lei Complementar', 'Lei Orgânica', 'Decreto Legislativo', 'Resolução', 'Portaria', 'Emenda à Lei Orgânica'];
const SITUACOES = ['Vigente', 'Revogada', 'Revogada Parcialmente', 'Suspensa', 'Não Vigente'];

export default function Normas() {
  const { tenantId, isAdminCamara, isOperadorGeral } = useTenant();
  const [normas, setNormas] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroSituacao, setFiltroSituacao] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const emptyForm = { tipo: 'Lei Ordinária', numero: '', ano: new Date().getFullYear(), ementa: '', data_publicacao: '', data_vigencia: '', texto_articulado: '', situacao: 'Vigente', arquivo_url: '', tenant_id: tenantId || '' };
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadData(); }, [tenantId]);

  async function loadData() {
    const filter = tenantId ? { tenant_id: tenantId } : {};
    const n = await base44.entities.NormaJuridica.filter(filter, '-ano', 200);
    setNormas(n);
  }

  function openNew() {
    setEditando(null);
    setForm({ ...emptyForm, tenant_id: tenantId || '' });
    setShowForm(true);
  }

  function openEdit(n) {
    setEditando(n);
    setForm({ ...emptyForm, ...n });
    setShowForm(true);
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, arquivo_url: file_url }));
    setUploading(false);
  }

  async function salvar() {
    if (editando) await base44.entities.NormaJuridica.update(editando.id, form);
    else await base44.entities.NormaJuridica.create(form);
    setShowForm(false);
    loadData();
  }

  const situacaoColor = {
    'Vigente': 'bg-green-100 text-green-700',
    'Revogada': 'bg-red-100 text-red-700',
    'Revogada Parcialmente': 'bg-orange-100 text-orange-700',
    'Suspensa': 'bg-yellow-100 text-yellow-700',
    'Não Vigente': 'bg-gray-100 text-gray-600',
  };

  const filtradas = normas.filter(n => {
    const matchBusca = n.ementa?.toLowerCase().includes(busca.toLowerCase()) || n.numero?.includes(busca);
    const matchTipo = filtroTipo === 'todos' || n.tipo === filtroTipo;
    const matchSit = filtroSituacao === 'todos' || n.situacao === filtroSituacao;
    return matchBusca && matchTipo && matchSit;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon={ScrollText}
        title="Normas Jurídicas"
        subtitle={`${normas.filter(n => n.situacao === 'Vigente' || !n.situacao).length} vigente(s)`}
        action={isOperadorGeral && <Button onClick={openNew} className="gap-2 shadow-lg shadow-primary/20"><Plus size={16} /> Nova Norma</Button>}
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por ementa ou número..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Tipos</SelectItem>
            {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Situação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {SITUACOES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <ScrollText size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma norma encontrada.</p>
          {isOperadorGeral && <Button onClick={openNew} variant="outline" className="mt-4 gap-2"><Plus size={16} /> Cadastrar norma</Button>}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {filtradas.map((n) => (
              <div key={n.id} onClick={() => openEdit(n)} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                  <ScrollText size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-muted-foreground">{n.tipo}</span>
                    {n.numero && <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">nº {n.numero}/{n.ano}</span>}
                  </div>
                  <div className="text-sm font-medium text-foreground mt-0.5 line-clamp-1">{n.ementa}</div>
                  {n.data_publicacao && <div className="text-xs text-muted-foreground mt-0.5">Publicada em: {n.data_publicacao}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {n.arquivo_url && (
                    <a href={n.arquivo_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-primary hover:underline flex-shrink-0">PDF</a>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${situacaoColor[n.situacao] || 'bg-muted text-muted-foreground'}`}>{n.situacao || 'Vigente'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editando ? 'Editar Norma' : 'Nova Norma Jurídica'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Tipo *</label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Situação</label>
                <Select value={form.situacao} onValueChange={v => setForm(f => ({ ...f, situacao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SITUACOES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Número</label>
                <Input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="Ex: 1234" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ano</label>
                <Input type="number" value={form.ano} onChange={e => setForm(f => ({ ...f, ano: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Ementa *</label>
              <Textarea value={form.ementa} onChange={e => setForm(f => ({ ...f, ementa: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Data de Publicação</label>
                <Input type="date" value={form.data_publicacao} onChange={e => setForm(f => ({ ...f, data_publicacao: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Data de Vigência</label>
                <Input type="date" value={form.data_vigencia} onChange={e => setForm(f => ({ ...f, data_vigencia: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Texto Articulado / Integral</label>
              <Textarea value={form.texto_articulado} onChange={e => setForm(f => ({ ...f, texto_articulado: e.target.value }))} rows={5} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Arquivo PDF</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer bg-muted/40 border border-dashed border-border rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted/60 transition-colors">
                  <Upload size={14} /> {uploading ? 'Enviando...' : form.arquivo_url ? 'Trocar arquivo' : 'Selecionar PDF'}
                  <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" />
                </label>
                {form.arquivo_url && <a href={form.arquivo_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Ver arquivo</a>}
              </div>
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