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
import { Mail, Plus, Search } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

const STATUS = ["Rascunho", "Enviado", "Recebido", "Respondido", "Arquivado"];
const TIPOS = ["Interno", "Externo"];
const DIRECOES = ["Enviado", "Recebido"];

export default function Oficios() {
  const { withTenant, canQuery, tenantId } = useTenant();
  const [oficios, setOficios] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ numero: "", ano: new Date().getFullYear(), tipo: "Externo", direcao: "Enviado", assunto: "", remetente: "", destinatario: "", data: "", texto: "", status: "Rascunho", observacoes: "" });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!canQuery) return;
    const filter = withTenant();
    if (!filter) return;
    base44.entities.Oficio.filter(filter, "-created_date", 100).then(setOficios);
  }, [canQuery]);

  const openNew = () => { setEditing(null); setForm({ numero: "", ano: new Date().getFullYear(), tipo: "Externo", direcao: "Enviado", assunto: "", remetente: "", destinatario: "", data: "", texto: "", status: "Rascunho", observacoes: "" }); setOpen(true); };
  const openEdit = (o) => { setEditing(o); setForm(o); setOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const data = { ...form, tenant_id: tenantId };
      if (editing) await base44.entities.Oficio.update(editing.id, data);
      else await base44.entities.Oficio.create(data);
      const filter = withTenant();
      if (filter) setOficios(await base44.entities.Oficio.filter(filter, "-created_date", 100));
      setOpen(false);
      setErrorMsg('');
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao salvar ofício.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = oficios.filter(o =>
    o.assunto?.toLowerCase().includes(search.toLowerCase()) ||
    o.destinatario?.toLowerCase().includes(search.toLowerCase()) ||
    o.remetente?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Mail}
        title="Ofícios"
        subtitle="Gestão de ofícios enviados e recebidos"
        action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novo Ofício</Button>}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por assunto, remetente ou destinatário..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-muted-foreground text-sm">Nenhum ofício encontrado.</p>}
        {filtered.map(o => (
          <Card key={o.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(o)}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">Ofício nº {o.numero}/{o.ano}</span>
                    <Badge variant="outline" className="text-xs">{o.tipo}</Badge>
                    <Badge variant="outline" className="text-xs">{o.direcao}</Badge>
                  </div>
                  <p className="text-sm mt-1">{o.assunto}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {o.direcao === "Enviado" ? `Para: ${o.destinatario}` : `De: ${o.remetente}`} | {o.data}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Ofício" : "Novo Ofício"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-muted-foreground">Número</label><Input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Ano</label><Input type="number" value={form.ano} onChange={e => setForm(f => ({ ...f, ano: +e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Data</label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Tipo</label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Direção</label>
                <Select value={form.direcao} onValueChange={v => setForm(f => ({ ...f, direcao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DIRECOES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><label className="text-xs text-muted-foreground">Assunto</label><Input value={form.assunto} onChange={e => setForm(f => ({ ...f, assunto: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Remetente</label><Input value={form.remetente} onChange={e => setForm(f => ({ ...f, remetente: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Destinatário</label><Input value={form.destinatario} onChange={e => setForm(f => ({ ...f, destinatario: e.target.value }))} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Texto</label><Textarea rows={4} value={form.texto} onChange={e => setForm(f => ({ ...f, texto: e.target.value }))} /></div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">Observações</label><Input value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
            {errorMsg && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{errorMsg}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setOpen(false); setErrorMsg(''); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}