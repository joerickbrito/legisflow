import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { sislegisEntities } from '@/lib/sislegisApi';
import { useTenant } from '@/lib/TenantContext';
import { Plus, Users, Search, Mail, Phone, Upload, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/PageHeader';

const SITUACOES = ['Ativo', 'Licenciado', 'Afastado'];
const TIPOS = ['Titular', 'Suplente'];
const CARGOS = ['Vereador', 'Presidente', 'Vice-Presidente', '1º Secretário', '2º Secretário'];

export default function Parlamentares() {
  const { tenantId, withTenant, canQuery, isAdminCamara } = useTenant();
  const [parlamentares, setParlamentares] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [legislaturas, setLegislaturas] = useState([]);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const emptyForm = {
    nome: '', nome_parlamentar: '', cpf: '', email: '', telefone: '',
    foto_url: '', partido_id: '', partido_sigla: '', cargo: 'Vereador',
    tipo: 'Titular', situacao: 'Ativo', data_posse: '', gabinete: '',
    legislatura_id: '', legislatura_numero: '',
    ativo: true, tenant_id: tenantId || '',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { if (canQuery) loadData(); }, [tenantId, canQuery]);

  async function loadData() {
    const filter = withTenant({});
    const [p, part, legs] = await Promise.all([
      sislegisEntities.Parlamentar.filter(filter, 'nome', 100),
      sislegisEntities.Partido.filter(filter, 'sigla', 50).catch(() => []),
      sislegisEntities.Legislatura.filter(filter, '-numero', 20).catch(() => []),
    ]);
    setParlamentares(p);
    setPartidos(part);
    setLegislaturas(legs);
  }

  function openNew() { setEditando(null); setForm({ ...emptyForm, tenant_id: tenantId || '' }); setShowForm(true); }
  function openEdit(p) { setEditando(p); setForm({ ...emptyForm, ...p }); setShowForm(true); }

  async function handleFotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, foto_url: file_url }));
    setUploading(false);
  }

  function onPartidoChange(partidoId) {
    const partido = partidos.find(p => p.id === partidoId);
    setForm(f => ({ ...f, partido_id: partidoId, partido_sigla: partido?.sigla || '' }));
  }

  async function salvar() {
    setSaving(true);
    setErrorMsg('');
    try {
      const data = { ...form, ativo: form.situacao === 'Ativo' };
      if (editando) await sislegisEntities.Parlamentar.update(editando.id, data);
      else await sislegisEntities.Parlamentar.create(data);
      setShowForm(false);
      setErrorMsg('');
      loadData();
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao salvar parlamentar.');
    } finally {
      setSaving(false);
    }
  }

  const filtrados = parlamentares.filter(p =>
    (p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    p.nome_parlamentar?.toLowerCase().includes(busca.toLowerCase()) ||
    p.partido_sigla?.toLowerCase().includes(busca.toLowerCase()))
  );

  const cargoOrder = { 'Presidente': 0, 'Vice-Presidente': 1, '1º Secretário': 2, '2º Secretário': 3, 'Vereador': 4 };
  const sorted = [...filtrados].sort((a, b) => (cargoOrder[a.cargo] ?? 5) - (cargoOrder[b.cargo] ?? 5));

  const situacaoColor = { 'Ativo': 'bg-green-100 text-green-700', 'Licenciado': 'bg-yellow-100 text-yellow-700', 'Afastado': 'bg-red-100 text-red-700' };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon={Users}
        title="Parlamentares"
        subtitle={`${parlamentares.filter(p => p.situacao === 'Ativo' || p.ativo !== false).length} ativos`}
        action={isAdminCamara && <Button onClick={openNew} className="gap-2 shadow-lg shadow-primary/20"><Plus size={16} /> Novo Parlamentar</Button>}
      />

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou partido..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
      </div>

      {sorted.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <Users size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum parlamentar cadastrado ainda.</p>
          {isAdminCamara && <Button onClick={openNew} variant="outline" className="mt-4 gap-2"><Plus size={16} /> Cadastrar parlamentar</Button>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map((p) => (
            <div key={p.id} onClick={() => openEdit(p)} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
              {/* Foto */}
              <div className="relative h-32 bg-gradient-to-b from-accent to-muted flex items-center justify-center">
                {p.foto_url ? (
                  <img src={p.foto_url} alt={p.nome} className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md absolute bottom-[-24px]" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-white shadow-md absolute bottom-[-24px] flex items-center justify-center">
                    <span className="text-3xl font-heading font-bold text-primary">{(p.nome_parlamentar || p.nome)?.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="pt-8 pb-4 px-4 text-center">
                <div className="font-semibold text-foreground text-sm leading-tight">
                  {p.nome_parlamentar || p.nome}
                  {p.partido_sigla && <span className="text-muted-foreground font-normal"> — {p.partido_sigla}</span>}
                </div>
                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    p.cargo === 'Presidente' ? 'bg-yellow-100 text-yellow-700' :
                    p.cargo === 'Vice-Presidente' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{p.cargo || 'Vereador'}</span>
                  {p.tipo === 'Suplente' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">Suplente</span>}
                  {(p.situacao && p.situacao !== 'Ativo') && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${situacaoColor[p.situacao] || 'bg-gray-100 text-gray-600'}`}>{p.situacao}</span>
                  )}
                </div>
                {(p.email || p.telefone) && (
                  <div className="mt-3 space-y-1 border-t border-border pt-2">
                    {p.email && <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground"><Mail size={10} /> <span className="truncate max-w-[140px]">{p.email}</span></div>}
                    {p.telefone && <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground"><Phone size={10} /> {p.telefone}</div>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editando ? 'Editar Parlamentar' : 'Novo Parlamentar'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Foto */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden flex-shrink-0">
                {form.foto_url ? (
                  <img src={form.foto_url} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={24} className="text-muted-foreground" />
                )}
                <input type="file" accept="image/*" onChange={handleFotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Foto do Parlamentar</p>
                <p className="text-xs text-muted-foreground">Clique na imagem para fazer upload. Obrigatória para vereadores.</p>
                {uploading && <p className="text-xs text-primary mt-1">Enviando...</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome Completo *</label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome Político</label>
                <Input value={form.nome_parlamentar} onChange={e => setForm(f => ({ ...f, nome_parlamentar: e.target.value }))} placeholder="Como será exibido" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Partido</label>
                {partidos.length > 0 ? (
                  <Select value={form.partido_id} onValueChange={onPartidoChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{partidos.map(p => <SelectItem key={p.id} value={p.id}>{p.sigla} — {p.nome}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={form.partido_sigla} onChange={e => setForm(f => ({ ...f, partido_sigla: e.target.value }))} placeholder="Sigla do partido" />
                )}
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
                <label className="text-sm font-medium mb-1.5 block">Tipo</label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Situação</label>
                <Select value={form.situacao} onValueChange={v => setForm(f => ({ ...f, situacao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SITUACOES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">E-mail</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Telefone</label>
                <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Data de Posse</label>
                <Input type="date" value={form.data_posse} onChange={e => setForm(f => ({ ...f, data_posse: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">CPF</label>
                <Input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
              </div>
            </div>

            {legislaturas.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Legislatura Vinculada</label>
                <Select value={form.legislatura_id} onValueChange={v => {
                  const leg = legislaturas.find(l => l.id === v);
                  setForm(f => ({ ...f, legislatura_id: v, legislatura_numero: leg?.numero || '' }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione a legislatura..." /></SelectTrigger>
                  <SelectContent>
                    {legislaturas.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.numero}ª Legislatura{(l.ano_inicio && l.ano_fim) ? ` (${l.ano_inicio}–${l.ano_fim})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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