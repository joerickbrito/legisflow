import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, Search, Users } from "lucide-react";

export default function GerenciarCamaras() {
  const { isSuperAdmin } = useTenant();
  const [camaras, setCamaras] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome: "", sigla: "", cnpj: "", cidade: "", estado: "", telefone: "", email: "", site: "", status: "Ativa", plano: "Básico", total_vereadores: 9, observacoes: "" });

  useEffect(() => {
    if (isSuperAdmin) base44.entities.Camara.list("-created_date", 200).then(setCamaras);
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return (
    <div className="p-6 text-center text-muted-foreground">Acesso restrito ao Super Admin.</div>
  );

  const openNew = () => { setEditing(null); setForm({ nome: "", sigla: "", cnpj: "", cidade: "", estado: "", telefone: "", email: "", site: "", status: "Ativa", plano: "Básico", total_vereadores: 9, observacoes: "" }); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm(c); setOpen(true); };

  const handleSave = async () => {
    if (editing) await base44.entities.Camara.update(editing.id, form);
    else await base44.entities.Camara.create(form);
    setCamaras(await base44.entities.Camara.list("-created_date", 200));
    setOpen(false);
  };

  const filtered = camaras.filter(c =>
    c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.cidade?.toLowerCase().includes(search.toLowerCase())
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

      <div className="space-y-3">
        {filtered.map(c => (
          <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(c)}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{c.nome}</p>
                    {c.sigla && <span className="text-xs text-muted-foreground">({c.sigla})</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.cidade}{c.estado ? ` - ${c.estado}` : ""}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{c.total_vereadores || "–"} vereadores</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={statusColor[c.status] || "secondary"}>{c.status}</Badge>
                  <Badge variant="outline" className="text-xs">{c.plano}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Nenhuma câmara encontrada.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Câmara" : "Nova Câmara"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><label className="text-xs text-muted-foreground">Nome</label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Sigla</label><Input value={form.sigla} onChange={e => setForm(f => ({ ...f, sigla: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">CNPJ</label><Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Total de Vereadores</label><Input type="number" value={form.total_vereadores} onChange={e => setForm(f => ({ ...f, total_vereadores: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Cidade</label><Input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Estado</label><Input value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Telefone</label><Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">E-mail</label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Site</label><Input value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} /></div>
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
            <div><label className="text-xs text-muted-foreground">Observações</label><Input value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.nome}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}