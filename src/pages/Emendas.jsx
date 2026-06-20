import { useState, useEffect } from "react";
import { sislegisEntities } from "@/lib/sislegisApi";
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
import FilterBar, { TODOS } from "@/components/FilterBar";

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
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState({});

  useEffect(() => {
    if (!canQuery) return;
    const filter = withTenant();
    sislegisEntities.Emenda.filter(filter, "-created_date", 50).then(setEmendas);
    sislegisEntities.Materia.filter(filter).then(setMaterias);
    sislegisEntities.Parlamentar.filter(filter).then(setParlamentares);
  }, [canQuery]);

  const openNew = () => { setEditing(null); setForm({ materia_id: "", numero: "", tipo: "Modificativa", ementa: "", texto: "", justificativa: "", autor_id: "", autor_nome: "", data_apresentacao: "", status: "Em análise" }); setOpen(true); };
  const openEdit = (e) => { setEditing(e); setForm(e); setOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const materia = materias.find(m => m.id === form.materia_id);
      const autor = parlamentares.find(p => p.id === form.autor_id);
      const data = { ...form, tenant_id: tenantId, materia_ementa: materia?.ementa || "", autor_nome: autor?.nome_parlamentar || autor?.nome || form.autor_nome };
      if (editing) await sislegisEntities.Emenda.update(editing.id, data);
      else await sislegisEntities.Emenda.create(data);
      const filter = withTenant();
      if (filter) setEmendas(await sislegisEntities.Emenda.filter(filter, "-created_date", 50));
      setOpen(false);
      setErrorMsg('');
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao salvar emenda.');
    } finally {
      setSaving(false);
    }
  };

  const filtradas = emendas.filter(e => {
    const buscaOk = `${e.ementa || ''} ${e.autor_nome || ''} ${e.materia_ementa || ''}`.toLowerCase().includes(busca.toLowerCase());
    const tipoOk = !filtros.tipo || filtros.tipo === TODOS || e.tipo === filtros.tipo;
    const statusOk = !filtros.status || filtros.status === TODOS || e.status === filtros.status;
    return buscaOk && tipoOk && statusOk;
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={FileDiff}
        title="Emendas"
        subtitle="Gestão de emendas a matérias legislativas"
        action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nova Emenda</Button>}
      />

      <FilterBar
        search={busca}
        onSearch={setBusca}
        searchPlaceholder="Buscar por ementa, autor ou matéria..."
        filtros={[
          { key: 'tipo', label: 'Tipo', options: TIPOS },
          { key: 'status', label: 'Status', options: STATUS },
        ]}
        valores={filtros}
        onChange={(k, v) => setFiltros(f => ({ ...f, [k]: v }))}
        onLimpar={() => { setBusca(''); setFiltros({}); }}
      />

      <div className="space-y-3">
        {filtradas.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma emenda registrada.</p>}
        {filtradas.map(e => (
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