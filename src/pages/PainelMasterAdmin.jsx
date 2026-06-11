import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Search, LogIn, Plus, ShieldOff, Trash2, Shield, PlusCircle } from 'lucide-react';

const statusColor = { Ativa: 'default', Suspensa: 'secondary', Inativa: 'destructive' };

export default function PainelMasterAdmin() {
  const navigate = useNavigate();
  const { enterCamara } = useTenant();
  const [camaras, setCamaras] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Camara.list("-created_date", 200).then(setCamaras).finally(() => setLoading(false));
  }, []);

  const filtered = camaras.filter(c =>
    !search || c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    (c.municipio || '')?.toLowerCase().includes(search.toLowerCase()) ||
    (c.estado || '')?.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleStatus(camara) {
    const next = camara.status === 'Ativa' ? 'Suspensa' : 'Ativa';
    await base44.entities.Camara.update(camara.id, { status: next });
    setCamaras(cs => cs.map(c => c.id === camara.id ? { ...c, status: next } : c));
  }

  async function deleteCamara(camara) {
    if (!confirm(`Excluir "${camara.nome}"? Esta ação é irreversível.`)) return;
    await base44.entities.Camara.delete(camara.id);
    setCamaras(cs => cs.filter(c => c.id !== camara.id));
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Shield}
        title="Painel Master Admin"
        subtitle="Visão geral e gestão de todas as câmaras municipais"
        action={
          <Button onClick={() => navigate('/gerenciar-camaras')} className="gap-2">
            <PlusCircle size={16} /> Gerenciar Câmaras
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: camaras.length, color: "text-primary" },
          { label: "Ativas", value: camaras.filter(c => c.status === "Ativa").length, color: "text-green-600" },
          { label: "Suspensas", value: camaras.filter(c => c.status === "Suspensa").length, color: "text-yellow-600" },
          { label: "Inativas", value: camaras.filter(c => c.status === "Inativa").length, color: "text-red-500" },
        ].map(s => (
          <Card key={s.label}><CardContent className="pt-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar câmara por nome, município ou estado..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma câmara encontrada</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(camara => (
            <Card key={camara.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {camara.brasao_url
                      ? <img src={camara.brasao_url} alt="" className="w-8 h-8 object-contain" />
                      : <Building2 size={18} className="text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm leading-tight truncate">{camara.nome}</p>
                      <Badge variant={statusColor[camara.status] || 'secondary'} className="text-[10px] flex-shrink-0">
                        {camara.status || 'Ativa'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {[camara.municipio, camara.estado].filter(Boolean).join(', ') || '—'}
                      {camara.plano && <span className="ml-2 opacity-60">· {camara.plano}</span>}
                    </p>
                    <div className="flex items-center gap-1.5 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs gap-1"
                        onClick={() => enterCamara(camara)}
                      >
                        <LogIn size={12} /> Entrar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-yellow-600"
                        onClick={() => toggleStatus(camara)}
                        title={camara.status === 'Ativa' ? 'Suspender' : 'Reativar'}
                      >
                        <ShieldOff size={13} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteCamara(camara)}
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}