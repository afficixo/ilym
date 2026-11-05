ALTER TABLE "link_accounts"
ADD COLUMN IF NOT EXISTS "usaSecretRedirectAccumulator" INTEGER NOT NULL DEFAULT 0;
