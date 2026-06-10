import { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const TenantContext = createContext(null);

// Role hierarchy and permissions
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',       // Master admin — acesso total
  ADMIN_CAMARA: 'ADMIN_CAMARA',     // Admin da câmara — gestão total da câmara
  OPERADOR_GERAL: 'OPERADOR_GERAL', // Acesso operacional completo, sem alterar cadastros estruturais
  PRESIDENTE: 'PRESIDENTE',         // Vereador presidente — desempate
  VEREADOR: 'VEREADOR',            // Acesso ao painel de votação e consulta
  // Legados (manter para compatibilidade)
  SECRETARIA_LEGISLATIVA: 'SECRETARIA_LEGISLATIVA',
  PROTOCOLO: 'PROTOCOLO',
  COMISSAO: 'COMISSAO',
  RELATOR: 'RELATOR',
  CONSULTA_PUBLICA: 'CONSULTA_PUBLICA',
};

export const ROLE_LABELS = {
  SUPER_ADMIN: 'Master Admin',
  ADMIN_CAMARA: 'Admin da Câmara',
  OPERADOR_GERAL: 'Operador Geral',
  PRESIDENTE: 'Presidente',
  VEREADOR: 'Vereador',
  // Legados
  SECRETARIA_LEGISLATIVA: 'Secretaria Legislativa',
  PROTOCOLO: 'Protocolo',
  COMISSAO: 'Comissão',
  RELATOR: 'Relator',
  CONSULTA_PUBLICA: 'Consulta Pública',
};

const OPERACIONAL = [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA, ROLES.OPERADOR_GERAL, ROLES.SECRETARIA_LEGISLATIVA];

export const PERMISSIONS = {
  // Admin permissions
  MANAGE_CAMARAS: [ROLES.SUPER_ADMIN],
  MANAGE_USERS: [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA],
  MANAGE_CONFIG: [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA],
  VIEW_REPORTS: [...OPERACIONAL],

  // Legislative process
  CREATE_MATERIA: [...OPERACIONAL, ROLES.PROTOCOLO],
  EDIT_MATERIA: [...OPERACIONAL],
  TRAMITAR_MATERIA: [...OPERACIONAL],
  DELETE_MATERIA: [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA],

  // Sessions
  MANAGE_SESSAO: [...OPERACIONAL, ROLES.PRESIDENTE],
  OPEN_SESSAO: [ROLES.PRESIDENTE, ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA, ROLES.OPERADOR_GERAL],
  OPEN_VOTACAO: [ROLES.PRESIDENTE, ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA, ROLES.OPERADOR_GERAL],

  // Comissao
  MANAGE_REUNIAO: [...OPERACIONAL, ROLES.COMISSAO],
  EMIT_PARECER: [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA, ROLES.OPERADOR_GERAL, ROLES.COMISSAO, ROLES.RELATOR],

  // Protocol
  PROTOCOLAR: [...OPERACIONAL, ROLES.PROTOCOLO, ROLES.VEREADOR],

  // Normas
  PUBLISH_NORMA: [...OPERACIONAL],

  // Voting
  VOTE: [ROLES.VEREADOR, ROLES.PRESIDENTE, ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA, ROLES.OPERADOR_GERAL],

  // View
  VIEW_ANY: Object.values(ROLES),
};

export function TenantProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [camara, setCamara] = useState(null);
  const [loadingCamara, setLoadingCamara] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.tenant_id) {
      loadCamara(user.tenant_id);
    }
  }, [isAuthenticated, user]);

  const loadCamara = async (tenantId) => {
    setLoadingCamara(true);
    try {
      // Try by id first, then by direct get
      const list = await base44.entities.Camara.list('-created_date', 200);
      const found = list.find(c => c.id === tenantId);
      if (found) setCamara(found);
    } catch (e) {
      console.error('Failed to load camara', e);
    }
    setLoadingCamara(false);
  };

  const tenantId = user?.tenant_id || null;
  const userRole = user?.role || null;

  const hasPermission = (permission) => {
    if (!userRole) return false;
    const allowed = PERMISSIONS[permission];
    if (!allowed) return false;
    return allowed.includes(userRole);
  };

  const isSuperAdmin = userRole === ROLES.SUPER_ADMIN;
  const isAdminCamara = userRole === ROLES.ADMIN_CAMARA || isSuperAdmin;
  const isOperadorGeral = userRole === ROLES.OPERADOR_GERAL || isAdminCamara;
  const isPresidente = userRole === ROLES.PRESIDENTE;

  // Helper: format parlamentar display name {Nome} — {Partido}
  const formatParlamentar = (nome, partido_sigla) => {
    if (!nome) return '—';
    if (!partido_sigla) return nome;
    return `${nome} — ${partido_sigla}`;
  };

  // Helper to add tenant_id to any filter object
  const withTenant = (filter = {}) => {
    if (isSuperAdmin) return filter; // Super admin sees all
    if (!tenantId) return filter;
    return { ...filter, tenant_id: tenantId };
  };

  return (
    <TenantContext.Provider value={{
      tenantId,
      camara,
      loadingCamara,
      userRole,
      hasPermission,
      isSuperAdmin,
      isAdminCamara,
      isOperadorGeral,
      isPresidente,
      withTenant,
      formatParlamentar,
      ROLES,
      ROLE_LABELS,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
};