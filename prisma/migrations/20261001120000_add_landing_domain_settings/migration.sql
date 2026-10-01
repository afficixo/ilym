CREATE TABLE "landing_domain_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "domains" TEXT[] NOT NULL DEFAULT ARRAY['weobly.com', 'weebly.pro']::TEXT[],
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "landing_domain_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "landing_domain_settings" ("id", "domains")
VALUES ('default', ARRAY['weobly.com', 'weebly.pro']::TEXT[])
ON CONFLICT ("id") DO NOTHING;