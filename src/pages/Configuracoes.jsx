import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Settings, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const TABELAS = [
  { key: 'TipoMateria', label: 'Tipos de Matéria', desc: 'Ex: Projeto de Lei, Indicação, Moção...', campos: ['nome', 'sigla', 'descricao'] },
  { key: 'TipoDocumento', label: 'Tipos de Documento', desc: 'Ex: Ofício, Memorando, Ata...', campos: ['nome', 'descricao'] },
  { key: 'TipoNorma', label: 'Tipos de Norma', desc: 'Ex: Lei Ordinária, Decreto Legislativo...', campos: ['nome', 'sigla', 'descricao'] },
  { key: 'TipoAutor', label: 'Tipos de Autor', desc: 'Ex: Parlamentar, Executivo, Cidadão...', campos: ['nome', 'descricao'] },
  { key: 'StatusTramitacao', label: 'Status de Tramitação', desc: 'Ex: Em análise, Em comissão, Aprovada...', campos: ['nome', 'cor', 'descricao'] },
];

export default function Configuracoes() {
  const { tenantId, isAdminCamara } = useTenant();
  const [abaAtiva, setAbaAtiva] = useState('TipoMateria');
  const [registros, setRegistros] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: '', sigla: '', descricao: '', cor: '#3b82f6' });

  const tabela = TABELAS.find(t => t.key === abaAtiva);

  useEffect(() => { loadRegistros(); }, [abaAtiva, tenantId]);

  async function loadRegistros() {
    const filter = tenantId ? { tenant_id: tenantId } : {};
    const data = await base44.entities[abaAtiva].filter(filter, 'ordem', 100);
    setRegistros(data);
  }

  async function salvar() {
    const payload = { ...form, tenant_id: tenantId || '', ativo: true };
    if (editando) await base44.entities[abaAtiva].update(editando.id, payload);
    else await base44.entities[abaAtiva].create(payload);
    setShowForm(false);
    loadRegistros();
  }

  async function toggleAtivo(r) {
    await base44.entities[abaAtiva].update(r.id, { ativo: !r.ativo });
    loadRegistros();
  }

  async function excluir(r) {
    if (!confirm(`Excluir "${r.nome}"?`)) return;
    await base44.entities[abaAtiva].delete(r.id);
    loadRegistros();
  }

  function openNew() {
    setEditando(null);
    setForm({ nome: '', sigla: '', descricao: '', cor: '#3b82f6' });
    setShowForm(true);
  }

  function openEdit(r) {
    setEditando(r);
    setForm({ nome: r.nome || '', sigla: r.sigla || '', descricao: r.descricao || '', cor: r.cor || '#3b82f6' });
    setShowForm(true);
  }

  if (!isAdminCamara) return (
    <div className="p-6 text-center text-muted-foreground">Acesso restrito a administradores.</div>
  );

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader
        icon={Settings}
        title="Configurações do Sistema"
        subtitle="Tabelas auxiliares configuráveis — sem necessidade de alterar código"
        action={<Button onClick={openNew} className="gap-2"><Plus size={16} /> Novo Item</Button>}
      />

      {/* Abas das tabelas */}
      <div className="flex flex-wrap gap-2">
        {TABELAS.map(t => (
          <button
            key={t.key}
            onClick={() => setAbaAtiva(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${abaAtiva === t.key ? 'bg-primary text-primary-foreground shadow' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tabela && (
        <div className="bg-muted/30 border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">{tabela.desc}</p>
        </div>
      )}

      {/* Lista */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{tabela?.label}</h2>
          <span className="text-xs text-muted-foreground">{registros.length} item(s)</span>
        </div>
        <div className="divide-y divide-border">
          {registros.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhum item cadastrado. Clique em "Novo Item" para adicionar.
            </div>
          )}
          {registros.map(r => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-3">
              {abaAtiva === 'StatusTramitacao' && r.cor && (
                <div className="w-4 h-4 rounded-full flex-shrink-0 border border-border" style={{ backgroundColor: r.cor }} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.nome}</span>
                  {r.sigla && <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">{r.sigla}</span>}
                  {!r.ativo && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                </div>
                {r.descricao && <p className="text-xs text-muted-foreground mt-0.5">{r.descricao}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}>
                  <Pencil size={13} />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => toggleAtivo(r)} title={r.ativo ? 'Desativar' : 'Ativar'}>
                  {r.ativo ? <ToggleRight size={15} className="text-green-600" /> : <ToggleLeft size={15} />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => excluir(r)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Defaults iniciais */}
      {registros.length === 0 && (
        <div className="text-center">
          <Button variant="outline" onClick={async () => {
            const defaults = {
              TipoMateria: ['Projeto de Lei', 'Projeto de Lei Complementar', 'Projeto de Resolução', 'Projeto de Decreto Legislativo', 'Indicação', 'Requerimento', 'Moção', 'Emenda', 'Substitutivo'],
              TipoDocumento: ['Ofício', 'Memorando', 'Convite', 'Contrato', 'Edital', 'Relatório', 'Portaria', 'Parecer', 'Ata', 'Balancete'],
              TipoNorma: ['Lei Ordinária', 'Lei Complementar', 'Decreto Legislativo', 'Resolução', 'Emenda à Lei Orgânica', 'Portaria'],
              TipoAutor: ['Parlamentar', 'Comissão', 'Mesa Diretora', 'Presidente', 'Prefeito', 'Executivo Municipal', 'Tribunal de Contas', 'Ministério Público', 'Cidadão', 'Outro'],
              StatusTramitacao: ['Protocolada', 'Recebida', 'Em análise', 'Em comissão', 'Com parecer', 'Em pauta', 'Em votação', 'Aprovada', 'Rejeitada', 'Arquivada', 'Sancionada', 'Promulgada'],
            };
            const itens = defaults[abaAtiva] || [];
            for (let i = 0; i < itens.length; i++) {
              await base44.entities[abaAtiva].create({ nome: itens[i], tenant_id: tenantId || '', ativo: true, ordem: i });
            }
            loadRegistros();
          }}>
            Carregar valores padrão
          </Button>
        </div>
      )}

      {/* Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-heading">{editando ? 'Editar' : 'Novo'} {tabela?.label?.replace(/s$/, '')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome *</label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Projeto de Lei" />
            </div>
            {tabela?.campos.includes('sigla') && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Sigla</label>
                <Input value={form.sigla} onChange={e => setForm(f => ({ ...f, sigla: e.target.value }))} placeholder="Ex: PL" maxLength={10} />
              </div>
            )}
            {tabela?.campos.includes('cor') && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Cor</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} className="w-10 h-9 rounded cursor-pointer border border-border" />
                  <Input value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} placeholder="#3b82f6" className="font-mono" />
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Descrição</label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} />
            </div>
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