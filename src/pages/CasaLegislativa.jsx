import { useEffect, useState } from 'react';
import { sislegisEntities } from '@/lib/sislegisApi';
import { useTenant } from '@/lib/TenantContext';
import { Building2, Save, Pencil, Sun, Moon, LayoutDashboard, Check, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import { PALETAS, aplicarPaleta, useTema, setTema } from '@/lib/theme';

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function CasaLegislativa() {
  const { withTenant, canQuery, tenantId, camara } = useTenant();
  const tema = useTema();
  const [paletaSel, setPaletaSel] = useState('azul');
  const [salvandoPaleta, setSalvandoPaleta] = useState(false);
  const [casa, setCasa] = useState(null);
  const [form, setForm] = useState({ nome: '', sigla: '', cnpj: '', endereco: '', cep: '', cidade: '', estado: '', telefone: '', email: '', site: '', brasao_url: '', logotipo_url: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editando, setEditando] = useState(false);

  // Recarrega quando a câmara fica disponível, para conseguir pré-preencher
  useEffect(() => { if (canQuery) load(); }, [canQuery, camara]);

  async function load() {
    const filter = withTenant();
    if (!filter) return;
    const list = await sislegisEntities.CasaLegislativa.filter(filter);
    if (list && list.length > 0) {
      const c = list[0];
      setCasa(c);
      setEditando(false);
      setForm({
        nome: c.nome || '', sigla: c.sigla || '', cnpj: c.cnpj || '',
        endereco: c.endereco || '', cep: c.cep || '', cidade: c.cidade || '',
        estado: c.estado || '', telefone: c.telefone || '', email: c.email || '', site: c.site || '',
        brasao_url: c.brasao_url || camara?.brasao_url || '', logotipo_url: c.logotipo_url || camara?.logotipo_url || '',
      });
    } else if (camara) {
      // Ainda não há registro da Casa Legislativa: pré-preenche com os dados do
      // cadastro da câmara (feito pelo Super Admin). Já entra em modo de edição
      // para o usuário apenas revisar e salvar. Só preenche campos vazios.
      setEditando(true);
      setForm(f => ({
        ...f,
        nome: f.nome || camara.nome || '',
        sigla: f.sigla || camara.sigla || '',
        cnpj: f.cnpj || camara.cnpj || '',
        endereco: f.endereco || camara.endereco || '',
        cidade: f.cidade || camara.cidade || camara.municipio || '',
        estado: f.estado || camara.estado || '',
        telefone: f.telefone || camara.telefone || '',
        email: f.email || camara.email || '',
        site: f.site || camara.site || '',
        brasao_url: f.brasao_url || camara.brasao_url || '',
        logotipo_url: f.logotipo_url || camara.logotipo_url || '',
      }));
    }
  }

  async function salvar() {
    setSaving(true);
    const data = { ...form, tenant_id: tenantId };
    if (casa) await sislegisEntities.CasaLegislativa.update(casa.id, data);
    else await sislegisEntities.CasaLegislativa.create(data);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  const f = (field) => ({ value: form[field], disabled: !editando, onChange: e => setForm(p => ({ ...p, [field]: e.target.value })) });

  // Paleta da câmara (vale para todos os usuários desta câmara)
  useEffect(() => { if (camara?.paleta) setPaletaSel(camara.paleta); }, [camara?.paleta]);

  async function escolherPaleta(v) {
    setPaletaSel(v);
    aplicarPaleta(v); // aplica na hora (preview)
    if (!tenantId) return;
    setSalvandoPaleta(true);
    try { await sislegisEntities.Camara.update(tenantId, { paleta: v }); }
    catch (e) { /* mantém o preview mesmo se o salvamento falhar */ }
    finally { setSalvandoPaleta(false); }
  }

  const MODOS = [
    { v: 'claro', label: 'Claro', Icon: Sun },
    { v: 'mesclado', label: 'Mesclado', Icon: LayoutDashboard },
    { v: 'escuro', label: 'Escuro', Icon: Moon },
  ];

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <PageHeader icon={Building2} title="Casa Legislativa" subtitle="Dados institucionais da casa" />

      {/* Aparência — paleta da câmara + modo */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Palette size={18} className="text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Aparência do sistema</h3>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-3">
            <strong className="text-foreground font-medium">Cor da câmara</strong> — define a cor de destaque do site para todos os usuários desta câmara. As cores ficam nos detalhes (base sempre bege/off-white); nada exagerado.
            {salvandoPaleta && <span className="ml-2 text-xs">salvando…</span>}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PALETAS.map((p) => (
              <button
                key={p.v}
                type="button"
                onClick={() => escolherPaleta(p.v)}
                className={cn(
                  'text-left rounded-xl border p-4 flex items-start gap-3 transition-colors',
                  paletaSel === p.v ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-border hover:bg-muted'
                )}
              >
                <span className="w-8 h-8 rounded-lg flex-shrink-0 ring-1 ring-black/10" style={{ backgroundColor: p.cor }} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                    {p.label}
                    {paletaSel === p.v && <Check size={14} className="text-primary" />}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{p.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">
            <strong className="text-foreground font-medium">Modo de exibição</strong> — preferência deste dispositivo.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MODOS.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setTema(o.v)}
                className={cn(
                  'text-left rounded-xl border p-4 transition-colors',
                  tema === o.v ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-border hover:bg-muted'
                )}
              >
                <o.Icon size={20} className={tema === o.v ? 'text-primary' : 'text-muted-foreground'} />
                <div className="font-medium text-sm mt-2 text-foreground">{o.label}</div>
                <div className="text-xs text-muted-foreground">
                  {o.v === 'claro' ? 'Tudo claro' : o.v === 'mesclado' ? 'Site claro, painel escuro' : 'Tudo escuro'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        {(form.brasao_url || form.logotipo_url) && (
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <img src={form.brasao_url || form.logotipo_url} alt="Brasão" className="w-16 h-16 object-contain rounded-lg bg-muted/40 p-1 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">Brasão da câmara. Para alterá-lo, edite o cadastro da câmara pelo Super Admin.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1.5 block">Nome da Instituição *</label>
            <Input {...f('nome')} placeholder="Câmara Municipal de..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Sigla</label>
            <Input {...f('sigla')} placeholder="CMXXX" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">CNPJ</label>
          <Input {...f('cnpj')} placeholder="00.000.000/0000-00" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Endereço</label>
          <Input {...f('endereco')} placeholder="Rua, nº, Bairro" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">CEP</label>
            <Input {...f('cep')} placeholder="00000-000" />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium mb-1.5 block">Cidade</label>
            <Input {...f('cidade')} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Estado</label>
            <select value={form.estado} disabled={!editando} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed">
              <option value="">UF</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Telefone</label>
            <Input {...f('telefone')} placeholder="(00) 0000-0000" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">E-mail</label>
            <Input type="email" {...f('email')} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Site</label>
            <Input {...f('site')} placeholder="https://..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          {editando ? (
            <>
              {casa && (
                <Button variant="outline" onClick={() => { setEditando(false); load(); }} disabled={saving}>
                  Cancelar
                </Button>
              )}
              <Button onClick={salvar} disabled={saving || !form.nome} className="gap-2">
                <Save size={16} /> {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Dados'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditando(true)} className="gap-2">
              <Pencil size={16} /> Editar Dados
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}