import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Users, Search, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CARGOS = ['Vereador', 'Presidente', 'Vice-Presidente', '1º Secretário', '2º Secretário'];
const PARTIDOS = ['MDB', 'PT', 'PP', 'PSD', 'PSDB', 'DEM', 'PDT', 'PSB', 'PRB', 'PTB', 'PR', 'Solidariedade', 'PPS', 'PSOL', 'PMN', 'PCdoB', 'PRD', 'PL', 'PROS', 'Republicanos', 'Avante', 'Patriota', 'Podemos', 'NOVO', 'Rede', 'Cidadania', 'Outros'];

export default function Parlamentares() {
  const [parlamentares, setParlamentares] = useState([]);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: '', partido: '', cargo: 'Vereador', email: '', telefone: '', gabinete: '', mandato_inicio: '', mandato_fim: '', ativo: true });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const p = await base44.entities.Parlamentar.list('-created_date', 100);
    setParlamentares(p);
  }

  function openNew() {
    setEditando(null);
    setForm({ nome: '', partido: '', cargo: 'Vereador', email: '', telefone: '', gabinete: '', mandato_inicio: '', mandato_fim: '', ativo: true });
    setShowForm(true);
  }

  function openEdit(p) {
    setEditando(p);
    setForm({ nome: p.nome, partido: p.partido, cargo: p.cargo || 'Vereador', email: p.email || '', telefone: p.telefone || '', gabinete: p.gabinete || '', mandato_inicio: p.mandato_inicio || '', mandato_fim: p.mandato_fim || '', ativo: p.ativo !== false });
    setShowForm(true);
  }

  async function salvar() {
    if (editando) await base44.entities.Parlamentar.update(editando.id, form);
    else await base44.entities.Parlamentar.create(form);
    setShowForm(false);
    loadData();
  }

  const filtrados = parlamentares.filter(p => p.nome?.toLowerCase().includes(busca.toLowerCase()) || p.partido?.toLowerCase().includes(busca.toLowerCase()));

  const cargoOrder = ['Presidente', 'Vice-Presidente', '1º Secretário', '2º Secretário', 'Vereador'];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Parlamentares</h1>
          <p className="text-muted-foreground mt-1">{parlamentares.filter(p => p.ativo !== false).length} ativos</p>
        </div>
        <Button onClick={openNew} className="gap-2 shadow-lg shadow-primary/20"><Plus size={18} /> Novo Parlamentar</Button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou partido..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
      </div>

      {filtrados.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <Users size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum parlamentar cadastrado ainda.</p>
          <Button onClick={openNew} variant="outline" className="mt-4 gap-2"><Plus size={16} /> Cadastrar parlamentar</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtrados.sort((a, b) => cargoOrder.indexOf(a.cargo) - cargoOrder.indexOf(b.cargo)).map((p) => (
            <div key={p.id} onClick={() => openEdit(p)} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center flex-shrink-0 text-xl font-heading font-bold text-primary">
                  {p.nome?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm leading-tight line-clamp-2">{p.nome}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.partido}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className={`text-xs px-2 py-0.5 rounded-full font-semibold inline-block ${
                  p.cargo === 'Presidente' ? 'bg-yellow-100 text-yellow-700' :
                  p.cargo === 'Vice-Presidente' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>{p.cargo || 'Vereador'}</div>
              </div>
              {(p.email || p.telefone) && (
                <div className="mt-3 space-y-1 border-t border-border pt-3">
                  {p.email && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail size={11} /> <span className="truncate">{p.email}</span></div>}
                  {p.telefone && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone size={11} /> {p.telefone}</div>}
                </div>
              )}
              {p.ativo === false && <div className="mt-2 text-xs text-red-500 font-semibold">Inativo</div>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{editando ? 'Editar Parlamentar' : 'Novo Parlamentar'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome Completo *</label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do parlamentar" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Partido *</label>
                <Select value={form.partido} onValueChange={v => setForm(f => ({ ...f, partido: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{PARTIDOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Cargo</label>
                <Select value={form.cargo} onValueChange={v => setForm(f => ({ ...f, cargo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CARGOS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Telefone</label>
                <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Início do Mandato</label>
                <Input type="date" value={form.mandato_inicio} onChange={e => setForm(f => ({ ...f, mandato_inicio: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Fim do Mandato</label>
                <Input type="date" value={form.mandato_fim} onChange={e => setForm(f => ({ ...f, mandato_fim: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Gabinete</label>
              <Input value={form.gabinete} onChange={e => setForm(f => ({ ...f, gabinete: e.target.value }))} placeholder="Número ou localização do gabinete" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="rounded" />
              <label htmlFor="ativo" className="text-sm font-medium">Parlamentar ativo</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!form.nome || !form.partido}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}