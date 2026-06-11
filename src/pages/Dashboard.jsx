import { useTenant, ROLES } from '@/lib/TenantContext';
import DashboardSuperAdmin from '@/components/dashboard/DashboardSuperAdmin';
import DashboardAdminCamara from '@/components/dashboard/DashboardAdminCamara';

export default function Dashboard() {
  const { userRole, isInChamberContext } = useTenant();

  // SUPER_ADMIN no contexto master → dashboard global
  if (userRole === ROLES.SUPER_ADMIN && !isInChamberContext) return <DashboardSuperAdmin />;

  // SUPER_ADMIN dentro de câmara OU qualquer outro perfil → dashboard da câmara
  return <DashboardAdminCamara />;
}