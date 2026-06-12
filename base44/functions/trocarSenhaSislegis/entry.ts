import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

// Controle simples de tentativas (em memória — reseta ao reiniciar a função)
const attemptTracker = new Map(); // key: username, value: { count, lastAttempt }

function checkRateLimit(username) {
  const now = Date.now();
  const entry = attemptTracker.get(username);

  // Limpar entradas expiradas
  if (entry && (now - entry.lastAttempt) > 15 * 60 * 1000) {
    attemptTracker.delete(username);
    return true;
  }

  if (!entry) {
    attemptTracker.set(username, { count: 1, lastAttempt: now });
    return true;
  }

  if (entry.count >= 5) {
    return false; // bloqueado
  }

  entry.count++;
  entry.lastAttempt = now;
  return true;
}

function resetRateLimit(username) {
  attemptTracker.delete(username);
}

// Obtém o usuário autenticado via session_token do SisLegis
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

    // Rate limiting
    if (!checkRateLimit(usernameLower)) {
      return Response.json({
        error: 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.'
      }, { status: 429 });
    }

    // Autenticar o chamador: deve ser o próprio usuário (verificado via session_token)
    const caller = await getAuthenticatedUser(base44);
    if (!caller) {
      return Response.json({ error: 'Não autorizado. Faça login para trocar a senha.' }, { status: 401 });
    }

    // Verificar que o usuário autenticado é o mesmo que está tentando trocar a senha
    if (caller.username !== usernameLower) {
      return Response.json({ error: 'Acesso negado. Você só pode trocar sua própria senha.' }, { status: 403 });
    }

    const usuario = caller;

    // Verificar senha atual
    const senhaValida = await verifyPassword(senha_atual, usuario.password_hash);
    if (!senhaValida) {
      return Response.json({ error: 'Senha atual incorreta.' }, { status: 401 });
    }

    // Senha correta — resetar rate limit
    resetRateLimit(usernameLower);

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