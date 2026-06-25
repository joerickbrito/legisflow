# Guia de Segurança — LegisFlow

> Documento de referência e auditoria. **Nenhuma alteração de código foi feita** para gerá‑lo.
> Serve para entender, priorizar e manter a segurança do sistema ao longo do tempo.

> ⚠️ **AVISO IMPORTANTE:** este arquivo descreve fragilidades específicas do sistema. **Não publique‑o em repositório público.** Se o seu repositório do GitHub for público, adicione `GUIA-SEGURANCA.md` ao `.gitignore` ou mova o arquivo para um local privado. Tratar este documento como confidencial.

Última atualização: 25/06/2026

---

## Índice

1. [Como usar este guia](#1-como-usar-este-guia)
2. [Princípios fundamentais](#2-princípios-fundamentais-de-segurança)
3. [OWASP Top 10 (2025) aplicado ao LegisFlow](#3-owasp-top-10-2025-aplicado-ao-legisflow)
4. [Como o LegisFlow está montado (modelo de segurança)](#4-como-o-legisflow-está-montado-modelo-de-segurança)
5. [O que já está bem feito](#5-o-que-já-está-bem-feito)
6. [Achados da auditoria (priorizados)](#6-achados-da-auditoria-priorizados)
7. [Dados pessoais e LGPD](#7-dados-pessoais-e-lgpd)
8. [Autenticação, senhas e sessões](#8-autenticação-senhas-e-sessões)
9. [HTTPS, domínio e cabeçalhos de segurança](#9-https-domínio-e-cabeçalhos-de-segurança)
10. [Checklist priorizado de ações](#10-checklist-priorizado-de-ações)
11. [Como manter o site seguro (rotina)](#11-como-manter-o-site-seguro-rotina)
12. [Plano de resposta a incidentes](#12-plano-de-resposta-a-incidentes)
13. [Glossário](#13-glossário)
14. [Fontes](#14-fontes)

---

## 1. Como usar este guia

Este documento tem duas partes que se complementam:

- **Teoria** (seções 2, 3, 9, 13): o que é segurança web, quais são os riscos mais comuns hoje e o vocabulário do assunto. Leitura para entender o "porquê".
- **Prático** (seções 4 a 8, 10 a 12): a situação real do LegisFlow, o que está bom, o que precisa melhorar, em que ordem, e como não deixar a segurança se degradar com o tempo.

Cada achado tem uma **severidade**:

- 🔴 **Crítico** — pode expor dados ou permitir invasão agora; resolver o quanto antes.
- 🟠 **Alto** — risco relevante; planejar correção em seguida.
- 🟡 **Médio** — boa prática importante; melhora o padrão geral.
- 🔵 **Baixo / informativo** — refinamento.

Importante: a regra de ouro é **"defesa em profundidade"** — nunca depender de uma única proteção. Mesmo com pontos a melhorar, o LegisFlow já tem várias camadas boas. O objetivo aqui é fechar as brechas sem quebrar o que funciona.

---

## 2. Princípios fundamentais de segurança

Antes dos detalhes técnicos, sete princípios que guiam todas as decisões:

1. **Defesa em profundidade.** Várias camadas independentes. Se uma falhar, a próxima segura. Ex.: validar permissão no front *e* no back *e* no banco.
2. **Menor privilégio.** Cada usuário (e cada parte do sistema) só pode fazer o mínimo necessário. Um vereador não precisa poder excluir uma câmara.
3. **Nunca confiar no cliente.** Tudo que vem do navegador (formulários, parâmetros, `tenant_id`, etc.) pode ser forjado. A decisão de segurança tem de ser tomada no servidor.
4. **Seguro por padrão.** O estado inicial deve ser fechado; abre‑se o acesso conscientemente, item a item — e não o contrário.
5. **Reduzir a superfície de ataque.** Menos endpoints abertos, menos campos expostos, menos dados guardados = menos coisa para dar errado.
6. **Falhar de forma segura.** Quando algo dá erro, o sistema deve negar o acesso e não vazar detalhes internos na mensagem de erro.
7. **Privacidade desde a concepção (privacy by design).** Coletar só o necessário, expor só o público, proteger o resto — especialmente dados pessoais (LGPD).

---

## 3. OWASP Top 10 (2025) aplicado ao LegisFlow

A **OWASP Top 10** é a lista de referência mundial dos riscos mais comuns em aplicações web, mantida pela OWASP Foundation. A edição **2025** é a mais recente. Abaixo, cada categoria com uma explicação curta e como ela se aplica ao LegisFlow.

| # | Categoria (2025) | O que é | Situação no LegisFlow |
|---|---|---|---|
| **A01** | **Broken Access Control** (Falha de Controle de Acesso) | Usuário consegue acessar dados/ações que não deveria. **#1 risco do mundo.** | 🔴 **Ponto mais sensível.** As proteções de acesso vivem no proxy `operarEntidade`, mas o banco (RLS) está aberto — dá para acessar dados direto, sem passar pelo proxy. Ver seção 6.1. |
| **A02** | **Security Misconfiguration** (Configuração Insegura) | Configurações padrão, permissões frouxas, falta de cabeçalhos de segurança. Subiu para #2. | 🟠 RLS aberto + ausência de cabeçalhos de segurança/CSP. Ver 6.1 e 9. |
| **A03** | **Software Supply Chain Failures** (Cadeia de Suprimentos) | Risco vindo de bibliotecas de terceiros, dependências, ferramentas de build. Categoria nova. | 🟡 Depende de pacotes npm e do SDK do Base44. Ver seção 11. |
| **A04** | **Cryptographic Failures** (Falhas de Criptografia) | Dados sensíveis sem criptografia adequada, em trânsito ou em repouso. | 🟢 Senhas com PBKDF2+salt (bom). 🟠 PII (CPF/RG) trafega legível porque o RLS é aberto. Ver 7. |
| **A05** | **Injection** (Injeção — SQL, XSS, etc.) | Entrada do usuário interpretada como código/comando. | 🟢 React escapa HTML por padrão (reduz XSS) e não há SQL manual. Manter cuidado com `dangerouslySetInnerHTML` e uploads. |
| **A06** | **Insecure Design** (Design Inseguro) | A falha está na arquitetura, não num bug pontual. | 🟠 O desenho "segurança só na aplicação, banco aberto" é frágil por concepção. Ver 4. |
| **A07** | **Identification & Authentication Failures** | Login fraco, senhas fracas, sessões mal gerenciadas. | 🟢 Boa base (hash forte, rate limit, token aleatório). 🟡 Sessão sem expiração. Ver 8. |
| **A08** | **Software & Data Integrity Failures** | Atualizações/dados sem verificação de integridade; logs adulteráveis. | 🟠 `LogAuditoria` com RLS aberto pode ser forjado/apagado. Ver 6.3. |
| **A09** | **Security Logging & Alerting Failures** | Não registrar eventos de segurança ou não ser avisado deles. | 🟡 Existe auditoria, mas não é confiável (ver A08) nem há alertas. Ver 6.3 e 11. |
| **A10** | **Mishandling of Exceptional Conditions** (Erros) | Tratamento ruim de erros: vazar detalhes, "falhar aberto". Categoria nova. | 🟡 Erros 500 devolvem `error.message` ao cliente. Ver 6.5. |

**Resumo:** os riscos mais relevantes para vocês hoje são **A01 (controle de acesso)** e **A02 (configuração)**, ambos ligados ao mesmo ponto: o banco de dados está acessível diretamente, sem passar pelas regras da aplicação.

---

## 4. Como o LegisFlow está montado (modelo de segurança)

Entender isto é a chave de tudo. O LegisFlow tem **duas camadas** onde a segurança *poderia* ser aplicada:

### Camada 1 — Aplicação (o proxy `operarEntidade`)

Quase tudo que o sistema faz com dados passa por uma função de backend chamada `operarEntidade`. Ela é muito bem feita e faz, em toda operação:

- Exige login (valida o `session_token`).
- Aceita apenas entidades de uma lista permitida (allowlist).
- Checa o **papel** do usuário (só ADMIN cria/edita; só SUPER_ADMIN/ADMIN_CAMARA exclui).
- Força o **isolamento por câmara** (`tenant_id`) em listar, filtrar, obter, criar, editar e excluir.
- Remove campos sensíveis (`password_hash`, `session_token`) antes de responder.

Esta camada é o ponto forte do sistema.

### Camada 2 — Banco de dados (RLS do Base44)

O Base44 oferece **RLS (Row Level Security)** — regras no próprio banco que dizem quem pode ler/criar/editar/excluir cada registro, *independentemente* do que a aplicação faz. É a "tranca do cofre".

**Hoje essa tranca está aberta** na maioria das entidades (`"read": null, "create": null, ...`). Isso foi necessário porque, na configuração atual, ativar RLS restritivo **quebrava as leituras do próprio app** (o acesso via `asServiceRole` parou de funcionar com as regras automáticas do botão "Corrigir" do Base44).

### Por que isso é um problema

O cliente do navegador é criado com `requiresAuth: false` e o **portal de transparência chama o banco diretamente** (`base44.entities.Parlamentar.filter(...)`), sem passar pelo `operarEntidade`. Isso **só funciona porque o RLS está aberto**.

A consequência é que **qualquer pessoa** — não só o portal — pode fazer a mesma chamada direta ao banco e:

- **Ler todos os registros de todas as câmaras** (basta não enviar o filtro `tenant_id`), incluindo dados que deveriam ser privados.
- Provavelmente **criar, editar e excluir** registros nas entidades com `create/update/delete: null`, **ignorando completamente** todas as checagens de papel do `operarEntidade`.

Em outras palavras: a Camada 1 é excelente, mas pode ser **contornada**, porque a Camada 2 está aberta. É o equivalente a ter um porteiro rigoroso na porta da frente, mas a porta dos fundos destrancada.

> Isto não é teoria distante: a própria plataforma Base44 já teve falhas públicas de bypass de autenticação e exposição de dados (relatadas pela Imperva em 2025). Por isso **não se deve depender só da plataforma** — a configuração do seu app importa.

A seção 6.1 detalha o risco e a seção 10 propõe um caminho **seguro** para fechar isso sem quebrar o portal de transparência.

---

## 5. O que já está bem feito

É importante reconhecer: a base de segurança do LegisFlow é **acima da média** para um sistema deste porte. Pontos fortes confirmados na auditoria:

- ✅ **Proxy centralizado de dados** (`operarEntidade`) com login obrigatório, allowlist de entidades, controle por papel e isolamento por câmara em todas as operações.
- ✅ **Senhas com hash forte:** PBKDF2‑SHA256, 100.000 iterações, **salt aleatório por usuário**. Senhas nunca são guardadas em texto puro.
- ✅ **Tokens de sessão aleatórios e fortes** (256 bits, gerados por `crypto.getRandomValues`).
- ✅ **Proteção contra força bruta no login:** máximo de 5 tentativas em 15 min, com bloqueio de 15 min (entidade `TentativasAcesso`).
- ✅ **Mensagens de erro genéricas no login** ("usuário ou senha inválidos") — dificulta descobrir quais usuários existem.
- ✅ **Sanitização de campos sensíveis:** `password_hash` e `session_token` nunca são enviados ao navegador.
- ✅ **Entidades sensíveis protegidas por RLS:** `UsuarioSislegis`, `SolicitacoesRecuperacaoSenha` e `TentativasAcesso` têm regras restritivas (não estão abertas).
- ✅ **Sessão encerra ao fechar a guia** (uso de `sessionStorage`) — ótimo para computadores compartilhados da câmara.
- ✅ **Bloqueio de exclusão com checagem de vínculos** (`verificarVinculos`) — evita apagar dados em uso.

---

## 6. Achados da auditoria (priorizados)

### 6.1 🔴 Crítico — Banco acessível diretamente (RLS aberto)

**O quê:** entidades como `Camara`, `Materia`, `Parlamentar`, `Partido`, `LogAuditoria` (e a maioria das demais) estão com `"read/create/update/delete": null`. Combinado com o cliente `requiresAuth: false`, isso permite que **qualquer pessoa** leia — e provavelmente escreva/exclua — dados diretamente, sem passar pelas regras do `operarEntidade`.

**Impacto:**
- Vazamento de dados entre câmaras (quebra do isolamento multi‑tenant na prática).
- Exposição de dados pessoais (ver 6.2).
- Possível criação/alteração/exclusão de registros por terceiros, ignorando papéis e permissões.

**Mapeamento OWASP:** A01 (Broken Access Control), A02 (Misconfiguration).

**Como resolver SEM quebrar o site:** esta é a correção mais delicada, por isso está detalhada como projeto à parte na seção 10 (P0). Em resumo, há três caminhos possíveis, do mais simples ao mais completo:
1. **Field‑Level Security (FLS) imediato** nas entidades com PII (esconder CPF/RG/endereço da leitura pública) — reduz muito o dano sem mexer no fluxo.
2. **RLS de leitura pública só onde precisa** (entidades do portal) e **RLS fechado** nas demais, testando uma a uma para não repetir a quebra anterior.
3. **Mover o portal de transparência para uma função de backend** dedicada (que devolve só campos públicos) e então **fechar o RLS** de todas as entidades — solução definitiva.

> ❗ **Não clicar no botão "Corrigir" do Base44** em massa: foi exatamente isso que quebrou as leituras antes. Qualquer mudança de RLS deve ser feita entidade por entidade, com teste de ponta a ponta.

### 6.2 🟠 Alto — Dados pessoais expostos no portal e no banco

**O quê:** a entidade `Parlamentar` guarda **CPF, RG, título de eleitor, endereço, data de nascimento, e‑mail e telefone**. Como o RLS está aberto e o portal busca o registro inteiro (`base44.entities.Parlamentar.filter(...)`), esses dados:

- Trafegam para o navegador de qualquer visitante do portal, mesmo que não apareçam na tela.
- Podem ser lidos diretamente por qualquer um, de todas as câmaras.

**Impacto:** violação de **LGPD** (dados pessoais sensíveis expostos sem base legal). Risco jurídico e reputacional para a câmara.

**Mapeamento OWASP:** A01, A04. Ver seção 7.

**Como resolver:** o portal só deve receber campos públicos (nome, nome parlamentar, foto, partido, cargo, biografia, gabinete). CPF/RG/título/endereço/nascimento **nunca** devem sair do servidor para o portal público — usar FLS e/ou uma função de backend que selecione só os campos públicos.

### 6.3 🟠 Alto — Log de auditoria adulterável

**O quê:** `LogAuditoria` está com RLS aberto (`create/read/update/delete: null`). Logs são uma **ferramenta de segurança**: servem para investigar incidentes. Se qualquer um pode lê‑los, criá‑los ou apagá‑los, eles deixam de ser confiáveis.

**Impacto:** um invasor pode apagar rastros ou forjar registros; e os logs podem revelar informações a quem não deveria.

**Mapeamento OWASP:** A08 (Integrity), A09 (Logging Failures).

**Como resolver:** logs devem ser **somente‑gravação** pela aplicação e **somente‑leitura** para administradores; nunca editáveis/excluíveis pelo cliente. Fechar o RLS de `LogAuditoria` (criação via backend, leitura restrita a SUPER_ADMIN/ADMIN_CAMARA da própria câmara).

### 6.4 🟡 Médio — Sessão sem expiração

**O quê:** o `session_token` fica salvo no registro do usuário e só é trocado no próximo login ou troca de senha. Não há prazo de validade.

**Impacto:** um token que vaze (ex.: copiado de um computador) continua válido indefinidamente.

**Mapeamento OWASP:** A07.

**Como resolver:** registrar a data de emissão do token e recusá‑lo após um prazo (ex.: 12–24 h), exigindo novo login. Combinado com o `sessionStorage` já adotado, fecha bem o ciclo.

### 6.5 🟡 Médio — Mensagens de erro vazam detalhes internos

**O quê:** em falhas inesperadas (HTTP 500), as funções devolvem `error.message` ao cliente.

**Impacto:** detalhes internos (nomes de campos, estrutura, bibliotecas) ajudam um atacante a planejar ataques.

**Mapeamento OWASP:** A10, A02.

**Como resolver:** devolver uma mensagem genérica ao cliente ("Erro interno. Tente novamente.") e registrar o detalhe completo apenas no log do servidor.

### 6.6 🟡 Médio — Ausência de cabeçalhos de segurança / CSP

Ver seção 9. Depende em parte da hospedagem (Base44/domínio), mas é uma camada importante contra XSS e clickjacking.

### 6.7 🔵 Baixo — Iterações de PBKDF2 abaixo da recomendação atual

**O quê:** o hash de senha usa 100.000 iterações. A recomendação atual da OWASP para PBKDF2‑HMAC‑SHA256 é **600.000**.

**Impacto:** baixo (o salt aleatório já protege bem), mas aumentar dificulta ataques de força bruta caso o banco vaze.

**Como resolver:** elevar gradualmente as iterações; re‑hashear no próximo login bem‑sucedido de cada usuário.

### 6.8 🔵 Baixo — Possível enumeração de usuários por outras rotas

**O quê:** o login não revela quais usuários existem (bom), mas a função `buscarEmailPorUsername` e o fluxo de recuperação de senha podem confirmar a existência de um usuário.

**Como resolver:** padronizar respostas (sempre "se o usuário existir, enviaremos as instruções"), e aplicar rate limit também nessas rotas.

---

## 7. Dados pessoais e LGPD

O LegisFlow lida com duas naturezas de dado, e a regra muda para cada uma:

**Dados públicos (devem aparecer no portal de transparência):**
- Nome e nome parlamentar, foto, partido, cargo, biografia, gabinete.
- Matérias, normas, sessões, atas, pautas, emendas impositivas — atos públicos do Legislativo.

**Dados pessoais / privados (NUNCA devem ir ao portal nem ficar legíveis publicamente):**
- **CPF, RG, título de eleitor, data de nascimento, endereço residencial, telefone e e‑mail pessoais** dos parlamentares.
- Dados de `Camara`/`CasaLegislativa` como CNPJ e contatos internos (avaliar caso a caso).
- Tudo de `UsuarioSislegis` (já protegido).

**Princípios LGPD a aplicar:**
- **Minimização:** o portal só recebe os campos que vai mostrar. Nada de "puxar o registro inteiro e esconder no front" — se o dado chegou ao navegador, ele vazou.
- **Finalidade:** dado coletado para cadastro interno não pode ser publicado sem base legal.
- **Segurança:** dado pessoal protegido por controle de acesso real (RLS/FLS), não só pela tela.

> A correção do item 6.2 é também a principal ação de conformidade com a LGPD. Recomenda‑se priorizá‑la.

---

## 8. Autenticação, senhas e sessões

**O que está bom (manter):** hash PBKDF2+salt, token aleatório, rate limit de login, mensagens genéricas, checagem de status (bloqueado/inativo), logout ao fechar a guia.

**Melhorias recomendadas:**

1. **Expiração de sessão** (ver 6.4): token com validade de 12–24 h.
2. **Política de senha forte** no cadastro/troca: mínimo de 10–12 caracteres, recusar senhas comuns (ex.: "123456", "camara2024"). Idealmente comparar com listas de senhas vazadas.
3. **Logout por inatividade** (opcional, ótimo para PC compartilhado): encerrar após X minutos sem uso.
4. **Senhas temporárias** com expiração curta e troca obrigatória no primeiro acesso (parece já existir o conceito de `senha_temporaria` — garantir que expira).
5. **2FA (autenticação em dois fatores)** para perfis administrativos (SUPER_ADMIN, ADMIN_CAMARA): é a melhoria de maior impacto contra roubo de conta. Pode ser por e‑mail/app autenticador, num segundo momento.
6. **Aumentar iterações do PBKDF2** para ~600.000 (ver 6.7).

---

## 9. HTTPS, domínio e cabeçalhos de segurança

Quando você escolher e configurar o domínio, garanta:

**HTTPS sempre (obrigatório).** Todo o tráfego cifrado. A plataforma de hospedagem normalmente já fornece o certificado; confirme que o acesso por `http://` redireciona para `https://`.

**Cabeçalhos de segurança HTTP** (configurados na hospedagem/CDN/domínio). Ordem recomendada de implantação, do mais seguro/simples ao mais trabalhoso:

1. **HSTS (Strict-Transport-Security):** força o navegador a só usar HTTPS.
   `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
2. **X-Content-Type-Options:** `nosniff` — impede o navegador de "adivinhar" tipos de arquivo.
3. **Referrer-Policy:** `strict-origin-when-cross-origin` — limita o vazamento de URLs.
4. **Anti‑clickjacking:** preferir `Content-Security-Policy: frame-ancestors 'self'` (substitui o antigo `X-Frame-Options`). Atenção: o **telão** abre em janela própria do mesmo domínio, então `'self'` é compatível.
5. **CSP (Content-Security-Policy):** a proteção mais forte contra XSS, e a mais delicada. **Implantar primeiro em modo de teste** (`Content-Security-Policy-Report-Only`), observar os bloqueios que ocorreriam, ajustar, e só então ativar de verdade. Como o app usa Vite/React e carrega recursos do Base44, a política precisa liberar essas origens.

> Dica: depois de configurar, teste o domínio em ferramentas como *Mozilla Observatory* ou *securityheaders.com* para ver a nota e o que falta.

---

## 10. Checklist priorizado de ações

Ordem sugerida. **Nada aqui exige quebrar o site** se feito com cuidado e testes.

### P0 — Fazer primeiro (risco crítico de dados)

- [ ] **Proteger os dados pessoais do `Parlamentar`** (CPF, RG, título, endereço, nascimento): aplicar Field‑Level Security e/ou trocar a busca do portal por uma seleção de campos públicos. *(itens 6.1, 6.2, 7)*
- [ ] **Mover a leitura do portal de transparência para uma função de backend** que devolve só campos públicos — pré‑requisito para fechar o RLS com segurança. *(item 6.1)*
- [ ] **Fechar o RLS das entidades, uma a uma, com teste de ponta a ponta** após o passo acima. Começar pelas que têm dados pessoais. **Nunca usar "Corrigir" em massa.** *(item 6.1)*
- [ ] **Fechar o RLS de `LogAuditoria`** (gravação via backend, leitura restrita a admins). *(item 6.3)*

### P1 — Em seguida (endurecimento)

- [ ] **Expiração de sessão** (token com validade). *(6.4)*
- [ ] **Mensagens de erro genéricas** ao cliente; detalhe só no log do servidor. *(6.5)*
- [ ] **Cabeçalhos de segurança + HTTPS/HSTS** ao configurar o domínio; CSP em modo report‑only primeiro. *(9)*
- [ ] **Política de senha forte** no cadastro/troca. *(8)*

### P2 — Melhorias de padrão

- [ ] **2FA para perfis administrativos.** *(8)*
- [ ] **Logout por inatividade.** *(8)*
- [ ] **Aumentar iterações do PBKDF2** (~600k) com re‑hash no login. *(6.7)*
- [ ] **Padronizar respostas anti‑enumeração** e rate limit nas rotas de recuperação. *(6.8)*
- [ ] **Alertas** para eventos críticos (muitas falhas de login, exclusões em massa). *(11)*

---

## 11. Como manter o site seguro (rotina)

Segurança não é um projeto que termina; é manutenção contínua.

**A cada mudança de código:**
- Perguntar "isto cria um novo caminho para os dados?" Se sim, a permissão é checada no **backend**?
- Nunca enviar ao navegador mais campos do que a tela usa.
- Não introduzir `dangerouslySetInnerHTML` sem sanitização; cuidado com conteúdo vindo de upload.

**Dependências (cadeia de suprimentos — A03):**
- Rodar `npm audit` periodicamente e atualizar pacotes com vulnerabilidade conhecida.
- Manter o SDK do Base44 atualizado.
- Não adicionar bibliotecas sem necessidade (cada uma é superfície de ataque).

**Deploy:**
- Confirmar que segredos (chaves, tokens) **não** estão no código/repositório. Usar variáveis de ambiente.
- Revisar periodicamente o **Application Security Center do Base44** — entendendo que os avisos de RLS refletem o item 6.1 e só somem quando ele for tratado de verdade.

**Periodicamente (ex.: a cada trimestre):**
- Revisar usuários e papéis: remover contas inativas, conferir quem é admin.
- Revisar este checklist e atualizar este documento.
- Testar o domínio em *securityheaders.com* / *Mozilla Observatory*.

**Monitoramento (A09):**
- Garantir que ações sensíveis (login, criação/edição/exclusão, reset de senha) geram log confiável.
- Definir alertas simples para padrões anômalos (muitas falhas de login, exclusões em volume).

---

## 12. Plano de resposta a incidentes

Ter um plano *antes* de precisar dele reduz o estrago. Passos mínimos:

1. **Conter:** se houver suspeita de vazamento ou invasão, suspender o acesso afetado (bloquear usuário, invalidar sessões — trocar tokens).
2. **Avaliar:** o que foi acessado/alterado? Os logs ajudam (por isso eles precisam ser confiáveis — item 6.3).
3. **Erradicar:** corrigir a brecha que permitiu o incidente.
4. **Recuperar:** restaurar dados de backup se necessário; confirmar que o sistema voltou íntegro.
5. **Comunicar:** em caso de vazamento de dados pessoais, a **LGPD pode exigir comunicação à ANPD e aos titulares** afetados. Avaliar com apoio jurídico.
6. **Aprender:** registrar a causa e o que mudou para não repetir.

Pré‑requisitos que valem investir desde já: **backups regulares** dos dados, **logs confiáveis** e a **capacidade de invalidar sessões** rapidamente.

---

## 13. Glossário

- **RLS (Row Level Security):** regras no banco que controlam quem acessa cada linha/registro. A "tranca" no nível dos dados.
- **FLS (Field Level Security):** controle de quais *campos* de um registro cada um pode ver.
- **Multi‑tenant / tenant_id:** vários clientes (câmaras) no mesmo sistema, isolados por um identificador. "Isolamento de tenant" = uma câmara não enxerga dados da outra.
- **XSS (Cross‑Site Scripting):** injeção de scripts maliciosos numa página para roubar dados/sessão.
- **CSRF:** forçar o navegador de um usuário logado a fazer uma ação sem ele querer.
- **Clickjacking:** enganar o usuário a clicar em algo invisível, geralmente via iframe.
- **Hash + salt:** transformação irreversível da senha + valor aleatório por usuário, para que o banco nunca guarde a senha real.
- **PBKDF2:** algoritmo que torna o cálculo do hash propositalmente lento, dificultando força bruta.
- **HSTS:** cabeçalho que obriga o uso de HTTPS.
- **CSP (Content Security Policy):** cabeçalho que restringe de onde a página pode carregar scripts/recursos — forte contra XSS.
- **asServiceRole:** modo do Base44 em que o backend acessa dados com privilégio total (por isso as regras de papel precisam ser checadas na aplicação).
- **Superfície de ataque:** o conjunto de todos os pontos por onde um sistema pode ser atacado.

---

## 14. Fontes

- [OWASP Top 10:2025 — Introdução](https://owasp.org/Top10/2025/0x00_2025-Introduction/)
- [OWASP Top 10:2025 — Lista](https://owasp.org/Top10/2025/)
- [OWASP Top Ten — Projeto](https://owasp.org/www-project-top-ten/)
- [OWASP — HTTP Security Response Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [OWASP — Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [MDN — Strict-Transport-Security (HSTS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security)
- [Base44 — Documentação de Segurança (Entities)](https://docs.base44.com/developers/backend/resources/entities/security)
- [Base44 — Trust Center](https://base44.com/security)
- [Imperva — Critical Flaws in Base44 (2025)](https://www.imperva.com/blog/critical-flaws-in-base44-exposed-sensitive-data-and-allowed-account-takeovers/)

---

*Documento gerado como auditoria e referência. Mantenha‑o privado e atualize‑o conforme o sistema evoluir.*
