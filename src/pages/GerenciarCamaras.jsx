import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, Search, Users, Upload, MapPin, CheckCircle2, Copy, AlertCircle } from "lucide-react";

const REQUIRED_FIELDS = ['nome', 'municipio', 'estado', 'cnpj', 'email', 'telefone'];

function isFormValid(form) {
  return REQUIRED_FIELDS.every(f => form[f]?.trim?.() || form[f]);
}

export default function GerenciarCamaras() {
  const { isSuperAdmin } = useTenant();
  const [camaras, setCamaras] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  // After-creation modal
  const [createdInfo, setCreatedInfo] = useState(null);

  const emptyForm = {
    nome: "", sigla: "", cnpj: "", municipio: "", estado: "",
    telefone: "", email: "", site: "", cor_institucional: "#1d4ed8",
    brasao_url: "", status: "Ativa", plano: "Básico",
    total_vereadores: 9, observacoes: "",
    // Admin padrão
    admin_email: "",
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isSuperAdmin) base44.entities.Camara.list("-created_date", 200).then(setCamaras);
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return (
    <div className="p-6 text-center text-muted-foreground">Acesso restrito ao Master Admin.</div>
  );

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...emptyForm, ...c }); setOpen(true); };

  async function handleBrasaoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, brasao_url: file_url }));
    setUploading(false);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        // Update existing câmara
        const { admin_email, ...camaraData } = form;
        await base44.entities.Camara.update(editing.id, camaraData);
        setCamaras(await base44.entities.Camara.list("-created_date", 200));
        setOpen(false);
      } else {
        // Create new câmara
        const { admin_email, ...camaraData } = form;
        const novaCamara = await base44.entities.Camara.create(camaraData);

        // Invite admin padrão — uses the câmara's id as tenant_id
        const adminEmailFinal = admin_email?.trim() || form.email;
        let adminConvite = null;
        try {
          await base44.users.inviteUser(adminEmailFinal, "user");
          adminConvite = { email: adminEmailFinal };
        } catch (err) {
          console.warn("Erro ao convidar admin:", err);
        }

        setCamaras(await base44.entities.Camara.list("-created_date", 200));
        setOpen(false);

        // Show summary to Master Admin
        setCreatedInfo({
          camara: novaCamara,
          adminEmail: adminEmailFinal,
          tenantId: novaCamara.id,
          success: !!adminConvite,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = camaras.filter(c =>
    c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    (c.municipio || c.cidade || '')?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = { "Ativa": "default", "Suspensa": "secondary", "Inativa": "destructive" };

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
        {filtered.map(c => (
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
                    <Badge variant="outline" className="text-[10px] px-1.5">{c.plano}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8 col-span-3">Nenhuma câmara encontrada.</p>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Editar Câmara" : "Nova Câmara"}</DialogTitle>
            {!editing && <p className="text-xs text-muted-foreground">Campos marcados com <span className="text-destructive">*</span> são obrigatórios.</p>}
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Brasão + Nome + Cor */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <label className="text-xs text-muted-foreground block mb-1.5">
                  Brasão <span className="text-destructive">*</span>
                </label>
                <div className="relative w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors">
                  {form.brasao_url ? (
                    <img src={form.brasao_url} alt="Brasão" className="w-full h-full object-contain p-1" />
                  ) : (
                    <div className="text-center">
                      <Upload size={18} className="text-muted-foreground mx-auto" />
                      <span className="text-[9px] text-muted-foreground mt-1 block">Clique</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleBrasaoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                {uploading && <p className="text-[10px] text-muted-foreground mt-1">Enviando...</p>}
              </div>
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <F label="Nome da Câmara" required>
                      <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Câmara Municipal de..." />
                    </F>
                  </div>
                  <div>
                    <F label="Sigla">
                      <Input value={form.sigla} onChange={e => setForm(f => ({ ...f, sigla: e.target.value }))} maxLength={10} placeholder="CM..." />
                    </F>
                  </div>
                </div>
                <F label="Cor Institucional">
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.cor_institucional} onChange={e => setForm(f => ({ ...f, cor_institucional: e.target.value }))} className="w-9 h-9 rounded border border-border cursor-pointer flex-shrink-0" />
                    <Input value={form.cor_institucional} onChange={e => setForm(f => ({ ...f, cor_institucional: e.target.value }))} className="font-mono" placeholder="#1d4ed8" />
                  </div>
                </F>
              </div>
            </div>

            {/* Localização */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <F label="Município" required>
                  <Input value={form.municipio || form.cidade || ''} onChange={e => setForm(f => ({ ...f, municipio: e.target.value, cidade: e.target.value }))} />
                </F>
              </div>
              <div>
                <F label="Estado (UF)" required>
                  <Input value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value.toUpperCase() }))} maxLength={2} placeholder="SP" />
                </F>
              </div>
            </div>

            {/* CNPJ + Vereadores */}
            <div className="grid grid-cols-2 gap-3">
              <F label="CNPJ" required>
                <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
              </F>
              <F label="Total de Vereadores">
                <Input type="number" min={1} value={form.total_vereadores} onChange={e => setForm(f => ({ ...f, total_vereadores: +e.target.value }))} />
              </F>
            </div>

            {/* Contato */}
            <div className="grid grid-cols-2 gap-3">
              <F label="E-mail Institucional" required>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contato@camara.sp.gov.br" />
              </F>
              <F label="Telefone" required>
                <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 3333-0000" />
              </F>
            </div>
            <F label="Site">
              <Input value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} placeholder="https://www.camara.sp.gov.br" />
            </F>

            {/* Admin padrão — somente ao criar */}
            {!editing && (
              <div className="rounded-lg border border-border bg-accent/30 p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Admin Padrão da Câmara</p>
                <p className="text-xs text-muted-foreground">
                  Um convite será enviado para este e-mail. O usuário receberá acesso como <strong>Admin da Câmara</strong> e deverá configurar sua senha ao fazer o primeiro acesso.
                </p>
                <F label="E-mail do Admin" required>
                  <Input
                    type="email"
                    value={form.admin_email}
                    onChange={e => setForm(f => ({ ...f, admin_email: e.target.value }))}
                    placeholder="admin@camara.sp.gov.br"
                  />
                </F>
              </div>
            )}

            {/* Plano + Status */}
            <div className="grid grid-cols-2 gap-3">
              <F label="Plano">
                <Select value={form.plano} onValueChange={v => setForm(f => ({ ...f, plano: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Básico">Básico</SelectItem>
                    <SelectItem value="Profissional">Profissional</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <F label="Status">
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativa">Ativa</SelectItem>
                    <SelectItem value="Suspensa">Suspensa</SelectItem>
                    <SelectItem value="Inativa">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </F>
            </div>

            <F label="Observações">
              <Input value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </F>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !isFormValid(form) || (!editing && !form.admin_email?.trim())}
            >
              {saving ? "Salvando..." : editing ? "Salvar Alterações" : "Criar Câmara"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-creation info modal */}
      <Dialog open={!!createdInfo} onOpenChange={() => setCreatedInfo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <CheckCircle2 className="text-green-600" size={22} />
              Câmara criada com sucesso!
            </DialogTitle>
          </DialogHeader>
          {createdInfo && (
            <div className="space-y-4 py-1">
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Nome da Câmara</p>
                  <p className="font-semibold">{createdInfo.camara?.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ID / Tenant ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono flex-1 truncate">{createdInfo.tenantId}</code>
                    <button onClick={() => navigator.clipboard.writeText(createdInfo.tenantId)} className="text-muted-foreground hover:text-foreground">
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Admin Convidado</p>
                  <p className="font-medium text-sm">{createdInfo.adminEmail}</p>
                </div>
              </div>

              {createdInfo.success ? (
                <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
                  <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-green-800">
                    Um convite foi enviado para <strong>{createdInfo.adminEmail}</strong>. Ao aceitar, o usuário deverá definir sua senha e será automaticamente vinculado a esta câmara.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                  <AlertCircle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-800">
                    A câmara foi criada, mas o convite ao admin não pôde ser enviado automaticamente. Acesse <strong>Gerenciar Usuários</strong> para convidá-lo manualmente e vincule o <strong>tenant_id</strong> acima.
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Após o primeiro acesso, o Admin da Câmara poderá configurar os usuários e dados do seu ambiente.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreatedInfo(null)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}