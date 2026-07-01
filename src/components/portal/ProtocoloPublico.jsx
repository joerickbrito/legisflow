import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Inbox, Search, Send, CheckCircle2, Copy, Check, Loader2,
  FileText, AlertCircle, Clock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/StatusBadge';
import { fmtData, fmtDataHora } from '@/lib/datas';
import FileUpload from '@/components/FileUpload';

const TIPOS = ['Ofício', 'Requerimento', 'Projeto de Lei', 'Petição', 'Memorando', 'Relatório', 'Outros'];

/* ─── CRIAR PROTOCOLO ─── */
function CriarProtocolo({ camaraId }) {
  const [form, setForm] = useState({
    tipo_documento: 'Ofício', interessado: '', email_interessado: '',
    telefone_interessado: '', assunto: '', observacoes: '', arquivo_url: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(false);

  function set(campo, v) { setForm(f => ({ ...f, [campo]: v })); }

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (!form.interessado.trim()) return setErro('Informe seu nome.');
    if (!form.email_interessado.includes('@')) return setErro('Informe um e-mail válido para receber o protocolo.');
    if (!form.assunto.trim()) return setErro('Informe o assunto.');
    setEnviando(true);
    try {
      const resp = await base44.functions.invoke('protocolar', { camara_id: camaraId, ...form });
      const data = resp?.data?.data;
      if (resp?.data?.error || !data) { setErro(resp?.data?.error || 'Erro ao protocolar. Tente novamente.'); }
      else setResultado(data);
    } catch {
      setErro('Erro ao protocolar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  function copiar() {
    navigator.clipboard?.writeText(resultado.codigo_consulta);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (resultado) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center max-w-lg mx-auto">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15 mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="font-heading font-bold text-xl text-foreground mb-1">Protocolo registrado!</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Guarde o <strong>código de acompanhamento</strong> abaixo — é com ele que você consulta o andamento.
          {resultado.email_enviado ? ' Também enviamos por e-mail.' : ''}
        </p>
        <div className="bg-muted/50 rounded-xl p-4 mb-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Nº do Protocolo</div>
          <div className="font-mono font-bold text-2xl text-foreground tabular-nums">{resultado.numero}</div>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-5">
          <div className="text-[11px] uppercase tracking-wide text-primary font-semibold mb-1">Código de Acompanhamento</div>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono font-bold text-xl text-foreground tracking-wider">{resultado.codigo_consulta}</span>
            <button onClick={copiar} className="p-1.5 rounded-lg hover:bg-primary/15 text-primary transition-colors" title="Copiar código">
              {copiado ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
        <button
          onClick={() => { setResultado(null); setForm({ tipo_documento: 'Ofício', interessado: '', email_interessado: '', telefone_interessado: '', assunto: '', observacoes: '', arquivo_url: '' }); }}
          className="text-sm text-primary hover:underline font-medium"
        >
          Registrar outro protocolo
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="bg-card border border-border rounded-xl p-6 max-w-2xl mx-auto space-y-4">
      <p className="text-sm text-muted-foreground">
        Protocole documentos diretamente à câmara. Você receberá um número de protocolo e um código para acompanhar o andamento.
      </p>
      {erro && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertCircle size={15} /> {erro}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Tipo de documento *</label>
          <Select value={form.tipo_documento} onValueChange={v => set('tipo_documento', v)}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Seu nome *</label>
          <Input value={form.interessado} onChange={e => set('interessado', e.target.value)} placeholder="Nome completo" className="h-10" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">E-mail *</label>
          <Input type="email" value={form.email_interessado} onChange={e => set('email_interessado', e.target.value)} placeholder="voce@email.com" className="h-10" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Telefone</label>
          <Input value={form.telefone_interessado} onChange={e => set('telefone_interessado', e.target.value)} placeholder="(00) 00000-0000" className="h-10" />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">Assunto *</label>
        <Input value={form.assunto} onChange={e => set('assunto', e.target.value)} placeholder="Resumo do documento" className="h-10" />
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">Detalhes / observações</label>
        <Textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Descreva o pedido ou conteúdo..." rows={4} />
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">Anexar documento</label>
        <FileUpload value={form.arquivo_url} onUploaded={(url) => set('arquivo_url', url)} label="" />
      </div>
      <button
        type="submit" disabled={enviando}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {enviando ? <><Loader2 size={16} className="animate-spin" /> Registrando...</> : <><Send size={16} /> Protocolar</>}
      </button>
    </form>
  );
}

/* ─── CONSULTAR PROTOCOLO ─── */
function ConsultarProtocolo({ camaraId }) {
  const [codigo, setCodigo] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState('');
  const [proto, setProto] = useState(null);

  async function buscar(e) {
    e.preventDefault();
    setErro(''); setProto(null);
    if (!codigo.trim()) return setErro('Informe o código do protocolo.');
    setBuscando(true);
    try {
      const resp = await base44.functions.invoke('consultarProtocolo', { camara_id: camaraId, codigo: codigo.trim() });
      const data = resp?.data?.data;
      if (resp?.data?.error || !data) setErro(resp?.data?.error || 'Protocolo não encontrado.');
      else setProto(data);
    } catch {
      setErro('Erro ao consultar. Tente novamente.');
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <form onSubmit={buscar} className="bg-card border border-border rounded-xl p-6">
        <p className="text-sm text-muted-foreground mb-3">
          Digite o <strong>código de acompanhamento</strong> que você recebeu ao protocolar (ex.: PUB-XXXX-XXXX).
        </p>
        <div className="flex gap-2">
          <Input
            value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())}
            placeholder="PUB-XXXX-XXXX" className="h-11 font-mono tracking-wider"
          />
          <button type="submit" disabled={buscando}
            className="flex items-center gap-2 h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-60">
            {buscando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Consultar
          </button>
        </div>
        {erro && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-3">
            <AlertCircle size={15} /> {erro}
          </div>
        )}
      </form>

      {proto && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start justify-between gap-3 mb-4 pb-4 border-b border-border">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Protocolo</div>
              <div className="font-mono font-bold text-2xl text-foreground tabular-nums">{proto.numero}</div>
              <div className="text-sm text-muted-foreground mt-1">{proto.tipo_documento} · {proto.assunto}</div>
            </div>
            <StatusBadge status={proto.status} />
          </div>
          <div className="text-xs text-muted-foreground mb-4">
            Protocolado em {fmtData(proto.data_protocolo)}{proto.hora_protocolo ? ` às ${proto.hora_protocolo}` : ''} · Interessado: {proto.interessado}
          </div>

          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Andamento</div>
          <div className="space-y-3">
            {(proto.historico_tramitacao?.length ? proto.historico_tramitacao : [{ status: proto.status, data: proto.data_protocolo, observacao: 'Protocolo registrado.' }])
              .slice().reverse().map((h, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <Clock size={13} className="text-primary" />
                    </div>
                    {i < (proto.historico_tramitacao?.length || 1) - 1 && <div className="w-px flex-1 bg-border my-1" />}
                  </div>
                  <div className="pb-2">
                    <div className="text-sm font-medium text-foreground">{h.status}</div>
                    {h.observacao && <div className="text-xs text-muted-foreground mt-0.5">{h.observacao}</div>}
                    {h.data && <div className="text-[11px] text-muted-foreground/70 mt-0.5">{fmtDataHora(h.data)}</div>}
                  </div>
                </div>
              ))}
          </div>
          {proto.atualizacoes && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Atualizações da câmara</div>
              <p className="text-sm text-foreground whitespace-pre-line">{proto.atualizacoes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProtocoloPublico({ camaraId }) {
  const [modo, setModo] = useState('criar');
  return (
    <div>
      <div className="flex justify-center mb-5">
        <div className="inline-flex bg-muted rounded-xl p-1 gap-1">
          <button
            onClick={() => setModo('criar')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${modo === 'criar' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Inbox size={15} /> Criar Protocolo
          </button>
          <button
            onClick={() => setModo('consultar')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${modo === 'consultar' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Search size={15} /> Consultar
          </button>
        </div>
      </div>
      {modo === 'criar' ? <CriarProtocolo camaraId={camaraId} /> : <ConsultarProtocolo camaraId={camaraId} />}
    </div>
  );
}
