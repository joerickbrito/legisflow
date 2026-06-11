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

async function operarEntidade(entity, operation, params = {}) {
  const token = getSessionToken();
  if (!token) throw new Error('Não autenticado.');

  const response = await base44.functions.invoke('operarEntidade', {
    entity,
    operation,
    params,
  }, {
    headers: {
      'x-sislegis-token': token,
    },
  });

  if (response.data?.error) {
    throw new Error(response.data.error);
  }

  return response.data?.data;
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
  const response = await base44.functions.invoke('criarUsuarioSislegis', data);
  if (response.data?.error) {
    throw new Error(response.data.error);
  }
  return response.data;
}

export async function trocarSenha(username, senhaAtual, novaSenha) {
  const response = await base44.functions.invoke('trocarSenhaSislegis', {
    username,
    senha_atual: senhaAtual,
    nova_senha: novaSenha,
  });

  if (response.data?.error) {
    throw new Error(response.data.error);
  }

  // Atualizar sessão com novo token
  if (response.data.session_token) {
    const session = getSession();
    session.session_token = response.data.session_token;
    if (session.user) {
      session.user.senha_temporaria = false;
      session.user.status = 'Ativo';
    }
    saveSession(session);
  }

  return response.data;
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