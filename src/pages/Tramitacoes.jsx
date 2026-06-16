import { useEffect, useState } from 'react';
import { sislegisEntities } from '@/lib/sislegisApi';
import { GitMerge, Plus, Search } from 'lucide-react';
import { useTenant } from '@/lib/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

const UNIDADES = ['Protocolo', 'Presidência', 'Secretaria', 'CCJ', 'CFO', 'Comissão de Saúde', 'Comissão de Educação', 'Plenário', 'Executivo', 'Arquivo'];
const STATUS_OPTS = ['Em Tramitação', 'Devolvida', 'Aprovada', 'Rejeitada', 'Arquivada', 'Aguardando Deliberação'];
const TURNOS = ['Único', '1º Turno', '2º Turno', '3º Turno'];

export default function Tramitacoes() {
  const { tenantId, withTenant, canQuery } = useTenant();
  const [tramitacoes, setTramitacoes] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({ materia_id: '', materia_ementa: '', materia_numero: '', unidade_tramitacao_origem: '', unidade_tramitacao_destino: '', data: format(new Date()), hora: '', status: 'Em Tramitação', texto_acao: '', urgente: false, turno: 'Único' });

  function format(d) { return d.toISOString().split('T')[0]; }

  useEffect(() => { if (canQuery) load(); }, [tenantId, canQuery]);

  async function load() {
    const filter = withTenant({});
    const [t, m] = await Promise.all([
      sislegisEntities.Tramitacao.filter(filter, '-created_date', 100),
      sislegisEntities.Materia.filter({ ...filter, status: 'Em tramitação' }),
    ]);
    setTramitacoes(t);
    setMaterias(m);
  }

  async function salvar() {
    const mat = materias.find(m => m.id === form.materia_id);
    await sislegisEntities.Tramitacao.create({
      ...form,
      tenant_id: tenantId || '',
      materia_ementa: mat?.ementa || form.materia_ementa,
      materia_numero: mat?.numero || '',
    });
    // Atualizar localização atual na matéria
    if (form.materia_id) {
      await sislegisEntities.Materia.update(form.materia_id, { local_atual: form.unidade_tramitacao_destino });
    }
    setShowForm(false);
    load();
  }

  const filtradas = tramitacoes.filter(t =>
    t.materia_ementa?.toLowerCase().includes(busca.toLowerCase()) ||
    t.unidade_tramitacao_destino?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader icon={GitMerge} title="Tramitações" subtitle="Workflow legislativo — rastreamento completo"
        action={<Button onClick={() => { setForm({ materia_id: '', materia_ementa: '', materia_numero: '', unidade_tramitacao_origem: '', unidade_tramitacao_destino: '', data: format(new Date()), hora: '', status: 'Em Tramitação', texto_acao: '', urgente: false, turno: 'Único' }); setShowForm(true); }} className="gap-2"><Plus size={16} /> Nova Tramitação</Button>}
      />

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por matéria ou unidade..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
      </div>

      {filtradas.length === 0 ? (
        <EmptyState icon={GitMerge} title="Nenhuma tramitação registrada" description="Registre movimentos para rastrear o workflow legislativo." onAdd={() => setShowForm(true)} addLabel="Nova Tramitação" />
      ) : (
        <div className="space-y-2">
          {filtradas.map(t => (
            <div key={t.id} className="bg-card border border-border rounded-xl px-5 py-4 flex items-start gap-4">
              <div className="flex flex-col items-center pt-1">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${t.urgente ? 'bg-red-500' : 'bg-primary'}`} />
                <div className="w-0.5 h-full bg-border mt-1" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-muted-foreground">{t.data} {t.hora}</span>
                  {t.urgente && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">URGENTE</span>}
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{t.turno}</span>
                </div>
                <div className="text-sm font-medium text-foreground mt-1 line-clamp-1">{t.materia_ementa}</div>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  {t.unidade_tramitacao_origem && <><span className="bg-muted px-2 py-0.5 rounded">{t.unidade_tramitacao_origem}</span> <span>→</span></>}
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">{t.unidade_tramitacao_destino}</span>
                </div>
                {t.texto_acao && <div className="text-xs text-muted-foreground mt-1.5 italic">{t.texto_acao}</div>}
              </div>
              <StatusBadge status={t.status} />
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">Nova Tramitação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Matéria *</label>
              <Select value={form.materia_id} onValueChange={v => setForm(f => ({ ...f, materia_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a matéria..." /></SelectTrigger>
                <SelectContent>{materias.map(m => <SelectItem key={m.id} value={m.id}>{m.tipo} — {m.ementa}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Origem</label>
                <Select value={form.unidade_tramitacao_origem} onValueChange={v => setForm(f => ({ ...f, unidade_tramitacao_origem: v }))}>
                  <SelectTrigger><SelectValue placeholder="De onde vem..." /></SelectTrigger>
                  <SelectContent>{UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Destino *</label>
                <Select value={form.unidade_tramitacao_destino} onValueChange={v => setForm(f => ({ ...f, unidade_tramitacao_destino: v }))}>
                  <SelectTrigger><SelectValue placeholder="Para onde vai..." /></SelectTrigger>
                  <SelectContent>{UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-sm font-medium mb-1.5 block">Data</label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Hora</label><Input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} /></div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Turno</label>
                <Select value={form.turno} onValueChange={v => setForm(f => ({ ...f, turno: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TURNOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium mb-1.5 block">Despacho / Texto da Ação</label><Textarea value={form.texto_acao} onChange={e => setForm(f => ({ ...f, texto_acao: e.target.value }))} rows={3} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="urgente" checked={form.urgente} onChange={e => setForm(f => ({ ...f, urgente: e.target.checked }))} className="rounded" />
              <label htmlFor="urgente" className="text-sm font-medium">Tramitação urgente</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!form.materia_id || !form.unidade_tramitacao_destino}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}