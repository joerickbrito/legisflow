import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getSessionUser, getSessionToken, clearSession } from '@/lib/sislegisApi';
import { temPermissao } from '@/lib/perfis';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setAuthError(null);

      const sislegisUser = getSessionUser();
      const sislegisToken = getSessionToken();

      if (sislegisUser && sislegisToken) {
        setUser(sislegisUser);
        setIsAuthenticated(true);
        setPrimeiroAcesso(!!sislegisUser.senha_temporaria);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }

      // Sem sessão SisLegis → não autenticado
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingAuth(false);
    }
  };



  const refreshUser = async () => {
    const sislegisUser = getSessionUser();
    if (sislegisUser) {
      setUser(sislegisUser);
      setPrimeiroAcesso(!!sislegisUser.senha_temporaria);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    clearSession();
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  // Logout automático por inatividade — complementa o logout ao fechar a guia.
  // Encerra a sessão após 30 minutos sem nenhuma interação (importante para PCs
  // compartilhados da câmara).
  useEffect(() => {
    if (!isAuthenticated) return;
    const INATIVIDADE_MS = 30 * 60 * 1000; // 30 minutos
    let timer;
    const reiniciar = () => {
      clearTimeout(timer);
      timer = setTimeout(() => logout(true), INATIVIDADE_MS);
    };
    const eventos = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    eventos.forEach((ev) => window.addEventListener(ev, reiniciar, { passive: true }));
    reiniciar();
    return () => {
      clearTimeout(timer);
      eventos.forEach((ev) => window.removeEventListener(ev, reiniciar));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const navigateToLogin = () => {
    clearSession();
    window.location.href = '/login';
  };

  // Verifica uma permissão de ação do usuário logado (respeita os checkboxes;
  // SUPER_ADMIN tem acesso total). Use nos botões: {pode('projetos_lei_criar') && ...}
  const pode = (key) => temPermissao(user, key);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      authError,
      authChecked,
      primeiroAcesso,
      logout,
      navigateToLogin,
      checkAppState,
      refreshUser,
      pode,
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