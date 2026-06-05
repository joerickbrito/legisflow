import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Calendar, Clock, Users, FileText, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIPOS = ['Ordinária', 'Extraordinária', 'Solene', 'Especial', 'Itinerante'];
const STATUS_OPTS = ['Agendada', 'Em Andamento', 'Encerrada', 'Cancelada'];

export default function Sessoes() {
  const [sessoes, setSessoes] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [tabAtiva, setTabAtiva] = useState('info');
  const [form, setForm] = useState({ tipo: 'Ordinária', data: '', hora_inicio: '', hora_fim: '', status: 'Agendada', observacoes: '', ata: '', pauta: [], presencas: [] });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [s, p, m] = await Promise.all([
      base44.entities.Sessao.list('-data', 50),
      base44.entities.Parlamentar.filter({ ativo: true }),
      base44.entities.Materia.filter({ status: 'Em tramitação' }),
    ]);
    setSessoes(s);
    setParlamentares(p);
    setMaterias(m);
  }

  function openNew() {
    setEditando(null);
    setForm({ tipo: 'Ordinária', data: '', hora_inicio: '', hora_fim: '', status: 'Agendada', observacoes: '', ata: '', pauta: [], presencas: parlamentares.map(p => ({ parlamentar_id: p.id, parlamentar_nome: p.nome, presente: false })) });
    setTabAtiva('info');
    setShowForm(true);
  }

  function openEdit(s) {
    setEditando(s);
    setForm({ tipo: s.tipo, data: s.data || '', hora_inicio: s.hora_inicio || '', hora_fim: s.hora_fim || '', status: s.status, observacoes: s.observacoes || '', ata: s.ata || '', pauta: s.pauta || [], presencas: s.presencas?.length ? s.presencas : parlamentares.map(p => ({ parlamentar_id: p.id, parlamentar_nome: p.nome, presente: false })) });
    setTabAtiva('info');
    setShowForm(true);
  }

  async function salvar() {
    if (editando) {
      await base44.entities.Sessao.update(editando.id, form);
    } else {
      await base44.entities.Sessao.create({ ...form, numero: String(sessoes.length + 1) });
    }
    setShowForm(false);
    loadData();
  }

  function togglePresenca(id) {
    setForm(f => ({ ...f, presencas: f.presencas.map(p => p.parlamentar_id === id ? { ...p, presente: !p.presente } : p) }));
  }

  function togglePauta(materia) {
    setForm(f => {
      const existe = f.pauta.find(p => p.materia_id === materia.id);
      if (existe) return { ...f, pauta: f.pauta.filter(p => p.materia_id !== materia.id) };
      return { ...f, pauta: [...f.pauta, { materia_id: materia.id, materia_ementa: materia.ementa, materia_tipo: materia.tipo, ordem: f.pauta.length + 1 }] };
    });
  }

  const statusColor = {
    'Agendada': 'bg-yellow-100 text-yellow-700',
    'Em Andamento': 'bg-green-100 text-green-700',
    'Encerrada': 'bg-gray-100 text-gray-600',
    'Cancelada': 'bg-red-100 text-red-600',
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Sessões Plenárias</h1>
          <p className="text-muted-foreground mt-1">{sessoes.length} sessão(ões) registrada(s)</p>
        </div>
        <Button onClick={openNew} className="gap-2 shadow-lg shadow-primary/20">
          <Plus size={18} /> Nova Sessão
        </Button>
      </div>

      {/* Cards de sessões */}
      {sessoes.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <Calendar size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma sessão cadastrada ainda.</p>
          <Button onClick={openNew} variant="outline" className="mt-4 gap-2"><Plus size={16} /> Agendar sessão</Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessoes.map((s) => (
            <div key={s.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => openEdit(s)}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                  <Calendar size={18} className="text-primary" />
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColor[s.status]}`}>{s.status}</span>
              </div>
              <div className="font-heading font-semibold text-foreground">{s.tipo}</div>
              {s.numero && <div className="text-xs text-muted-foreground">Sessão nº {s.numero}</div>}
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
                {s.pauta?.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText size={13} /> {s.pauta.length} matéria(s) em pauta
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editando ? 'Editar Sessão' : 'Nova Sessão Plenária'}</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-border pb-0 -mb-2">
            {[['info', 'Informações'], ['pauta', 'Pauta'], ['presenca', 'Presenças'], ['ata', 'Ata']].map(([key, label]) => (
              <button key={key} onClick={() => setTabAtiva(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tabAtiva === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-4 py-2">
            {tabAtiva === 'info' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Tipo *</label>
                    <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Status</label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_OPTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Data *</label>
                    <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Hora de Início</label>
                    <Input type="time" value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Hora de Fim</label>
                    <Input type="time" value={form.hora_fim} onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Observações</label>
                  <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} />
                </div>
              </>
            )}

            {tabAtiva === 'pauta' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Selecione as matérias que farão parte da pauta desta sessão:</p>
                {materias.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">Nenhuma matéria em tramitação.</p>
                ) : (
                  <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                    {materias.map((m) => {
                      const selecionada = form.pauta.find(p => p.materia_id === m.id);
                      return (
                        <div key={m.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selecionada ? 'bg-accent' : 'hover:bg-muted/40'}`} onClick={() => togglePauta(m)}>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selecionada ? 'bg-primary border-primary' : 'border-border'}`}>
                            {selecionada && <CheckSquare size={12} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{m.ementa}</div>
                            <div className="text-xs text-muted-foreground">{m.tipo}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tabAtiva === 'presenca' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Registre a presença dos parlamentares:</p>
                <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                  {form.presencas.map((p) => (
                    <div key={p.parlamentar_id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${p.presente ? 'bg-green-50' : 'hover:bg-muted/40'}`} onClick={() => togglePresenca(p.parlamentar_id)}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${p.presente ? 'bg-green-500 border-green-500' : 'border-border'}`}>
                        {p.presente && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <span className="text-sm font-medium">{p.parlamentar_nome}</span>
                      {p.presente && <span className="ml-auto text-xs text-green-600 font-semibold">Presente</span>}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  {form.presencas.filter(p => p.presente).length} de {form.presencas.length} parlamentares presentes
                </div>
              </div>
            )}

            {tabAtiva === 'ata' && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ata da Sessão</label>
                <Textarea value={form.ata} onChange={e => setForm(f => ({ ...f, ata: e.target.value }))} placeholder="Registro dos acontecimentos da sessão..." rows={10} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!form.tipo || !form.data}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}