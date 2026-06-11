import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Search, Monitor, User, Clock, Shield } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACAO_COLOR = {
  CRIAR:           "bg-green-100 text-green-800 border-green-200",
  EDITAR:          "bg-blue-100 text-blue-800 border-blue-200",
  EXCLUIR:         "bg-red-100 text-red-800 border-red-200",
  VISUALIZAR:      "bg-gray-100 text-gray-700 border-gray-200",
  LOGIN:           "bg-purple-100 text-purple-800 border-purple-200",
  LOGOUT:          "bg-slate-100 text-slate-700 border-slate-200",
  EXPORTAR:        "bg-orange-100 text-orange-800 border-orange-200",
  INICIAR_VOTACAO: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ENCERRAR_VOTACAO:"bg-yellow-100 text-yellow-800 border-yellow-200",
  REGISTRAR_VOTO:  "bg-teal-100 text-teal-800 border-teal-200",
  PROTOCOLAR:      "bg-indigo-100 text-indigo-800 border-indigo-200",
  TRAMITAR:        "bg-cyan-100 text-cyan-800 border-cyan-200",
  OUTRA:           "bg-muted text-muted-foreground border-border",
};

const ACOES = ["TODAS", "CRIAR", "EDITAR", "EXCLUIR", "LOGIN", "LOGOUT", "EXPORTAR", "INICIAR_VOTACAO", "ENCERRAR_VOTACAO", "REGISTRAR_VOTO", "PROTOCOLAR", "TRAMITAR", "OUTRA"];

function formatDataHora(log) {
  const raw = log.data_hora || log.created_date;
  if (!raw) return "—";
  try { return format(new Date(raw), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }); }
  catch { return raw; }
}

export default function Auditoria() {
  const { isAdminCamara, isSuperAdmin, tenantId } = useTenant();
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("TODAS");
  const [filtroModulo, setFiltroModulo] = useState("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdminCamara) return;
    const filter = isSuperAdmin ? {} : { tenant_id: tenantId };
    base44.entities.LogAuditoria.filter(filter, "-created_date", 500).then(all => {
      setLogs(all);
      setLoading(false);
    });
  }, [isAdminCamara, tenantId, isSuperAdmin]);

  if (!isAdminCamara) return (
    <div className="p-6 text-center text-muted-foreground flex flex-col items-center gap-3 py-20">
      <Shield size={36} className="text-muted-foreground/40" />
      <p>Acesso restrito a administradores.</p>
    </div>
  );

  const modulos = ["todos", ...new Set(logs.map(l => l.modulo).filter(Boolean))].sort();

  const filtered = logs.filter(l => {
    const matchSearch = !search || [l.acao, l.modulo, l.usuario_nome, l.usuario_email, l.descricao, l.ip]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchAcao = filtroAcao === "TODAS" || l.acao === filtroAcao;
    const matchModulo = filtroModulo === "todos" || l.modulo === filtroModulo;
    return matchSearch && matchAcao && matchModulo;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon={ScrollText}
        title="Log de Auditoria"
        subtitle={`${filtered.length} registro(s) — todas as ações do sistema com usuário, hora e IP`}
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por usuário, módulo, IP, descrição..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filtroAcao} onValueChange={setFiltroAcao}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Ação" /></SelectTrigger>
          <SelectContent>
            {ACOES.map(a => <SelectItem key={a} value={a}>{a === "TODAS" ? "Todas as ações" : a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroModulo} onValueChange={setFiltroModulo}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Módulo" /></SelectTrigger>
          <SelectContent>
            {modulos.map(m => <SelectItem key={m} value={m}>{m === "todos" ? "Todos os módulos" : m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm animate-pulse">Carregando logs...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">Nenhum registro encontrado.</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map(log => (
              <div key={log.id} className="px-5 py-3.5 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Esquerda */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap mt-0.5 ${ACAO_COLOR[log.acao] || ACAO_COLOR.OUTRA}`}>
                      {log.acao}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] py-0">{log.modulo}</Badge>
                        {log.registro_id && (
                          <span className="text-[10px] text-muted-foreground font-mono">#{log.registro_id.slice(-6)}</span>
                        )}
                      </div>
                      {log.descricao && (
                        <p className="text-sm mt-1 text-foreground leading-snug">{log.descricao}</p>
                      )}
                      {/* Meta info */}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <User size={10} /> {log.usuario_nome || "—"}{log.usuario_email ? ` (${log.usuario_email})` : ""}
                        </span>
                        {log.ip && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                            <Monitor size={10} /> {log.ip}
                          </span>
                        )}
                        {log.user_agent && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={log.user_agent}>
                            {log.user_agent.slice(0, 40)}…
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Data/hora */}
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1 mt-0.5">
                    <Clock size={10} /> {formatDataHora(log)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}