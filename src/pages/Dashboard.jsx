import { useTenant, ROLES } from '@/lib/TenantContext';
import DashboardSuperAdmin from '@/components/dashboard/DashboardSuperAdmin';
import DashboardAdminCamara from '@/components/dashboard/DashboardAdminCamara';

// Default dashboard (operacional) — vereador, secretaria, etc.
export { default as DashboardAdminCamara } from '@/components/dashboard/DashboardAdminCamara';

export default function Dashboard() {
  const { userRole } = useTenant();

  if (userRole === ROLES.SUPER_ADMIN) return <DashboardSuperAdmin />;

  // Admin câmara, secretaria, presidente, protocolo, comissão, relator, vereador → todos veem o dashboard da câmara
  return <DashboardAdminCamara />;
}