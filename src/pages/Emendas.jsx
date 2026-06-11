import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDiff, Plus } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

const TIPOS = ["Supressiva", "Modificativa", "Aditiva", "Substitutiva", "Substitutivo Global"];
const STATUS = ["Em análise", "Aprovada", "Rejeitada", "Retirada"];

export default function Emendas() {
  const { withTenant, canQuery, tenantId } = useTenant();
  const [emendas, setEmendas] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ materia_id: "", numero: "", tipo: "Modificativa", ementa: "", texto: "", justificativa: "", autor_id: "", autor_nome: "", data_apresentacao: "", status: "Em análise" });

  useEffect(() => {
    if (!canQuery) return;
    const filter = withTenant();
    base44.entities.Emenda.filter(filter, "-created_date", 50).then(setEmendas);
    base44.entities.Materia.filter(filter).then(setMaterias);
    base44.entities.Parlamentar.filter(filter).then(setParlamentares);
  }, [canQuery]);

  const openNew = () => { setEditing(null); setForm({ materia_id: "", numero: "", tipo: "Modificativa", ementa: "", texto: "", justificativa: "", autor_id: "", autor_nome: "", data_apresentacao: "", status: "Em análise" }); setOpen(true); };
  const openEdit = (e) => { setEditing(e); setForm(e); setOpen(true); };

  const handleSave = async () => {
    const materia = materias.find(m => m.id === form.materia_id);
    const autor = parlamentares.find(p => p.id === form.autor_id);
    const data = { ...form, tenant_id: tenantId, materia_ementa: materia?.ementa || "", autor_nome: autor?.nome_parlamentar || autor?.nome || form.autor_nome };
    if (editing) await base44.entities.Emenda.update(editing.id, data);
    else await base44.entities.Emenda.create(data);
    const filter = withTenant();
    if (filter) setEmendas(await base44.entities.Emenda.filter(filter, "-created_date", 50));
    setOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={FileDiff}
        title="Emendas"
        subtitle="Gestão de emendas a matérias legislativas"
        action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nova Emenda</Button>}
      />

      <div className="space-y-3">
        {emendas.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma emenda registrada.</p>}
        {emendas.map(e => (
          <Card key={e.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(e)}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{e.ementa}</p>
                  <p className="text-xs text-muted-foreground mt-1">{e.materia_ementa}</p>
                  <p className="text-xs text-muted-foreground">Autor: {e.autor_nome} | Tipo: {e.tipo}</p>
                </div>
                <StatusBadge status={e.status} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Emenda" : "Nova Emenda"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Matéria</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background mt-1" value={form.materia_id} onChange={e => setForm(f => ({ ...f, materia_id: e.target.value }))}>
                <option value="">Selecione...</option>
                {materias.map(m => <option key={m.id} value={m.id}>{m.tipo} {m.numero}/{m.ano} — {m.ementa?.substring(0, 60)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Número</label><Input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} /></div>
              <div>
                <label className="text-xs text-muted-foreground">Tipo</label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><label className="text-xs text-muted-foreground">Ementa</label><Input value={form.ementa} onChange={e => setForm(f => ({ ...f, ementa: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">Texto</label><Textarea rows={3} value={form.texto} onChange={e => setForm(f => ({ ...f, texto: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">Justificativa</label><Textarea rows={2} value={form.justificativa} onChange={e => setForm(f => ({ ...f, justificativa: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Autor</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background mt-1" value={form.autor_id} onChange={e => setForm(f => ({ ...f, autor_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {parlamentares.map(p => <option key={p.id} value={p.id}>{p.nome_parlamentar || p.nome}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground">Data Apresentação</label><Input type="date" value={form.data_apresentacao} onChange={e => setForm(f => ({ ...f, data_apresentacao: e.target.value }))} /></div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}