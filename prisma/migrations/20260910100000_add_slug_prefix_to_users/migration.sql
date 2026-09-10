ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "slugPrefix" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_slugPrefix_key" ON "users"("slugPrefix");
