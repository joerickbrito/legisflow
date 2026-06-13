import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MAX_TENTATIVAS = 5;
const JANELA_MINUTOS = 15;
const BLOQUEIO_MINUTOS = 15;

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const saltArray = Array.from(salt);
  return JSON.stringify({ salt: saltArray, hash: hashArray });
}

async function verifyPassword(password, stored) {
  try {
    const { salt, hash } = JSON.parse(stored);
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
    );
    const derivedBits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: new Uint8Array(salt), iterations: 100000, hash: "SHA-256" },
      keyMaterial, 256
    );
    const newHash = Array.from(new Uint8Array(derivedBits));
    return newHash.every((b, i) => b === hash[i]);
  } catch {
    return false;
  }
}

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Rate limiting persistente via entidade TentativasAcesso.
 * Retorna { permitido: true } ou { permitido: false, mensagem: string }.
 */
async function verificarRateLimit(base44, username, tipo) {
  const agora = new Date().toISOString();

  const registros = await base44.asServiceRole.entities.TentativasAcesso.filter({
    username,
    tipo
  });

  const registro = registros.length > 0 ? registros[0] : null;

  // Se existe bloqueio ativo, verificar se já expirou
  if (registro?.bloqueado_ate) {
    if (new Date(registro.bloqueado_ate) > new Date()) {
      return { permitido: false, mensagem: 'Muitas tentativas. Tente novamente em alguns minutos.' };
    }
    // Bloqueio expirado — resetar
    await base44.asServiceRole.entities.TentativasAcesso.update(registro.id, {
      tentativas: 0,
      bloqueado_ate: null,
      ultima_tentativa: null
    });
    return { permitido: true };
  }

  return { permitido: true, registro };
}

/**
 * Registra uma tentativa falha.
 */
async function registrarFalha(base44, username, tipo, registroExistente) {
  const agora = new Date().toISOString();

  if (registroExistente) {
    const novasTentativas = (registroExistente.tentativas || 0) + 1;

    // Verificar se está dentro da janela de 15 min desde a primeira tentativa
    // Se a última tentativa for muito antiga, resetar contagem
    const ultimaData = registroExistente.ultima_tentativa
      ? new Date(registroExistente.ultima_tentativa)
      : new Date(0);
    const diffMs = new Date() - ultimaData;

    if (diffMs > JANELA_MINUTOS * 60 * 1000) {
      // Fora da janela — resetar contagem para 1
      await base44.asServiceRole.entities.TentativasAcesso.update(registroExistente.id, {
        tentativas: 1,
        ultima_tentativa: agora,
        bloqueado_ate: null
      });
    } else if (novasTentativas >= MAX_TENTATIVAS) {
      // Atingiu o limite — bloquear
      const bloqueioAte = new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1000).toISOString();
      await base44.asServiceRole.entities.TentativasAcesso.update(registroExistente.id, {
        tentativas: novasTentativas,
        ultima_tentativa: agora,
        bloqueado_ate: bloqueioAte
      });
    } else {
      await base44.asServiceRole.entities.TentativasAcesso.update(registroExistente.id, {
        tentativas: novasTentativas,
        ultima_tentativa: agora
      });
    }
  } else {
    // Primeira tentativa falha
    await base44.asServiceRole.entities.TentativasAcesso.create({
      username,
      tipo,
      tentativas: 1,
      ultima_tentativa: agora
    });
  }
}

/**
 * Reseta o contador em caso de sucesso.
 */
async function resetarRateLimit(base44, username, tipo) {
  const registros = await base44.asServiceRole.entities.TentativasAcesso.filter({
    username,
    tipo
  });
  if (registros.length > 0) {
    await base44.asServiceRole.entities.TentativasAcesso.delete(registros[0].id);
  }
}

async function getAuthenticatedUser(base44) {
  const token = base44._requestHeaders?.get?.('x-sislegis-token') || '';
  if (!token) return null;

  const usuarios = await base44.asServiceRole.entities.UsuarioSislegis.filter({ session_token: token });
  if (!usuarios || usuarios.length === 0) return null;
  return usuarios[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { username, senha_atual, nova_senha } = await req.json();

    if (!username || !senha_atual || !nova_senha) {
      return Response.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }

    if (nova_senha.length < 6) {
      return Response.json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
    }

    const usernameLower = username.trim().toLowerCase();

    // Rate limiting persistente
    const rateCheck = await verificarRateLimit(base44, usernameLower, 'troca_senha');
    if (!rateCheck.permitido) {
      return Response.json({ error: rateCheck.mensagem }, { status: 429 });
    }

    // Autenticar o chamador
    const caller = await getAuthenticatedUser(base44);
    if (!caller) {
      return Response.json({ error: 'Não autorizado. Faça login para trocar a senha.' }, { status: 401 });
    }

    if (caller.username !== usernameLower) {
      return Response.json({ error: 'Acesso negado. Você só pode trocar sua própria senha.' }, { status: 403 });
    }

    const usuario = caller;

    // Verificar senha atual
    const senhaValida = await verifyPassword(senha_atual, usuario.password_hash);
    if (!senhaValida) {
      await registrarFalha(base44, usernameLower, 'troca_senha', rateCheck.registro);
      return Response.json({ error: 'Senha atual incorreta.' }, { status: 401 });
    }

    // Sucesso — resetar rate limit
    await resetarRateLimit(base44, usernameLower, 'troca_senha');

    const novoHash = await hashPassword(nova_senha);
    const novoSessionToken = generateToken();

    await base44.asServiceRole.entities.UsuarioSislegis.update(usuario.id, {
      password_hash: novoHash,
      senha_temporaria: false,
      status: 'Ativo',
      session_token: novoSessionToken
    });

    return Response.json({
      success: true,
      session_token: novoSessionToken,
      message: 'Senha alterada com sucesso.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});