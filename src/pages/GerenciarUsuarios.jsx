import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { criarUsuario, listarUsuariosSislegis, atualizarUsuarioSislegis, sislegisEntities, validarSenhaForte } from "@/lib/sislegisApi";
import { useTenant } from "@/lib/TenantContext";
import { PERFIS_ORDER, PERFIL_LABELS, PERFIL_DESCRIPTIONS, DEFAULT_PERMISSIONS, PERMISSION_GROUPS, PERFIS_PARTIDO_OBRIGATORIO, PERFIS_FOTO_OBRIGATORIA } from "@/lib/perfis";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Plus, Search, Upload, UserCircle, Shield, KeyRound, Loader2, Trash2 } from "lucide-react";
import { useExclusaoSegura } from "@/components/ExclusaoSegura";
import LoadingState from "@/components/LoadingState";

const STATUS_OPTIONS = ["Pendente de Ativação", "Ativo", "Inativo", "Bloqueado", "Pendente"];
const STATUS_COLOR = { "Pendente de Ativação": "outline", Ativo: "default", Inativo: "secondary", Bloqueado: "destructive", Pendente: "outline" };
const ROLE_BADGE_COLOR = {
  ADMIN_CAMARA: 'bg-blue-100 text-blue-700',
  OPERADOR_GERAL: 'bg-indigo-100 text-indigo-700',
  PRESIDENTE: 'bg-amber-100 text-amber-700',
  VEREADOR: 'bg-green-100 text-green-700',
  ASSESSOR: 'bg-slate-100 text-slate-700',
  SECRETARIO_LEGISLATIVO: 'bg-teal-100 text-teal-700',
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
};

function displayName(u) {
  const nome = u.nome || u.full_name || u.username || u.email || '';
  if ((u.role === 'VEREADOR' || u.role === 'PRESIDENTE') && u.partido_sigla) {
    return `${nome} — ${u.partido_sigla}`;
  }
  return nome;
}

const FormField = ({ label, required, children }) => (
  <div>
    <label className="text-xs text-muted-foreground block mb-1">
      {label}{required && <span className="text-destructive ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

export default function GerenciarUsuarios() {
  const { isAdminCamara, isSuperAdmin, isInChamberContext, tenantId, withTenant } = useTenant();
  const [usuarios, setUsuarios] = useState([]);
  const [camaras, setCamaras] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [search, setSearch] = useState("");
  const [filterCamara, setFilterCamara] = useState("todas");
  const [filterRole, setFilterRole] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetandoSenha, setResetandoSenha] = useState(null);
  const [camarasAtivas, setCamarasAtivas] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);

  const handleResetarSenha = async (e, u) => {
    e.stopPropagation();
    const nome = u.nome || u.full_name || u.email || u.username;

    // Prompt para o admin definir a senha (ou deixar em branco para geração automática)
    const senhaEscolhida = prompt(
      `Redefinir senha de ${nome}\n\nDigite a nova senha temporária (mínimo 8 caracteres) ou deixe em branco para gerar automaticamente:`
    );

    // Se o usuário clicou Cancelar, abortar
    if (senhaEscolhida === null) return;

    // Se digitou algo mas menos de 8 caracteres
    if (senhaEscolhida.trim() !== '' && senhaEscolhida.trim().length < 8) {
      alert('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (!confirm(`Confirma a redefinição de senha de ${nome}?\n\n${senhaEscolhida.trim() ? 'Senha definida: ' + senhaEscolhida.trim() : 'Uma senha aleatória será gerada.'}\n\nO usuário deverá trocá-la no próximo acesso.`)) return;

    setResetandoSenha(u.id);
    try {
      const payload = { usuario_id: u.id };
      if (senhaEscolhida.trim()) {
        payload.nova_senha = senhaEscolhida.trim();
      }
      const res = await base44.functions.invoke('resetarSenhaSislegis', payload);
      const senhaGerada = res.data?.senha_temporaria;
      if (senhaGerada) {
        alert(`Senha de ${nome} redefinida com sucesso.\n\nNova senha temporária: ${senhaGerada}\n\nAnote esta senha e repasse ao usuário. Ela não será exibida novamente.`);
      } else {
        alert(`Senha de ${nome} redefinida com sucesso.`);
      }
      await loadUsuarios();
    } catch (err) {
      alert('Erro ao redefinir senha: ' + (err?.response?.data?.error || err.message));
    } finally {
      setResetandoSenha(null);
    }
  };

  const { pedirExclusao, dialogExclusao } = useExclusaoSegura({ withTenant, onExcluido: () => loadUsuarios() });

  const emptyForm = {
    email: "", full_name: "", username: "", cpf: "", telefone: "", cargo: "",
    foto_url: "", partido_id: "", partido_sigla: "",
    login: "", role: "VEREADOR", tenant_id: tenantId || "",
    status: "Ativo", senha_temporaria: true,
    camara_id: "", camara_nome: "",
    parlamentar_id: "",
    permissoes: { ...DEFAULT_PERMISSIONS.VEREADOR },
  };
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdminCamara && !isSuperAdmin) { setLoading(false); return; }
    loadUsuarios();
    if (isSuperAdmin) {
      sislegisEntities.Camara.list().then(setCamaras).catch(() => {});
      // Carregar câmaras ativas para o select de vínculo
      sislegisEntities.Camara.filter({ status: 'Ativa' }, 'nome', 200).then(setCamarasAtivas).catch(() => {});
    }
    const pFilter = withTenant({});
    if (pFilter) {
      sislegisEntities.Partido.filter(pFilter).then(setPartidos).catch(() => {});
      sislegisEntities.Parlamentar.filter({ ...pFilter, ativo: true }, 'nome', 100)
        .then(setParlamentares).catch(() => {});
    }
  }, [isAdminCamara, isSuperAdmin, tenantId]);

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      let users;
      if (isSuperAdmin) {
        // SUPER_ADMIN vê todos os usuários (ou filtra por câmara ativa)
        users = await listarUsuariosSislegis({}, 'nome', 500);
      } else {
        // ADMIN_CAMARA vê apenas usuários da própria câmara
        users = await listarUsuariosSislegis({ tenant_id: tenantId }, 'nome', 500);
      }
      setUsuarios(users || []);
    } catch (e) {
      console.error('Erro ao carregar usuários:', e);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdminCamara) return (
    <div className="p-6 text-center text-muted-foreground">Acesso restrito a administradores.</div>
  );

  const openNew = () => {
    setEditing(null);
    const defaultRole = isInChamberContext ? 'VEREADOR' : 'SUPER_ADMIN';
    setForm({ ...emptyForm, role: defaultRole, tenant_id: tenantId || "", permissoes: { ...(DEFAULT_PERMISSIONS[defaultRole] || {}) } });
    setOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      ...emptyForm,
      full_name: u.nome || u.full_name || '',
      email: u.email || '',
      username: u.username || '',
      cpf: u.cpf || '',
      telefone: u.telefone || '',
      cargo: u.cargo || '',
      foto_url: u.foto_url || '',
      partido_id: u.partido_id || '',
      partido_sigla: u.partido_sigla || '',
      role: u.role,
      tenant_id: u.tenant_id || tenantId || '',
      status: u.status || 'Ativo',
      senha_temporaria: !!u.senha_temporaria,
      camara_id: u.camara_id || '',
      camara_nome: u.camara_nome || '',
      parlamentar_id: u.parlamentar_id || '',
      permissoes: u.permissoes || DEFAULT_PERMISSIONS[u.role] || { ...DEFAULT_PERMISSIONS.VEREADOR },
    });
    setOpen(true);
  };

  async function handleFotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, foto_url: file_url }));
    setUploading(false);
  }

  const handleRoleChange = (newRole) => {
    const defaults = DEFAULT_PERMISSIONS[newRole] || {};
    setForm(f => ({
      ...f,
      role: newRole,
      permissoes: { ...defaults },
      camara_id: newRole === 'ADMIN_CAMARA' ? f.camara_id : '',
      camara_nome: newRole === 'ADMIN_CAMARA' ? f.camara_nome : '',
      parlamentar_id: PERFIS_PARTIDO_OBRIGATORIO.includes(newRole) ? f.parlamentar_id : '',
    }));
  };

  const togglePermissao = (key) => {
    setForm(f => ({
      ...f,
      permissoes: { ...f.permissoes, [key]: !f.permissoes[key] },
    }));
  };

  const handleSave = async () => {
    if (form.role === 'ADMIN_CAMARA' && !form.camara_id) {
      alert('Selecione a Câmara vinculada para o perfil Admin da Câmara.');
      return;
    }
    // Validação de senha forte ao criar novo usuário
    if (!editing) {
      const erroSenha = validarSenhaForte(form.senha || '');
      if (erroSenha) {
        alert(erroSenha);
        return;
      }
    }
    // Bloquear vínculo de parlamentar já vinculado a outro usuário
    if (form.parlamentar_id && PERFIS_PARTIDO_OBRIGATORIO.includes(form.role)) {
      const existingLink = usuarios.find(
        u => u.parlamentar_id === form.parlamentar_id && u.id !== editing?.id
      );
      if (existingLink) {
        alert(`Este parlamentar já possui um usuário vinculado: ${existingLink.username}`);
        return;
      }
    }
    setSaving(true);
    try {
      if (editing) {
        // Atualizar no SisLegis
        await atualizarUsuarioSislegis(editing.id, {
          username: form.username,
          nome: form.nome || form.full_name,
          cpf: form.cpf,
          telefone: form.telefone,
          cargo: form.cargo,
          foto_url: form.foto_url,
          partido_id: form.partido_id,
          partido_sigla: form.partido_sigla,
          role: form.role,
          tenant_id: form.tenant_id,
          status: form.status,
          camara_id: form.camara_id || null,
          camara_nome: form.camara_nome || null,
          permissoes: form.permissoes,
          parlamentar_id: form.parlamentar_id || null,
        });
      } else {
        // Criar novo usuário no SisLegis (sem convite por e-mail)
        await criarUsuario({
          username: form.username,
          nome: form.full_name || form.nome,
          email: form.email || null,
          role: form.role,
          tenant_id: form.tenant_id,
          senha: form.senha || '',
          status: form.status,
          senha_temporaria: form.senha_temporaria,
          camara_id: form.camara_id || null,
          camara_nome: form.camara_nome || null,
          permissoes: form.permissoes,
          foto_url: form.foto_url,
          cargo: form.cargo,
          partido_id: form.partido_id,
          partido_sigla: form.partido_sigla,
          cpf: form.cpf,
          telefone: form.telefone,
          parlamentar_id: form.parlamentar_id || null,
        });
      }
      await loadUsuarios();
      setOpen(false);
    } catch (err) {
      alert('Erro ao salvar: ' + (err?.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  // "Usuários" (fora do contexto de câmara): todos os usuários, filtráveis por câmara e perfil
  // Perfis de câmara (ADMIN_CAMARA, VEREADOR, etc.) podem ser criados também pelo Master Admin
  const availableRoles = isInChamberContext
    ? PERFIS_ORDER
    : ['SUPER_ADMIN', 'ADMIN_CAMARA'];
  const isParlamentar = PERFIS_PARTIDO_OBRIGATORIO.includes(form.role);
  const fotoObrigatoria = PERFIS_FOTO_OBRIGATORIA.includes(form.role);

  const filtered = usuarios.filter(u => {
    const matchSearch = (u.nome || u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchCamara = isInChamberContext || filterCamara === "todas" || u.tenant_id === filterCamara;
    const matchRole = filterRole === "todos" || u.role === filterRole;
    return matchSearch && matchCamara && matchRole;
  });

  // Mapeia tenant_id → nome da câmara para exibição no Master
  const camaraMap = {};
  camaras.forEach(c => { camaraMap[c.id] = c.nome; });

  const todasPermKeys = PERMISSION_GROUPS.flatMap(g => g.keys.map(k => k.key));

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Users}
        title={isInChamberContext ? "Usuários da Câmara" : "Usuários"}
        subtitle={`${usuarios.length} usuário(s) cadastrado(s)`}
        action={
          (isInChamberContext || isSuperAdmin) && (
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novo Usuário</Button>
          )
        }
      />

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, username ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {!isInChamberContext && (
          <Select value={filterCamara} onValueChange={setFilterCamara}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as câmaras</SelectItem>
              {camaras.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os perfis</SelectItem>
            {availableRoles.map(r => <SelectItem key={r} value={r}>{PERFIL_LABELS[r]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {loading && <LoadingState label="Carregando usuários..." />}
        {!loading && filtered.map(u => (
          <Card key={u.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(u)}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {u.foto_url ? (
                    <img src={u.foto_url} alt={u.full_name} className="w-10 h-10 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <UserCircle size={22} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{displayName(u)}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.username || u.email}</p>
                  {u.cargo && <p className="text-xs text-muted-foreground">{u.cargo}</p>}
                  {!isInChamberContext && u.tenant_id && (
                    <span className="text-[10px] text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                      {camaraMap[u.tenant_id] || u.camara_nome || u.tenant_id}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isSuperAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={(e) => handleResetarSenha(e, u)}
                      disabled={resetandoSenha === u.id}
                      title="Redefinir senha do administrador"
                    >
                      {resetandoSenha === u.id ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); pedirExclusao('UsuarioSislegis', u, u.nome || u.full_name || u.username || u.email); }}
                    title="Excluir usuário"
                  >
                    <Trash2 size={13} />
                  </Button>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE_COLOR[u.role] || 'bg-muted text-muted-foreground'}`}>
                      {PERFIL_LABELS[u.role] || u.role}
                    </span>
                    <Badge variant={STATUS_COLOR[u.status] || "secondary"} className="text-[10px]">{u.status || 'Ativo'}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && filtered.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Nenhum usuário encontrado.</p>}
      </div>

      {/* Dialog — FORMULÁRIO COMPLETO */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            {!editing && <p className="text-xs text-muted-foreground">O usuário será criado diretamente, sem envio de e-mail. A senha deve ser informada manualmente.</p>}
          </DialogHeader>

          {/* ===== SEÇÃO 1: DADOS DO USUÁRIO ===== */}
          <div className="space-y-4 pt-1">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Dados do Usuário</h3>

            {/* Foto + Nome/Username/Email */}
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <div className={`w-20 h-20 rounded-full border-2 border-dashed ${fotoObrigatoria && !form.foto_url ? 'border-destructive/50' : 'border-border'} bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors`}>
                  {form.foto_url ? (
                    <img src={form.foto_url} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <Upload size={20} className="text-muted-foreground" />
                  )}
                  <input type="file" accept="image/*" onChange={handleFotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                {uploading && <p className="text-[9px] text-muted-foreground mt-1 text-center">Enviando...</p>}
                {fotoObrigatoria && <p className="text-[10px] text-muted-foreground mt-0.5 text-center">Obrigatória</p>}
              </div>
              <div className="flex-1 space-y-2">
                <FormField label="Nome completo" required>
                  {editing ? (
                    <Input value={form.full_name || ""} disabled className="opacity-50" />
                  ) : (
                    <Input value={form.full_name || ""} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nome Completo" />
                  )}
                </FormField>
                {!editing && (
                  <FormField label="Nome de Usuário" required>
                    <Input value={form.username || ""} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="admin.saopaulo" />
                  </FormField>
                )}
                {editing && (
                  <FormField label="Nome de Usuário">
                    <Input value={form.username || ""} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="admin.saopaulo" />
                  </FormField>
                )}
                <FormField label="E-mail (opcional)">
                  <Input type="email" value={form.email || ""} disabled={!!editing} className={editing ? "opacity-50" : ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="usuario@camara.gov.br" />
                </FormField>
              </div>
            </div>

            {/* CPF + Telefone */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="CPF">
                <Input value={form.cpf || ""} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
              </FormField>
              <FormField label="Telefone">
                <Input value={form.telefone || ""} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-0000" />
              </FormField>
            </div>

            {/* Senha (novo usuário) + Status (edição) */}
            {!editing && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Senha Inicial" required>
                  <Input
                    type="password"
                    value={form.senha || ""}
                    onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                    placeholder="Mín. 8, com letras e números"
                  />
                </FormField>
                <FormField label="Confirmar Senha" required>
                  <Input
                    type="password"
                    value={form.confirmarSenha || ""}
                    onChange={e => setForm(f => ({ ...f, confirmarSenha: e.target.value }))}
                    placeholder="Repita a senha"
                  />
                </FormField>
              </div>
            )}
            {editing && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Status">
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Senha temporária">
                  <div className="flex items-center h-9 gap-2">
                    <Switch
                      checked={form.senha_temporaria}
                      onCheckedChange={v => setForm(f => ({ ...f, senha_temporaria: v }))}
                    />
                    <span className="text-xs text-muted-foreground">
                      {form.senha_temporaria ? 'Troca no 1º acesso' : 'Permanente'}
                    </span>
                  </div>
                </FormField>
              </div>
            )}

            {!editing && (
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  checked={form.senha_temporaria}
                  onCheckedChange={v => setForm(f => ({ ...f, senha_temporaria: v }))}
                />
                <span className="text-xs text-muted-foreground">
                  {form.senha_temporaria ? 'Exigir troca de senha no primeiro acesso' : 'Senha permanente (não exigir troca)'}
                </span>
              </div>
            )}

            {/* Vínculo Parlamentar — obrigatório para Vereador/Presidente */}
            {isParlamentar && (
              <FormField label="Parlamentar Vinculado" required>
                <Select
                  value={form.parlamentar_id || ''}
                  onValueChange={v => setForm(f => ({ ...f, parlamentar_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o parlamentar cadastrado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {parlamentares.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome_parlamentar || p.nome} — {p.partido_sigla}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Vincule este usuário ao seu registro de parlamentar para funcionar no painel de votação.
                </p>
              </FormField>
            )}

            {/* Partido — obrigatório para Vereador/Presidente */}
            <FormField label="Partido Político" required={isParlamentar}>
              {partidos.length > 0 ? (
                <Select
                  value={form.partido_id || ""}
                  onValueChange={v => {
                    const p = partidos.find(p => p.id === v);
                    setForm(f => ({ ...f, partido_id: v, partido_sigla: p?.sigla || '' }));
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o partido..." /></SelectTrigger>
                  <SelectContent>
                    {partidos.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.sigla} — {p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.partido_sigla || ""}
                  onChange={e => setForm(f => ({ ...f, partido_sigla: e.target.value.toUpperCase() }))}
                  placeholder="Sigla do partido"
                  maxLength={10}
                />
              )}
              {form.partido_sigla && (
                <p className="text-xs text-muted-foreground mt-1">
                  Exibição: <strong>{form.full_name || 'Nome'} — {form.partido_sigla}</strong>
                </p>
              )}
            </FormField>

            {/* Câmara vinculada — campo obrigatório para ADMIN_CAMARA */}
            {form.role === 'ADMIN_CAMARA' && (
              <FormField label="Câmara vinculada" required>
                {camarasAtivas.length > 0 ? (
                  <Select
                    value={form.camara_id || ""}
                    onValueChange={v => {
                      const c = camarasAtivas.find(c => c.id === v);
                      setForm(f => ({ ...f, camara_id: v, camara_nome: c?.nome || '' }));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione a câmara..." /></SelectTrigger>
                    <SelectContent>
                      {camarasAtivas.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}{c.municipio ? ` — ${c.municipio}` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma câmara ativa encontrada.</p>
                )}
                {form.camara_nome && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Vinculado a: <strong>{form.camara_nome}</strong>
                  </p>
                )}
              </FormField>
            )}

            {/* Câmara — Super Admin (seleção de tenant) */}
            {isSuperAdmin && camaras.length > 0 && form.role !== 'ADMIN_CAMARA' && (
              <FormField label="Câmara" required>
                <Select value={form.tenant_id} onValueChange={v => setForm(f => ({ ...f, tenant_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a câmara..." /></SelectTrigger>
                  <SelectContent>
                    {camaras.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            )}

            {/* ===== SEÇÃO 2: DEFINIÇÃO DE ACESSO ===== */}
            <h3 className="text-sm font-semibold text-foreground border-b pb-2 pt-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Definição de Acesso
            </h3>

            {/* Etapa 1 — Seleção de Perfil */}
            <div className="bg-muted/40 rounded-lg p-4 space-y-3">
              <FormField label="Perfil" required>
                <Select value={form.role} onValueChange={handleRoleChange}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(r => (
                      <SelectItem key={r} value={r}>{PERFIL_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {PERFIL_DESCRIPTIONS[form.role] || 'Selecione um perfil para ver sua descrição.'}
              </p>
              {PERFIS_PARTIDO_OBRIGATORIO.includes(form.role) && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                  ⚠ Este perfil exige vínculo com partido político e foto obrigatória.
                </p>
              )}
            </div>

            {/* Etapa 2 — Permissões individuais */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Permissões Individuais</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {todasPermKeys.filter(k => form.permissoes?.[k]).length} de {todasPermKeys.length} concedidas
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                {PERMISSION_GROUPS.map(group => (
                  <div key={group.label} className="space-y-1.5">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1">
                      {group.label}
                    </h4>
                    <div className="space-y-0.5">
                      {group.keys.map(pk => (
                        <label key={pk.key} className="flex items-center gap-2.5 py-1 px-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors">
                          <Checkbox
                            checked={form.permissoes?.[pk.key] || false}
                            onCheckedChange={() => togglePermissao(pk.key)}
                          />
                          <span className="text-xs text-foreground select-none">{pk.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.username || !form.full_name || (!editing && (!form.senha || form.senha.length < 8))}>
              {saving ? "Salvando..." : editing ? "Salvar Alterações" : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {dialogExclusao}
    </div>
  );
}