import { useEffect, useState } from 'react';
import { sislegisEntities } from '@/lib/sislegisApi';
import { useTenant } from '@/lib/TenantContext';
import { Calendar, Clock, Users, Plus, Pencil, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIPOS = ['Ordinária', 'Extraordinária', 'Solene', 'Especial'];
const STATUS_OPTS = ['Agendada', 'Em Andamento', 'Encerrada', 'Cancelada'];

const STATUS_COLOR = {
  'Agendada': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Em Andamento': 'bg-green-100 text-green-700 border-green-200',
  'Encerrada': 'bg-gray-100 text-gray-600 border-gray-200',
  'Cancelada': 'bg-red-100 text-red-600 border-red-200',
};

const emptyForm = {
  tipo: 'Ordinária', data: '', hora_inicio: '', hora_fim: '',
  local: '', status: 'Agendada', observacoes: '', ata: '',
  numero: '', sessao_legislativa_id: '', sessao_legislativa_numero: '',
  legislatura_id: '', legislatura_numero: '', pauta: [], presencas: [],
};

export default function Sessoes() {
  const { tenantId, withTenant, canQuery, isOperadorGeral, isPresidente } = useTenant();
  const [sessoes, setSessoes] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [sessoesLeg, setSessoesLeg] = useState([]);
  const [legislaturas, setLegislaturas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [tabAtiva, setTabAtiva] = useState('info');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const podeGerenciar = isOperadorGeral || isPresidente;

  useEffect(() => { if (canQuery) loadData(); }, [tenantId, canQuery]);

  async function loadData() {
    const filter = withTenant({});
    if (!filter) return;
    try { const s = await sislegisEntities.Sessao.filter(filter, '-data', 50); setSessoes(s); } catch (e) { console.error('Erro ao carregar sessões:', e); }
    try { const p = await sislegisEntities.Parlamentar.filter({ ...filter, ativo: true }); setParlamentares(p); } catch (e) { console.error('Erro ao carregar parlamentares:', e); }
    try { const m = await sislegisEntities.Materia.filter({ ...filter, status: 'Em tramitação' }); setMaterias(m); } catch (e) { console.error('Erro ao carregar matérias:', e); }
    try { const sl = await sislegisEntities.SessaoLegislativa.filter(filter); setSessoesLeg(sl); } catch (e) { console.error('Erro ao carregar sessões leg:', e); }
    try { const leg = await sislegisEntities.Legislatura.filter(filter); setLegislaturas(leg); } catch (e) { console.error('Erro ao carregar legislaturas:', e); }
  }

  function buildPresencas(existing) {
    if (existing?.length) return existing;
    return parlamentares.map(p => ({
      parlamentar_id: p.id,
      parlamentar_nome: p.nome_parlamentar || p.nome,
      partido_sigla: p.partido_sigla || '',
      foto_url: p.foto_url || '',
      presente: false,
    }));
  }

  function openNew() {
    setEditando(null);
    setForm({ ...emptyForm, presencas: buildPresencas([]) });
    setTabAtiva('info');
    setShowForm(true);
  }

  function openEdit(s) {
    setEditando(s);
    setForm({ ...emptyForm, ...s, presencas: buildPresencas(s.presencas) });
    setTabAtiva('info');
    setShowForm(true);
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleSessaoLeg(id) {
    const sl = sessoesLeg.find(s => s.id === id);
    setForm(f => ({ ...f, sessao_legislativa_id: id, sessao_legislativa_numero: sl?.numero || '' }));
  }

  function handleLegislatura(id) {
    const leg = legislaturas.find(l => l.id === id);
    setForm(f => ({ ...f, legislatura_id: id, legislatura_numero: leg?.numero || '' }));
  }

  async function salvar() {
    setSaving(true);
    setErrorMsg('');
    try {
      const num = editando?.numero || String(sessoes.filter(s => !editando || s.id !== editando.id).length + 1).padStart(3, '0');
      const data = { ...form, tenant_id: tenantId || '', numero: editando?.numero || num };
      if (editando) {
        await sislegisEntities.Sessao.update(editando.id, data);
      } else {
        await sislegisEntities.Sessao.create(data);
      }
      setShowForm(false);
      setErrorMsg('');
      loadData();
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao salvar sessão.');
    } finally {
      setSaving(false);
    }
  }

  function togglePresenca(id) {
    setForm(f => ({
      ...f,
      presencas: f.presencas.map(p => p.parlamentar_id === id ? { ...p, presente: !p.presente } : p),
    }));
  }

  function togglePauta(materia) {
    setForm(f => {
      const existe = f.pauta.find(p => p.materia_id === materia.id);
      if (existe) return { ...f, pauta: f.pauta.filter(p => p.materia_id !== materia.id) };
      return { ...f, pauta: [...f.pauta, { materia_id: materia.id, materia_ementa: materia.ementa, materia_tipo: materia.tipo, materia_numero: materia.numero || '', ordem: f.pauta.length + 1, votada: false }] };
    });
  }

  const presencasForm = form.presencas || [];
  const presentes = presencasForm.filter(p => p.presente).length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon={Calendar}
        title="Sessões Plenárias"
        subtitle={`${sessoes.length} sessão(ões) registrada(s)`}
        action={podeGerenciar && (
          <Button onClick={openNew} className="gap-2 shadow-lg shadow-primary/20">
            <Plus size={16} /> Nova Sessão
          </Button>
        )}
      />

      {sessoes.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <Calendar size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma sessão cadastrada ainda.</p>
          {podeGerenciar && (
            <Button onClick={openNew} variant="outline" className="mt-4 gap-2">
              <Plus size={16} /> Agendar sessão
            </Button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessoes.map((s) => (
            <div
              key={s.id}
              className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => podeGerenciar && openEdit(s)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                  <Calendar size={18} className="text-primary" />
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${STATUS_COLOR[s.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {s.status}
                </span>
              </div>
              <div className="font-heading font-semibold text-foreground">{s.numero ? `${s.numero}ª` : ''} Sessão {s.tipo}</div>
              {(s.sessao_legislativa_numero || s.legislatura_numero) && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {s.sessao_legislativa_numero ? `${s.sessao_legislativa_numero}ª Sessão Legislativa` : ''}
                  {s.sessao_legislativa_numero && s.legislatura_numero ? ' · ' : ''}
                  {s.legislatura_numero ? `${s.legislatura_numero}ª Legislatura` : ''}
                </div>
              )}
              <div className="mt-3 space-y-1">
                {s.data && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar size={13} />
                    {format(new Date(s.data + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                )}
                {s.hora_inicio && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock size={13} /> {s.hora_inicio}
                  </div>
                )}
                {s.presencas?.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users size={13} />
                    {s.presencas.filter(p => p.presente).length} presentes / {s.presencas.length} parlamentares
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editando ? 'Editar Sessão' : 'Nova Sessão Plenária'}</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-border">
            {[['info', 'Informações'], ['presenca', 'Presenças'], ['pauta', 'Pauta'], ['ata', 'Ata']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTabAtiva(key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tabAtiva === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {label}
                {key === 'presenca' && presentes > 0 && (
                  <span className="ml-1.5 bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">{presentes}</span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-4 py-2">
            {/* INFO */}
            {tabAtiva === 'info' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Número da Sessão</label>
                    <Input value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="001" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Tipo *</label>
                    <Select value={form.tipo} onValueChange={v => set('tipo', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Data *</label>
                    <Input type="date" value={form.data} onChange={e => set('data', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Hora de Início</label>
                    <Input type="time" value={form.hora_inicio} onChange={e => set('hora_inicio', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Hora de Fim</label>
                    <Input type="time" value={form.hora_fim} onChange={e => set('hora_fim', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Sessão Legislativa</label>
                    <Select value={form.sessao_legislativa_id || ''} onValueChange={handleSessaoLeg}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        {sessoesLeg.map(sl => (
                          <SelectItem key={sl.id} value={sl.id}>{sl.numero}ª Sessão Legislativa — {sl.ano}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Legislatura</label>
                    <Select value={form.legislatura_id || ''} onValueChange={handleLegislatura}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        {legislaturas.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.numero}ª Legislatura ({l.ano_inicio}–{l.ano_fim})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Status</label>
                    <Select value={form.status} onValueChange={v => set('status', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_OPTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Local</label>
                    <Input value={form.local} onChange={e => set('local', e.target.value)} placeholder="Plenário..." />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Observações</label>
                  <Textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} />
                </div>
              </>
            )}

            {/* PRESENÇAS */}
            {tabAtiva === 'presenca' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Marque os parlamentares presentes na sessão:</p>
                  <span className="text-sm font-semibold text-green-600">{presentes} / {presencasForm.length} presentes</span>
                </div>
                {presencasForm.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Nenhum parlamentar cadastrado.</p>
                ) : (
                  <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                    {presencasForm.map((p) => (
                      <div
                        key={p.parlamentar_id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${p.presente ? 'bg-green-50 dark:bg-green-950/20' : 'hover:bg-muted/40'}`}
                        onClick={() => togglePresenca(p.parlamentar_id)}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${p.presente ? 'bg-green-500 border-green-500' : 'border-border'}`}>
                          {p.presente && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        {p.foto_url ? (
                          <img src={p.foto_url} alt={p.parlamentar_nome} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                            {p.parlamentar_nome?.[0]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium block truncate">{p.parlamentar_nome}</span>
                          {p.partido_sigla && <span className="text-xs text-muted-foreground">{p.partido_sigla}</span>}
                        </div>
                        {p.presente && <span className="ml-auto text-xs text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 size={12} /> Presente</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PAUTA */}
            {tabAtiva === 'pauta' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Selecione as matérias em pauta desta sessão:</p>
                {materias.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma matéria em tramitação.</p>
                ) : (
                  <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                    {materias.map((m) => {
                      const sel = form.pauta.find(p => p.materia_id === m.id);
                      return (
                        <div
                          key={m.id}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${sel ? 'bg-accent' : 'hover:bg-muted/40'}`}
                          onClick={() => togglePauta(m)}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${sel ? 'bg-primary border-primary' : 'border-border'}`}>
                            {sel && <CheckCircle2 size={11} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{m.ementa}</div>
                            <div className="text-xs text-muted-foreground">{m.tipo}{m.numero ? ` nº ${m.numero}` : ''}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ATA */}
            {tabAtiva === 'ata' && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ata da Sessão</label>
                <Textarea value={form.ata} onChange={e => set('ata', e.target.value)} placeholder="Registro dos acontecimentos da sessão..." rows={12} />
              </div>
            )}
          </div>

          {errorMsg && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{errorMsg}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setErrorMsg(''); }}>Cancelar</Button>
            <Button onClick={salvar} disabled={!form.tipo || !form.data || saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}