# Análise de Performance - Bot Telegram

## Causas de Lentidão Identificadas

### 1. WEBHOOK ROUTE: Operações bloqueantes que não precisam esperar
O arquivo `app/api/telegram/webhook/[storeId]/route.ts` faz 3 operações SEQUENCIAIS (await) que
bloqueiam a resposta ao Telegram:
- `await recordWebhookEvent(storeId, update)` — 4 gravações em settings
- `await handleUpdate(storeId, update)` — o processamento real do bot
- `await processSchedules()` — processa agendamentos pendentes
- `await expireDuePixOrders()` — varre PIX expirados

O Telegram exige resposta em ≤ 60s. Se processSchedules + expireDuePixOrders + handleUpdate
levam > 5s, o Telegram considera timeout e reenvia o webhook.

### 2. RECORD WEBHOOK EVENT: 4 gravações de settings por update
Cada update recebido dispara 4 calls saveSetting (Promise.all), cada uma fazendo um INSERT/UPDATE
no banco. Para stores com muitos updates, isso é wasteful.

### 3. PROCESS SCHEDULES: Sequencial, bloqueante no webhook
processSchedules() é chamado dentro do webhook. Se houver schedules vencidos, ele processa
todos sequencialmente (await em loop), cada um podendo disparar enqueuePost com mais queries DB.

### 4. EXPIRE DUE PIX ORDERS: Varredura em todo webhook
expireDuePixOrders() faz SELECT em orders + UPDATE para cada ordem expirada + chamada Telegram
para cada mensagem. Isso é pesado e não precisa bloquear o webhook.

### 5. TELEGRAM CLIENT: Sem timeout nas chamadas fetch
callApi() faz fetch sem AbortController/timeout. Se a API do Telegram estiver lenta, o request
fica pendurado indefinidamente, bloqueando o worker.

### 6. LOAD STORE CONTEXT: Query SELECT * settings a cada update
loadStoreContext faz SELECT * FROM settings WHERE ownerId = storeId em TODO update. Se o store
tem muitas settings, isso carrega tudo para memória a cada mensagem.

### 7. BUILD HOME SCREEN: 2 queries DB separadas
buildHomeScreen faz:
- SELECT categorias + SELECT COUNT uncategorized (2 queries sequenciais)
Poderia ser 1 query com JOIN.

### 8. BUILD CATEGORY SCREEN: Query sem LIMIT/PAGINAÇÃO no DB
buildCategoryScreen faz SELECT * FROM products (sem LIMIT!) e depois pagina no JavaScript.
Se um store tem 5000 produtos, carrega todos para memória.

### 9. DISPATCH: answerCallbackQuery para PIX actions é AFTER o processamento
Para pixver: e pixcxl:, o answerCallbackQuery é feito DENTRO da função, que faz queries DB
antes. O botão fica girando até toda a operação terminar.

### 10. DISPATCH: renderScreen faz editMessageText/Photo que pode falhar e refazer
Se o tipo de mensagem mudou (texto->foto ou vice-versa), renderScreen faz delete + send.
Isso adiciona 2 chamadas Telegram extras em vez de 1.
