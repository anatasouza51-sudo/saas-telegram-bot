# Análise Técnica do Backend — GHOST BOT SaaS

Este documento apresenta uma análise detalhada da arquitetura de backend, segurança e fluxos de dados da aplicação.

## 1. Arquitetura de Banco de Dados (Drizzle ORM + PostgreSQL)
A modelagem de dados segue o padrão **Multi-tenant (SaaS)**, onde o isolamento entre lojas é garantido pela coluna `ownerId` em todas as tabelas críticas.

| Tabela | Estratégia de Performance | Observação |
| :--- | :--- | :--- |
| **settings** | `uniqueIndex` (ownerId, key) | Garante buscas O(1) para configurações de bot e gateways por loja. |
| **stock_items** | `FOR UPDATE SKIP LOCKED` | Implementação robusta para evitar **Double Spending** em vendas simultâneas. |
| **telegram_chats** | `uniqueIndex` (ownerId, chatId) | Evita duplicidade de canais/grupos para o mesmo tenant. |

**Ponto Positivo:** O uso de `numeric(12, 2)` para preços e valores financeiros evita erros de precisão de ponto flutuante comuns em aplicações de e-commerce.

## 2. Lógica do Bot e Escalabilidade
O processamento de mensagens do Telegram é feito via **Webhooks**, o que é mais eficiente que Polling para aplicações SaaS.

*   **Segurança de Webhook:** Implementação de `X-Telegram-Bot-Api-Secret-Token` com comparação em tempo constante (`safeEqual`), protegendo contra ataques de falsificação de identidade.
*   **Resiliência:** Uso de `fire-and-forget` para tarefas não críticas (logs, expiração de pedidos) durante o processamento do webhook, garantindo que o Telegram receba o ACK rapidamente (< 2s).
*   **Concorrência:** O bot utiliza transações SQL puras (`pool.connect()`) em fluxos críticos de pagamento para garantir atomicidade.

## 3. Fluxo de Fulfillment (Entrega Automática)
A lógica de entrega no arquivo `lib/fulfillment.ts` é o coração da aplicação e apresenta alta maturidade técnica:

> "A claim de itens de estoque utiliza a cláusula SQL `SKIP LOCKED`, permitindo que o sistema processe centenas de vendas por segundo sem que uma transação bloqueie a outra."

**Mecanismo de Idempotência:** O sistema verifica o `deliveryStatus === 'delivered'` dentro da transação de trava, impedindo que o mesmo pedido seja entregue duas vezes caso o webhook do gateway de pagamento falhe e tente novamente.

## 4. Segurança e Autorização
*   **RBAC (Role-Based Access Control):** Implementação clara de permissões (`admin`, `products`, `finance`, `support`) via `requireCapability`.
*   **Deduplicação de Sessão:** Uso do `cache()` do React para evitar múltiplas consultas ao banco de dados na mesma requisição, resolvendo problemas comuns de esgotamento de pool de conexões.
*   **Proteção SSR:** Compatibilidade com Next.js 16.2.x garantida através de manipulação manual de headers de cookies.

## 5. Áreas de Atenção e Melhorias Recomendadas
1.  **Índices de Busca:** Recomenda-se adicionar índices nas colunas `status` e `deliveryType` da tabela `products` para otimizar filtros em catálogos grandes.
2.  **Rate Limiting:** O limite atual de 120 requisições/minuto por IP no webhook é adequado, mas pode precisar de ajuste se o bot se tornar viral em grupos muito grandes.
3.  **Logs de Erro:** A captura de erros em processos de fundo (`processSchedules`, `expireDuePixOrders`) deve ser enviada para um serviço de monitoramento (Sentry/Logtail) além do console.

---
**Conclusão:** O backend é altamente profissional, seguro e preparado para escala, com foco especial na integridade das transações financeiras e isolamento de dados entre clientes.
