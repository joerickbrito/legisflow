import { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const TenantContext = createContext(null);

// Role hierarchy and permissions
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN_CAMARA: 'ADMIN_CAMARA',
  SECRETARIA_LEGISLATIVA: 'SECRETARIA_LEGISLATIVA',
  PROTOCOLO: 'PROTOCOLO',
  PRESIDENTE: 'PRESIDENTE',
  COMISSAO: 'COMISSAO',
  RELATOR: 'RELATOR',
  VEREADOR: 'VEREADOR',
  CONSULTA_PUBLICA: 'CONSULTA_PUBLICA',
};

export const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_CAMARA: 'Admin da Câmara',
  SECRETARIA_LEGISLATIVA: 'Secretaria Legislativa',
  PROTOCOLO: 'Protocolo',
  PRESIDENTE: 'Presidente',
  COMISSAO: 'Comissão',
  RELATOR: 'Relator',
  VEREADOR: 'Vereador',
  CONSULTA_PUBLICA: 'Consulta Pública',
};

export const PERMISSIONS = {
  // Admin permissions
  MANAGE_CAMARAS: [ROLES.SUPER_ADMIN],
  MANAGE_USERS: [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA],
  MANAGE_CONFIG: [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA],
  VIEW_REPORTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA, ROLES.SECRETARIA_LEGISLATIVA],

  // Legislative process
  CREATE_MATERIA: [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA, ROLES.SECRETARIA_LEGISLATIVA, ROLES.PROTOCOLO],
  EDIT_MATERIA: [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA, ROLES.SECRETARIA_LEGISLATIVA],
  TRAMITAR_MATERIA: [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA, ROLES.SECRETARIA_LEGISLATIVA],
  DELETE_MATERIA: [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA],

  // Sessions
  MANAGE_SESSAO: [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA, ROLES.SECRETARIA_LEGISLATIVA, ROLES.PRESIDENTE],
  OPEN_SESSAO: [ROLES.PRESIDENTE, ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA],
  OPEN_VOTACAO: [ROLES.PRESIDENTE, ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA],

  // Comissao
  MANAGE_REUNIAO: [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA, ROLES.SECRETARIA_LEGISLATIVA, ROLES.COMISSAO],
  EMIT_PARECER: [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA, ROLES.COMISSAO, ROLES.RELATOR],

  // Protocol
  PROTOCOLAR: [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA, ROLES.SECRETARIA_LEGISLATIVA, ROLES.PROTOCOLO, ROLES.VEREADOR],

  // Normas
  PUBLISH_NORMA: [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA, ROLES.SECRETARIA_LEGISLATIVA],

  // Voting
  VOTE: [ROLES.VEREADOR, ROLES.PRESIDENTE, ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA],

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
      const camaras = await base44.entities.Camara.filter({ id: tenantId });
      if (camaras.length > 0) setCamara(camaras[0]);
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
      withTenant,
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