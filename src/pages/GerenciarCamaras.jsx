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
import { Building2, Plus, Search, Users, Upload, MapPin, Phone, Mail, Globe } from "lucide-react";

export default function GerenciarCamaras() {
  const { isSuperAdmin } = useTenant();
  const [camaras, setCamaras] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const emptyForm = {
    nome: "", sigla: "", cnpj: "", municipio: "", estado: "",
    telefone: "", email: "", site: "", cor_institucional: "#1d4ed8",
    brasao_url: "", status: "Ativa", plano: "Básico",
    total_vereadores: 9, observacoes: ""
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isSuperAdmin) base44.entities.Camara.list("-created_date", 200).then(setCamaras);
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return (
    <div className="p-6 text-center text-muted-foreground">Acesso restrito ao Super Admin.</div>
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
    if (editing) await base44.entities.Camara.update(editing.id, form);
    else await base44.entities.Camara.create(form);
    setCamaras(await base44.entities.Camara.list("-created_date", 200));
    setOpen(false);
  };

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
        subtitle="Gestão de todas as Câmaras Municipais cadastradas na plataforma"
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
          <Card key={c.id} className="cursor-pointer hover:shadow-md transition-all group" onClick={() => openEdit(c)}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                {c.brasao_url ? (
                  <img src={c.brasao_url} alt="Brasão" className="w-12 h-12 object-contain rounded-lg border border-border flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.cor_institucional || '#1d4ed8' + '20' }}>
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
        {filtered.length === 0 && <p className="text-muted-foreground text-sm text-center py-8 col-span-3">Nenhuma câmara encontrada.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Editar Câmara" : "Nova Câmara"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {/* Brasão e cor */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <label className="text-xs text-muted-foreground block mb-1.5">Brasão</label>
                <div className="relative w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
                  {form.brasao_url ? (
                    <img src={form.brasao_url} alt="Brasão" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Upload size={24} className="text-muted-foreground" />
                  )}
                  <input type="file" accept="image/*" onChange={handleBrasaoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                {uploading && <p className="text-xs text-muted-foreground mt-1">Enviando...</p>}
              </div>
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Nome *</label>
                    <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Sigla</label>
                    <Input value={form.sigla} onChange={e => setForm(f => ({ ...f, sigla: e.target.value }))} maxLength={10} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Cor Institucional (hex)</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.cor_institucional} onChange={e => setForm(f => ({ ...f, cor_institucional: e.target.value }))} className="w-9 h-9 rounded border border-border cursor-pointer flex-shrink-0" />
                    <Input value={form.cor_institucional} onChange={e => setForm(f => ({ ...f, cor_institucional: e.target.value }))} className="font-mono" placeholder="#1d4ed8" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">CNPJ</label>
                <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Total de Vereadores</label>
                <Input type="number" value={form.total_vereadores} onChange={e => setForm(f => ({ ...f, total_vereadores: +e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Município *</label>
                <Input value={form.municipio || form.cidade || ''} onChange={e => setForm(f => ({ ...f, municipio: e.target.value, cidade: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Estado (UF)</label>
                <Input value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} maxLength={2} placeholder="SP" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Telefone</label>
                <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">E-mail Institucional</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Site</label>
              <Input value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} placeholder="https://" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativa">Ativa</SelectItem>
                    <SelectItem value="Suspensa">Suspensa</SelectItem>
                    <SelectItem value="Inativa">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Plano</label>
                <Select value={form.plano} onValueChange={v => setForm(f => ({ ...f, plano: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Básico">Básico</SelectItem>
                    <SelectItem value="Profissional">Profissional</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Observações</label>
              <Input value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.nome}>Salvar Câmara</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}