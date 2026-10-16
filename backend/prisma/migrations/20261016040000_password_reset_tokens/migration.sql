-- CreateTable
CREATE TABLE IF NOT EXISTS "password_reset_token" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "panel" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_token_tokenHash_key" ON "password_reset_token"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "password_reset_token_ownerEmail_panel_idx" ON "password_reset_token"("ownerEmail", "panel");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "password_reset_token_expiresAt_idx" ON "password_reset_token"("expiresAt");
