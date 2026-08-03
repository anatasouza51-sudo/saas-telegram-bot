-- Two-Factor Authentication (2FA) support using Better Auth plugin
-- Adds tables for TOTP, OTP, backup codes, and trusted devices

-- Two-factor table to store user 2FA settings
CREATE TABLE IF NOT EXISTS "twoFactor" (
  id text PRIMARY KEY,
  "userId" text NOT NULL UNIQUE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE
);

-- TOTP (Time-based One-Time Password) table
CREATE TABLE IF NOT EXISTS "totpCredential" (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  "twoFactorId" text NOT NULL,
  secret text NOT NULL,
  "backupCodes" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE,
  FOREIGN KEY ("twoFactorId") REFERENCES "twoFactor"(id) ON DELETE CASCADE
);

-- OTP (One-Time Password) table for email/SMS codes
CREATE TABLE IF NOT EXISTS "otpCredential" (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  "twoFactorId" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE,
  FOREIGN KEY ("twoFactorId") REFERENCES "twoFactor"(id) ON DELETE CASCADE
);

-- Trusted devices table
CREATE TABLE IF NOT EXISTS "trustedDevice" (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  "twoFactorId" text NOT NULL,
  "userAgent" text,
  "ipAddress" text,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE,
  FOREIGN KEY ("twoFactorId") REFERENCES "twoFactor"(id) ON DELETE CASCADE
);

-- Add 2FA enabled flag to user table
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "twoFactorEnabled" boolean NOT NULL DEFAULT false;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "twoFactor_userId_idx" ON "twoFactor"("userId");
CREATE INDEX IF NOT EXISTS "totpCredential_userId_idx" ON "totpCredential"("userId");
CREATE INDEX IF NOT EXISTS "otpCredential_userId_idx" ON "otpCredential"("userId");
CREATE INDEX IF NOT EXISTS "trustedDevice_userId_idx" ON "trustedDevice"("userId");
CREATE INDEX IF NOT EXISTS "trustedDevice_expiresAt_idx" ON "trustedDevice"("expiresAt");
