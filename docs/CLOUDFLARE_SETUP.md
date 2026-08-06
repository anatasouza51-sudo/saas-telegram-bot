# Cloudflare Setup — SaaS Telegram Bot

## Visão Geral

Este documento descreve a configuração completa do Cloudflare para proteger o webhook do Telegram Bot com DNS, SSL/TLS, proteção DDoS e validação de IP no código da aplicação.

---

## 1. Configuração DNS no Cloudflare

### 1.1 Adicionar o domínio ao Cloudflare

```bash
# No painel Cloudflare:
# 1. Acesse https://dash.cloudflare.com
# 2. Clique em "Add a site"
# 3. Digite seu domínio (ex: meubot.com.br)
# 4. Selecione o plano Free
# 5. Copie os nameservers indicados
# 6. Atualize os nameservers no registrador do domínio
```

### 1.2 Criar registro DNS (via API ou painel)

**Via API:**
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/dns_records" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "A",
    "name": "meubot.com.br",
    "content": "SEU_IP_SERVIDOR",
    "ttl": 1,
    "proxied": true
  }'
```

**Via painel Cloudflare:**
| Tipo | Nome | Conteúdo | Proxy |
|------|------|----------|-------|
| A | `@` | IP do servidor | Proxied (nuvem laranja) |
| CNAME | `www` | `meubot.com.br` | Proxied |

---

## 2. SSL/TLS

### 2.1 Configuração recomendada

No painel Cloudflare → **SSL/TLS** → **Overview**:

| Setting | Valor |
|---------|-------|
| Encryption Mode | **Full (Strict)** |
| Always Use HTTPS | **ON** |
| Minimum TLS Version | **1.2** |
| Opportunistic Encryption | **ON** |
| TLS 1.3 | **ON** |

### 2.2 Por que Full (Strict)?

O modo **Full (Strict)** exige que o servidor de origem tenha um certificado SSL válido. Se usar Vercel, já possui certificado próprio. Para servidor próprio, instale um certificado Let's Encrypt.

---

## 3. Proteção DDoS

### 3.1 WAF — Security Level

No painel Cloudflare → **Security** → **Settings**:

| Setting | Valor |
|---------|-------|
| Security Level | **Medium** |
| Challenge Passage | **15 minutes** |
| Browser Integrity Check | **ON** |

### 3.2 Regra WAF para Webhook do Telegram

No painel Cloudflare → **Security** → **WAF** → **Custom Rules**:

```
Expressão:
  (http.request.uri.path starts with "/api/telegram/webhook")
  AND
  (not ip.src in {149.154.160.0/20 91.108.4.0/22 149.154.164.0/22 149.154.168.0/22 149.154.172.0/23 149.154.174.0/23})

Ação: Block
```

### 3.3 Regra para o resto da aplicação

```
Expressão:
  (http.request.uri.path starts with "/api/telegram/webhook")
Ação: Bypass (permitir sem challenge, pois Telegram não interage com CAPTCHA)
```

---

## 4. Page Rules (opcional)

No painel Cloudflare → **Rules** → **Page Rules**:

### Page Rule 1 — Webhook do Telegram
```
URL: *meubot.com.br/api/telegram/webhook/*
Settings:
  - Security Level: High
  - Disable Apps: On
  - TLS: Strict
```

### Page Rule 2 — API geral
```
URL: *meubot.com.br/api/*
Settings:
  - Cache Level: Bypass
  - Edge Cache TTL: 0
  - Browser Cache TTL: 0
```

---

## 5. Configuração do Código (já implementada)

### 5.1 Variáveis de ambiente

Adicione ao `.env` de produção:

```bash
# URL do domínio Cloudflare (substitui Vercel URL)
BETTER_AUTH_URL=https://meubot.com.br

# Opcional: se quiser debug de IPs
CLOUDFLARE_TRUST_IPS=true
```

### 5.2 Headers Cloudflare reconhecidos pelo app

| Header | Uso |
|--------|-----|
| `CF-Connecting-IP` | IP real do cliente (prioridade máxima) |
| `CF-Ray` | Identificador único da requisição |
| `CF-IPCountry` | País do visitante |

### 5.3 Validação de IP do Telegram (middleware)

O middleware (`middleware.ts`) valida que requisições ao endpoint `/api/telegram/webhook/*` vêm de IPs do Telegram. Isso previne spoofing mesmo que alguém descubra o storeId.

### 5.4 Como o webhook se conecta

Quando o admin salva as configurações no painel, o app chama automaticamente:

```
Telegram API → setWebhook
  URL: https://meubot.com.br/api/telegram/webhook/{storeId}
  Secret Token: (gerado automaticamente)
```

Com Cloudflare ativo, a URL registrada no Telegram será a do domínio Cloudflare, e o Cloudflare roteará a requisição até o servidor real.

---

## 6. Verificação

### 6.1 Verificar se Cloudflare está ativo

```bash
curl -sI https://meubot.com.br | grep -i "cf-ray\|server"
```

Esperado: `cf-ray` header presente e `server: cloudflare`

### 6.2 Verificar webhook do Telegram

```bash
# Via Telegram Bot API
curl "https://api.telegram.org/bot{TOKEN}/getWebhookInfo"
```

Verifique se `url` aponta para o domínio Cloudflare.

### 6.3 Testar proteção DDoS

```bash
# Teste simples (não faça em produção real)
curl -I https://meubot.com.br/api/telegram/webhook/test
# Deve retornar 403 se não vier de IP do Telegram
```

---

## 7. Automação com Script

Execute o script de configuração:

```bash
chmod +x scripts/setup-cloudflare.sh
# Edite as variáveis no topo do script
./scripts/setup-cloudflare.sh
```

---

## 8. Troubleshooting

| Problema | Solução |
|----------|---------|
| Webhook não recebe updates | Verifique se `CF-Connecting-IP` não está sendo bloqueado pela regra WAF |
| Erro 522 (Connection timed out) | Verifique se o servidor de origem está acessível via IP direto |
| Erro 403 no webhook | Verifique a regra WAF do Telegram — IPs do Telegram podem estar bloqueados |
| SSL handshake failed | Mude Encryption Mode para "Full" (não Strict) temporariamente |
| Timeout no webhook | Aumente o `maxDuration` no `vercel.json` (já está em 30s) |
