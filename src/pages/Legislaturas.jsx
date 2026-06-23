import { useEffect, useState } from 'react';
import { sislegisEntities } from '@/lib/sislegisApi';
import { BookOpen, Plus, Trash2, Pencil, AlertTriangle, Loader2 } from 'lucide-react';
import { useTenant } from '@/lib/TenantContext';
import { verificarVinculos } from '@/lib/dependencias';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';

export default function Legislaturas() {
  const { tenantId, withTenant, canQuery } = useTenant();
  const [legislaturas, setLegislaturas] = useState([]);
  const [sessoesLeg, setSessoesLeg] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ numero: '', ano_inicio: '', ano_fim: '', data_inicio: '', data_fim: '', data_eleicao: '', descricao: '', status: 'Ativa' });
  const [showSessaoForm, setShowSessaoForm] = useState(false);
  const [editandoSessao, setEditandoSessao] = useState(null);
  const [sessaoForm, setSessaoForm] = useState({ numero: '', ano: new Date().getFullYear(), data_inicio: '', data_fim: '', legislatura_id: '' });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // Exclusão com verificação de vínculo
  const [del, setDel] = useState(null); // { tipo: 'Legislatura'|'SessaoLegislativa', registro, titulo }
  const [delVinculos, setDelVinculos] = useState([]);
  const [delChecando, setDelChecando] = useState(false); // verificando vínculos
  const [delExcluindo, setDelExcluindo] = useState(false); // exclusão em andamento
  const [delErro, setDelErro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (canQuery) load(); }, [tenantId, canQuery]);

  async function load() {
    const filter = withTenant({});
    if (!filter) { setLoading(false); return; }
    setLoading(true);
    try {
      const [l, s] = await Promise.all([
        sislegisEntities.Legislatura.filter(filter, '-data_inicio').catch(() => []),
        sislegisEntities.SessaoLegislativa.filter(filter, '-ano').catch(() => []),
      ]);
      setLegislaturas(l);
      setSessoesLeg(s);
    } finally {
      setLoading(false);
    }
  }

  async function salvarLeg() {
    setSaving(true);
    setErrorMsg('');
    try {
      if (!form.numero || Number(form.numero) <= 0) {
        setErrorMsg('O número da legislatura é obrigatório.');
        setSaving(false);
        return;
      }
      const data = {
        ...form,
        tenant_id: tenantId || '',
        numero: Number(form.numero),
        ano_inicio: form.ano_inicio ? Number(form.ano_inicio) : undefined,
        ano_fim: form.ano_fim ? Number(form.ano_fim) : undefined,
      };
      if (editando) await sislegisEntities.Legislatura.update(editando.id, data);
      else await sislegisEntities.Legislatura.create(data);
      setShowForm(false);
      setErrorMsg('');
      load();
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao salvar legislatura.');
    } finally {
      setSaving(false);
    }
  }

  async function salvarSessao() {
    setSaving(true);
    setErrorMsg('');
    try {
      const leg = legislaturas.find(l => l.id === sessaoForm.legislatura_id);
      const data = {
        ...sessaoForm,
        tenant_id: tenantId || '',
        ano: Number(sessaoForm.ano),
        numero: Number(sessaoForm.numero),
        legislatura_numero: leg?.numero,
      };
      if (editandoSessao) await sislegisEntities.SessaoLegislativa.update(editandoSessao.id, data);
      else await sislegisEntities.SessaoLegislativa.create(data);
      setShowSessaoForm(false);
      setEditandoSessao(null);
      setErrorMsg('');
      load();
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao salvar sessão legislativa.');
    } finally {
      setSaving(false);
    }
  }

  function abrirEdicaoSessao(s) {
    setEditandoSessao(s);
    setSessaoForm({
      numero: s.numero ?? '',
      ano: s.ano ?? new Date().getFullYear(),
      data_inicio: s.data_inicio || '',
      data_fim: s.data_fim || '',
      legislatura_id: s.legislatura_id || '',
    });
    setErrorMsg('');
    setShowSessaoForm(true);
  }

  // Abre o fluxo de exclusão: verifica vínculos antes de permitir excluir
  async function pedirExclusao(tipo, registro, titulo) {
    setDel({ tipo, registro, titulo });
    setDelVinculos([]);
    setDelErro('');
    setDelChecando(true);
    try {
      const vinc = await verificarVinculos(tipo, registro.id, withTenant);
      setDelVinculos(vinc);
    } catch (e) {
      setDelErro('Não foi possível verificar os vínculos. Tente novamente.');
    } finally {
      setDelChecando(false);
    }
  }

  async function confirmarExclusao() {
    if (!del) return;
    setDelExcluindo(true);
    setDelErro('');
    try {
      if (del.tipo === 'Legislatura') await sislegisEntities.Legislatura.delete(del.registro.id);
      else await sislegisEntities.SessaoLegislativa.delete(del.registro.id);
      setDel(null);
      load();
    } catch (e) {
      setDelErro(e?.message || 'Erro ao excluir.');
    } finally {
      setDelExcluindo(false);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader icon={BookOpen} title="Legislaturas & Sessões Legislativas"
        subtitle="Controle de mandatos e anos legislativos"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSessaoForm(true)} className="gap-1">
              <Plus size={15} /> Sessão Legislativa
            </Button>
            <Button size="sm" onClick={() => { setEditando(null); setForm({ numero: '', ano_inicio: '', ano_fim: '', data_inicio: '', data_fim: '', data_eleicao: '', descricao: '', status: 'Ativa' }); setShowForm(true); }} className="gap-1">
              <Plus size={15} /> Legislatura
            </Button>
          </div>
        }
      />

      {loading ? (
        <LoadingState label="Carregando legislaturas..." />
      ) : legislaturas.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nenhuma legislatura cadastrada" description="Cadastre a legislatura atual para começar." onAdd={() => setShowForm(true)} addLabel="Cadastrar Legislatura" />
      ) : (
        <div className="space-y-4">
          {legislaturas.map((l) => {
            const sessoes = sessoesLeg.filter(s => s.legislatura_id === l.id);
            return (
              <div key={l.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center font-heading font-bold text-primary">{l.numero}ª</div>
                    <div>
                      <div className="font-semibold text-foreground">{l.numero}ª Legislatura{(l.ano_inicio && l.ano_fim) ? ` — ${l.ano_inicio}/${l.ano_fim}` : ''}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.data_eleicao && <span>Eleição: {l.data_eleicao} · </span>}
                        {l.data_inicio && `${l.data_inicio} a ${l.data_fim}`}
                      </div>
                      {l.descricao && <div className="text-xs text-muted-foreground italic">{l.descricao}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={l.status} />
                    <Button variant="outline" size="sm" onClick={() => { setEditando(l); setForm({ numero: l.numero, ano_inicio: l.ano_inicio || '', ano_fim: l.ano_fim || '', data_inicio: l.data_inicio || '', data_fim: l.data_fim || '', data_eleicao: l.data_eleicao || '', descricao: l.descricao || '', status: l.status }); setShowForm(true); }}>
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                      onClick={() => pedirExclusao('Legislatura', l, `${l.numero}ª Legislatura`)} title="Excluir legislatura">
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
                {sessoes.length > 0 && (
                  <div className="px-5 py-3 flex flex-wrap gap-2">
                    {sessoes.map(s => (
                      <div key={s.id} className="group inline-flex items-center gap-1 bg-muted rounded-full pl-3 pr-1.5 py-1">
                        <span className="text-xs text-muted-foreground font-medium">{s.numero}ª Sessão — {s.ano}</span>
                        <button onClick={() => abrirEdicaoSessao(s)} title="Editar sessão"
                          className="p-1 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => pedirExclusao('SessaoLegislativa', s, `${s.numero}ª Sessão Legislativa de ${s.ano}`)} title="Excluir sessão"
                          className="p-1 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-heading">{editando ? 'Editar' : 'Nova'} Legislatura</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-sm font-medium mb-1.5 block">Número *</label><Input type="number" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="Ex: 19" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1.5 block">Ano de Início</label><Input type="number" value={form.ano_inicio} onChange={e => setForm(f => ({ ...f, ano_inicio: e.target.value }))} placeholder="2021" /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Ano de Fim</label><Input type="number" value={form.ano_fim} onChange={e => setForm(f => ({ ...f, ano_fim: e.target.value }))} placeholder="2024" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1.5 block">Data de Início</label><Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Data de Fim</label><Input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} /></div>
            </div>
            <div><label className="text-sm font-medium mb-1.5 block">Data de Eleição</label><Input type="date" value={form.data_eleicao} onChange={e => setForm(f => ({ ...f, data_eleicao: e.target.value }))} /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Descrição</label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: 19ª Legislatura — 2021 a 2024" /></div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Ativa">Ativa</SelectItem><SelectItem value="Encerrada">Encerrada</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          {errorMsg && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{errorMsg}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setErrorMsg(''); }}>Cancelar</Button>
            <Button onClick={salvarLeg} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSessaoForm} onOpenChange={(v) => { setShowSessaoForm(v); if (!v) { setEditandoSessao(null); setErrorMsg(''); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-heading">{editandoSessao ? 'Editar' : 'Nova'} Sessão Legislativa</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Legislatura</label>
              <Select value={sessaoForm.legislatura_id} onValueChange={v => setSessaoForm(f => ({ ...f, legislatura_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{legislaturas.map(l => <SelectItem key={l.id} value={l.id}>{l.numero}ª Legislatura</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1.5 block">Número</label><Input type="number" value={sessaoForm.numero} onChange={e => setSessaoForm(f => ({ ...f, numero: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Ano</label><Input type="number" value={sessaoForm.ano} onChange={e => setSessaoForm(f => ({ ...f, ano: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1.5 block">Início</label><Input type="date" value={sessaoForm.data_inicio} onChange={e => setSessaoForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Fim</label><Input type="date" value={sessaoForm.data_fim} onChange={e => setSessaoForm(f => ({ ...f, data_fim: e.target.value }))} /></div>
            </div>
          </div>
          {errorMsg && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{errorMsg}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSessaoForm(false); setErrorMsg(''); }}>Cancelar</Button>
            <Button onClick={salvarSessao} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exclusão com verificação de vínculo */}
      <Dialog open={!!del} onOpenChange={(v) => { if (!v) { setDel(null); setDelVinculos([]); setDelErro(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              {delVinculos.length > 0
                ? <><AlertTriangle size={18} className="text-amber-500" /> Exclusão bloqueada</>
                : 'Excluir registro'}
            </DialogTitle>
          </DialogHeader>

          {delChecando ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 size={16} className="animate-spin" /> Verificando vínculos...
            </div>
          ) : delVinculos.length > 0 ? (
            <div className="py-2 space-y-3">
              <p className="text-sm text-muted-foreground">
                Não é possível excluir <strong className="text-foreground">{del?.titulo}</strong> porque há registros vinculados a ele:
              </p>
              <ul className="space-y-1.5">
                {delVinculos.map(v => (
                  <li key={v.entity} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                    <span className="text-foreground font-medium">{v.count} {v.label}</span>
                    <span className="text-xs text-muted-foreground">em {v.onde}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Exclua ou desvincule esses registros primeiro (nas telas indicadas) e tente de novo. Ao excluir cada um, a própria tela mostrará os vínculos do próximo nível, se houver — assim você segue o caminho até liberar a exclusão.
              </p>
            </div>
          ) : (
            <div className="py-2">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja excluir <strong className="text-foreground">{del?.titulo}</strong>? Esta ação não pode ser desfeita.
              </p>
            </div>
          )}

          {delErro && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{delErro}</p>}

          <DialogFooter>
            {delVinculos.length > 0 ? (
              <Button variant="outline" onClick={() => setDel(null)}>Entendi</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDel(null)} disabled={delExcluindo || delChecando}>Cancelar</Button>
                <Button variant="destructive" onClick={confirmarExclusao} disabled={delExcluindo || delChecando}>
                  {delExcluindo ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Excluindo...</> : 'Excluir'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}