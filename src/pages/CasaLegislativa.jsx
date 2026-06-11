import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { Building2, Save, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/PageHeader';

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function CasaLegislativa() {
  const { withTenant, canQuery, tenantId } = useTenant();
  const [casa, setCasa] = useState(null);
  const [form, setForm] = useState({ nome: '', sigla: '', cnpj: '', endereco: '', cep: '', cidade: '', estado: '', telefone: '', email: '', site: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (canQuery) load(); }, [canQuery]);

  async function load() {
    const filter = withTenant();
    if (!filter) return;
    const list = await base44.entities.CasaLegislativa.filter(filter);
    if (list.length > 0) {
      setCasa(list[0]);
      setForm({
        nome: list[0].nome || '', sigla: list[0].sigla || '', cnpj: list[0].cnpj || '',
        endereco: list[0].endereco || '', cep: list[0].cep || '', cidade: list[0].cidade || '',
        estado: list[0].estado || '', telefone: list[0].telefone || '', email: list[0].email || '', site: list[0].site || ''
      });
    }
  }

  async function salvar() {
    setSaving(true);
    const data = { ...form, tenant_id: tenantId };
    if (casa) await base44.entities.CasaLegislativa.update(casa.id, data);
    else await base44.entities.CasaLegislativa.create(data);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  const f = (field) => ({ value: form[field], onChange: e => setForm(p => ({ ...p, [field]: e.target.value })) });

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <PageHeader icon={Building2} title="Casa Legislativa" subtitle="Dados institucionais da casa" />

      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
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
            <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
        <div className="flex justify-end pt-2">
          <Button onClick={salvar} disabled={saving || !form.nome} className="gap-2">
            <Save size={16} /> {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Dados'}
          </Button>
        </div>
      </div>
    </div>
  );
}