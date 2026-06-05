import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Play, Square, RotateCcw, Users, CheckCircle, XCircle, MinusCircle } from "lucide-react";

export default function PainelEletronico() {
  const [sessoes, setSessoes] = useState([]);
  const [sessaoSelecionada, setSessaoSelecionada] = useState(null);
  const [votacoes, setVotacoes] = useState([]);
  const [votacaoAtiva, setVotacaoAtiva] = useState(null);
  const [timer, setTimer] = useState(0);
  const [timerAtivo, setTimerAtivo] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    base44.entities.Sessao.list("-created_date", 20).then(setSessoes);
    base44.entities.Votacao.list("-created_date", 50).then(setVotacoes);
  }, []);

  useEffect(() => {
    if (timerAtivo) {
      intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerAtivo]);

  const formatTimer = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const votacoesDaSessao = sessaoSelecionada
    ? votacoes.filter(v => v.sessao_id === sessaoSelecionada.id)
    : [];

  return (
    <div className="p-6 space-y-6">
      <PageHeader icon={Monitor} title="Painel Eletrônico" subtitle="Controle em tempo real de sessões, votações e timer" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Cronômetro</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="text-6xl font-mono font-bold text-primary">{formatTimer(timer)}</div>
            <div className="flex gap-2">
              <Button onClick={() => setTimerAtivo(true)} disabled={timerAtivo} size="sm">
                <Play className="w-4 h-4 mr-1" /> Iniciar
              </Button>
              <Button onClick={() => setTimerAtivo(false)} disabled={!timerAtivo} variant="outline" size="sm">
                <Square className="w-4 h-4 mr-1" /> Pausar
              </Button>
              <Button onClick={() => { setTimerAtivo(false); setTimer(0); }} variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-1" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sessão Ativa */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Sessão Selecionada</CardTitle></CardHeader>
          <CardContent>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm mb-4 bg-background"
              value={sessaoSelecionada?.id || ""}
              onChange={e => setSessaoSelecionada(sessoes.find(s => s.id === e.target.value) || null)}
            >
              <option value="">Selecione uma sessão...</option>
              {sessoes.map(s => (
                <option key={s.id} value={s.id}>
                  Sessão {s.numero} - {s.data} ({s.status})
                </option>
              ))}
            </select>
            {sessaoSelecionada && (
              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <Badge>{sessaoSelecionada.tipo}</Badge>
                  <Badge variant="outline">{sessaoSelecionada.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Local: {sessaoSelecionada.local || "Plenário"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Votações da sessão */}
      {sessaoSelecionada && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Votações da Sessão</CardTitle></CardHeader>
          <CardContent>
            {votacoesDaSessao.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma votação registrada nesta sessão.</p>
            ) : (
              <div className="space-y-3">
                {votacoesDaSessao.map(v => (
                  <div key={v.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium text-sm">{v.materia_ementa || v.materia_id}</p>
                      <p className="text-xs text-muted-foreground">{v.tipo_votacao}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" />{v.votos_sim ?? 0}</span>
                      <span className="flex items-center gap-1 text-red-500"><XCircle className="w-4 h-4" />{v.votos_nao ?? 0}</span>
                      <span className="flex items-center gap-1 text-muted-foreground"><MinusCircle className="w-4 h-4" />{v.abstencoes ?? 0}</span>
                      <Badge variant={v.resultado === "Aprovada" ? "default" : "destructive"}>{v.resultado || "Em votação"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}