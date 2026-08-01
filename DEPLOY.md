# Guia de Deploy — GHOST BOT SaaS

Este guia descreve os passos e as variáveis de ambiente necessárias para colocar a aplicação em produção com segurança, utilizando a infraestrutura da Vercel e um banco de dados PostgreSQL.

## 1. Variáveis de Ambiente Necessárias

Configure as seguintes variáveis no painel da Vercel (ou no seu arquivo `.env.production`):

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `DATABASE_URL` | String de conexão com o banco de dados PostgreSQL. | `postgres://user:pass@host:5432/db` |
| `BETTER_AUTH_SECRET` | Chave aleatória para criptografia de sessões. | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | URL pública da sua aplicação (sem barra no final). | `https://sua-loja.vercel.app` |
| `CRON_SECRET` | Token de segurança para autorizar o processamento da fila. | `uma-chave-longa-e-aleatoria` |

## 2. Configuração do Cron Job

A aplicação utiliza um sistema de fila para garantir que as mensagens do Telegram sejam enviadas respeitando os limites da API.

1. O arquivo `vercel.json` já está configurado para bater no endpoint `/api/tg/cron`.
2. Certifique-se de que a variável `CRON_SECRET` na Vercel seja **exatamente igual** ao token enviado pelo Vercel Cron (ou configurado manualmente).
3. O agendamento está definido para `* * * * *` (cada minuto) para garantir agilidade nas vendas.

## 3. Banco de Dados (PostgreSQL)

O sistema utiliza **Drizzle ORM**. Antes do primeiro acesso, certifique-se de rodar as migrações:

```bash
pnpm drizzle-kit push
```

*Nota: Se estiver usando Neon ou Supabase, garanta que o limite de conexões seja suficiente (mínimo 10-20), pois o Next.js pode abrir múltiplas conexões em paralelo.*

## 4. Webhooks do Telegram

Ao configurar o token do bot no painel administrativo, o sistema tentará registrar o webhook automaticamente.
- Certifique-se de que a `BETTER_AUTH_URL` esteja correta, pois ela é usada para informar ao Telegram para onde enviar as mensagens.
- Caso o registro automático falhe, você pode clicar em "Conectar Bot" no painel.

## 5. Segurança Adicional

- **HTTPS:** A aplicação exige HTTPS para o funcionamento dos webhooks e cookies de sessão.
- **Secrets:** Nunca compartilhe o `BETTER_AUTH_SECRET` ou `CRON_SECRET`.

---
**Ghost Bot SaaS** — Pronto para escalar sua operação digital.
