import { useEffect, useState } from 'react';
import { sislegisEntities } from '@/lib/sislegisApi';
import { Inbox, Search, Mail, Phone, Clock, Lock } from 'lucide-react';
import { useTenant } from '@/lib/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import LoadingState from '@/components/LoadingState';

const STATUS_OPTS = ['Recebido', 'Em Análise', 'Encaminhado', 'Arquivado', 'Respondido', 'Aguardando'];

const STATUS_COLOR = {
  'Recebido': 'bg-blue-100 text-blue-700',
  'Em Análise': 'bg-yellow-100 text-yellow-700',
  'Encaminhado': 'bg-orange-100 text-orange-700',
  'Arquivado': 'bg-gray-100 text-gray-600',
  'Respondido': 'bg-green-100 text-green-700',
  'Aguardando': 'bg-purple-100 text-purple-700',
};

const ORIGEM_COLOR = {
  'Público': 'bg-sky-100 text-sky-700',
  'Prefeitura': 'bg-indigo-100 text-indigo-700',
  'Interno': 'bg-slate-100 text-slate-600',
};

// origemDe: protocolos antigos (sem origem) contam como "Interno".
const origemDe = (p) => p.origem || 'Interno';

export default function GestaoProtocolos({ origens, titulo, descricao, vazioLabel }) {
  const { tenantId, withTenant, canQuery } = useTenant();
  const [protocolos, setProtocolos] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [sel, setSel] = useState(null);
  const [status, setStatus] = useState('Recebido');
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (canQuery) loadData(); }, [tenantId, canQuery]);

  async function loadData() {
    setLoading(true);
    try {
      const p = await sislegisEntities.Protocolo.filter(withTenant({}), '-created_date', 300);
      setProtocolos((p || []).filter(x => origens.includes(origemDe(x))));
    } catch {
      setProtocolos([]);
    } finally {
      setLoading(false);
    }
  }

  function abrir(p) {
    setSel(p);
    setStatus(p.status || 'Recebido');
    setObs(p.observacoes || '');
  }

  async function salvar() {
    if (!sel) return;
    setSalvando(true);
    try {
      const mudouStatus = status !== sel.status;
      const historico = Array.isArray(sel.historico_tramitacao) ? [...sel.historico_tramitacao] : [];
      if (mudouStatus || (obs && obs !== (sel.observacoes || ''))) {
        historico.push({
          status,
          data: new Date().toISOString(),
          observacao: mudouStatus ? `Status alterado para "${status}".` : 'Observação atualizada.',
          por: 'Câmara',
        });
      }
      await sislegisEntities.Protocolo.update(sel.id, { status, observacoes: obs, historico_tramitacao: historico });
      setSel(null);
      loadData();
    } finally {
      setSalvando(false);
    }
  }

  const filtrados = protocolos.filter(p => {
    const matchBusca = !busca
      || p.assunto?.toLowerCase().includes(busca.toLowerCase())
      || p.interessado?.toLowerCase().includes(busca.toLowerCase())
      || p.numero?.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const pendentes = protocolos.filter(p => p.status === 'Recebido').length;
  const numeroFmt = (p) => p.numero || (p.numero_sequencial ? `${String(p.numero_sequencial).padStart(3, '0')}/${p.ano}` : '—');
  const mostrarOrigem = origens.length > 1;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">{titulo}</h1>
        <p className="text-muted-foreground mt-1">{descricao} · {pendentes} pendente(s)</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nº, assunto ou interessado..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {STATUS_OPTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingState label="Carregando protocolos..." />
      ) : filtrados.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <Inbox size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum {vazioLabel} encontrado.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {filtrados.map((p) => (
              <div key={p.id} onClick={() => abrir(p)} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                  <Inbox size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-foreground tabular-nums">{numeroFmt(p)}</span>
                    <span className="text-xs font-semibold text-muted-foreground">{p.tipo_documento || p.tipo}</span>
                    {mostrarOrigem && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${ORIGEM_COLOR[origemDe(p)]}`}>{origemDe(p)}</span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-foreground mt-0.5 line-clamp-1">{p.assunto}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    De: {p.interessado}{p.data_protocolo ? ` · ${p.data_protocolo}` : ''}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${STATUS_COLOR[p.status] || 'bg-muted text-muted-foreground'}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detalhe — admin edita apenas status + observações */}
      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <span className="font-mono tabular-nums">{sel && numeroFmt(sel)}</span>
              <span className="text-sm font-normal text-muted-foreground">{sel?.tipo_documento || sel?.tipo}</span>
            </DialogTitle>
          </DialogHeader>
          {sel && (
            <div className="space-y-4 py-1">
              {/* Dados do protocolo (somente leitura) */}
              <div className="bg-muted/40 rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock size={12} /> Dados do protocolo (somente leitura)
                </div>
                <div className="font-medium text-foreground">{sel.assunto}</div>
                <div className="text-muted-foreground text-xs">Interessado: {sel.interessado}</div>
                {sel.email_interessado && <div className="text-muted-foreground text-xs flex items-center gap-1"><Mail size={11} /> {sel.email_interessado}</div>}
                {sel.telefone_interessado && <div className="text-muted-foreground text-xs flex items-center gap-1"><Phone size={11} /> {sel.telefone_interessado}</div>}
                {sel.data_protocolo && <div className="text-muted-foreground text-xs">Protocolado em {sel.data_protocolo}{sel.hora_protocolo ? ` às ${sel.hora_protocolo}` : ''}</div>}
                <div className="text-muted-foreground text-xs">Origem: {origemDe(sel)}</div>
              </div>

              {/* Edição permitida */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Status de tramitação</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Observações</label>
                <Textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} placeholder="Anotações internas / resposta ao interessado..." />
              </div>

              {/* Histórico */}
              {Array.isArray(sel.historico_tramitacao) && sel.historico_tramitacao.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Histórico</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-slim">
                    {sel.historico_tramitacao.slice().reverse().map((h, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <Clock size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-foreground">{h.status}</span>
                          {h.observacao ? ` — ${h.observacao}` : ''}
                          {h.data && <span className="text-muted-foreground/70"> · {new Date(h.data).toLocaleString('pt-BR')}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSel(null)}>Fechar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
