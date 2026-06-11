import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { Building2, Search, LogIn, Edit2, ShieldOff, Trash2, Plus, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const statusColor = { Ativa: 'bg-green-500/15 text-green-400', Suspensa: 'bg-yellow-500/15 text-yellow-400', Inativa: 'bg-red-500/15 text-red-400' };

export default function PainelMasterAdmin() {
  const { enterCamara } = useTenant();
  const [camaras, setCamaras] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Camara.list().then(setCamaras).finally(() => setLoading(false));
  }, []);

  const filtered = camaras.filter(c =>
    !search || c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.municipio?.toLowerCase().includes(search.toLowerCase()) ||
    c.estado?.toLowerCase().includes(search.toLowerCase())
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
    <div className="min-h-screen bg-[hsl(220,30%,8%)] text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
            <Shield size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Painel Master Admin</h1>
            <p className="text-xs text-white/40">Gerenciamento global de câmaras municipais</p>
          </div>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus size={14} /> Nova Câmara
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 px-6 py-5">
        {[
          { label: 'Total de Câmaras', value: camaras.length, color: 'text-blue-400' },
          { label: 'Ativas', value: camaras.filter(c => c.status === 'Ativa').length, color: 'text-green-400' },
          { label: 'Suspensas / Inativas', value: camaras.filter(c => c.status !== 'Ativa').length, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-xs text-white/40">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="px-6 pb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <Input
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500"
            placeholder="Buscar câmara por nome, município ou estado..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
        {loading ? (
          <div className="flex justify-center pt-12">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center pt-12 text-white/30">
            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
            <p>Nenhuma câmara encontrada</p>
          </div>
        ) : filtered.map(camara => (
          <div key={camara.id} className="flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-4 py-3 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                {camara.brasao_url
                  ? <img src={camara.brasao_url} alt="" className="w-7 h-7 object-contain" />
                  : <Building2 size={16} className="text-blue-400" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{camara.nome}</p>
                <p className="text-xs text-white/40 truncate">
                  {[camara.municipio, camara.estado].filter(Boolean).join(', ')}
                  {camara.plano && <span className="ml-2 opacity-60">· {camara.plano}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor[camara.status] || statusColor.Ativa}`}>
                {camara.status || 'Ativa'}
              </span>
              <Button
                size="sm"
                className="h-7 px-3 text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 gap-1"
                onClick={() => enterCamara(camara)}
              >
                <LogIn size={12} /> Entrar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-white/40 hover:text-yellow-400 hover:bg-yellow-500/10"
                onClick={() => toggleStatus(camara)}
                title={camara.status === 'Ativa' ? 'Suspender' : 'Reativar'}
              >
                <ShieldOff size={13} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => deleteCamara(camara)}
                title="Excluir"
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}