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

      // Fallback: autenticação Base44 (legado)
      if (appParams.token) {
        await checkBase44Auth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthChecked(true);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkBase44Auth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthMode('base44');

      // Primeiro usuário → SUPER_ADMIN
      let roleUpdated = false;
      try {
        const totalUsers = await base44.entities.User.list();
        if (totalUsers.length <= 1 && currentUser.role !== 'SUPER_ADMIN') {
          await base44.entities.User.update(currentUser.id, { role: 'SUPER_ADMIN' });
          roleUpdated = true;
        }
      } catch (_) { /* silencioso */ }

      // Vincular admin de câmara (convite aceito)
      let adminVinculado = false;
      if (currentUser.role === 'user') {
        try {
          await base44.functions.invoke('vincularAdminCamara', {});
          adminVinculado = true;
        } catch (_) { /* silencioso */ }
      }

      if (roleUpdated || adminVinculado) {
        const refreshed = await base44.auth.me();
        setUser(refreshed);
        setPrimeiroAcesso(!!refreshed.senha_temporaria);
      } else {
        setPrimeiroAcesso(!!currentUser.senha_temporaria);
      }

      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
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
        setUser(currentUser);
        setPrimeiroAcesso(!!currentUser.senha_temporaria);
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
      checkUserAuth: checkBase44Auth,
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