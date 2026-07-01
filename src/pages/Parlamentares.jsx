import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { sislegisEntities, criarUsuario, validarSenhaForte } from '@/lib/sislegisApi';
import { useTenant } from '@/lib/TenantContext';
import { useAuth } from '@/lib/AuthContext';
import { Plus, Users, Search, Upload, Camera, UserPlus, Link, Unlink, ExternalLink, Key, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/PageHeader';
import LoadingState from '@/components/LoadingState';
import { useExclusaoSegura } from '@/components/ExclusaoSegura';

const SITUACOES = ['Ativo', 'Licenciado', 'Afastado'];
const TIPOS = ['Titular', 'Suplente'];
const CARGOS = ['Vereador', 'Presidente', 'Vice-Presidente', '1º Secretário', '2º Secretário'];
const PARLAMENTAR_ROLES = ['VEREADOR', 'PRESIDENTE'];

export default function Parlamentares() {
  const { tenantId, withTenant, canQuery, isAdminCamara } = useTenant();
  const { pode } = useAuth();
  const podeCriar = pode('parlamentares_criar');
  const podeExcluir = pode('parlamentares_excluir');
  const [parlamentares, setParlamentares] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [legislaturas, setLegislaturas] = useState([]);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { pedirExclusao, dialogExclusao } = useExclusaoSegura({ withTenant, onExcluido: () => loadData() });
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);
  // Estados do vínculo com usuário
  const [usuarios, setUsuarios] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('VEREADOR');
  const [creatingUser, setCreatingUser] = useState(false);
  const [userFormError, setUserFormError] = useState('');
  const [linkExistingId, setLinkExistingId] = useState('');

  const emptyForm = {
    nome: '', nome_parlamentar: '', cpf: '', email: '', telefone: '',
    foto_url: '', partido_id: '', partido_sigla: '', cargo: 'Vereador',
    tipo: 'Titular', situacao: 'Ativo', data_posse: '', gabinete: '',
    legislatura_id: '', legislatura_numero: '',
    ativo: true, tenant_id: tenantId || '',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { if (canQuery) loadData(); }, [tenantId, canQuery]);

  async function loadData() {
    const filter = withTenant({});
    if (!filter) { setLoading(false); return; }
    setLoading(true);
    try {
    const [p, part, legs, usrs] = await Promise.all([
      sislegisEntities.Parlamentar.filter(filter, 'nome', 100).catch(() => []),
      sislegisEntities.Partido.filter(filter, 'sigla', 50).catch(() => []),
      sislegisEntities.Legislatura.filter(filter, '-numero', 20).catch(() => []),
      sislegisEntities.UsuarioSislegis.filter(filter, 'nome', 500).catch(() => []),
    ]);
    setParlamentares(p);
    setPartidos(part);
    setLegislaturas(legs);
    setUsuarios(usrs || []);
    } finally {
      setLoading(false);
    }
  }

  // Mapa: parlamentar_id → usuário vinculado
  const vinculadosMap = {};
  usuarios.forEach(u => {
    if (u.parlamentar_id) vinculadosMap[u.parlamentar_id] = u;
  });

  // Usuários da mesma câmara sem parlamentar_id (disponíveis para vínculo)
  const usuariosDisponiveis = usuarios.filter(
    u => !u.parlamentar_id && PARLAMENTAR_ROLES.includes(u.role)
  );

  function openNew() {
    setEditando(null);
    setForm({ ...emptyForm, tenant_id: tenantId || '' });
    setShowUserForm(false);
    setNewUserUsername(''); setNewUserPassword(''); setNewUserRole('VEREADOR');
    setUserFormError(''); setLinkExistingId('');
    setShowForm(true);
  }

  function openEdit(p) {
    setEditando(p);
    setForm({ ...emptyForm, ...p });
    setShowUserForm(false);
    setNewUserUsername(''); setNewUserPassword('');
    setNewUserRole(p.cargo === 'Presidente' ? 'PRESIDENTE' : 'VEREADOR');
    setUserFormError(''); setLinkExistingId('');
    setShowForm(true);
  }

  async function handleFotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, foto_url: file_url }));
    setUploading(false);
  }

  function onPartidoChange(partidoId) {
    const partido = partidos.find(p => p.id === partidoId);
    setForm(f => ({ ...f, partido_id: partidoId, partido_sigla: partido?.sigla || '' }));
  }

  async function salvar() {
    setSaving(true);
    setErrorMsg('');
    try {
      const data = { ...form, ativo: form.situacao === 'Ativo' };
      if (editando) await sislegisEntities.Parlamentar.update(editando.id, data);
      else await sislegisEntities.Parlamentar.create(data);
      setShowForm(false);
      setErrorMsg('');
      loadData();
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao salvar parlamentar.');
    } finally {
      setSaving(false);
    }
  }

  // Criar usuário para o parlamentar atual
  async function handleCreateUser() {
    if (!newUserUsername.trim() || !newUserPassword.trim()) {
      setUserFormError('Preencha username e senha.');
      return;
    }
    const erroSenha = validarSenhaForte(newUserPassword);
    if (erroSenha) {
      setUserFormError(erroSenha);
      return;
    }
    setCreatingUser(true);
    setUserFormError('');
    try {
      const parlamentar = editando || form;
      const nome = parlamentar.nome_parlamentar || parlamentar.nome;
      await criarUsuario({
        username: newUserUsername.trim().toLowerCase(),
        nome,
        role: newUserRole,
        tenant_id: tenantId,
        senha: newUserPassword,
        status: 'Pendente de Ativação',
        senha_temporaria: true,
        parlamentar_id: editando?.id || null,
        foto_url: parlamentar.foto_url || '',
        partido_id: parlamentar.partido_id || '',
        partido_sigla: parlamentar.partido_sigla || '',
        cargo: parlamentar.cargo || '',
      });
      setShowUserForm(false);
      setNewUserUsername(''); setNewUserPassword('');
      loadData();
    } catch (e) {
      setUserFormError(e?.message || 'Erro ao criar usuário.');
    } finally {
      setCreatingUser(false);
    }
  }

  // Vincular usuário existente
  async function handleLinkExisting() {
    if (!linkExistingId) return;
    setSaving(true);
    setErrorMsg('');
    try {
      const usuario = usuarios.find(u => u.id === linkExistingId);
      await sislegisEntities.UsuarioSislegis.update(linkExistingId, {
        parlamentar_id: editando?.id,
        foto_url: form.foto_url || usuario?.foto_url,
        partido_id: form.partido_id || usuario?.partido_id,
        partido_sigla: form.partido_sigla || usuario?.partido_sigla,
      });
      setLinkExistingId('');
      loadData();
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao vincular usuário.');
    } finally {
      setSaving(false);
    }
  }

  // Desvincular usuário
  async function handleUnlink(usuarioId) {
    if (!confirm('Desvincular este usuário do parlamentar? O login será mantido, apenas o vínculo será removido.')) return;
    setSaving(true);
    setErrorMsg('');
    try {
      await sislegisEntities.UsuarioSislegis.update(usuarioId, { parlamentar_id: null });
      loadData();
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao desvincular usuário.');
    } finally {
      setSaving(false);
    }
  }

  const filtrados = parlamentares.filter(p =>
    (p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    p.nome_parlamentar?.toLowerCase().includes(busca.toLowerCase()) ||
    p.partido_sigla?.toLowerCase().includes(busca.toLowerCase()))
  );

  const cargoOrder = { 'Presidente': 0, 'Vice-Presidente': 1, '1º Secretário': 2, '2º Secretário': 3, 'Vereador': 4 };
  const sorted = [...filtrados].sort((a, b) => (cargoOrder[a.cargo] ?? 5) - (cargoOrder[b.cargo] ?? 5));

  const situacaoColor = { 'Ativo': 'bg-green-100 text-green-700', 'Licenciado': 'bg-yellow-100 text-yellow-700', 'Afastado': 'bg-red-100 text-red-700' };
  const roleBadgeColor = { 'VEREADOR': 'bg-green-100 text-green-700', 'PRESIDENTE': 'bg-amber-100 text-amber-700' };
  const statusBadge = { 'Pendente de Ativação': 'outline', 'Ativo': 'default', 'Inativo': 'secondary', 'Bloqueado': 'destructive' };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon={Users}
        title="Parlamentares"
        subtitle={`${parlamentares.filter(p => p.situacao === 'Ativo' || p.ativo !== false).length} ativos`}
        action={podeCriar && <Button onClick={openNew} className="gap-2 shadow-lg shadow-primary/20"><Plus size={16} /> Novo Parlamentar</Button>}
      />

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou partido..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <LoadingState label="Carregando parlamentares..." />
      ) : sorted.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <Users size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum parlamentar cadastrado ainda.</p>
          {podeCriar && <Button onClick={openNew} variant="outline" className="mt-4 gap-2"><Plus size={16} /> Cadastrar parlamentar</Button>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {sorted.map((p) => {
            const vinculado = vinculadosMap[p.id];
            return (
            <div
              key={p.id}
              onClick={() => openEdit(p)}
              className={`group relative flex items-center gap-3 bg-card border border-border rounded-xl p-3 cursor-pointer card-elevated hover:shadow-md hover:border-primary/30 transition-all ${
                p.cargo === 'Presidente' ? 'border-l-4 border-l-amber-400' :
                p.cargo === 'Vice-Presidente' ? 'border-l-4 border-l-orange-400' : ''
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {p.foto_url ? (
                  <img src={p.foto_url} alt={p.nome_parlamentar || p.nome} className="w-14 h-14 rounded-xl object-cover object-top border border-border" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center">
                    <span className="text-xl font-heading font-bold text-primary/50">{(p.nome_parlamentar || p.nome)?.charAt(0)}</span>
                  </div>
                )}
                {vinculado && (
                  <span title="Possui acesso ao sistema" className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center ring-2 ring-card">
                    <UserPlus size={10} />
                  </span>
                )}
              </div>

              {/* Informações */}
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-bold text-foreground text-sm leading-tight truncate">
                  {p.nome_parlamentar || p.nome}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {p.partido_sigla || 'Sem partido'}{p.cargo ? ` · ${p.cargo}` : ''}
                </p>
                {((p.cargo && p.cargo !== 'Vereador') || p.tipo === 'Suplente' || (p.situacao && p.situacao !== 'Ativo')) && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {p.cargo && p.cargo !== 'Vereador' && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        p.cargo === 'Presidente' ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100' :
                        p.cargo === 'Vice-Presidente' ? 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-100' :
                        'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100'
                      }`}>{p.cargo}</span>
                    )}
                    {p.tipo === 'Suplente' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200">Suplente</span>
                    )}
                    {p.situacao && p.situacao !== 'Ativo' && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${situacaoColor[p.situacao] || 'bg-slate-100 text-slate-600'}`}>{p.situacao}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Botão excluir */}
              {podeExcluir && (
                <button
                  onClick={(e) => { e.stopPropagation(); pedirExclusao('Parlamentar', p, p.nome_parlamentar || p.nome); }}
                  className="flex-shrink-0 w-8 h-8 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  title="Excluir parlamentar"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )})}
        </div>
      )}

      {/* Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editando ? 'Editar Parlamentar' : 'Novo Parlamentar'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Foto */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden flex-shrink-0">
                {form.foto_url ? (
                  <img src={form.foto_url} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={24} className="text-muted-foreground" />
                )}
                <input type="file" accept="image/*" onChange={handleFotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Foto do Parlamentar</p>
                <p className="text-xs text-muted-foreground">Clique na imagem para fazer upload. Obrigatória para vereadores.</p>
                {uploading && <p className="text-xs text-primary mt-1">Enviando...</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome Completo *</label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome Político</label>
                <Input value={form.nome_parlamentar} onChange={e => setForm(f => ({ ...f, nome_parlamentar: e.target.value }))} placeholder="Como será exibido" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Partido</label>
                {partidos.length > 0 ? (
                  <Select value={form.partido_id} onValueChange={onPartidoChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{partidos.map(p => <SelectItem key={p.id} value={p.id}>{p.sigla} — {p.nome}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={form.partido_sigla} onChange={e => setForm(f => ({ ...f, partido_sigla: e.target.value }))} placeholder="Sigla do partido" />
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Cargo</label>
                <Select value={form.cargo} onValueChange={v => setForm(f => ({ ...f, cargo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CARGOS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tipo</label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Situação</label>
                <Select value={form.situacao} onValueChange={v => setForm(f => ({ ...f, situacao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SITUACOES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">E-mail</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Telefone</label>
                <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Data de Posse</label>
                <Input type="date" value={form.data_posse} onChange={e => setForm(f => ({ ...f, data_posse: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">CPF</label>
                <Input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
              </div>
            </div>

            {legislaturas.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Legislatura Vinculada</label>
                <Select value={form.legislatura_id} onValueChange={v => {
                  const leg = legislaturas.find(l => l.id === v);
                  setForm(f => ({ ...f, legislatura_id: v, legislatura_numero: leg?.numero || '' }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione a legislatura..." /></SelectTrigger>
                  <SelectContent>
                    {legislaturas.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.numero}ª Legislatura{(l.ano_inicio && l.ano_fim) ? ` (${l.ano_inicio}–${l.ano_fim})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* ===== SEÇÃO: ACESSO AO SISTEMA (apenas na edição) ===== */}
            {editando && (
              <div className="border-t border-border pt-4 mt-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Key size={14} className="text-primary" />
                  Acesso ao Sistema
                </h3>

                {(() => {
                  const vinculado = vinculadosMap[editando.id];

                  // CENÁRIO 1: Já tem usuário vinculado
                  if (vinculado) {
                    return (
                      <div className="bg-muted/40 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{vinculado.username}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleBadgeColor[vinculado.role] || 'bg-gray-100 text-gray-600'}`}>
                                {vinculado.role === 'PRESIDENTE' ? 'Presidente' : 'Vereador'}
                              </span>
                              <Badge variant={statusBadge[vinculado.status] || 'secondary'} className="text-[10px]">{vinculado.status || 'Ativo'}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1"
                              onClick={() => handleUnlink(vinculado.id)}
                              disabled={saving}
                            >
                              <Unlink size={12} /> Desvincular
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Usuário vinculado. Gerencie senha e permissões em <strong>Usuários da Câmara</strong>.
                        </p>
                      </div>
                    );
                  }

                  // CENÁRIO 2: Sem vínculo — opções para criar ou vincular
                  return (
                    <div className="space-y-3">
                      {/* Opção A: Criar novo acesso */}
                      {!showUserForm ? (
                        <div className="space-y-3">
                          <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => { setShowUserForm(true); setLinkExistingId(''); }}
                          >
                            <UserPlus size={14} /> Criar acesso para este parlamentar
                          </Button>

                          {/* Opção B: Vincular existente */}
                          {usuariosDisponiveis.length > 0 && (
                            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                              <p className="text-xs text-muted-foreground">Ou vincular um usuário já existente:</p>
                              <div className="flex gap-2">
                                <Select value={linkExistingId} onValueChange={setLinkExistingId}>
                                  <SelectTrigger className="flex-1 h-8 text-xs">
                                    <SelectValue placeholder="Selecione o usuário..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {usuariosDisponiveis.map(u => (
                                      <SelectItem key={u.id} value={u.id}>
                                        {u.username} — {u.nome || u.full_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  className="h-8 text-xs gap-1"
                                  disabled={!linkExistingId || saving}
                                  onClick={handleLinkExisting}
                                >
                                  <Link size={12} /> Vincular
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Mini-formulário de criação de usuário */
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                          <p className="text-sm font-medium">Novo acesso para: <strong>{editando.nome_parlamentar || editando.nome}</strong></p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">Username *</label>
                              <Input
                                value={newUserUsername}
                                onChange={e => setNewUserUsername(e.target.value)}
                                placeholder="vereador.nome"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">Senha temporária *</label>
                              <Input
                                type="password"
                                value={newUserPassword}
                                onChange={e => setNewUserPassword(e.target.value)}
                                placeholder="Mín. 8, com letras e números"
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">Perfil</label>
                            <Select value={newUserRole} onValueChange={setNewUserRole}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="VEREADOR">Vereador</SelectItem>
                                <SelectItem value="PRESIDENTE">Presidente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {userFormError && <p className="text-xs text-destructive">{userFormError}</p>}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => { setShowUserForm(false); setUserFormError(''); }}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1"
                              onClick={handleCreateUser}
                              disabled={creatingUser}
                            >
                              {creatingUser ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                              {creatingUser ? 'Criando...' : 'Criar Usuário'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          {errorMsg && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{errorMsg}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setErrorMsg(''); }}>Cancelar</Button>
            <Button onClick={salvar} disabled={!form.nome || saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {dialogExclusao}
    </div>
  );
}