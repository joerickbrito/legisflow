import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Plus, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

export default function Audiencias() {
  const [audiencias, setAudiencias] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ tema: '', descricao: '', data: '', hora: '', local: '', status: 'Agendada', ata: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    const a = await base44.entities.AudienciaPublica.list('-data', 50);
    setAudiencias(a);
  }

  async function salvar() {
    if (editando) await base44.entities.AudienciaPublica.update(editando.id, form);
    else await base44.entities.AudienciaPublica.create(form);
    setShowForm(false);
    load();
  }

  function openEdit(a) {
    setEditando(a);
    setForm({ tema: a.tema, descricao: a.descricao || '', data: a.data, hora: a.hora || '', local: a.local || '', status: a.status, ata: a.ata || '' });
    setShowForm(true);
  }

  const statusColor = { 'Agendada': 'bg-yellow-100 text-yellow-700', 'Realizada': 'bg-green-100 text-green-700', 'Cancelada': 'bg-red-100 text-red-700' };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader icon={Users} title="Audiências Públicas" subtitle="Gestão de audiências e participação popular"
        action={<Button onClick={() => { setEditando(null); setForm({ tema: '', descricao: '', data: '', hora: '', local: '', status: 'Agendada', ata: '' }); setShowForm(true); }} className="gap-2"><Plus size={16} /> Nova Audiência</Button>}
      />

      {audiencias.length === 0 ? (
        <EmptyState icon={Users} title="Nenhuma audiência cadastrada" onAdd={() => setShowForm(true)} addLabel="Agendar Audiência" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {audiencias.map(a => (
            <div key={a.id} onClick={() => openEdit(a)} className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-primary" />
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColor[a.status]}`}>{a.status}</span>
              </div>
              <div className="font-heading font-semibold text-foreground leading-tight">{a.tema}</div>
              {a.descricao && <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.descricao}</div>}
              <div className="mt-3 space-y-1.5">
                {a.data && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock size={12} /> {a.data} {a.hora ? `às ${a.hora}` : ''}</div>}
                {a.local && <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin size={12} /> {a.local}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">{editando ? 'Editar' : 'Nova'} Audiência Pública</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><label className="text-sm font-medium mb-1.5 block">Tema *</label><Input value={form.tema} onChange={e => setForm(f => ({ ...f, tema: e.target.value }))} /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Descrição</label><Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1.5 block">Data *</label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Hora</label><Input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} /></div>
            </div>
            <div><label className="text-sm font-medium mb-1.5 block">Local</label><Input value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} /></div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agendada">Agendada</SelectItem>
                  <SelectItem value="Realizada">Realizada</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium mb-1.5 block">Ata</label><Textarea value={form.ata} onChange={e => setForm(f => ({ ...f, ata: e.target.value }))} rows={5} placeholder="Registro da audiência..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!form.tema || !form.data}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}