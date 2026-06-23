import { useEffect, useState } from 'react';
import { sislegisEntities } from '@/lib/sislegisApi';
import { useTenant } from '@/lib/TenantContext';
import { MessageSquare, Plus } from 'lucide-react';
import FilterBar, { TODOS } from '@/components/FilterBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';

const TIPOS = ['Favorável', 'Contrário', 'Favorável com Emendas', 'Pela Inconstitucionalidade', 'Pela Constitucionalidade'];

export default function Pareceres() {
  const { tenantId, withTenant, canQuery, hasPermission, ROLES } = useTenant();
  const [pareceres, setPareceres] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [comissoes, setComissoes] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ materia_id: '', comissao_id: '', relator_id: '', tipo: 'Favorável', texto: '', data: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (canQuery) load(); }, [tenantId, canQuery]);

  async function load() {
    const filter = withTenant({});
    setLoading(true);
    try {
      const [p, m, c, parl] = await Promise.all([
        sislegisEntities.Parecer.filter(filter, '-created_date', 50).catch(() => []),
        sislegisEntities.Materia.filter({ ...filter, status: 'Em tramitação' }).catch(() => []),
        sislegisEntities.Comissao.filter({ ...filter, ativa: true }).catch(() => []),
        sislegisEntities.Parlamentar.filter({ ...filter, ativo: true }).catch(() => []),
      ]);
      setPareceres(p);
      setMaterias(m);
      setComissoes(c);
      setParlamentares(parl);
    } finally {
      setLoading(false);
    }
  }

  async function salvar() {
    const mat = materias.find(m => m.id === form.materia_id);
    const com = comissoes.find(c => c.id === form.comissao_id);
    const rel = parlamentares.find(p => p.id === form.relator_id);
    await sislegisEntities.Parecer.create({
      ...form,
      tenant_id: tenantId || '',
      materia_ementa: mat?.ementa || '',
      comissao_nome: com?.nome || '',
      relator_nome: rel?.nome || rel?.nome_parlamentar || '',
    });
    setShowForm(false);
    load();
  }

  const tipoColor = {
    'Favorável': 'bg-green-100 text-green-700',
    'Contrário': 'bg-red-100 text-red-700',
    'Favorável com Emendas': 'bg-yellow-100 text-yellow-700',
    'Pela Inconstitucionalidade': 'bg-red-100 text-red-700',
    'Pela Constitucionalidade': 'bg-green-100 text-green-700',
  };

  const filtrados = pareceres.filter(p => {
    const buscaOk = p.materia_ementa?.toLowerCase().includes(busca.toLowerCase()) ||
      p.relator_nome?.toLowerCase().includes(busca.toLowerCase());
    const tipoOk = !filtros.tipo || filtros.tipo === TODOS || p.tipo === filtros.tipo;
    return buscaOk && tipoOk;
  });

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader icon={MessageSquare} title="Pareceres" subtitle="Pareceres emitidos pelas comissões"
        action={<Button onClick={() => { setForm({ materia_id: '', comissao_id: '', relator_id: '', tipo: 'Favorável', texto: '', data: '' }); setShowForm(true); }} className="gap-2"><Plus size={16} /> Novo Parecer</Button>}
      />

      <FilterBar
        search={busca}
        onSearch={setBusca}
        searchPlaceholder="Buscar por matéria ou relator..."
        filtros={[{ key: 'tipo', label: 'Tipo de parecer', options: TIPOS }]}
        valores={filtros}
        onChange={(k, v) => setFiltros(f => ({ ...f, [k]: v }))}
        onLimpar={() => { setBusca(''); setFiltros({}); }}
      />

      {loading ? (
        <LoadingState label="Carregando pareceres..." />
      ) : filtrados.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Nenhum parecer emitido" onAdd={() => setShowForm(true)} addLabel="Emitir Parecer" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {filtrados.map(p => (
              <div key={p.id} className="px-6 py-4 flex items-start gap-4">
                <div className={`mt-1 text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap flex-shrink-0 ${tipoColor[p.tipo] || 'bg-muted text-muted-foreground'}`}>{p.tipo}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground line-clamp-2">{p.materia_ementa}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Relator: {p.relator_nome} {p.comissao_nome ? `· ${p.comissao_nome}` : ''} {p.data ? `· ${p.data}` : ''}
                  </div>
                  {p.texto && <div className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">{p.texto}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">Novo Parecer</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Matéria *</label>
              <Select value={form.materia_id} onValueChange={v => setForm(f => ({ ...f, materia_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{materias.map(m => <SelectItem key={m.id} value={m.id}>{m.ementa}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Comissão</label>
                <Select value={form.comissao_id} onValueChange={v => setForm(f => ({ ...f, comissao_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{comissoes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Relator</label>
                <Select value={form.relator_id} onValueChange={v => setForm(f => ({ ...f, relator_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{parlamentares.map(p => <SelectItem key={p.id} value={p.id}>{p.nome_parlamentar || p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tipo do Parecer *</label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium mb-1.5 block">Data</label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
            </div>
            <div><label className="text-sm font-medium mb-1.5 block">Texto do Parecer</label><Textarea value={form.texto} onChange={e => setForm(f => ({ ...f, texto: e.target.value }))} rows={5} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!form.materia_id || !form.tipo}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}