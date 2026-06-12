import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Scale, Plus, Users } from 'lucide-react';
import { useTenant } from '@/lib/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function Partidos() {
  const { tenantId, withTenant, canQuery } = useTenant();
  const [partidos, setPartidos] = useState([]);
  const [bancadas, setBancadas] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showBancada, setShowBancada] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: '', sigla: '', numero: '', cor_hex: '#1d4ed8', data_fundacao: '', ativo: true });
  const [bancadaForm, setBancadaForm] = useState({ nome: '', sigla: '', tipo: 'Partidária', membros: [] });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => { if (canQuery) load(); }, [tenantId, canQuery]);

  async function load() {
    const filter = withTenant({});
    const [p, b, parl] = await Promise.all([
      base44.entities.Partido.filter(filter),
      base44.entities.Bancada.filter(filter),
      base44.entities.Parlamentar.filter({ ...filter, ativo: true }),
    ]);
    setPartidos(p);
    setBancadas(b);
    setParlamentares(parl);
  }

  async function salvarPartido() {
    setSaving(true);
    setErrorMsg('');
    try {
      if (editando) await base44.entities.Partido.update(editando.id, form);
      else await base44.entities.Partido.create({ ...form, tenant_id: tenantId || '' });
      setShowForm(false);
      setErrorMsg('');
      load();
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao salvar partido.');
    } finally {
      setSaving(false);
    }
  }

  async function salvarBancada() {
    setSaving(true);
    setErrorMsg('');
    try {
      await base44.entities.Bancada.create({ ...bancadaForm, tenant_id: tenantId || '' });
      setShowBancada(false);
      setErrorMsg('');
      load();
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao salvar bancada.');
    } finally {
      setSaving(false);
    }
  }

  function toggleMembro(p) {
    setBancadaForm(f => {
      const existe = f.membros.find(m => m.parlamentar_id === p.id);
      if (existe) return { ...f, membros: f.membros.filter(m => m.parlamentar_id !== p.id) };
      return { ...f, membros: [...f.membros, { parlamentar_id: p.id, parlamentar_nome: p.nome, cargo: 'Membro' }] };
    });
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader icon={Scale} title="Partidos & Bancadas" subtitle="Gestão de partidos políticos e bancadas" />

      <Tabs defaultValue="partidos">
        <TabsList>
          <TabsTrigger value="partidos">Partidos ({partidos.length})</TabsTrigger>
          <TabsTrigger value="bancadas">Bancadas ({bancadas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="partidos" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditando(null); setForm({ nome: '', sigla: '', numero: '', data_fundacao: '', ativo: true }); setShowForm(true); }} className="gap-2">
              <Plus size={16} /> Novo Partido
            </Button>
          </div>
          {partidos.length === 0 ? (
            <EmptyState icon={Scale} title="Nenhum partido cadastrado" onAdd={() => setShowForm(true)} addLabel="Cadastrar Partido" />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {partidos.map(p => (
                <div key={p.id} onClick={() => { setEditando(p); setForm({ nome: p.nome, sigla: p.sigla, numero: p.numero || '', data_fundacao: p.data_fundacao || '', ativo: p.ativo !== false }); setShowForm(true); }}
                  className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-heading font-bold text-white text-sm" style={{ backgroundColor: p.cor_hex || '#1d4ed8' }}>{p.sigla}</div>
                    <div>
                      <div className="font-semibold text-foreground">{p.sigla}</div>
                      <div className="text-xs text-muted-foreground">{p.nome}</div>
                      {p.numero && <div className="text-xs text-muted-foreground">Número: {p.numero}</div>}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-600">
                      {parlamentares.filter(par => par.partido_sigla === p.sigla || par.partido_id === p.id).length} parlamentar(es)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bancadas" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setBancadaForm({ nome: '', sigla: '', tipo: 'Partidária', membros: [] }); setShowBancada(true); }} className="gap-2">
              <Plus size={16} /> Nova Bancada
            </Button>
          </div>
          {bancadas.length === 0 ? (
            <EmptyState icon={Users} title="Nenhuma bancada cadastrada" onAdd={() => setShowBancada(true)} addLabel="Criar Bancada" />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {bancadas.map(b => (
                <div key={b.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="font-semibold text-foreground">{b.nome}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{b.tipo} · {b.membros?.length || 0} membro(s)</div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-heading">{editando ? 'Editar' : 'Novo'} Partido</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-sm font-medium mb-1.5 block">Nome *</label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1.5 block">Sigla *</label><Input value={form.sigla} onChange={e => setForm(f => ({ ...f, sigla: e.target.value }))} maxLength={10} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Número Eleitoral</label><Input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="Ex: 13" /></div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Cor do Partido</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.cor_hex || '#1d4ed8'} onChange={e => setForm(f => ({ ...f, cor_hex: e.target.value }))} className="w-9 h-9 rounded border border-border cursor-pointer flex-shrink-0" />
                <Input value={form.cor_hex || ''} onChange={e => setForm(f => ({ ...f, cor_hex: e.target.value }))} className="font-mono" placeholder="#1d4ed8" />
              </div>
            </div>
            <div><label className="text-sm font-medium mb-1.5 block">Data de Fundação</label><Input type="date" value={form.data_fundacao} onChange={e => setForm(f => ({ ...f, data_fundacao: e.target.value }))} /></div>
          </div>
          {errorMsg && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{errorMsg}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setErrorMsg(''); }}>Cancelar</Button>
            <Button onClick={salvarPartido} disabled={!form.nome || !form.sigla || saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBancada} onOpenChange={setShowBancada}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Nova Bancada</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><label className="text-sm font-medium mb-1.5 block">Nome *</label><Input value={bancadaForm.nome} onChange={e => setBancadaForm(f => ({ ...f, nome: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Sigla</label><Input value={bancadaForm.sigla} onChange={e => setBancadaForm(f => ({ ...f, sigla: e.target.value }))} /></div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tipo</label>
              <Select value={bancadaForm.tipo} onValueChange={v => setBancadaForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Partidária">Partidária</SelectItem><SelectItem value="Suprapartidária">Suprapartidária</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Membros</label>
              <div className="border border-border rounded-lg divide-y divide-border max-h-40 overflow-y-auto">
                {parlamentares.map(p => {
                  const sel = bancadaForm.membros.find(m => m.parlamentar_id === p.id);
                  return (
                    <div key={p.id} onClick={() => toggleMembro(p)} className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors ${sel ? 'bg-accent' : 'hover:bg-muted/40'}`}>
                      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 ${sel ? 'bg-primary border-primary' : 'border-border'}`} />
                      {p.nome} <span className="text-muted-foreground text-xs">({p.partido_sigla})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBancada(false)}>Cancelar</Button>
            <Button onClick={salvarBancada} disabled={!bancadaForm.nome}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}