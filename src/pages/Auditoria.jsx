import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Auditoria() {
  const { isAdminCamara, isSuperAdmin, tenantId } = useTenant();
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isAdminCamara) return;
    base44.entities.LogAuditoria.list("-created_date", 200).then(all => {
      if (isSuperAdmin) setLogs(all);
      else setLogs(all.filter(l => l.tenant_id === tenantId));
    });
  }, [isAdminCamara]);

  if (!isAdminCamara) return (
    <div className="p-6 text-center text-muted-foreground">Acesso restrito a administradores.</div>
  );

  const filtered = logs.filter(l =>
    l.acao?.toLowerCase().includes(search.toLowerCase()) ||
    l.modulo?.toLowerCase().includes(search.toLowerCase()) ||
    l.usuario_nome?.toLowerCase().includes(search.toLowerCase()) ||
    l.descricao?.toLowerCase().includes(search.toLowerCase())
  );

  const acaoColor = {
    CRIAR: "bg-green-100 text-green-800",
    EDITAR: "bg-blue-100 text-blue-800",
    EXCLUIR: "bg-red-100 text-red-800",
    LOGIN: "bg-purple-100 text-purple-800",
    LOGOUT: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader icon={ScrollText} title="Log de Auditoria" subtitle="Registro de todas as ações realizadas no sistema" />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por ação, módulo, usuário..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Nenhum registro encontrado.</p>}
        {filtered.map(log => (
          <Card key={log.id}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${acaoColor[log.acao] || "bg-muted text-muted-foreground"}`}>
                      {log.acao}
                    </span>
                    <Badge variant="outline" className="text-xs">{log.modulo}</Badge>
                    <span className="text-xs text-muted-foreground">{log.usuario_nome || "—"}</span>
                  </div>
                  {log.descricao && <p className="text-sm mt-1 text-foreground">{log.descricao}</p>}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {log.created_date ? format(new Date(log.created_date), "dd/MM/yy HH:mm", { locale: ptBR }) : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}