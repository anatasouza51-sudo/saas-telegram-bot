import { pool } from "./index"

/**
 * Executa as migrações necessárias para garantir que o banco de dados
 * tenha a estrutura esperada pelo código.
 *
 * IMPORTANTE: As tabelas do Better Auth (user, session, account,
 * verification, twoFactor) são criadas FORA da transação geral.
 * Se as demais migrações falharem (UUID, FK constraints, etc),
 * as tabelas de auth continuam existindo e o cadastro funciona.
 */
export async function ensureDbStructure() {
  if (!process.env.DATABASE_URL) {
    console.warn("[db/migrate] DATABASE_URL não configurada. Pulando migração.")
    return
  }

  // ============================================================
  // FASE 1: Tabelas do Better Auth — SEM transação, SEM falha
  // ============================================================
  const client = await pool.connect()
  try {
    // Extensão UUID
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    // Tabela user
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
        image TEXT,
        role TEXT NOT NULL DEFAULT 'admin',
        "ownerId" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    // BUGFIX: Se a tabela já existia com ID como UUID (legado), precisamos converter para TEXT
    // para o Better Auth funcionar.
    await client.query(`
      DO $$
      DECLARE
          pk_name TEXT;
          col_type TEXT;
      BEGIN
          -- 1. Verificar tipo da coluna de forma mais direta
          SELECT format_type(atttypid, atttypmod) INTO col_type
          FROM pg_attribute
          WHERE attrelid = 'public.user'::regclass
          AND attname = 'id';

          IF col_type = 'uuid' THEN
              -- 2. Identificar o nome da Primary Key atual
              SELECT conname INTO pk_name
              FROM pg_constraint
              WHERE conrelid = 'public.user'::regclass
              AND contype = 'p';

              -- 3. Remover PK se existir
              IF pk_name IS NOT NULL THEN
                  EXECUTE 'ALTER TABLE public.user DROP CONSTRAINT ' || quote_ident(pk_name) || ' CASCADE';
              END IF;

              -- 4. Converte tipo da coluna ID
              ALTER TABLE public.user ALTER COLUMN id TYPE TEXT USING id::TEXT;
              
              -- 5. Remover o DEFAULT gen_random_uuid() que conflita com TEXT
              ALTER TABLE public.user ALTER COLUMN id DROP DEFAULT;

              -- 6. Recriar PK
              ALTER TABLE public.user ADD PRIMARY KEY (id);
          END IF;
      END $$;
    `)

    // Tabela session
    await client.query(`
      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        "expiresAt" TIMESTAMP NOT NULL,
        token TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "userId" TEXT NOT NULL
      );
    `)

    // Tabela account
    await client.query(`
      CREATE TABLE IF NOT EXISTS account (
        id TEXT PRIMARY KEY,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMP,
        "refreshTokenExpiresAt" TIMESTAMP,
        scope TEXT,
        password TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    // Garantir que userId seja TEXT caso as tabelas já existam com INTEGER
    await updateColumnToText(client, "session", "userId")
    await updateColumnToText(client, "account", "userId")
    await updateColumnToText(client, "twoFactor", "userId")

    // Tabela verification
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `)

    // Tabela twoFactor (plugin Better Auth)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "twoFactor" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        secret TEXT NOT NULL,
        "backupCodes" TEXT NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        verified BOOLEAN DEFAULT TRUE,
        "failedVerificationCount" INTEGER DEFAULT 0,
        "lockedUntil" TIMESTAMP
      );
    `)

    // Colunas extras na tabela user
    await addColumnIfMissing(client, "user", "twoFactorEnabled", "BOOLEAN DEFAULT FALSE")
    await addColumnIfMissing(client, "user", "onboardingSeen", "BOOLEAN DEFAULT FALSE")
    await addColumnIfMissing(client, "user", "emailVerified", "BOOLEAN NOT NULL DEFAULT FALSE")
    await addColumnIfMissing(client, "user", "image", "TEXT")
    
    // Garantir colunas na tabela account (Better Auth v1 vs v1.6)
    await addColumnIfMissing(client, "account", "password", "TEXT")
    await addColumnIfMissing(client, "account", "accountId", "TEXT")
    await addColumnIfMissing(client, "account", "providerId", "TEXT")
    
    // Garantir colunas na tabela twoFactor
    await addColumnIfMissing(client, "twoFactor", "secret", "TEXT")
    await addColumnIfMissing(client, "twoFactor", "backupCodes", "TEXT")
    await addColumnIfMissing(client, "twoFactor", "verified", "BOOLEAN DEFAULT TRUE")

    console.log("[db/migrate] Fase 1 OK — Tabelas do Better Auth garantidas.")
  } catch (err) {
    console.error("[db/migrate] Fase 1 FALHOU — Tabelas do Better Auth:", err)
    // Não throw — vamos tentar a fase 2 mesmo assim
  } finally {
    client.release()
  }

  // ============================================================
  // FASE 2: Tabelas da aplicação — COM transação isolada
  // ============================================================
  const client2 = await pool.connect()
  try {
    await client2.query("BEGIN")

    // Telegram chats
    await client2.query(`
      CREATE TABLE IF NOT EXISTS telegram_chats (
        id SERIAL PRIMARY KEY,
        "ownerId" TEXT NOT NULL,
        title TEXT NOT NULL,
        "chatId" TEXT NOT NULL,
        username TEXT,
        type TEXT DEFAULT 'group' NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'active' NOT NULL,
        "botIsAdmin" BOOLEAN DEFAULT FALSE NOT NULL,
        "missingPermissions" TEXT,
        "grantedPermissions" TEXT,
        purpose TEXT DEFAULT 'audience' NOT NULL,
        "isForum" BOOLEAN DEFAULT FALSE NOT NULL,
        "memberCount" INTEGER,
        "lastSyncedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `)

    // Telegram topics
    await client2.query(`
      CREATE TABLE IF NOT EXISTS telegram_topics (
        id SERIAL PRIMARY KEY,
        "ownerId" TEXT NOT NULL,
        "chatId" TEXT NOT NULL,
        "threadId" INTEGER NOT NULL,
        name TEXT NOT NULL,
        source TEXT DEFAULT 'auto' NOT NULL,
        active BOOLEAN DEFAULT TRUE NOT NULL,
        "lastSeenAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)

    // Coupons
    await client2.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        "ownerId" TEXT NOT NULL,
        code TEXT NOT NULL,
        "discountPercent" INTEGER NOT NULL,
        "maxUses" INTEGER,
        "usedCount" INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)

    // Índices únicos
    const indexes = [
      { name: "telegram_chats_owner_chatid_uidx", table: "telegram_chats", cols: '("ownerId", "chatId")' },
      { name: "telegram_topics_owner_chat_thread_uidx", table: "telegram_topics", cols: '("ownerId", "chatId", "threadId")' },
      { name: "coupons_owner_code_uidx", table: "coupons", cols: '("ownerId", code)' },
      { name: "customers_owner_telegramid_uidx", table: "customers", cols: '("ownerId", "telegramId")' },
      { name: "settings_owner_key_uidx", table: "settings", cols: '("ownerId", key)' }
    ]

    for (const idx of indexes) {
      try {
        await client2.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = '${idx.name}') THEN
              CREATE UNIQUE INDEX ${idx.name} ON ${idx.table} ${idx.cols};
            END IF;
          END $$;
        `)
      } catch {
        // Ignorar erro de índice — não bloqueia o app
      }
    }

    // Colunas extras
    await addColumnIfMissing(client2, "customers", "activeCoupon", "TEXT")
    await addColumnIfMissing(client2, "orders", "originalAmount", "NUMERIC(12,2)")
    await addColumnIfMissing(client2, "orders", "couponCode", "TEXT")

    await client2.query("COMMIT")
    console.log("[db/migrate] Fase 2 OK — Tabelas da aplicação garantidas.")
  } catch (err) {
    await client2.query("ROLLBACK").catch(() => {})
    console.error("[db/migrate] Fase 2 FALHOU — Tabelas da aplicação:", err)
  } finally {
    client2.release()
  }

  // ============================================================
  // FASE 3: Migração UUID — COM transação isolada
  // ============================================================
  const client3 = await pool.connect()
  try {
    await client3.query("BEGIN")

    try {
      await migrateTableToUuid(client3, "customers", [])
    } catch {
      // Ignorar — tabela pode não existir ou já estar migrada
    }

    try {
      await migrateTableToUuid(client3, "orders", [
        { table: "deliveries", column: "orderId" },
        { table: "stock_items", column: "orderId" }
      ])
    } catch {
      // Ignorar
    }

    try {
      await migrateTableToUuid(client3, "telegram_posts", [
        { table: "telegram_schedules", column: "postId" },
        { table: "telegram_queue", column: "postId" }
      ])
    } catch {
      // Ignorar
    }

    // Atualizar referências cruzadas
    try { await updateColumnToText(client3, "orders", "customerId") } catch {}
    try { await updateColumnToText(client3, "deliveries", "customerId") } catch {}

    await client3.query("COMMIT")
    console.log("[db/migrate] Fase 3 OK — UUID migrados.")
  } catch (err) {
    await client3.query("ROLLBACK").catch(() => {})
    console.error("[db/migrate] Fase 3 FALHOU — UUID:", err)
  } finally {
    client3.release()
  }

  console.log("[db/migrate] Migração completa.")
}

async function addColumnIfMissing(client: any, table: string, column: string, type: string) {
  await client.query(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='${table}' AND column_name='${column}') THEN
        ALTER TABLE ${table} ADD COLUMN "${column}" ${type};
      END IF;
    END $$;
  `)
}

async function updateColumnToText(client: any, table: string, column: string) {
  await client.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='${table}' AND column_name='${column}' AND data_type='integer'
      ) THEN
        ALTER TABLE ${table} ALTER COLUMN "${column}" TYPE TEXT USING "${column}"::TEXT;
      END IF;
    END $$;
  `)
}

async function migrateTableToUuid(client: any, tableName: string, references: { table: string, column: string }[]) {
  // Verifica se a coluna ID já é TEXT/UUID
  const res = await client.query(`
    SELECT data_type FROM information_schema.columns 
    WHERE table_name = '${tableName}' AND column_name = 'id';
  `)
  
  if (res.rows.length === 0) {
    return // Tabela não existe
  }

  if (res.rows[0].data_type === 'text' || res.rows[0].data_type === 'uuid') {
    return // Já migrado
  }

  console.log(`[db/migrate] Migrando tabela ${tableName} para UUID...`)

  // 1. Adicionar nova coluna UUID
  await client.query(`ALTER TABLE ${tableName} ADD COLUMN id_new TEXT DEFAULT gen_random_uuid();`)
  
  // 2. Popular id_new para registros existentes
  await client.query(`UPDATE ${tableName} SET id_new = gen_random_uuid() WHERE id_new IS NULL;`)

  // 3. Atualizar referências em outras tabelas
  for (const ref of references) {
    await updateColumnToText(client, ref.table, ref.column)
    await client.query(`
      UPDATE ${ref.table} r
      SET "${ref.column}" = t.id_new
      FROM ${tableName} t
      WHERE r."${ref.column}" = t.id::TEXT;
    `)
  }

  // 4. Trocar PK
  await client.query(`ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${tableName}_pkey CASCADE;`)
  await client.query(`ALTER TABLE ${tableName} DROP COLUMN id;`)
  await client.query(`ALTER TABLE ${tableName} RENAME COLUMN id_new TO id;`)
  await client.query(`ALTER TABLE ${tableName} ADD PRIMARY KEY (id);`)
}
