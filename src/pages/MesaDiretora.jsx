import { useEffect, useState } from 'react';
import { sislegisEntities } from '@/lib/sislegisApi';
import { useTenant } from '@/lib/TenantContext';
import { Gavel, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';

const CARGOS = ['Presidente', 'Vice-Presidente', '1º Secretário', '2º Secretário'];

export default function MesaDiretora() {
  const { withTenant, canQuery, tenantId } = useTenant();
  const [mesas, setMesas] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);
  const [legislaturas, setLegislaturas] = useState([]);
  const [sessoesLeg, setSessoesLeg] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ legislatura_id: '', legislatura_numero: '', sessao_legislativa_id: '', data_inicio: '', data_fim: '', presidente_id: '', presidente_nome: '', vice_presidente_id: '', vice_presidente_nome: '', primeiro_secretario_id: '', primeiro_secretario_nome: '', segundo_secretario_id: '', segundo_secretario_nome: '', status: 'Ativa' });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => { if (canQuery) load(); }, [canQuery]);

  async function load() {
    const filter = withTenant();
    if (!filter) return;
    try { const m = await sislegisEntities.MesaDiretora.filter(filter, '-created_date'); setMesas(m); } catch (e) { console.error('Erro ao carregar mesas:', e); }
    try { const p = await sislegisEntities.Parlamentar.filter({ ...filter, ativo: true }); setParlamentares(p); } catch (e) { console.error('Erro ao carregar parlamentares:', e); }
    try { const l = await sislegisEntities.Legislatura.filter(filter); setLegislaturas(l); } catch (e) { console.error('Erro ao carregar legislaturas:', e); }
    try { const sl = await sislegisEntities.SessaoLegislativa.filter(filter, '-ano'); setSessoesLeg(sl); } catch (e) { console.error('Erro ao carregar sessões:', e); }
  }

  function setParlamentarCargo(cargo, id) {
    const p = parlamentares.find(x => x.id === id);
    const nome = p?.nome_parlamentar || p?.nome || '';
    const map = {
      presidente: { presidente_id: id, presidente_nome: nome },
      vice: { vice_presidente_id: id, vice_presidente_nome: nome },
      primeiro: { primeiro_secretario_id: id, primeiro_secretario_nome: nome },
      segundo: { segundo_secretario_id: id, segundo_secretario_nome: nome },
    };
    setForm(f => ({ ...f, ...map[cargo] }));
  }

  async function salvar() {
    setSaving(true);
    setErrorMsg('');
    try {
      const leg = legislaturas.find(l => l.id === form.legislatura_id);
      const data = { ...form, tenant_id: tenantId, legislatura_numero: leg?.numero };
      if (editando) await sislegisEntities.MesaDiretora.update(editando.id, data);
      else await sislegisEntities.MesaDiretora.create(data);
      setShowForm(false);
      setErrorMsg('');
      load();
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao salvar mesa diretora.');
    } finally {
      setSaving(false);
    }
  }

  const cargosDisplay = [
    { key: 'presidente', label: 'Presidente', nome: 'presidente_nome' },
    { key: 'vice', label: 'Vice-Presidente', nome: 'vice_presidente_nome' },
    { key: 'primeiro', label: '1º Secretário', nome: 'primeiro_secretario_nome' },
    { key: 'segundo', label: '2º Secretário', nome: 'segundo_secretario_nome' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <PageHeader icon={Gavel} title="Mesa Diretora" subtitle="Composição e histórico da Mesa Diretora"
        action={<Button onClick={() => { setEditando(null); setForm({ legislatura_id: '', legislatura_numero: '', sessao_legislativa_id: '', data_inicio: '', data_fim: '', presidente_id: '', presidente_nome: '', vice_presidente_id: '', vice_presidente_nome: '', primeiro_secretario_id: '', primeiro_secretario_nome: '', segundo_secretario_id: '', segundo_secretario_nome: '', status: 'Ativa' }); setShowForm(true); }} className="gap-2"><Plus size={16} /> Nova Mesa</Button>}
      />

      {mesas.length === 0 ? (
        <EmptyState icon={Gavel} title="Nenhuma Mesa Diretora cadastrada" onAdd={() => setShowForm(true)} addLabel="Cadastrar Mesa Diretora" />
      ) : (
        <div className="space-y-4">
          {mesas.map(m => (
            <div key={m.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <div className="font-heading font-semibold text-foreground">
                    Mesa Diretora {m.legislatura_numero ? `— ${m.legislatura_numero}ª Legislatura` : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">{m.data_inicio} {m.data_fim ? `até ${m.data_fim}` : ''}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={m.status} />
                  <Button variant="outline" size="sm" onClick={() => { setEditando(m); setForm({ legislatura_id: m.legislatura_id || '', legislatura_numero: m.legislatura_numero || '', data_inicio: m.data_inicio || '', data_fim: m.data_fim || '', presidente_id: m.presidente_id || '', presidente_nome: m.presidente_nome || '', vice_presidente_id: m.vice_presidente_id || '', vice_presidente_nome: m.vice_presidente_nome || '', primeiro_secretario_id: m.primeiro_secretario_id || '', primeiro_secretario_nome: m.primeiro_secretario_nome || '', segundo_secretario_id: m.segundo_secretario_id || '', segundo_secretario_nome: m.segundo_secretario_nome || '', status: m.status }); setShowForm(true); }}>Editar</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
                {[
                  { cargo: 'Presidente', nome: m.presidente_nome },
                  { cargo: 'Vice-Presidente', nome: m.vice_presidente_nome },
                  { cargo: '1º Secretário', nome: m.primeiro_secretario_nome },
                  { cargo: '2º Secretário', nome: m.segundo_secretario_nome },
                ].map((item) => (
                  <div key={item.cargo} className="bg-card px-5 py-4">
                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{item.cargo}</div>
                    <div className="font-semibold text-foreground mt-1 text-sm">{item.nome || <span className="text-muted-foreground font-normal italic">Não definido</span>}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">{editando ? 'Editar' : 'Nova'} Mesa Diretora</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Legislatura</label>
              <Select value={form.legislatura_id} onValueChange={v => { const leg = legislaturas.find(l => l.id === v); setForm(f => ({ ...f, legislatura_id: v, legislatura_numero: leg?.numero })); }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{legislaturas.map(l => <SelectItem key={l.id} value={l.id}>{l.numero}ª Legislatura{l.ano_inicio ? ` (${l.ano_inicio}–${l.ano_fim})` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Sessão Legislativa</label>
              <Select value={form.sessao_legislativa_id} onValueChange={v => setForm(f => ({ ...f, sessao_legislativa_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione (opcional)..." /></SelectTrigger>
                <SelectContent>
                  {sessoesLeg
                    .filter(s => !form.legislatura_id || s.legislatura_id === form.legislatura_id)
                    .map(s => <SelectItem key={s.id} value={s.id}>{s.numero}ª Sessão — {s.ano}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1.5 block">Data Início</label><Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Data Fim</label><Input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} /></div>
            </div>
            {cargosDisplay.map(c => (
              <div key={c.key}>
                <label className="text-sm font-medium mb-1.5 block">{c.label}</label>
                <Select value={form[`${c.key === 'vice' ? 'vice_presidente' : c.key === 'primeiro' ? 'primeiro_secretario' : c.key === 'segundo' ? 'segundo_secretario' : 'presidente'}_id`]}
                  onValueChange={v => setParlamentarCargo(c.key, v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o parlamentar..." /></SelectTrigger>
                  <SelectContent>{parlamentares.map(p => <SelectItem key={p.id} value={p.id}>{p.nome_parlamentar || p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
          </div>
          {errorMsg && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{errorMsg}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setErrorMsg(''); }}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}