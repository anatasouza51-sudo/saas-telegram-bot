#!/bin/bash
# ============================================================
# Cloudflare Setup Script — DNS, SSL, DDoS Protection
# ============================================================
# Usage: Edit variables below and run:
#   chmod +x scripts/setup-cloudflare.sh
#   ./scripts/setup-cloudflare.sh
# ============================================================

# --- CONFIGURAÇÃO ---
CLOUDFLARE_API_TOKEN="seu-cloudflare-api-token"
ZONE_ID="seu-zone-id-do-cloudflare"
DOMAIN="seu-dominio.com"
SERVER_IP="seu-ip-do-servidor"  # ou IP da Vercel se aplicável
# --- FIM CONFIGURAÇÃO ---

echo "=== Configurando DNS no Cloudflare ==="

# 1. Criar registro A apontando para o servidor
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{
    \"type\": \"A\",
    \"name\": \"${DOMAIN}\",
    \"content\": \"${SERVER_IP}\",
    \"ttl\": 1,
    \"proxied\": true,
    \"comment\": \"App principal - SaaS Telegram Bot\"
  }" | python3 -m json.tool

# 2. Criar registro CNAME para www (opcional)
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{
    \"type\": \"CNAME\",
    \"name\": \"www\",
    \"content\": \"${DOMAIN}\",
    \"ttl\": 1,
    \"proxied\": true,
    \"comment\": \"WWW redirect\"
  }" | python3 -m json.tool

echo ""
echo "=== SSL/TLS Settings ==="
echo "Ative no painel Cloudflare > SSL/TLS:"
echo "  - Encryption Mode: Full (Strict)"
echo "  - Always Use HTTPS: ON"
echo "  - Minimum TLS Version: 1.2"
echo "  - Opportunistic Encryption: ON"

echo ""
echo "=== Proteção DDoS ==="
echo "Ative no painel Cloudflare > Security > WAF:"
echo "  - Security Level: Medium"
echo "  - Challenge Passage: 15 min"
echo "  - Browser Integrity Check: ON"
echo "  - Web Application Firewall: Managed Rules"

echo ""
echo "=== Telegram Webhook Protection ==="
echo "Crie uma Page Rule ou Worker para o endpoint /api/telegram/webhook/*:"
echo "  - Security Level: High (ou I'm Under Attack! durante ataques)"
echo "  - Disable Apps: ON (evita interferência de apps do Cloudflare)"
echo "  - TLS: Strict"

echo ""
echo "=== Regra WAF para Telegram (recomendado) ==="
echo "No Cloudflare WAF, crie uma regra customizada:"
echo "  IF (URI Path starts with \"/api/telegram/webhook\")"
echo "    AND (CF-Connecting-IP NOT IN Telegram IP Ranges)"
echo "  THEN: Block"
echo ""
echo "Telegram IP ranges:"
echo "  149.154.160.0/20"
echo "  91.108.4.0/22"
echo "  149.154.164.0/22"
echo "  149.154.168.0/22"
echo "  149.154.172.0/23"
echo "  149.154.174.0/23"

echo ""
echo "=== Headers de Segurança (já aplicados no Next.js) ==="
echo "  X-Content-Type-Options: nosniff"
echo "  Strict-Transport-Security: max-age=63072000"
echo "  X-Frame-Options: DENY"
echo "  Content-Security-Policy: (ver next.config.mjs)"
