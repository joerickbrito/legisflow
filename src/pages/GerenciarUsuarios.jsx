import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useTenant, ROLE_LABELS, ROLES } from "@/lib/TenantContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Search, Upload, UserCircle } from "lucide-react";

const STATUS_OPTIONS = ["Ativo", "Inativo", "Bloqueado", "Pendente"];
const STATUS_COLOR = { Ativo: "default", Inativo: "secondary", Bloqueado: "destructive", Pendente: "outline" };

// Roles disponíveis por contexto (sem SUPER_ADMIN para admins de câmara)
const ROLES_CAMARA = ['ADMIN_CAMARA', 'OPERADOR_GERAL', 'PRESIDENTE', 'VEREADOR'];
const ROLES_SUPER = ['SUPER_ADMIN', 'ADMIN_CAMARA', 'OPERADOR_GERAL', 'PRESIDENTE', 'VEREADOR'];

// Formato padrão: {Nome} — {Partido} para vereadores/presidentes
function displayName(u) {
  if ((u.role === 'VEREADOR' || u.role === 'PRESIDENTE') && u.partido_sigla) {
    return `${u.full_name || u.email} — ${u.partido_sigla}`;
  }
  return u.full_name || u.email;
}

const ROLE_BADGE_COLOR = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  ADMIN_CAMARA: 'bg-blue-100 text-blue-700',
  OPERADOR_GERAL: 'bg-indigo-100 text-indigo-700',
  PRESIDENTE: 'bg-amber-100 text-amber-700',
  VEREADOR: 'bg-green-100 text-green-700',
};

export default function GerenciarUsuarios() {
  const { isAdminCamara, isSuperAdmin, tenantId } = useTenant();
  const [usuarios, setUsuarios] = useState([]);
  const [camaras, setCamaras] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    email: "", full_name: "", cpf: "", telefone: "", cargo: "",
    foto_url: "", partido_id: "", partido_sigla: "",
    role: "VEREADOR", tenant_id: tenantId || "", status: "Ativo",
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isAdminCamara) return;
    loadUsuarios();
    if (isSuperAdmin) base44.entities.Camara.list().then(setCamaras);
    // Carregar partidos do tenant atual
    const filter = tenantId ? { tenant_id: tenantId } : {};
    base44.entities.Partido.filter(filter).then(setPartidos).catch(() => {});
  }, [isAdminCamara, tenantId]);

  const loadUsuarios = async () => {
    const all = await base44.entities.User.list();
    setUsuarios(isSuperAdmin ? all : all.filter(u => u.tenant_id === tenantId));
  };

  if (!isAdminCamara) return (
    <div className="p-6 text-center text-muted-foreground">Acesso restrito a administradores.</div>
  );

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, tenant_id: tenantId || "" }); setOpen(true); };
  const openEdit = (u) => { setEditing(u); setForm({ ...emptyForm, ...u }); setOpen(true); };

  async function handleFotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, foto_url: file_url }));
    setUploading(false);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.User.update(editing.id, {
          cpf: form.cpf,
          telefone: form.telefone,
          cargo: form.cargo,
          foto_url: form.foto_url,
          partido_id: form.partido_id,
          partido_sigla: form.partido_sigla,
          role: form.role,
          tenant_id: form.tenant_id,
          status: form.status,
        });
      } else {
        await base44.users.inviteUser(form.email, form.role === ROLES.SUPER_ADMIN ? "admin" : "user");
        // After invite, update the newly created user's extra fields
        const all = await base44.entities.User.list();
        const newUser = all.find(u => u.email === form.email);
        if (newUser) {
          await base44.entities.User.update(newUser.id, {
            cpf: form.cpf,
            telefone: form.telefone,
            cargo: form.cargo,
            foto_url: form.foto_url,
            partido_id: form.partido_id,
            partido_sigla: form.partido_sigla,
            role: form.role,
            tenant_id: form.tenant_id,
            senha_temporaria: true,
          });
        }
      }
      await loadUsuarios();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const availableRoles = isSuperAdmin ? ROLES_SUPER : ROLES_CAMARA;
  const isVereador = form.role === 'VEREADOR' || form.role === 'PRESIDENTE';

  const filtered = usuarios.filter(u => {
    const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "todos" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const F = ({ label, required, children }) => (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Users}
        title="Gerenciar Usuários"
        subtitle={`${usuarios.length} usuário(s) cadastrado(s)`}
        action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Convidar Usuário</Button>}
      />

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os perfis</SelectItem>
            {availableRoles.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.map(u => (
          <Card key={u.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(u)}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                {/* Foto */}
                <div className="flex-shrink-0">
                  {u.foto_url ? (
                    <img src={u.foto_url} alt={u.full_name} className="w-10 h-10 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <UserCircle size={22} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{displayName(u)}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  {u.cargo && <p className="text-xs text-muted-foreground">{u.cargo}</p>}
                </div>
                {/* Badges */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE_COLOR[u.role] || 'bg-muted text-muted-foreground'}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                  <Badge variant={STATUS_COLOR[u.status] || "secondary"} className="text-[10px]">{u.status || 'Ativo'}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Nenhum usuário encontrado.</p>}
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Usuário" : "Convidar Usuário"}</DialogTitle>
            {!editing && <p className="text-xs text-muted-foreground">Um convite será enviado ao e-mail informado.</p>}
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Foto */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors">
                  {form.foto_url ? (
                    <img src={form.foto_url} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <Upload size={18} className="text-muted-foreground" />
                  )}
                  <input type="file" accept="image/*" onChange={handleFotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                {uploading && <p className="text-[9px] text-muted-foreground mt-1 text-center">Enviando...</p>}
              </div>
              <div className="flex-1 space-y-2">
                <F label="Nome completo" required={!editing}>
                  {editing ? (
                    <Input value={form.full_name || ""} disabled className="opacity-50" />
                  ) : (
                    <Input value={form.full_name || ""} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nome Completo" />
                  )}
                </F>
                <F label="E-mail" required={!editing}>
                  <Input type="email" value={form.email || ""} disabled={!!editing} className={editing ? "opacity-50" : ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="usuario@camara.gov.br" />
                </F>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <F label="CPF">
                <Input value={form.cpf || ""} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
              </F>
              <F label="Telefone">
                <Input value={form.telefone || ""} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-0000" />
              </F>
            </div>

            <F label="Cargo / Função">
              <Input value={form.cargo || ""} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Ex: Secretário Legislativo" />
            </F>

            <F label="Perfil de Acesso" required>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableRoles.map(r => (
                    <SelectItem key={r} value={r}>
                      <span className="flex items-center gap-2">
                        {ROLE_LABELS[r]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>

            {/* Partido — obrigatório para Vereador/Presidente */}
            {isVereador && (
              <F label="Partido Político" required>
                {partidos.length > 0 ? (
                  <Select
                    value={form.partido_id}
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
                  <div className="flex gap-2">
                    <Input
                      value={form.partido_sigla || ""}
                      onChange={e => setForm(f => ({ ...f, partido_sigla: e.target.value.toUpperCase() }))}
                      placeholder="Sigla (ex: PT)"
                      maxLength={10}
                      className="w-24"
                    />
                    <Input
                      value={form.partido_nome || ""}
                      onChange={e => setForm(f => ({ ...f, partido_nome: e.target.value }))}
                      placeholder="Nome do partido"
                      className="flex-1"
                    />
                  </div>
                )}
                {form.partido_sigla && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Exibição: <strong>{form.full_name || 'Nome'} — {form.partido_sigla}</strong>
                  </p>
                )}
              </F>
            )}

            {/* Câmara — apenas Super Admin */}
            {isSuperAdmin && camaras.length > 0 && (
              <F label="Câmara" required>
                <Select value={form.tenant_id} onValueChange={v => setForm(f => ({ ...f, tenant_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a câmara..." /></SelectTrigger>
                  <SelectContent>
                    {camaras.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
            )}

            {editing && (
              <F label="Status">
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || (!editing && !form.email)}>
              {saving ? "Salvando..." : editing ? "Salvar Alterações" : "Enviar Convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}