// Cliente SisLegis — API própria, independente do Base44
// Substitui base44.entities.X para todas as operações de entidade

import { base44 } from '@/api/base44Client';

const SESSION_KEY = 'sislegis_session';

// Sessão guardada em sessionStorage: o navegador a apaga automaticamente
// quando a guia/janela é fechada. Sobrevive a recarregar a página (F5) na
// mesma guia, mas exige novo login se a guia for fechada — importante para
// computadores compartilhados (ex.: PCs da câmara).
//
// Migração de segurança: remove qualquer sessão antiga que tenha ficado
// persistida em localStorage de versões anteriores.
try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }

function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(data) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ===== Handoff de sessão entre janelas (ex.: telão em outro monitor) =====
// O sessionStorage NÃO é compartilhado entre janelas/abas. Para que a janela
// do telão (aberta via window.open) já entre autenticada — sem novo login —
// passamos a sessão atual no hash da URL ao abrir, e a janela nova a consome
// no boot. O hash não é enviado ao servidor e é removido logo após o uso.
const HANDOFF_KEY = 'sislegis_handoff';

export function abrirJanelaComSessao(url, nome, features) {
  // Monta no hash: sessão + aparência (tema/paleta). A janela do telão pode abrir
  // em outro subdomínio (preview-sandbox), onde localStorage NÃO é compartilhado,
  // então o tema/paleta precisam viajar pela URL — senão o telão cai no padrão escuro.
  const params = [];
  const raw = sessionStorage.getItem(SESSION_KEY) || '';
  if (raw) {
    const token = btoa(unescape(encodeURIComponent(raw)));
    params.push(`${HANDOFF_KEY}=${encodeURIComponent(token)}`);
  }
  try {
    const tema = localStorage.getItem('sislegis_tema');
    if (tema) params.push(`tema=${encodeURIComponent(tema)}`);
  } catch { /* ignore */ }
  try {
    const paleta = (typeof document !== 'undefined' && document.documentElement.dataset.paleta) || '';
    if (paleta) params.push(`paleta=${encodeURIComponent(paleta)}`);
  } catch { /* ignore */ }
  const sep = url.includes('#') ? '&' : '#';
  const full = params.length ? `${url}${sep}${params.join('&')}` : url;
  return window.open(full, nome, features);
}

export function consumirHandoffSessao() {
  try {
    const m = (window.location.hash || '').match(new RegExp(`${HANDOFF_KEY}=([^&]+)`));
    if (!m) return;
    if (!sessionStorage.getItem(SESSION_KEY)) {
      const raw = decodeURIComponent(escape(atob(decodeURIComponent(m[1]))));
      JSON.parse(raw); // valida que é uma sessão íntegra
      sessionStorage.setItem(SESSION_KEY, raw);
    }
    // Remove o handoff da URL (não deixa a sessão exposta na barra de endereços)
    history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch {
    /* handoff ausente ou inválido — segue o fluxo normal de login */
  }
}

// Política de senha forte — mesma regra do backend (criar/trocar senha).
// Retorna uma mensagem de erro, ou null se a senha for válida.
const SENHAS_COMUNS = [
  '12345678', '123456789', '1234567890', 'senha123', 'password', 'password1',
  'qwerty123', 'camara123', 'admin123', 'sislegis', 'mudar123', 'abc12345',
];
export function validarSenhaForte(senha) {
  if (!senha || senha.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
  if (/^(.)\1+$/.test(senha)) return 'A senha não pode ser um único caractere repetido.';
  if (!/[A-Za-z]/.test(senha) || !/[0-9]/.test(senha)) return 'A senha deve conter letras e números.';
  if (SENHAS_COMUNS.includes(senha.toLowerCase())) return 'Essa senha é muito comum. Escolha uma mais forte.';
  return null;
}

export function getSessionToken() {
  return getSession()?.session_token || null;
}

export function getSessionUser() {
  return getSession()?.user || null;
}

// Helper: injeta o sislegis_token no payload quando disponível
function withAuth(payload = {}) {
  const token = getSessionToken();
  if (token) {
    return { ...payload, sislegis_token: token };
  }
  return payload;
}

async function operarEntidade(entity, operation, params = {}) {
  const response = await base44.functions.invoke('operarEntidade', withAuth({
    entity,
    operation,
    params,
  }));

  // Sessão expirada: limpa e volta ao login de forma transparente.
  if (response.data?.code === 'SESSION_EXPIRED') {
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }

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
  const response = await base44.functions.invoke('criarUsuarioSislegis', withAuth(data));
  if (response.data?.error) {
    throw new Error(response.data.error);
  }
  return response.data;
}

export async function trocarSenha(username, senhaAtual, novaSenha) {
  const response = await base44.functions.invoke('trocarSenhaSislegis', withAuth({
    username,
    senha_atual: senhaAtual,
    nova_senha: novaSenha,
  }));

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

// Espelha um comando de cronômetro para todas as janelas/telas via o registro
// da votação (propagado pelo subscribe em tempo real). Não gera auditoria.
export async function sincronizarCronometro(votacaoId, cmd) {
  if (!votacaoId || !cmd) return;
  try {
    await base44.functions.invoke('sincronizarCronometro', withAuth({ votacao_id: votacaoId, cmd }));
  } catch {
    /* sincronização de exibição não deve interromper o uso */
  }
}

// ===== Protocolo =====
// Cria um protocolo (numeração sequencial + código de rastreio, no backend).
// Quando há sessão (login da prefeitura/interno), o token vai junto e o servidor
// define a origem; sem sessão (portal público) a origem vira "Público".
export async function protocolar(dados) {
  const response = await base44.functions.invoke('protocolar', withAuth(dados));
  if (response.data?.error) throw new Error(response.data.error);
  return response.data?.data;
}

// Consulta pública de protocolo pelo código de rastreio (sem login).
export async function consultarProtocolo(camara_id, codigo) {
  const response = await base44.functions.invoke('consultarProtocolo', { camara_id, codigo });
  if (response.data?.error) throw new Error(response.data.error);
  return response.data?.data;
}

// Exclui um protocolo (exige sessão + permissão; validado no backend).
export async function excluirProtocolo(protocolo_id) {
  const response = await base44.functions.invoke('excluirProtocolo', withAuth({ protocolo_id }));
  if (response.data?.error) throw new Error(response.data.error);
  return response.data?.data;
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