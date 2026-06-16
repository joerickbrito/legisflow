import { useState, useEffect } from "react";
import { sislegisEntities } from "@/lib/sislegisApi";
import { useTenant } from "@/lib/TenantContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserCheck, Plus, CheckCircle, XCircle } from "lucide-react";

export default function Quorum() {
  const { withTenant, canQuery, tenantId } = useTenant();
  const [registros, setRegistros] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ sessao_id: "", data: "", total_parlamentares: 0, quorum_minimo: 0, registro_presencas: [], observacoes: "" });

  useEffect(() => {
    if (!canQuery) return;
    const filter = withTenant();
    if (!filter) return;
    sislegisEntities.Quorum.filter(filter, "-created_date", 50).then(setRegistros);
    sislegisEntities.Sessao.filter(filter, "-created_date", 20).then(setSessoes);
    sislegisEntities.Parlamentar.filter(filter).then(setParlamentares);
  }, [canQuery]);

  const handleSave = async () => {
    const presentes = form.registro_presencas.filter(p => p.status === "Presente").length;
    const ausentes = form.total_parlamentares - presentes;
    const quorum_atingido = presentes >= form.quorum_minimo;
    await sislegisEntities.Quorum.create({ ...form, tenant_id: tenantId, presentes, ausentes, quorum_atingido });
    const filter = withTenant();
    const updated = filter ? await sislegisEntities.Quorum.filter(filter, "-created_date", 50) : [];
    setRegistros(updated);
    setOpen(false);
  };

  const initPresencas = (sessaoId) => {
    const sessao = sessoes.find(s => s.id === sessaoId);
    const presencas = parlamentares.map(p => ({ parlamentar_id: p.id, parlamentar_nome: p.nome_parlamentar || p.nome, status: "Presente" }));
    setForm(f => ({ ...f, sessao_id: sessaoId, total_parlamentares: parlamentares.length, quorum_minimo: Math.ceil(parlamentares.length / 2) + 1, registro_presencas: presencas, data: sessao?.data || "" }));
  };

  const togglePresenca = (idx) => {
    setForm(f => {
      const reg = [...f.registro_presencas];
      reg[idx] = { ...reg[idx], status: reg[idx].status === "Presente" ? "Ausente" : "Presente" };
      return { ...f, registro_presencas: reg };
    });
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={UserCheck}
        title="Controle de Quórum"
        subtitle="Registro de presenças e verificação de quórum"
        action={<Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo Registro</Button>}
      />

      <div className="space-y-4">
        {registros.length === 0 && <p className="text-muted-foreground text-sm">Nenhum registro de quórum encontrado.</p>}
        {registros.map(r => {
          const sessao = sessoes.find(s => s.id === r.sessao_id);
          return (
            <Card key={r.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sessão {sessao?.numero || r.sessao_id} — {r.data}</p>
                    <p className="text-sm text-muted-foreground">{r.presentes}/{r.total_parlamentares} presentes | Mínimo: {r.quorum_minimo}</p>
                  </div>
                  <Badge variant={r.quorum_atingido ? "default" : "destructive"}>
                    {r.quorum_atingido ? "Quórum Atingido" : "Sem Quórum"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Registro de Quórum</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.sessao_id}
              onChange={e => initPresencas(e.target.value)}>
              <option value="">Selecione a sessão...</option>
              {sessoes.map(s => <option key={s.id} value={s.id}>Sessão {s.numero} — {s.data}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Total Parlamentares</label>
                <Input type="number" value={form.total_parlamentares} onChange={e => setForm(f => ({ ...f, total_parlamentares: +e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Quórum Mínimo</label>
                <Input type="number" value={form.quorum_minimo} onChange={e => setForm(f => ({ ...f, quorum_minimo: +e.target.value }))} /></div>
            </div>
            {form.registro_presencas.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Presenças</p>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {form.registro_presencas.map((p, idx) => (
                    <button key={idx} onClick={() => togglePresenca(idx)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-sm text-left ${p.status === "Presente" ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                      {p.status === "Presente" ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                      {p.parlamentar_nome}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Input placeholder="Observações" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.sessao_id}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}