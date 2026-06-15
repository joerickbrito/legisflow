import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getSessionUser, getSessionToken, clearSession } from '@/lib/sislegisApi';

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

  const navigateToLogin = () => {
    clearSession();
    window.location.href = '/login';
  };

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