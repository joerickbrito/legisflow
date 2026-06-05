import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UsersRound, Plus } from "lucide-react";

const STATUS = ["Agendada", "Realizada", "Cancelada"];

export default function ReuniaoComissao() {
  const [reunioes, setReunioes] = useState([]);
  const [comissoes, setComissoes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ comissao_id: "", comissao_nome: "", numero: "", data: "", hora_inicio: "", hora_fim: "", local: "", status: "Agendada", ata: "", observacoes: "" });

  useEffect(() => {
    base44.entities.ReuniaoComissao.list("-created_date", 50).then(setReunioes);
    base44.entities.Comissao.list().then(setComissoes);
  }, []);

  const openNew = () => { setEditing(null); setForm({ comissao_id: "", comissao_nome: "", numero: "", data: "", hora_inicio: "", hora_fim: "", local: "", status: "Agendada", ata: "", observacoes: "" }); setOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm(r); setOpen(true); };

  const handleSave = async () => {
    const comissao = comissoes.find(c => c.id === form.comissao_id);
    const data = { ...form, comissao_nome: comissao?.nome || form.comissao_nome };
    if (editing) await base44.entities.ReuniaoComissao.update(editing.id, data);
    else await base44.entities.ReuniaoComissao.create(data);
    setReunioes(await base44.entities.ReuniaoComissao.list("-created_date", 50));
    setOpen(false);
  };

  const statusColor = { "Agendada": "secondary", "Realizada": "default", "Cancelada": "destructive" };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={UsersRound}
        title="Reuniões de Comissão"
        subtitle="Agendamento e registro de reuniões das comissões"
        action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nova Reunião</Button>}
      />

      <div className="space-y-3">
        {reunioes.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma reunião registrada.</p>}
        {reunioes.map(r => (
          <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(r)}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">{r.comissao_nome} — Reunião nº {r.numero}</p>
                  <p className="text-xs text-muted-foreground mt-1">{r.data} {r.hora_inicio && `às ${r.hora_inicio}`} | {r.local}</p>
                </div>
                <Badge variant={statusColor[r.status] || "secondary"}>{r.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Reunião" : "Nova Reunião de Comissão"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Comissão</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background mt-1" value={form.comissao_id} onChange={e => setForm(f => ({ ...f, comissao_id: e.target.value }))}>
                <option value="">Selecione...</option>
                {comissoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Número</label><Input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Data</label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Hora Início</label><Input type="time" value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Hora Fim</label><Input type="time" value={form.hora_fim} onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Local</label><Input value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} /></div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">Ata</label><Textarea rows={3} value={form.ata} onChange={e => setForm(f => ({ ...f, ata: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">Observações</label><Input value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
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