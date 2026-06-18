import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token: defaultToken, functionsVersion, appBaseUrl } = appParams;

// Recupera o token dinâmico da sessão ativa do SisLegis
let activeToken = defaultToken;
let hasAuth = false;

try {
  const sessionRaw = localStorage.getItem('sislegis_session');
  if (sessionRaw) {
    const session = JSON.parse(sessionRaw);
    if (session && session.session_token) {
      activeToken = session.session_token;
      hasAuth = true;
    }
  }
} catch (error) {
  // Ignora falhas de parse para evitar quebra do app se o storage estiver limpo
}

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token: activeToken,
  functionsVersion,
  serverUrl: '',
  requiresAuth: hasAuth,
  appBaseUrl
});