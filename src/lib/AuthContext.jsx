import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { getSessionUser, getSessionToken, clearSession } from '@/lib/sislegisApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);
  const [authMode, setAuthMode] = useState(null); // 'sislegis' | 'base44' | null

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      // Carregar configurações públicas do app
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: appParams.token,
        interceptResponses: true
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({ type: 'auth_required', message: 'Authentication required' });
          } else if (reason === 'user_not_registered') {
            setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
          } else {
            setAuthError({ type: reason, message: appError.message });
          }
        } else {
          setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        return;
      }

      // Verificar autenticação SisLegis primeiro
      const sislegisUser = getSessionUser();
      const sislegisToken = getSessionToken();

      if (sislegisUser && sislegisToken) {
        setUser(sislegisUser);
        setIsAuthenticated(true);
        setPrimeiroAcesso(!!sislegisUser.senha_temporaria);
        setAuthMode('sislegis');
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }

      // ─── FALLBACK: verificar autenticação Base44 nativa (Master Admin) ───
      // O Master Admin NÃO possui registro em UsuarioSislegis por decisão arquitetural.
      // Ele é reconhecido via base44.auth.me() e o primeiro usuário Base44 a autenticar
      // é automaticamente registrado como Master Admin na ConfiguracaoSistema.
      // ⚠️ NÃO REMOVER este bloco: ele foi restaurado após a remoção acidental durante
      //    a limpeza das dependências do User nativo. Sem ele, o Master Admin fica bloqueado.
      try {
        const base44User = await base44.auth.me();
        if (base44User && base44User.id) {
          const configs = await base44.entities.ConfiguracaoSistema.filter({ chave: 'master_admin' });

          if (configs.length === 0) {
            // Primeiro usuário Base44 a autenticar → torna-se o Master Admin
            await base44.entities.ConfiguracaoSistema.create({
              chave: 'master_admin',
              master_admin_id: base44User.id,
              master_admin_email: base44User.email || '',
            });
            setUser({ ...base44User, role: 'SUPER_ADMIN' });
            setIsAuthenticated(true);
            setAuthMode('base44');
            setPrimeiroAcesso(false);
            setIsLoadingAuth(false);
            setAuthChecked(true);
            return;
          }

          const config = configs[0];
          if (config.master_admin_id === base44User.id) {
            // Master Admin reconhecido — acesso concedido
            setUser({ ...base44User, role: 'SUPER_ADMIN' });
            setIsAuthenticated(true);
            setAuthMode('base44');
            setPrimeiroAcesso(false);
            setIsLoadingAuth(false);
            setAuthChecked(true);
            return;
          }

          // Usuário Base44 que NÃO é o Master Admin → sem privilégios especiais
        }
      } catch (_) {
        // base44.auth.me() lança se não houver sessão Base44 → ignorar silenciosamente
      }

      // Sem sessão SisLegis e sem Master Admin reconhecido → não autenticado
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };



  const refreshUser = async () => {
    if (authMode === 'sislegis') {
      const sislegisUser = getSessionUser();
      if (sislegisUser) {
        setUser(sislegisUser);
        setPrimeiroAcesso(!!sislegisUser.senha_temporaria);
      }
    } else if (authMode === 'base44') {
      try {
        const currentUser = await base44.auth.me();
        // Re-verificar Master Admin para manter o role SUPER_ADMIN
        const configs = await base44.entities.ConfiguracaoSistema.filter({ chave: 'master_admin' });
        if (configs.length > 0 && configs[0].master_admin_id === currentUser.id) {
          setUser({ ...currentUser, role: 'SUPER_ADMIN' });
        } else {
          setUser(currentUser);
        }
        setPrimeiroAcesso(false);
      } catch (_) { /* silencioso */ }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthMode(null);

    if (authMode === 'sislegis') {
      clearSession();
      if (shouldRedirect) {
        window.location.href = '/login';
      }
    } else {
      if (shouldRedirect) {
        base44.auth.logout(window.location.href);
      } else {
        base44.auth.logout();
      }
    }
  };

  const navigateToLogin = () => {
    if (authMode === 'sislegis') {
      clearSession();
      window.location.href = '/login';
    } else {
      base44.auth.redirectToLogin(window.location.href);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      primeiroAcesso,
      authMode,
      logout,
      navigateToLogin,
      checkAppState,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};