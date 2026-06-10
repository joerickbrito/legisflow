import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

export default function Legislaturas() {
  const [legislaturas, setLegislaturas] = useState([]);
  const [sessoesLeg, setSessoesLeg] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ numero: '', ano_inicio: '', ano_fim: '', data_inicio: '', data_fim: '', data_eleicao: '', descricao: '', status: 'Ativa' });
  const [showSessaoForm, setShowSessaoForm] = useState(false);
  const [sessaoForm, setSessaoForm] = useState({ numero: '', ano: new Date().getFullYear(), data_inicio: '', data_fim: '', legislatura_id: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    const [l, s] = await Promise.all([
      base44.entities.Legislatura.list('-data_inicio'),
      base44.entities.SessaoLegislativa.list('-ano'),
    ]);
    setLegislaturas(l);
    setSessoesLeg(s);
  }

  async function salvarLeg() {
    const data = { ...form, numero: Number(form.numero), ano_inicio: form.ano_inicio ? Number(form.ano_inicio) : undefined, ano_fim: form.ano_fim ? Number(form.ano_fim) : undefined };
    if (editando) await base44.entities.Legislatura.update(editando.id, data);
    else await base44.entities.Legislatura.create(data);
    setShowForm(false); load();
  }

  async function salvarSessao() {
    const leg = legislaturas.find(l => l.id === sessaoForm.legislatura_id);
    await base44.entities.SessaoLegislativa.create({ ...sessaoForm, ano: Number(sessaoForm.ano), numero: Number(sessaoForm.numero), legislatura_numero: leg?.numero });
    setShowSessaoForm(false); load();
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader icon={BookOpen} title="Legislaturas & Sessões Legislativas"
        subtitle="Controle de mandatos e anos legislativos"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSessaoForm(true)} className="gap-1">
              <Plus size={15} /> Sessão Legislativa
            </Button>
            <Button size="sm" onClick={() => { setEditando(null); setForm({ numero: '', ano_inicio: '', ano_fim: '', data_inicio: '', data_fim: '', data_eleicao: '', descricao: '', status: 'Ativa' }); setShowForm(true); }} className="gap-1">
              <Plus size={15} /> Legislatura
            </Button>
          </div>
        }
      />

      {legislaturas.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nenhuma legislatura cadastrada" description="Cadastre a legislatura atual para começar." onAdd={() => setShowForm(true)} addLabel="Cadastrar Legislatura" />
      ) : (
        <div className="space-y-4">
          {legislaturas.map((l) => {
            const sessoes = sessoesLeg.filter(s => s.legislatura_id === l.id);
            return (
              <div key={l.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center font-heading font-bold text-primary">{l.numero}ª</div>
                    <div>
                      <div className="font-semibold text-foreground">{l.numero}ª Legislatura{(l.ano_inicio && l.ano_fim) ? ` — ${l.ano_inicio}/${l.ano_fim}` : ''}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.data_eleicao && <span>Eleição: {l.data_eleicao} · </span>}
                        {l.data_inicio && `${l.data_inicio} a ${l.data_fim}`}
                      </div>
                      {l.descricao && <div className="text-xs text-muted-foreground italic">{l.descricao}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={l.status} />
                    <Button variant="outline" size="sm" onClick={() => { setEditando(l); setForm({ numero: l.numero, ano_inicio: l.ano_inicio || '', ano_fim: l.ano_fim || '', data_inicio: l.data_inicio || '', data_fim: l.data_fim || '', data_eleicao: l.data_eleicao || '', descricao: l.descricao || '', status: l.status }); setShowForm(true); }}>
                      Editar
                    </Button>
                  </div>
                </div>
                {sessoes.length > 0 && (
                  <div className="px-5 py-3 flex flex-wrap gap-2">
                    {sessoes.map(s => (
                      <span key={s.id} className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full font-medium">
                        {s.numero}ª Sessão — {s.ano}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-heading">{editando ? 'Editar' : 'Nova'} Legislatura</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-sm font-medium mb-1.5 block">Número *</label><Input type="number" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="Ex: 19" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1.5 block">Ano de Início</label><Input type="number" value={form.ano_inicio} onChange={e => setForm(f => ({ ...f, ano_inicio: e.target.value }))} placeholder="2021" /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Ano de Fim</label><Input type="number" value={form.ano_fim} onChange={e => setForm(f => ({ ...f, ano_fim: e.target.value }))} placeholder="2024" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1.5 block">Data de Início</label><Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Data de Fim</label><Input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} /></div>
            </div>
            <div><label className="text-sm font-medium mb-1.5 block">Data de Eleição</label><Input type="date" value={form.data_eleicao} onChange={e => setForm(f => ({ ...f, data_eleicao: e.target.value }))} /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Descrição</label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: 19ª Legislatura — 2021 a 2024" /></div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Ativa">Ativa</SelectItem><SelectItem value="Encerrada">Encerrada</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={salvarLeg}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSessaoForm} onOpenChange={setShowSessaoForm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-heading">Nova Sessão Legislativa</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Legislatura</label>
              <Select value={sessaoForm.legislatura_id} onValueChange={v => setSessaoForm(f => ({ ...f, legislatura_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{legislaturas.map(l => <SelectItem key={l.id} value={l.id}>{l.numero}ª Legislatura</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1.5 block">Número</label><Input type="number" value={sessaoForm.numero} onChange={e => setSessaoForm(f => ({ ...f, numero: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Ano</label><Input type="number" value={sessaoForm.ano} onChange={e => setSessaoForm(f => ({ ...f, ano: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1.5 block">Início</label><Input type="date" value={sessaoForm.data_inicio} onChange={e => setSessaoForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Fim</label><Input type="date" value={sessaoForm.data_fim} onChange={e => setSessaoForm(f => ({ ...f, data_fim: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSessaoForm(false)}>Cancelar</Button>
            <Button onClick={salvarSessao}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}