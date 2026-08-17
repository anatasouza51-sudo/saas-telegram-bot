-- Part 4C: multi-tenant Row-Level Security.
--
-- This migration intentionally targets only application tables. Better Auth
-- tables (user, session, account, verification, twoFactor) and optional 2FA
-- tables remain outside the tenant policy because they are control-plane data.
--
-- PostgreSQL requires at least one permissive policy for a table to expose rows.
-- Each table therefore receives a permissive tenant gate plus a restrictive
-- defense-in-depth gate. Both predicates are identical and fail closed when
-- app.current_tenant is absent (current_setting(..., true) returns NULL).

DO $$
DECLARE
  table_name text;
  application_tables text[] := ARRAY[
    'categories',
    'products',
    'stock_items',
    'customers',
    'orders',
    'deliveries',
    'settings',
    'activity_logs',
    'balance_transactions',
    'telegram_chats',
    'telegram_topics',
    'telegram_media_folders',
    'telegram_media',
    'telegram_templates',
    'telegram_posts',
    'telegram_schedules',
    'telegram_queue',
    'coupons',
    'telegram_automations'
  ];
BEGIN
  FOREACH table_name IN ARRAY application_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      RAISE EXCEPTION 'RLS migration requires application table public.%', table_name;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);

    -- Recreating only policies owned by this migration makes reruns safe while
    -- preventing duplicate policies or stale predicates after a deployment.
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      table_name || '_tenant_access',
      table_name
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      table_name || '_tenant_isolation',
      table_name
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR ALL TO PUBLIC ' ||
      'USING ("ownerId" = current_setting(''app.current_tenant'', true)) ' ||
      'WITH CHECK ("ownerId" = current_setting(''app.current_tenant'', true))',
      table_name || '_tenant_access',
      table_name
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO PUBLIC ' ||
      'USING ("ownerId" = current_setting(''app.current_tenant'', true)) ' ||
      'WITH CHECK ("ownerId" = current_setting(''app.current_tenant'', true))',
      table_name || '_tenant_isolation',
      table_name
    );
  END LOOP;
END
$$;

-- Cross-tenant relationship hardening. These composite references make the
-- ownerId part of the relationship, so an ID from another tenant cannot be
-- attached even when the numeric/textual IDs intentionally collide.
CREATE UNIQUE INDEX IF NOT EXISTS categories_owner_id_uidx
  ON public.categories ("ownerId", id);
CREATE UNIQUE INDEX IF NOT EXISTS products_owner_id_uidx
  ON public.products ("ownerId", id);
CREATE UNIQUE INDEX IF NOT EXISTS stock_items_owner_id_uidx
  ON public.stock_items ("ownerId", id);
CREATE UNIQUE INDEX IF NOT EXISTS customers_owner_id_uidx
  ON public.customers ("ownerId", id);
CREATE UNIQUE INDEX IF NOT EXISTS orders_owner_id_uidx
  ON public.orders ("ownerId", id);
CREATE UNIQUE INDEX IF NOT EXISTS deliveries_owner_id_uidx
  ON public.deliveries ("ownerId", id);
CREATE UNIQUE INDEX IF NOT EXISTS telegram_chats_owner_id_chatid_uidx
  ON public.telegram_chats ("ownerId", "chatId");
CREATE UNIQUE INDEX IF NOT EXISTS telegram_media_folders_owner_id_uidx
  ON public.telegram_media_folders ("ownerId", id);
CREATE UNIQUE INDEX IF NOT EXISTS telegram_posts_owner_id_uidx
  ON public.telegram_posts ("ownerId", id);
CREATE UNIQUE INDEX IF NOT EXISTS telegram_schedules_owner_id_uidx
  ON public.telegram_schedules ("ownerId", id);
CREATE UNIQUE INDEX IF NOT EXISTS telegram_templates_owner_id_uidx
  ON public.telegram_templates ("ownerId", id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_category_same_tenant_fk') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_category_same_tenant_fk
      FOREIGN KEY ("ownerId", "categoryId")
      REFERENCES public.categories ("ownerId", id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_items_product_same_tenant_fk') THEN
    ALTER TABLE public.stock_items
      ADD CONSTRAINT stock_items_product_same_tenant_fk
      FOREIGN KEY ("ownerId", "productId")
      REFERENCES public.products ("ownerId", id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_items_order_same_tenant_fk') THEN
    ALTER TABLE public.stock_items
      ADD CONSTRAINT stock_items_order_same_tenant_fk
      FOREIGN KEY ("ownerId", "orderId")
      REFERENCES public.orders ("ownerId", id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_customer_same_tenant_fk') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_customer_same_tenant_fk
      FOREIGN KEY ("ownerId", "customerId")
      REFERENCES public.customers ("ownerId", id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_product_same_tenant_fk') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_product_same_tenant_fk
      FOREIGN KEY ("ownerId", "productId")
      REFERENCES public.products ("ownerId", id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deliveries_order_same_tenant_fk') THEN
    ALTER TABLE public.deliveries
      ADD CONSTRAINT deliveries_order_same_tenant_fk
      FOREIGN KEY ("ownerId", "orderId")
      REFERENCES public.orders ("ownerId", id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deliveries_product_same_tenant_fk') THEN
    ALTER TABLE public.deliveries
      ADD CONSTRAINT deliveries_product_same_tenant_fk
      FOREIGN KEY ("ownerId", "productId")
      REFERENCES public.products ("ownerId", id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deliveries_customer_same_tenant_fk') THEN
    ALTER TABLE public.deliveries
      ADD CONSTRAINT deliveries_customer_same_tenant_fk
      FOREIGN KEY ("ownerId", "customerId")
      REFERENCES public.customers ("ownerId", id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deliveries_stock_same_tenant_fk') THEN
    ALTER TABLE public.deliveries
      ADD CONSTRAINT deliveries_stock_same_tenant_fk
      FOREIGN KEY ("ownerId", "stockItemId")
      REFERENCES public.stock_items ("ownerId", id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'telegram_topics_chat_same_tenant_fk') THEN
    ALTER TABLE public.telegram_topics
      ADD CONSTRAINT telegram_topics_chat_same_tenant_fk
      FOREIGN KEY ("ownerId", "chatId")
      REFERENCES public.telegram_chats ("ownerId", "chatId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'telegram_media_folder_same_tenant_fk') THEN
    ALTER TABLE public.telegram_media
      ADD CONSTRAINT telegram_media_folder_same_tenant_fk
      FOREIGN KEY ("ownerId", "folderId")
      REFERENCES public.telegram_media_folders ("ownerId", id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'telegram_schedules_post_same_tenant_fk') THEN
    ALTER TABLE public.telegram_schedules
      ADD CONSTRAINT telegram_schedules_post_same_tenant_fk
      FOREIGN KEY ("ownerId", "postId")
      REFERENCES public.telegram_posts ("ownerId", id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'telegram_queue_post_same_tenant_fk') THEN
    ALTER TABLE public.telegram_queue
      ADD CONSTRAINT telegram_queue_post_same_tenant_fk
      FOREIGN KEY ("ownerId", "postId")
      REFERENCES public.telegram_posts ("ownerId", id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'telegram_queue_schedule_same_tenant_fk') THEN
    ALTER TABLE public.telegram_queue
      ADD CONSTRAINT telegram_queue_schedule_same_tenant_fk
      FOREIGN KEY ("ownerId", "scheduleId")
      REFERENCES public.telegram_schedules ("ownerId", id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'telegram_automations_template_same_tenant_fk') THEN
    ALTER TABLE public.telegram_automations
      ADD CONSTRAINT telegram_automations_template_same_tenant_fk
      FOREIGN KEY ("ownerId", "templateId")
      REFERENCES public.telegram_templates ("ownerId", id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'balance_transactions_customer_same_tenant_fk') THEN
    ALTER TABLE public.balance_transactions
      ADD CONSTRAINT balance_transactions_customer_same_tenant_fk
      FOREIGN KEY ("ownerId", "customerId")
      REFERENCES public.customers ("ownerId", id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'balance_transactions_order_same_tenant_fk') THEN
    ALTER TABLE public.balance_transactions
      ADD CONSTRAINT balance_transactions_order_same_tenant_fk
      FOREIGN KEY ("ownerId", "orderId")
      REFERENCES public.orders ("ownerId", id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'telegram_media_folders_parent_same_tenant_fk') THEN
    ALTER TABLE public.telegram_media_folders
      ADD CONSTRAINT telegram_media_folders_parent_same_tenant_fk
      FOREIGN KEY ("ownerId", "parentId")
      REFERENCES public.telegram_media_folders ("ownerId", id);
  END IF;
END
$$;

-- JSON mediaIds in templates/posts remains validated by application code. It
-- has no relational FK target in the current schema and is intentionally not
-- replaced by triggers in this phase.
