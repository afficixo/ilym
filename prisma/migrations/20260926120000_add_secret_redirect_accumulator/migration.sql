ALTER TABLE "offer_vaults"
ADD COLUMN IF NOT EXISTS "usaSecretRedirectAccumulator" INTEGER NOT NULL DEFAULT 0;