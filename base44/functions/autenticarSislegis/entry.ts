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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: 'Usuário e senha são obrigatórios.' }, { status: 400 });
    }

    const usuarios = await base44.asServiceRole.entities.UsuarioSislegis.filter({
      username: username.trim().toLowerCase()
    });

    if (!usuarios || usuarios.length === 0) {
      return Response.json({ error: 'Nome de usuário ou senha inválidos.' }, { status: 401 });
    }

    const usuario = usuarios[0];

    if (usuario.status === 'Bloqueado' || usuario.status === 'Inativo') {
      return Response.json({ error: 'Usuário bloqueado ou inativo. Entre em contato com o administrador.' }, { status: 403 });
    }

    const senhaValida = await verifyPassword(password, usuario.password_hash);
    if (!senhaValida) {
      return Response.json({ error: 'Nome de usuário ou senha inválidos.' }, { status: 401 });
    }

    // Gerar token de sessão
    const sessionToken = generateToken();
    await base44.asServiceRole.entities.UsuarioSislegis.update(usuario.id, {
      session_token: sessionToken
    });

    return Response.json({
      session_token: sessionToken,
      user: {
        id: usuario.id,
        username: usuario.username,
        nome: usuario.nome,
        email: usuario.email || null,
        role: usuario.role,
        tenant_id: usuario.tenant_id || null,
        camara_id: usuario.camara_id || null,
        camara_nome: usuario.camara_nome || null,
        status: usuario.status,
        senha_temporaria: !!usuario.senha_temporaria,
        permissoes: usuario.permissoes || {},
        foto_url: usuario.foto_url || null,
        cargo: usuario.cargo || null,
        partido_id: usuario.partido_id || null,
        partido_sigla: usuario.partido_sigla || null,
        cpf: usuario.cpf || null,
        telefone: usuario.telefone || null,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});