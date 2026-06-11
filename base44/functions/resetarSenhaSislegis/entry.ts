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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { usuario_id, nova_senha } = await req.json();

    if (!usuario_id || !nova_senha || nova_senha.length < 6) {
      return Response.json({ error: 'ID do usuário e nova senha (mín. 6 caracteres) são obrigatórios.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(nova_senha);

    await base44.asServiceRole.entities.UsuarioSislegis.update(usuario_id, {
      password_hash: passwordHash,
      senha_temporaria: true,
      status: 'Pendente de Ativação',
      session_token: null,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});