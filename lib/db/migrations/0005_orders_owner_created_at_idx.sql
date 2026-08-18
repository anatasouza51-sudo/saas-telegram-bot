-- Performance: dashboard period queries filter by tenant and order creation time.
CREATE INDEX IF NOT EXISTS orders_owner_createdat_idx
  ON orders ("ownerId", "createdAt");
