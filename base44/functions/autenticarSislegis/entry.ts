/**
 * SISTEMA DE USUÁRIOS DO SISLEGIS — ARQUITETURA DEFINITIVA
 *
 * Confirmado pela documentação oficial do Base44: não existe forma
 * de criar usuários nativos (User) administrativamente sem convite
 * por e-mail e ativação imediata. Por isso, TODOS os usuários do
 * SisLegis exceto o Master Admin existem EXCLUSIVAMENTE na entidade
 * UsuarioSislegis, sem qualquer sincronização com User nativo.
 *
 * Master Admin = login nativo Base44 (única exceção, via fallback
 * getAuthenticatedUser).
 * Todos os demais = UsuarioSislegis (username + senha própria).
 *
 * Funções removidas em 2026-06-14: configurarAdminCamara,
 * vincularAdminCamara, verificarAdminsPendentes, resetarSenhaAdmin.
 *
 * NÃO recriar pontes, sincronizações ou vínculos entre os dois
 * sistemas. Repetir teste de ponta a ponta (criar câmara → criar
 * admin → login → troca de senha → verificar listagem de usuários)
 * antes de qualquer alteração futura neste arquivo.
 */

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
 * Consolida registros duplicados (causados por race condition em chamadas paralelas).
 * Retorna o registro único consolidado.
 */
async function consolidarRegistros(base44, username, tipo) {
  const registros = await base44.entities.TentativasAcesso.filter({ username, tipo });

  if (registros.length === 0) return null;

  // Ordenar por updated_date decrescente
  registros.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));

  if (registros.length === 1) return registros[0];

  // Consolidar múltiplos registros: somar tentativas, pegar dados do mais recente
  let totalTentativas = 0;
  let bloqueadoAte = null;
  for (const r of registros) {
    totalTentativas += r.tentativas || 0;
    if (r.bloqueado_ate && (!bloqueadoAte || new Date(r.bloqueado_ate) > new Date(bloqueadoAte))) {
      bloqueadoAte = r.bloqueado_ate;
    }
  }

  const principal = registros[0];
  await base44.entities.TentativasAcesso.update(principal.id, {
    tentativas: totalTentativas,
    bloqueado_ate: bloqueadoAte
  });

  // Deletar duplicatas
  for (let i = 1; i < registros.length; i++) {
    await base44.entities.TentativasAcesso.delete(registros[i].id);
  }

  return { ...principal, tentativas: totalTentativas, bloqueado_ate: bloqueadoAte };
}

/**
 * Rate limiting persistente.
 * Retorna { permitido: true, registro } ou { permitido: false, mensagem }
 */
async function verificarRateLimit(base44, username, tipo) {
  try {
    const registro = await consolidarRegistros(base44, username, tipo);

    if (registro?.bloqueado_ate) {
      if (new Date(registro.bloqueado_ate) > new Date()) {
        return { permitido: false, mensagem: 'Muitas tentativas. Tente novamente em alguns minutos.' };
      }
      // Bloqueio expirado — resetar
      await base44.entities.TentativasAcesso.update(registro.id, {
        tentativas: 0, bloqueado_ate: null, ultima_tentativa: null
      });
      return { permitido: true, registro: null };
    }
    return { permitido: true, registro };
  } catch {
    return { permitido: true };
  }
}

async function registrarFalha(base44, username, tipo, registroExistente) {
  try {
    const agora = new Date().toISOString();

    if (registroExistente) {
      const novasTentativas = (registroExistente.tentativas || 0) + 1;
      const ultimaData = registroExistente.ultima_tentativa ? new Date(registroExistente.ultima_tentativa) : new Date(0);
      const diffMs = Date.now() - ultimaData.getTime();

      if (diffMs > JANELA_MINUTOS * 60 * 1000) {
        await base44.entities.TentativasAcesso.update(registroExistente.id, {
          tentativas: 1, ultima_tentativa: agora, bloqueado_ate: null
        });
      } else if (novasTentativas >= MAX_TENTATIVAS) {
        const bloqueioAte = new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1000).toISOString();
        await base44.entities.TentativasAcesso.update(registroExistente.id, {
          tentativas: novasTentativas, ultima_tentativa: agora, bloqueado_ate: bloqueioAte
        });
      } else {
        await base44.entities.TentativasAcesso.update(registroExistente.id, {
          tentativas: novasTentativas, ultima_tentativa: agora
        });
      }
    } else {
      await base44.entities.TentativasAcesso.create({
        username, tipo, tentativas: 1, ultima_tentativa: agora
      });
    }
  } catch {
    // Fail-open: não interromper fluxo de autenticação
  }
}

async function resetarRateLimit(base44, username, tipo) {
  try {
    const registros = await base44.entities.TentativasAcesso.filter({ username, tipo });
    for (const r of registros) {
      await base44.entities.TentativasAcesso.delete(r.id);
    }
  } catch {
    // Ignorar
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: 'Usuário e senha são obrigatórios.' }, { status: 400 });
    }

    const usernameLower = username.trim().toLowerCase();

    const rateCheck = await verificarRateLimit(base44, usernameLower, 'login');
    if (!rateCheck.permitido) {
      return Response.json({ error: rateCheck.mensagem }, { status: 429 });
    }

    const usuarios = await base44.entities.UsuarioSislegis.filter({
      username: usernameLower
    });

    if (!usuarios || usuarios.length === 0) {
      await registrarFalha(base44, usernameLower, 'login', rateCheck.registro);
      return Response.json({ error: 'Nome de usuário ou senha inválidos.' }, { status: 401 });
    }

    const usuario = usuarios[0];

    if (usuario.status === 'Bloqueado' || usuario.status === 'Inativo') {
      return Response.json({ error: 'Usuário bloqueado ou inativo. Entre em contato com o administrador.' }, { status: 403 });
    }

    const senhaValida = await verifyPassword(password, usuario.password_hash);
    if (!senhaValida) {
      await registrarFalha(base44, usernameLower, 'login', rateCheck.registro);
      return Response.json({ error: 'Nome de usuário ou senha inválidos.' }, { status: 401 });
    }

    await resetarRateLimit(base44, usernameLower, 'login');

    const sessionToken = generateToken();
    await base44.entities.UsuarioSislegis.update(usuario.id, {
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