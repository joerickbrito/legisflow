// Cliente SisLegis — API própria, independente do Base44
// Substitui base44.entities.X para todas as operações de entidade

import { base44 } from '@/api/base44Client';

const SESSION_KEY = 'sislegis_session';

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getSessionToken() {
  return getSession()?.session_token || null;
}

export function getSessionUser() {
  return getSession()?.user || null;
}

// Helper: chama backend function com header x-sislegis-token
async function invokeWithAuth(functionName, payload = {}) {
  const token = getSessionToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['x-sislegis-token'] = token;
  }

  const response = await base44.functions.fetch(`/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

async function operarEntidade(entity, operation, params = {}) {
  const data = await invokeWithAuth('operarEntidade', {
    entity,
    operation,
    params,
  });
  return data.data;
}

// Proxy que cria APIs de entidade com a mesma interface do Base44 SDK
export function createEntityApi(entityName) {
  return {
    list: (sort, limit) => operarEntidade(entityName, 'list', { sort, limit }),
    filter: (query, sort, limit) => operarEntidade(entityName, 'filter', { query, sort, limit }),
    get: (id) => operarEntidade(entityName, 'get', { id }),
    create: (data) => operarEntidade(entityName, 'create', { data }),
    update: (id, data) => operarEntidade(entityName, 'update', { id, data }),
    delete: (id) => operarEntidade(entityName, 'delete', { id }),
  };
}

// Auth functions
export async function autenticar(username, password) {
  const response = await base44.functions.invoke('autenticarSislegis', { username, password });
  if (response.data?.error) {
    throw new Error(response.data.error);
  }
  const { session_token, user } = response.data;
  saveSession({ session_token, user });
  return user;
}

export async function criarUsuario(data) {
  const result = await invokeWithAuth('criarUsuarioSislegis', data);
  return result;
}

export async function trocarSenha(username, senhaAtual, novaSenha) {
  const result = await invokeWithAuth('trocarSenhaSislegis', {
    username,
    senha_atual: senhaAtual,
    nova_senha: novaSenha,
  });

  // Atualizar sessão com novo token
  if (result.session_token) {
    const session = getSession();
    session.session_token = result.session_token;
    if (session.user) {
      session.user.senha_temporaria = false;
      session.user.status = 'Ativo';
    }
    saveSession(session);
  }

  return result;
}

export async function atualizarUsuarioSislegis(id, data) {
  return operarEntidade('UsuarioSislegis', 'update', { id, data });
}

export async function listarUsuariosSislegis(query = {}, sort, limit) {
  return operarEntidade('UsuarioSislegis', 'filter', { query, sort, limit });
}

// Convenience: wrapper de entidades com a mesma cara do base44.entities
const entityCache = {};
export const sislegisEntities = new Proxy({}, {
  get(_, entityName) {
    if (!entityCache[entityName]) {
      entityCache[entityName] = createEntityApi(entityName);
    }
    return entityCache[entityName];
  }
});