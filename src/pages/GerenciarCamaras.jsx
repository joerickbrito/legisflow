import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { sislegisEntities } from "@/lib/sislegisApi";
import { useTenant } from "@/lib/TenantContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Building2, Plus, Search, Users, Upload, MapPin, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import LoadingState from "@/components/LoadingState";

const REQUIRED_FIELDS = ['nome', 'municipio', 'estado', 'cnpj', 'email', 'telefone'];

function isFormValid(form) {
  return REQUIRED_FIELDS.every(f => form[f]?.trim?.() || form[f]);
}

const FormField = ({ label, required, children }) => (
  <div>
    <label className="text-xs text-muted-foreground block mb-1">
      {label}{required && <span className="text-destructive ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

export default function GerenciarCamaras() {
  const { isSuperAdmin } = useTenant();
  const [camaras, setCamaras] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [secaoExpandida, setSecaoExpandida] = useState("camara");

  const emptyForm = {
    nome: "", sigla: "", cnpj: "", municipio: "", estado: "",
    telefone: "", email: "", site: "", cor_institucional: "#1d4ed8",
    brasao_url: "", logotipo_url: "", status: "Ativa",
    total_vereadores: 9, observacoes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const [uploadingBrasao, setUploadingBrasao] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Usuários da câmara
  const [chamberUsers, setChamberUsers] = useState([]);
  const [editingChamberUser, setEditingChamberUser] = useState(null);
  const [chamberUserForm, setChamberUserForm] = useState({ nome: '', username: '', status: 'Ativo', role: '' });
  const [savingChamberUser, setSavingChamberUser] = useState(false);
  const [resettingUserId, setResettingUserId] = useState(null);

  // Solicitações de recuperação de senha
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [atendendoSolicitacao, setAtendendoSolicitacao] = useState(null);
  const [solicitacoesCounts, setSolicitacoesCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin) { setLoading(false); return; }
    if (isSuperAdmin) {
      setLoading(true);
      sislegisEntities.Camara.list("-created_date", 200).then(setCamaras).catch(() => setCamaras([])).finally(() => setLoading(false));
      // Carregar contagem de solicitações pendentes
      sislegisEntities.SolicitacoesRecuperacaoSenha.filter({ status: 'pendente' }, '-created_date', 200)
        .then(sols => {
          const counts = {};
          (sols || []).forEach(s => {
            if (s.tenant_id) counts[s.tenant_id] = (counts[s.tenant_id] || 0) + 1;
          });
          setSolicitacoesCounts(counts);
        })
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return (
    <div className="p-6 text-center text-muted-foreground">Acesso restrito ao Master Admin.</div>
  );

  const openNew = () => { setEditing(null); setForm(emptyForm); setSecaoExpandida("camara"); setOpen(true); };
  const openEdit = async (c) => {
    setEditing(c);
    setForm({ ...emptyForm, ...c });
    setSecaoExpandida("camara");
    setChamberUsers([]);
    setSolicitacoes([]);
    setOpen(true);
    // Buscar todos os usuários da câmara (inclui o admin)
    try {
      const users = await sislegisEntities.UsuarioSislegis.filter({ tenant_id: c.id }, 'nome', 200);
      setChamberUsers(users || []);
    } catch { setChamberUsers([]); }
    // Buscar solicitações de recuperação de senha pendentes
    try {
      const sols = await sislegisEntities.SolicitacoesRecuperacaoSenha.filter({ tenant_id: c.id, status: 'pendente' }, '-created_date', 50);
      setSolicitacoes(sols || []);
    } catch { setSolicitacoes([]); }
  };

  async function handleUpload(e, tipo) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (tipo === 'brasao') setUploadingBrasao(true); else setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, [tipo === 'brasao' ? 'brasao_url' : 'logotipo_url']: file_url }));
    if (tipo === 'brasao') setUploadingBrasao(false); else setUploadingLogo(false);
  }

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      if (editing) {
        await sislegisEntities.Camara.update(editing.id, form);
        setCamaras(await sislegisEntities.Camara.list("-created_date", 200));
        setOpen(false);
      } else {
        const novaCamara = await sislegisEntities.Camara.create(form);
        setCamaras(await sislegisEntities.Camara.list("-created_date", 200));
        setOpen(false);
        alert(`Câmara "${novaCamara.nome}" criada com sucesso!`);
      }
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao salvar câmara.');
    } finally {
      setSaving(false);
    }
  };

  // ===== USUÁRIOS DA CÂMARA =====
  const openEditChamberUser = (u) => {
    setEditingChamberUser(u);
    setChamberUserForm({
      nome: u.nome || '',
      username: u.username || '',
      status: u.status || 'Ativo',
      role: u.role || '',
    });
  };

  const handleSaveChamberUser = async () => {
    if (!editingChamberUser || !chamberUserForm.nome.trim()) return;
    setSavingChamberUser(true);
    try {
      await sislegisEntities.UsuarioSislegis.update(editingChamberUser.id, {
        nome: chamberUserForm.nome.trim(),
        username: chamberUserForm.username.trim(),
        status: chamberUserForm.status,
      });
      setChamberUsers(prev => prev.map(u => u.id === editingChamberUser.id ? { ...u, ...chamberUserForm } : u));
      setEditingChamberUser(null);
    } catch (e) {
      alert('Erro ao salvar: ' + (e?.message || 'Erro desconhecido.'));
    } finally {
      setSavingChamberUser(false);
    }
  };

  const handleResetUserPassword = async (u) => {
    if (!confirm(`Deseja redefinir a senha de ${u.nome || u.username}?\n\nUma nova senha temporária será gerada.`)) return;
    setResettingUserId(u.id);
    try {
      const res = await base44.functions.invoke('resetarSenhaSislegis', { usuario_id: u.id });
      const senha = res.data?.senha_temporaria;
      if (senha) {
        alert(`Senha redefinida com sucesso!\n\nNova senha temporária: ${senha}\n\nAnote esta senha. Ela não será exibida novamente.`);
      } else {
        alert('Senha redefinida com sucesso.');
      }
    } catch (e) {
      alert('Erro ao redefinir senha: ' + (e?.response?.data?.error || e?.message || 'Erro desconhecido.'));
    } finally {
      setResettingUserId(null);
    }
  };

  // ===== SOLICITAÇÕES DE RECUPERAÇÃO DE SENHA =====
  const handleAtenderSolicitacao = async (sol) => {
    if (!sol.usuario_id) {
      alert('Esta solicitação não possui um usuário vinculado. O usuário pode ter sido removido.');
      return;
    }
    if (!confirm(`Redefinir senha de "${sol.usuario_nome || sol.username}"?\n\nUma nova senha temporária será gerada e a solicitação será marcada como atendida.`)) return;
    setAtendendoSolicitacao(sol.id);
    try {
      const res = await base44.functions.invoke('resetarSenhaSislegis', { usuario_id: sol.usuario_id });
      // Marcar como atendida
      await sislegisEntities.SolicitacoesRecuperacaoSenha.update(sol.id, { status: 'atendida' });
      const senha = res.data?.senha_temporaria;
      if (senha) {
        alert(`Senha redefinida!\n\nNova senha temporária: ${senha}\n\nComunique ao usuário.`);
      } else {
        alert('Senha redefinida com sucesso. Solicitação marcada como atendida.');
      }
      setSolicitacoes(prev => prev.filter(s => s.id !== sol.id));
    } catch (e) {
      alert('Erro: ' + (e?.response?.data?.error || e?.message || 'Erro desconhecido.'));
    } finally {
      setAtendendoSolicitacao(null);
    }
  };

  const handleIgnorarSolicitacao = async (sol) => {
    if (!confirm(`Marcar solicitação de "${sol.usuario_nome || sol.username}" como atendida sem redefinir a senha?`)) return;
    setAtendendoSolicitacao(sol.id);
    try {
      await sislegisEntities.SolicitacoesRecuperacaoSenha.update(sol.id, { status: 'atendida' });
      setSolicitacoes(prev => prev.filter(s => s.id !== sol.id));
    } catch (e) {
      alert('Erro: ' + (e?.message || 'Erro desconhecido.'));
    } finally {
      setAtendendoSolicitacao(null);
    }
  };

  const ROLE_LABEL = {
    ADMIN_CAMARA: 'Admin da Câmara',
    OPERADOR_GERAL: 'Operador Geral',
    PRESIDENTE: 'Presidente',
    VEREADOR: 'Vereador',
    ASSESSOR: 'Assessor',
    SECRETARIO_LEGISLATIVO: 'Secretário Legislativo',
    SUPER_ADMIN: 'Super Admin',
  };

  const ROLE_COLOR = {
    ADMIN_CAMARA: 'bg-blue-100 text-blue-700',
    OPERADOR_GERAL: 'bg-indigo-100 text-indigo-700',
    PRESIDENTE: 'bg-amber-100 text-amber-700',
    VEREADOR: 'bg-green-100 text-green-700',
    ASSESSOR: 'bg-slate-100 text-slate-700',
    SECRETARIO_LEGISLATIVO: 'bg-teal-100 text-teal-700',
    SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  };

  const STATUS_LABEL = { "Pendente de Ativação": "outline", "Ativo": "default", "Inativo": "secondary", "Bloqueado": "destructive" };

  const filtered = camaras.filter(c =>
    c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    (c.municipio || c.cidade || '')?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = { "Ativa": "default", "Suspensa": "secondary", "Inativa": "destructive" };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Building2}
        title="Gerenciar Câmaras"
        subtitle="Cadastro e gestão de todas as Câmaras Municipais da plataforma"
        action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nova Câmara</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: camaras.length, color: "text-primary" },
          { label: "Ativas", value: camaras.filter(c => c.status === "Ativa").length, color: "text-green-600" },
          { label: "Suspensas", value: camaras.filter(c => c.status === "Suspensa").length, color: "text-yellow-600" },
          { label: "Inativas", value: camaras.filter(c => c.status === "Inativa").length, color: "text-red-500" },
        ].map(s => (
          <Card key={s.label}><CardContent className="pt-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar câmaras..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <div className="col-span-full"><LoadingState label="Carregando câmaras..." /></div>}
        {!loading && filtered.map(c => (
          <Card key={c.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => openEdit(c)}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                {c.brasao_url ? (
                  <img src={c.brasao_url} alt="Brasão" className="w-12 h-12 object-contain rounded-lg border border-border flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10">
                    <Building2 size={22} style={{ color: c.cor_institucional || '#1d4ed8' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm leading-tight">{c.nome}</p>
                      {c.sigla && <span className="text-xs text-muted-foreground">({c.sigla})</span>}
                    </div>
                    <Badge variant={statusColor[c.status] || "secondary"} className="flex-shrink-0 text-xs">{c.status}</Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <MapPin size={11} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{c.municipio || c.cidade}{c.estado ? `, ${c.estado}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <Users size={11} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{c.total_vereadores || '—'} ver.</span>
                    </div>
                    {c.cor_institucional && (
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: c.cor_institucional }} />
                        <span className="text-xs text-muted-foreground font-mono">{c.cor_institucional}</span>
                      </div>
                    )}
                    {solicitacoesCounts[c.id] > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5">{solicitacoesCounts[c.id]} recuperação</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8 col-span-3">Nenhuma câmara encontrada.</p>
        )}
      </div>

      {/* ============ FORM DIALOG ============ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Editar Câmara" : "Nova Câmara"}</DialogTitle>
            {!editing && <p className="text-xs text-muted-foreground">Campos marcados com <span className="text-destructive">*</span> são obrigatórios.</p>}
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* SEÇÃO 1: DADOS DA CÂMARA */}
            <div className="rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setSecaoExpandida(s => s === "camara" ? "" : "camara")}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
              >
                <span className="text-sm font-semibold text-foreground">Seção 1 — Dados da Câmara</span>
                {secaoExpandida === "camara" ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
              </button>
              {secaoExpandida === "camara" && (
                <div className="p-4 space-y-4">
                  {/* Brasão + Logotipo + Nome + Cor */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <label className="text-xs text-muted-foreground block mb-1.5">Brasão</label>
                      <div className="relative w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors">
                        {form.brasao_url ? (
                          <img src={form.brasao_url} alt="Brasão" className="w-full h-full object-contain p-1" />
                        ) : (
                          <div className="text-center">
                            <Upload size={16} className="text-muted-foreground mx-auto" />
                            <span className="text-[9px] text-muted-foreground mt-1 block">Upload</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={e => handleUpload(e, 'brasao')} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                      {uploadingBrasao && <p className="text-[10px] text-muted-foreground mt-1">Enviando...</p>}
                    </div>

                    <div className="flex-shrink-0">
                      <label className="text-xs text-muted-foreground block mb-1.5">Logotipo</label>
                      <div className="relative w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors">
                        {form.logotipo_url ? (
                          <img src={form.logotipo_url} alt="Logotipo" className="w-full h-full object-contain p-1" />
                        ) : (
                          <div className="text-center">
                            <Upload size={16} className="text-muted-foreground mx-auto" />
                            <span className="text-[9px] text-muted-foreground mt-1 block">Upload</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={e => handleUpload(e, 'logo')} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                      {uploadingLogo && <p className="text-[10px] text-muted-foreground mt-1">Enviando...</p>}
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <FormField label="Nome da Câmara" required>
                            <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Câmara Municipal de..." />
                          </FormField>
                        </div>
                        <div>
                          <FormField label="Sigla">
                            <Input value={form.sigla} onChange={e => setForm(f => ({ ...f, sigla: e.target.value }))} maxLength={10} placeholder="CM..." />
                          </FormField>
                        </div>
                      </div>
                      <FormField label="Cor Institucional">
                        <div className="flex items-center gap-2">
                          <input type="color" value={form.cor_institucional} onChange={e => setForm(f => ({ ...f, cor_institucional: e.target.value }))} className="w-9 h-9 rounded border border-border cursor-pointer flex-shrink-0" />
                          <Input value={form.cor_institucional} onChange={e => setForm(f => ({ ...f, cor_institucional: e.target.value }))} className="font-mono" placeholder="#1d4ed8" />
                        </div>
                      </FormField>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <FormField label="Município" required>
                        <Input value={form.municipio || form.cidade || ''} onChange={e => setForm(f => ({ ...f, municipio: e.target.value, cidade: e.target.value }))} />
                      </FormField>
                    </div>
                    <div>
                      <FormField label="Estado (UF)" required>
                        <Input value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value.toUpperCase() }))} maxLength={2} placeholder="SP" />
                      </FormField>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="CNPJ" required>
                      <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
                    </FormField>
                    <FormField label="Total de Vereadores">
                      <Input type="number" min={1} value={form.total_vereadores} onChange={e => setForm(f => ({ ...f, total_vereadores: +e.target.value }))} />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="E-mail Institucional" required>
                      <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contato@camara.sp.gov.br" />
                    </FormField>
                    <FormField label="Telefone" required>
                      <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 3333-0000" />
                    </FormField>
                  </div>
                  <FormField label="Site">
                    <Input value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} placeholder="https://www.camara.sp.gov.br" />
                  </FormField>

                  <FormField label="Status">
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ativa">Ativa</SelectItem>
                        <SelectItem value="Suspensa">Suspensa</SelectItem>
                        <SelectItem value="Inativa">Inativa</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Observações">
                    <Input value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
                  </FormField>
                </div>
              )}
            </div>

            {/* SEÇÃO 2: USUÁRIOS DA CÂMARA (somente edição) — inclui o admin, destacado no topo */}
            {editing && (
              <div className="rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSecaoExpandida(s => s === "users" ? "" : "users")}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <span className="text-sm font-semibold text-foreground">
                    Seção 2 — Usuários da Câmara
                    {chamberUsers.length > 0 && <span className="ml-2 text-xs font-normal text-muted-foreground">({chamberUsers.length} usuário{chamberUsers.length !== 1 ? 's' : ''})</span>}
                  </span>
                  {secaoExpandida === "users" ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>
                {secaoExpandida === "users" && (
                  <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                    {chamberUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário cadastrado nesta câmara.</p>
                    ) : (
                      [...chamberUsers]
                        .sort((a, b) => (b.role === 'ADMIN_CAMARA' ? 1 : 0) - (a.role === 'ADMIN_CAMARA' ? 1 : 0))
                        .map(u => {
                          const isAdmin = u.role === 'ADMIN_CAMARA';
                          return (
                            <div key={u.id} className={`flex items-center gap-3 py-2 px-3 rounded-lg border transition-colors ${isAdmin ? 'border-primary/40 bg-primary/5 hover:bg-primary/10' : 'border-border bg-background hover:bg-muted/30'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isAdmin ? 'bg-primary/15' : 'bg-muted'}`}>
                                <Users size={14} className={isAdmin ? 'text-primary' : 'text-muted-foreground'} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                                  {u.nome || u.username}
                                  {isAdmin && <span className="text-[9px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Admin</span>}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">{u.username}{u.email ? ` · ${u.email}` : ''}</p>
                              </div>
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${ROLE_COLOR[u.role] || 'bg-muted text-muted-foreground'}`}>
                                {ROLE_LABEL[u.role] || u.role}
                              </span>
                              <Badge variant={STATUS_LABEL[u.status] || 'secondary'} className="text-[10px] flex-shrink-0">{u.status || 'Ativo'}</Badge>
                              <div className="flex gap-1 flex-shrink-0">
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); openEditChamberUser(u); }}>Editar</Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  onClick={(e) => { e.stopPropagation(); handleResetUserPassword(u); }}
                                  disabled={resettingUserId === u.id}
                                >
                                  {resettingUserId === u.id ? '...' : 'Senha'}
                                </Button>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SEÇÃO 3: SOLICITAÇÕES DE RECUPERAÇÃO DE SENHA (somente edição) */}
            {editing && (
              <div className="rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSecaoExpandida(s => s === "solicitacoes" ? "" : "solicitacoes")}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <span className="text-sm font-semibold text-foreground">
                    Seção 3 — Solicitações de Recuperação de Senha
                    {solicitacoes.length > 0 && (
                      <Badge variant="destructive" className="ml-2 text-[10px]">{solicitacoes.length} pendente{solicitacoes.length !== 1 ? 's' : ''}</Badge>
                    )}
                    {solicitacoes.length === 0 && <span className="ml-2 text-xs font-normal text-muted-foreground">(0 pendentes)</span>}
                  </span>
                  {secaoExpandida === "solicitacoes" ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>
                {secaoExpandida === "solicitacoes" && (
                  <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                    {solicitacoes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma solicitação pendente.</p>
                    ) : (
                      solicitacoes.map(sol => (
                        <div key={sol.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-border bg-amber-50/50 hover:bg-amber-50 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <AlertCircle size={14} className="text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{sol.usuario_nome || sol.username}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {sol.username}
                              {sol.usuario_role && <span className="ml-2 opacity-60">· {ROLE_LABEL[sol.usuario_role] || sol.usuario_role}</span>}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Solicitado {new Date(sol.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 px-2 text-xs bg-amber-500 hover:bg-amber-600"
                              onClick={(e) => { e.stopPropagation(); handleAtenderSolicitacao(sol); }}
                              disabled={atendendoSolicitacao === sol.id}
                            >
                              {atendendoSolicitacao === sol.id ? '...' : 'Redefinir'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={(e) => { e.stopPropagation(); handleIgnorarSolicitacao(sol); }}
                              disabled={atendendoSolicitacao === sol.id || !sol.usuario_id}
                            >
                              Ignorar
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Dialog para editar usuário da câmara */}
            <Dialog open={!!editingChamberUser} onOpenChange={(v) => { if (!v) setEditingChamberUser(null); }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Editar Usuário</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <FormField label="Nome" required>
                    <Input value={chamberUserForm.nome} onChange={e => setChamberUserForm(f => ({ ...f, nome: e.target.value }))} />
                  </FormField>
                  <FormField label="Nome de Usuário">
                    <Input value={chamberUserForm.username} onChange={e => setChamberUserForm(f => ({ ...f, username: e.target.value }))} />
                  </FormField>
                  <FormField label="Perfil">
                    <Input value={ROLE_LABEL[chamberUserForm.role] || chamberUserForm.role} disabled className="opacity-50" />
                  </FormField>
                  <FormField label="Status">
                    <Select value={chamberUserForm.status} onValueChange={v => setChamberUserForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="Pendente de Ativação">Pendente de Ativação</SelectItem>
                        <SelectItem value="Inativo">Inativo</SelectItem>
                        <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingChamberUser(null)}>Cancelar</Button>
                  <Button onClick={handleSaveChamberUser} disabled={savingChamberUser}>{savingChamberUser ? 'Salvando...' : 'Salvar'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {errorMsg && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{errorMsg}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setErrorMsg(''); }}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !isFormValid(form)}
            >
              {saving ? "Salvando..." : editing ? "Salvar Alterações" : "Criar Câmara"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}