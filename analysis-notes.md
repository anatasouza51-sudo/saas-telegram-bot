# Análise de Erros - Bot Telegram /start não respondendo

## Problemas Identificados

### 1. Coluna `balance` faltando na tabela `customers`
- **Schema Drizzle** (schema.ts linha 149): define campo `balance: numeric(...)` na tabela customers
- **Migração SQL** (migrate.ts): NÃO cria a coluna `balance` na tabela customers
- **Impacto**: Qualquer query que insira/leia da tabela customers com o campo `balance` vai falhar porque a coluna não existe no banco. Isso pode causar erros silenciosos em queries que o Drizzle gera automaticamente.

### 2. Tabela `balance_transactions` não criada na migração
- **Schema Drizzle** (schema.ts linha 240): define tabela `balance_transactions`
- **Migração SQL** (migrate.ts): NÃO cria a tabela `balance_transactions`
- **Impacto**: Se o código tentar ler/gravar nessa tabela (ex: recargas), vai falhar com "relation does not exist"

### 3. Webhook secret - bug no getOrCreateWebhookSecret
- **Arquivo**: lib/webhook-secrets.ts, linha 64
- **Bug**: Quando a tabela settings não existe, o código tenta inserir o `secret` (não criptografado):
  ```ts
  await db.insert(settings).values({ ownerId: storeId, key: key(provider), value: secret })
  ```
  Mas nos outros caminhos, o valor é armazenado criptografado com `encrypt(secret)`.
- **Impacto**: Se a tabela settings foi criada durante esse caminho de fallback, o secret fica em plaintext. Quando depois é lido, `isEncrypted(val)` retorna false, e o valor é retornado como está. Isso pode causar mismatch se depois o código espera um valor criptografado.

### 4. Validação de IP do Telegram pode falhar em produção
- **Arquivo**: lib/cloudflare.ts
- **Problema**: A função `validateTelegramWebhook` usa `cf-connecting-ip` para obter o IP real. Se o app NÃO está atrás do Cloudflare (ex: Vercel direto), o header `cf-connecting-ip` não existe e o IP será extraído de `x-forwarded-for`.
- **Porém**: A função `clientIpFrom` (security.ts) já lida com isso corretamente, usando cf-connecting-ip primeiro, depois x-vercel-proxied-for, depois x-forwarded-for.
- **Risco real**: O IP extraído pode ser o IP do Vercel/proxy, não do Telegram. A validação contra ranges do Telegram falharia.

### 5. Fluxo do /start - cadeia de dependências
Para o /start funcionar:
1. Telegram envia update → webhook endpoint
2. Webhook valida IP do Telegram (403 se falhar)
3. Webhook valida secret token (401 se falhar)
4. handleUpdate carrega StoreContext (null se não tiver botToken)
5. Verifica se é chat privado (silencioso se não for)
6. upsertCustomer (pode falhar se índice único não existir)
7. renderScreen (envia mensagem via TelegramClient)

**Causas mais prováveis do /start não responder:**
- Webhook não está registrado corretamente (URL errada, secret mismatch)
- IP validation falhando (app não atrás do Cloudflare mas NODE_ENV=production)
- BotToken não configurado na store
- Tabela customers sem coluna `balance` causando erro no upsertCustomer ou queries subsequentes

## Auditoria de Autenticação - Ghost Bot (Atualização)
- **URL de Produção**: `https://ghostsbot.vercel.app`
- **Problema**: O Better Auth em produção na Vercel requer que as variáveis de ambiente `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` (ou `NEXT_PUBLIC_APP_URL`) estejam explicitamente configuradas no painel da Vercel para que os cookies de sessão (`__Secure-better-auth.session_token`) sejam emitidos com segurança e aceitos nas rotas do painel.
