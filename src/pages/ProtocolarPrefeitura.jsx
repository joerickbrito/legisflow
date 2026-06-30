import { useState } from 'react';
import { useTenant } from '@/lib/TenantContext';
import { protocolar } from '@/lib/sislegisApi';
import {
  Inbox, Send, CheckCircle2, Copy, Check, Loader2, AlertCircle, Building2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FileUpload from '@/components/FileUpload';

const TIPOS = ['Ofício', 'Requerimento', 'Projeto de Lei', 'Petição', 'Memorando', 'Relatório', 'Outros'];

const FORM_VAZIO = {
  tipo_documento: 'Ofício', interessado: '', email_interessado: '',
  telefone_interessado: '', assunto: '', observacoes: '', arquivo_url: '',
};

export default function ProtocolarPrefeitura() {
  const { tenantId, camara } = useTenant();
  const [form, setForm] = useState(FORM_VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(false);

  function set(campo, v) { setForm(f => ({ ...f, [campo]: v })); }

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (!form.interessado.trim()) return setErro('Informe o remetente/interessado.');
    if (!form.assunto.trim()) return setErro('Informe o assunto.');
    setEnviando(true);
    try {
      const data = await protocolar({ camara_id: tenantId, ...form });
      if (!data) setErro('Erro ao protocolar. Tente novamente.');
      else setResultado(data);
    } catch (err) {
      setErro(err?.message || 'Erro ao protocolar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  function copiar() {
    navigator.clipboard?.writeText(resultado.codigo_consulta);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <Inbox className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-xl text-foreground">Protocolar Documento</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Building2 size={13} /> Prefeitura → {camara?.nome || 'Câmara Municipal'}
          </p>
        </div>
      </div>

      {resultado ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15 mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="font-heading font-bold text-xl text-foreground mb-1">Protocolo registrado!</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Documento enviado à câmara. Guarde os dados abaixo para acompanhamento.
            {resultado.email_enviado ? ' Uma cópia foi enviada por e-mail.' : ''}
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mb-5 text-left">
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Nº do Protocolo</div>
              <div className="font-mono font-bold text-2xl text-foreground tabular-nums">{resultado.numero}</div>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wide text-primary font-semibold mb-1">Código de Acompanhamento</div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg text-foreground tracking-wider">{resultado.codigo_consulta}</span>
                <button onClick={copiar} className="p-1.5 rounded-lg hover:bg-primary/15 text-primary transition-colors" title="Copiar código">
                  {copiado ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setResultado(null); setForm(FORM_VAZIO); }}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90"
          >
            <Inbox size={15} /> Protocolar outro documento
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} className="bg-card border border-border rounded-xl p-6 space-y-4">
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
              <label className="text-xs font-semibold text-foreground mb-1 block">Remetente / interessado *</label>
              <Input value={form.interessado} onChange={e => set('interessado', e.target.value)} placeholder="Ex.: Prefeitura Municipal / Secretaria" className="h-10" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">E-mail (para receber o comprovante)</label>
              <Input type="email" value={form.email_interessado} onChange={e => set('email_interessado', e.target.value)} placeholder="setor@prefeitura.gov.br" className="h-10" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Telefone</label>
              <Input value={form.telefone_interessado} onChange={e => set('telefone_interessado', e.target.value)} placeholder="(00) 0000-0000" className="h-10" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Assunto *</label>
            <Input value={form.assunto} onChange={e => set('assunto', e.target.value)} placeholder="Resumo do documento" className="h-10" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Detalhes / observações</label>
            <Textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Descreva o conteúdo do documento..." rows={5} />
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
      )}
    </div>
  );
}
