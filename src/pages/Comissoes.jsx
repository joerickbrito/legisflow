import { useEffect, useState } from 'react';
import { sislegisEntities } from '@/lib/sislegisApi';
import { useTenant } from '@/lib/TenantContext';
import { useAuth } from '@/lib/AuthContext';
import { Plus, Building2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const TIPOS = ['Permanente', 'Temporária', 'CPI', 'Especial', 'Mista'];
const CARGOS_MEMBRO = ['Presidente', 'Vice-Presidente', 'Membro', 'Suplente'];

import PageHeader from '@/components/PageHeader';
import LoadingState from '@/components/LoadingState';

export default function Comissoes() {
  const { tenantId, withTenant, canQuery, isAdminCamara } = useTenant();
  const { pode } = useAuth();
  const podeCriar = pode('comissoes_criar');
  const [comissoes, setComissoes] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const emptyForm = { nome: '', sigla: '', tipo: 'Permanente', objetivo: '', data_criacao: '', data_encerramento: '', membros: [], ativa: true, tenant_id: tenantId || '' };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (canQuery) loadData(); }, [tenantId, canQuery]);

  async function loadData() {
    const filter = withTenant({});
    if (!filter) { setLoading(false); return; }
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        sislegisEntities.Comissao.filter(filter, '-created_date', 50).catch(() => []),
        sislegisEntities.Parlamentar.filter({ ...filter, ativo: true }).catch(() => []),
      ]);
      setComissoes(c);
      setParlamentares(p);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditando(null);
    setForm({ ...emptyForm, tenant_id: tenantId || '' });
    setShowForm(true);
  }

  function openEdit(c) {
    setEditando(c);
    setForm({ ...emptyForm, ...c });
    setShowForm(true);
  }

  async function salvar() {
    setSaving(true);
    setErrorMsg('');
    try {
      if (editando) await sislegisEntities.Comissao.update(editando.id, form);
      else await sislegisEntities.Comissao.create(form);
      setShowForm(false);
      setErrorMsg('');
      loadData();
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao salvar comissão.');
    } finally {
      setSaving(false);
    }
  }

  function toggleMembro(parlamentar, cargo) {
    setForm(f => {
      const existe = f.membros.find(m => m.parlamentar_id === parlamentar.id);
      if (existe) return { ...f, membros: f.membros.filter(m => m.parlamentar_id !== parlamentar.id) };
      return { ...f, membros: [...f.membros, { parlamentar_id: parlamentar.id, parlamentar_nome: parlamentar.nome, cargo: cargo || 'Membro' }] };
    });
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon={Building2}
        title="Comissões"
        subtitle={`${comissoes.filter(c => c.ativa !== false).length} ativa(s)`}
        action={podeCriar && <Button onClick={openNew} className="gap-2 shadow-lg shadow-primary/20"><Plus size={16} /> Nova Comissão</Button>}
      />

      {loading ? (
        <LoadingState label="Carregando comissões..." />
      ) : comissoes.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <Building2 size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma comissão cadastrada.</p>
          {podeCriar && <Button onClick={openNew} variant="outline" className="mt-4 gap-2"><Plus size={16} /> Criar comissão</Button>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {comissoes.map((c) => (
            <div key={c.id} onClick={() => openEdit(c)} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                  <Building2 size={18} className="text-primary" />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.ativa !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {c.ativa !== false ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              {c.sigla && <div className="text-xs font-bold text-primary mb-0.5">{c.sigla}</div>}
              <div className="font-heading font-semibold text-foreground">{c.nome}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.tipo}</div>
              {c.membros?.length > 0 && (
                <div className="mt-3 text-xs text-muted-foreground">{c.membros.length} membro(s)</div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editando ? 'Editar Comissão' : 'Nova Comissão'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Nome *</label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Sigla</label>
                <Input value={form.sigla} onChange={e => setForm(f => ({ ...f, sigla: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tipo</label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Objetivo / Descrição</label>
              <Textarea value={form.objetivo || form.descricao || ''} onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1.5 block">Data de Criação</label><Input type="date" value={form.data_criacao} onChange={e => setForm(f => ({ ...f, data_criacao: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Data de Encerramento</label><Input type="date" value={form.data_encerramento} onChange={e => setForm(f => ({ ...f, data_encerramento: e.target.value }))} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Membros</label>
                <span className="text-xs text-muted-foreground">{form.membros.length} selecionado(s)</span>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden max-h-56 overflow-y-auto">
                {parlamentares.map((p) => {
                  const membro = form.membros.find(m => m.parlamentar_id === p.id);
                  return (
                    <div key={p.id} className={`flex items-center gap-3 px-3 py-2 transition-colors ${membro ? 'bg-accent' : 'hover:bg-muted/40'}`}>
                      <div
                        className={`w-4 h-4 rounded border-2 flex-shrink-0 cursor-pointer ${membro ? 'bg-primary border-primary' : 'border-border'}`}
                        onClick={() => toggleMembro(p, 'Membro')}
                      />
                      <span className="text-sm flex-1 cursor-pointer" onClick={() => toggleMembro(p, 'Membro')}>
                        {p.nome_parlamentar || p.nome}
                        {p.partido_sigla && <span className="text-muted-foreground text-xs ml-1">({p.partido_sigla})</span>}
                      </span>
                      {membro && (
                        <select
                          value={membro.cargo}
                          onClick={e => e.stopPropagation()}
                          onChange={e => {
                            const cargo = e.target.value;
                            setForm(f => ({ ...f, membros: f.membros.map(m => m.parlamentar_id === p.id ? { ...m, cargo } : m) }));
                          }}
                          className="text-xs border border-border rounded px-1.5 py-0.5 bg-background text-foreground"
                        >
                          {CARGOS_MEMBRO.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {errorMsg && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{errorMsg}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setErrorMsg(''); }}>Cancelar</Button>
            <Button onClick={salvar} disabled={!form.nome || saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}