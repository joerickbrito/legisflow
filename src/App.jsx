import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { TenantProvider } from '@/lib/TenantContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';

// Pages
import Dashboard from '@/pages/Dashboard';
import CasaLegislativa from '@/pages/CasaLegislativa';
import Legislaturas from '@/pages/Legislaturas';
import Parlamentares from '@/pages/Parlamentares';
import Partidos from '@/pages/Partidos';
import MesaDiretora from '@/pages/MesaDiretora';
import Comissoes from '@/pages/Comissoes';
import Protocolo from '@/pages/Protocolo';
import Proposicoes from '@/pages/Proposicoes';
import Materias from '@/pages/Materias';
import Tramitacoes from '@/pages/Tramitacoes';
import Pareceres from '@/pages/Pareceres';
import Audiencias from '@/pages/Audiencias';
import Sessoes from '@/pages/Sessoes';
import Votacao from '@/pages/Votacao';
import Normas from '@/pages/Normas';
import Documentos from '@/pages/Documentos';
import Transparencia from '@/pages/Transparencia';
import Relatorios from '@/pages/Relatorios';
import PainelEletronico from '@/pages/PainelEletronico.jsx';
import TelaoPage from '@/pages/TelaoPage.jsx';
import Quorum from '@/pages/Quorum.jsx';
import Emendas from '@/pages/Emendas.jsx';
import ReuniaoComissao from '@/pages/ReuniaoComissao.jsx';
import Oficios from '@/pages/Oficios.jsx';
import ProjetosLei from '@/pages/ProjetosLei';
import Leis from '@/pages/Leis';
import Resolucoes from '@/pages/Resolucoes';
import Decretos from '@/pages/Decretos';
import Portarias from '@/pages/Portarias';
import EmendasImpositivas from '@/pages/EmendasImpositivas';
import AtasSessoes from '@/pages/AtasSessoes';
import PautasSessoes from '@/pages/PautasSessoes';
import GerenciarCamaras from '@/pages/GerenciarCamaras';
import PainelMasterAdmin from '@/pages/PainelMasterAdmin.jsx';
import GerenciarUsuarios from '@/pages/GerenciarUsuarios';
import Auditoria from '@/pages/Auditoria';
import Configuracoes from '@/pages/Configuracoes';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import TrocarSenha from '@/pages/TrocarSenha.jsx';

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, navigateToLogin, user, primeiroAcesso } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  // Primeiro acesso → redirecionar para troca de senha obrigatória
  if (primeiroAcesso && user) {
    return (
      <Routes>
        <Route path="/trocar-senha" element={<TrocarSenha />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/trocar-senha" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/trocar-senha" element={<TrocarSenha />} />
      <Route path="/transparencia" element={<Transparencia />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/telao" element={<TelaoPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/casa-legislativa" element={<CasaLegislativa />} />
          <Route path="/legislaturas" element={<Legislaturas />} />
          <Route path="/parlamentares" element={<Parlamentares />} />
          <Route path="/partidos" element={<Partidos />} />
          <Route path="/mesa-diretora" element={<MesaDiretora />} />
          <Route path="/comissoes" element={<Comissoes />} />
          <Route path="/protocolo" element={<Protocolo />} />
          <Route path="/proposicoes" element={<Proposicoes />} />
          <Route path="/materias" element={<Materias />} />
          <Route path="/tramitacoes" element={<Tramitacoes />} />
          <Route path="/pareceres" element={<Pareceres />} />
          <Route path="/audiencias" element={<Audiencias />} />
          <Route path="/sessoes" element={<Sessoes />} />
          <Route path="/votacao" element={<Votacao />} />
          <Route path="/normas" element={<Normas />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/painel-eletronico" element={<PainelEletronico />} />
          <Route path="/quorum" element={<Quorum />} />
          <Route path="/emendas" element={<Emendas />} />
          <Route path="/reuniao-comissao" element={<ReuniaoComissao />} />
          <Route path="/oficios" element={<Oficios />} />
          <Route path="/projetos-lei" element={<ProjetosLei />} />
          <Route path="/leis" element={<Leis />} />
          <Route path="/resolucoes" element={<Resolucoes />} />
          <Route path="/decretos" element={<Decretos />} />
          <Route path="/portarias" element={<Portarias />} />
          <Route path="/emendas-impositivas" element={<EmendasImpositivas />} />
          <Route path="/atas-sessoes" element={<AtasSessoes />} />
          <Route path="/pautas-sessoes" element={<PautasSessoes />} />
          <Route path="/gerenciar-camaras" element={<GerenciarCamaras />} />
          <Route path="/painel-master" element={<PainelMasterAdmin />} />
          <Route path="/gerenciar-usuarios" element={<GerenciarUsuarios />} />
          <Route path="/auditoria" element={<Auditoria />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <TenantProvider>
            <AuthenticatedApp />
          </TenantProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;