-- Forum topics (tópicos) support: choose which topic of a supergroup a post
-- is delivered to. Idempotent — safe to run more than once.

CREATE TABLE IF NOT EXISTS telegram_topics (
  id serial PRIMARY KEY,
  "ownerId" text NOT NULL,
  "chatId" text NOT NULL,
  "threadId" integer NOT NULL,
  name text NOT NULL,
  source text NOT NULL DEFAULT 'auto',
  active boolean NOT NULL DEFAULT true,
  "lastSeenAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS telegram_topics_owner_chat_thread_uidx
  ON telegram_topics ("ownerId", "chatId", "threadId");

ALTER TABLE telegram_chats
  ADD COLUMN IF NOT EXISTS "isForum" boolean NOT NULL DEFAULT false;

ALTER TABLE telegram_queue
  ADD COLUMN IF NOT EXISTS "messageThreadId" integer;

ALTER TABLE telegram_templates
  ADD COLUMN IF NOT EXISTS "defaultTargets" text;
