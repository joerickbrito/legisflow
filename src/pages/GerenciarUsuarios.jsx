import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useTenant, ROLE_LABELS, ROLES } from "@/lib/TenantContext";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Search } from "lucide-react";

const STATUS_OPTIONS = ["Ativo", "Inativo", "Bloqueado", "Pendente"];
const STATUS_COLOR = { Ativo: "default", Inativo: "secondary", Bloqueado: "destructive", Pendente: "outline" };

export default function GerenciarUsuarios() {
  const { isAdminCamara, isSuperAdmin, tenantId, withTenant } = useTenant();
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [camaras, setCamaras] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ email: "", full_name: "", telefone: "", cargo: "", role: "VEREADOR", tenant_id: tenantId || "", status: "Ativo" });

  useEffect(() => {
    if (!isAdminCamara) return;
    loadUsuarios();
    if (isSuperAdmin) base44.entities.Camara.list().then(setCamaras);
  }, [isAdminCamara]);

  const loadUsuarios = async () => {
    const all = await base44.entities.User.list();
    if (isSuperAdmin) setUsuarios(all);
    else setUsuarios(all.filter(u => u.tenant_id === tenantId));
  };

  if (!isAdminCamara) return (
    <div className="p-6 text-center text-muted-foreground">Acesso restrito a administradores.</div>
  );

  const openNew = () => {
    setEditing(null);
    setForm({ email: "", full_name: "", telefone: "", cargo: "", role: "VEREADOR", tenant_id: tenantId || "", status: "Ativo" });
    setOpen(true);
  };
  const openEdit = (u) => { setEditing(u); setForm(u); setOpen(true); };

  const handleSave = async () => {
    if (editing) {
      await base44.auth.updateMe ? null : null; // Users update via admin
      await base44.entities.User.update(editing.id, {
        telefone: form.telefone,
        cargo: form.cargo,
        role: form.role,
        tenant_id: form.tenant_id,
        status: form.status,
      });
    } else {
      await base44.users.inviteUser(form.email, form.role === ROLES.SUPER_ADMIN ? "admin" : "user");
    }
    await loadUsuarios();
    setOpen(false);
  };

  const availableRoles = isSuperAdmin
    ? Object.values(ROLES)
    : Object.values(ROLES).filter(r => r !== ROLES.SUPER_ADMIN);

  const filtered = usuarios.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Users}
        title="Gerenciar Usuários"
        subtitle="Cadastro e controle de acesso dos usuários do sistema"
        action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Convidar Usuário</Button>}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar usuários..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filtered.map(u => (
          <Card key={u.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(u)}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{u.full_name || u.email}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                  {u.cargo && <p className="text-xs text-muted-foreground">{u.cargo}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant="outline" className="text-xs">{ROLE_LABELS[u.role] || u.role}</Badge>
                  <Badge variant={STATUS_COLOR[u.status] || "secondary"} className="text-xs">{u.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Nenhum usuário encontrado.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar Usuário" : "Convidar Usuário"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!editing && (
              <div>
                <label className="text-xs text-muted-foreground">E-mail *</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="usuario@camara.gov.br" />
                <p className="text-xs text-muted-foreground mt-1">Um convite será enviado para este e-mail.</p>
              </div>
            )}
            {editing && (
              <>
                <div><label className="text-xs text-muted-foreground">Nome</label><Input value={form.full_name || ""} disabled className="opacity-50" /></div>
                <div><label className="text-xs text-muted-foreground">E-mail</label><Input value={form.email || ""} disabled className="opacity-50" /></div>
              </>
            )}
            <div><label className="text-xs text-muted-foreground">Cargo / Função</label><Input value={form.cargo || ""} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Ex: Secretário Legislativo" /></div>
            <div><label className="text-xs text-muted-foreground">Telefone</label><Input value={form.telefone || ""} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
            <div>
              <label className="text-xs text-muted-foreground">Perfil de Acesso</label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableRoles.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {isSuperAdmin && camaras.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground">Câmara</label>
                <Select value={form.tenant_id} onValueChange={v => setForm(f => ({ ...f, tenant_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a câmara..." /></SelectTrigger>
                  <SelectContent>
                    {camaras.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {editing && (
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>{editing ? "Salvar" : "Enviar Convite"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}