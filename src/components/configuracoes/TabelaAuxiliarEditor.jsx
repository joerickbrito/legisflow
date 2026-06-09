import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, ToggleLeft, ToggleRight, Search } from 'lucide-react';

export default function TabelaAuxiliarEditor({ tabela }) {
  const { tenantId } = useTenant();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (tabela) { setBusca(''); load(); }
  }, [tabela?.key, tenantId]);

  async function load() {
    setLoading(true);
    const filter = tenantId ? { tenant_id: tenantId } : {};
    const data = await base44.entities[tabela.key].filter(filter, 'ordem', 200);
    setRegistros(data);
    setLoading(false);
  }

  function emptyForm() {
    const f = {};
    tabela.campos.forEach(c => f[c] = c === 'cor' ? '#3b82f6' : c === 'ordem' ? 0 : '');
    return f;
  }

  function openNew() { setEditando(null); setForm(emptyForm()); setShowForm(true); }
  function openEdit(r) { setEditando(r); const f = emptyForm(); tabela.campos.forEach(c => f[c] = r[c] ?? f[c]); setForm(f); setShowForm(true); }

  async function salvar() {
    const payload = { ...form, tenant_id: tenantId || '', ativo: editando ? editando.ativo : true };
    if (editando) await base44.entities[tabela.key].update(editando.id, payload);
    else await base44.entities[tabela.key].create(payload);
    setShowForm(false);
    load();
  }

  async function toggleAtivo(r) {
    await base44.entities[tabela.key].update(r.id, { ativo: !r.ativo });
    load();
  }

  async function carregarPadroes() {
    if (!tabela.padroes?.length) return;
    for (let i = 0; i < tabela.padroes.length; i++) {
      const item = tabela.padroes[i];
      await base44.entities[tabela.key].create({
        nome: typeof item === 'string' ? item : item.nome,
        sigla: typeof item === 'object' ? (item.sigla || '') : '',
        descricao: '',
        cor: typeof item === 'object' ? (item.cor || '#3b82f6') : '#3b82f6',
        ordem: i,
        tenant_id: tenantId || '',
        ativo: true,
      });
    }
    load();
  }

  const filtered = registros.filter(r => !busca || r.nome?.toLowerCase().includes(busca.toLowerCase()));
  const temCampo = (c) => tabela.campos.includes(c);

  const FIELD_LABELS = { nome: 'Nome', sigla: 'Sigla', descricao: 'Descrição', cor: 'Cor', ordem: 'Ordem' };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Pesquisar..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        {registros.length === 0 && tabela.padroes?.length > 0 && (
          <Button variant="outline" size="sm" onClick={carregarPadroes} className="text-xs">
            Carregar padrões
          </Button>
        )}
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus size={14} /> Novo
        </Button>
      </div>

      {/* Description */}
      {tabela.desc && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">{tabela.desc}</p>
      )}

      {/* Lista */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tabela.label}</span>
          <span className="text-xs text-muted-foreground">{filtered.length} registro(s)</span>
        </div>
        {loading ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {busca ? 'Nenhum resultado encontrado.' : 'Nenhum item cadastrado ainda.'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(r => (
              <div key={r.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors ${!r.ativo ? 'opacity-50' : ''}`}>
                {temCampo('cor') && r.cor && (
                  <div className="w-3.5 h-3.5 rounded-full border border-border flex-shrink-0" style={{ backgroundColor: r.cor }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{r.nome}</span>
                    {r.sigla && <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{r.sigla}</span>}
                    {!r.ativo && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inativo</Badge>}
                  </div>
                  {r.descricao && <p className="text-xs text-muted-foreground truncate mt-0.5">{r.descricao}</p>}
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)} title="Editar">
                    <Pencil size={12} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleAtivo(r)} title={r.ativo ? 'Desativar' : 'Ativar'}>
                    {r.ativo ? <ToggleRight size={14} className="text-green-600" /> : <ToggleLeft size={14} className="text-muted-foreground" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{editando ? 'Editar' : 'Novo'}: {tabela.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {tabela.campos.filter(c => c !== 'ordem').map(campo => (
              <div key={campo}>
                <label className="text-sm font-medium mb-1.5 block">{FIELD_LABELS[campo] || campo}{campo === 'nome' ? ' *' : ''}</label>
                {campo === 'descricao' ? (
                  <Textarea value={form[campo] || ''} onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))} rows={2} />
                ) : campo === 'cor' ? (
                  <div className="flex items-center gap-3">
                    <input type="color" value={form.cor || '#3b82f6'} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} className="w-10 h-9 rounded cursor-pointer border border-border" />
                    <Input value={form.cor || ''} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} className="font-mono" />
                  </div>
                ) : (
                  <Input
                    value={form[campo] || ''}
                    onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))}
                    placeholder={campo === 'sigla' ? 'Ex: PL' : ''}
                    maxLength={campo === 'sigla' ? 15 : undefined}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!form.nome}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}