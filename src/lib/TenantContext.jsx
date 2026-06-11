import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { createAuditor } from '@/lib/auditoria';
import { PERFIS, PERFIL_LABELS, DEFAULT_PERMISSIONS } from '@/lib/perfis';

const TenantContext = createContext(null);

// Role hierarchy and permissions
export const ROLES = { ...PERFIS,
  // Legados (manter para compatibilidade)
  SECRETARIA_LEGISLATIVA: 'SECRETARIA_LEGISLATIVA',
  PROTOCOLO: 'PROTOCOLO',
  COMISSAO: 'COMISSAO',
  RELATOR: 'RELATOR',
  CONSULTA_PUBLICA: 'CONSULTA_PUBLICA',
};

export const ROLE_LABELS = { ...PERFIL_LABELS,
  // Legados
  SECRETARIA_LEGISLATIVA: 'Secretaria Legislativa',
  PROTOCOLO: 'Protocolo',
  COMISSAO: 'Comissão',
  RELATOR: 'Relator',
  CONSULTA_PUBLICA: 'Consulta Pública',
};

export { DEFAULT_PERMISSIONS };

const OPERACIONAL = [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAMARA, ROLES.OPERADOR_GERAL, ROLES.SECRETARIO_LEGISLATIVO];

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
  // activeCamara: quando um SUPER_ADMIN "entra" numa câmara específica
  const [activeCamara, setActiveCamara] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user?.tenant_id) {
      loadCamara(user.tenant_id);
    }
  }, [isAuthenticated, user]);

  const loadCamara = async (tenantId) => {
    setLoadingCamara(true);
    try {
      const list = await base44.entities.Camara.list('-created_date', 200);
      const found = list.find(c => c.id === tenantId);
      if (found) setCamara(found);
    } catch (e) {
      console.error('Failed to load camara', e);
    }
    setLoadingCamara(false);
  };

  // tenant_id efetivo: se SUPER_ADMIN entrou numa câmara, usa o id dela
  const effectiveTenantId = (() => {
    if (user?.role === 'SUPER_ADMIN' && activeCamara) return activeCamara.id;
    return user?.tenant_id || null;
  })();

  const tenantId = effectiveTenantId;
  const userRole = user?.role || null;

  // Entrar no contexto de uma câmara (apenas SUPER_ADMIN)
  const enterCamara = async (camaraData) => {
    const c = camaraData.id ? camaraData : await base44.entities.Camara.list('-created_date', 200).then(list => list.find(x => x.id === camaraData));
    if (!c) return;
    setActiveCamara(c);
    return c;
  };

  // Sair do contexto de uma câmara (voltar ao painel master)
  const exitCamara = () => {
    setActiveCamara(null);
  };

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
  const isAssessor = userRole === ROLES.ASSESSOR;
  const isSecretarioLegislativo = userRole === ROLES.SECRETARIO_LEGISLATIVO;

  // Helper: format parlamentar display name {Nome} — {Partido}
  const formatParlamentar = (nome, partido_sigla) => {
    if (!nome) return '—';
    if (!partido_sigla) return nome;
    return `${nome} — ${partido_sigla}`;
  };

  // Helper to add tenant_id to any filter object.
  // SECURITY: SUPER_ADMIN sees all tenants ONLY when in master mode.
  // When SUPER_ADMIN enters a chamber, queries are scoped to that chamber.
  const withTenant = useCallback((filter = {}) => {
    // SUPER_ADMIN dentro de uma câmara → escopo da câmara ativa
    if (isSuperAdmin && activeCamara) return { ...filter, tenant_id: activeCamara.id };
    // SUPER_ADMIN no painel master → vê tudo (sem filtro de tenant)
    if (isSuperAdmin) return filter;
    // Usuário comum sem tenant → bloqueado
    if (!tenantId) return null;
    return { ...filter, tenant_id: tenantId };
  }, [isSuperAdmin, tenantId, activeCamara]);

  // Hard guard: throws if called without a valid tenant (use in critical paths).
  const requireTenant = useCallback((filter = {}) => {
    if (!tenantId && !isSuperAdmin) {
      throw new Error('[Security] Query attempted without tenant_id. Blocked.');
    }
    return withTenant(filter);
  }, [isSuperAdmin, tenantId, withTenant]);

  // Use this in useEffects: if withTenant() returns null, skip the fetch
  const canQuery = isSuperAdmin || !!tenantId;

  // Auditor pré-configurado com o tenant e usuário atuais
  const audit = useCallback(
    createAuditor(tenantId, user),
    [tenantId, user]
  );

  // isInChamberContext: true se NÃO for SUPER_ADMIN (admin câmara sempre tem tenant)
  // ou se SUPER_ADMIN tiver entrado numa câmara específica
  const isInChamberContext = !!(userRole !== 'SUPER_ADMIN' || activeCamara);

  return (
    <TenantContext.Provider value={{
      tenantId,
      camara: activeCamara || camara,  // prefere a câmara ativa do master
      activeCamara,
      loadingCamara,
      userRole,
      hasPermission,
      isSuperAdmin,
      isAdminCamara,
      isOperadorGeral,
      isPresidente,
      isAssessor,
      isSecretarioLegislativo,
      withTenant,
      requireTenant,
      canQuery: isSuperAdmin || !!tenantId,
      formatParlamentar,
      audit,
      enterCamara,
      exitCamara,
      isInChamberContext,
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