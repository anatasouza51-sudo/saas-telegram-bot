# Análise do Problema de Postagem

## Fluxo atual quando usuário clica "Publicar agora":

1. `post-editor.tsx` → chama `publishNow(input, targets)` via Server Action
2. `publishNow()` → salva post no DB → chama `enqueuePost()` → insere rows na `telegramQueue`
3. `publishNow()` retorna `{ enqueued: N }` → UI mostra toast "Postagem enfileirada para N destino(s)"

## O problema:
`publishNow()` apenas ENFILEIRA os itens. O envio real depende de `processQueue()`.

## Quem chama `processQueue()`?
1. **Cron route** (`/api/tg/cron`) — roda a cada minuto via Vercel Cron
2. **Webhook route** (`/api/telegram/webhook/[storeId]`) — chamava `processSchedules()` fire-and-forget, mas NÃO chamava `processQueue()`

## Causa raiz:
Quando o usuário clica "Publicar agora", os itens ficam na fila com `scheduledFor: new Date()` (agora).
Mas ninguém processa a fila imediatamente. O usuário precisa esperar o próximo cron tick (até 1 minuto).

## Correção mínima:
Chamar `processQueue()` imediatamente após `enqueuePost()` dentro de `publishNow()`.
Usar fire-and-forget para não bloquear a resposta da action.

## Arquivos envolvidos:
- `app/actions/tg-posts.ts` — onde `publishNow()` está definido
- `lib/tg/queue.ts` — onde `processQueue()` está definido (já importado)
