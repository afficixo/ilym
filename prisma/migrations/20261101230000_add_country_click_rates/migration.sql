CREATE TABLE "country_click_rates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "country_click_rates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "country_click_rates_userId_countryCode_key"
ON "country_click_rates"("userId", "countryCode");

CREATE INDEX "country_click_rates_countryCode_idx"
ON "country_click_rates"("countryCode");

ALTER TABLE "country_click_rates"
ADD CONSTRAINT "country_click_rates_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
