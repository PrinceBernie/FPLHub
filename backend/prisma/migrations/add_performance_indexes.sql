-- Performance optimization indexes for login and authentication
-- These indexes will dramatically improve login performance

-- Critical: User email lookup (most important for login)
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- Critical: User phone lookup (for OTP verification)
CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"("phone");

-- Critical: Session lookups by user and active status
CREATE INDEX IF NOT EXISTS "Session_userId_isActive_idx" ON "Session"("userId", "isActive");

-- Critical: Session expiry lookups
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");

-- Critical: Session token lookups (for authentication middleware)
CREATE INDEX IF NOT EXISTS "Session_token_idx" ON "Session"("token");

-- Critical: User active status lookup
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");

-- Critical: User verification status lookup
CREATE INDEX IF NOT EXISTS "User_isVerified_idx" ON "User"("isVerified");

-- Performance: Linked teams by user
CREATE INDEX IF NOT EXISTS "LinkedTeam_userId_idx" ON "LinkedTeam"("userId");

-- Performance: League entries by user
CREATE INDEX IF NOT EXISTS "LeagueEntry_userId_idx" ON "LeagueEntry"("userId");

-- Performance: League entries by league
CREATE INDEX IF NOT EXISTS "LeagueEntry_leagueId_idx" ON "LeagueEntry"("leagueId");

-- Performance: League lookups by gameweek and type
CREATE INDEX IF NOT EXISTS "League_startGameweek_type_idx" ON "League"("startGameweek", "type");

-- Performance: League status lookups
CREATE INDEX IF NOT EXISTS "League_status_idx" ON "League"("status");

-- Performance: League private status
CREATE INDEX IF NOT EXISTS "League_isPrivate_idx" ON "League"("isPrivate");

-- Performance: User admin level lookups
CREATE INDEX IF NOT EXISTS "User_adminLevel_idx" ON "User"("adminLevel");

-- Performance: User creation date for analytics
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");

-- Performance: Session creation date for cleanup
CREATE INDEX IF NOT EXISTS "Session_createdAt_idx" ON "Session"("createdAt");

-- Performance: Transaction lookups by user
CREATE INDEX IF NOT EXISTS "Transaction_userId_idx" ON "Transaction"("userId");

-- Performance: Payment lookups by user
CREATE INDEX IF NOT EXISTS "Payment_userId_idx" ON "Payment"("userId");

-- Performance: Wallet lookups by user
CREATE INDEX IF NOT EXISTS "Wallet_userId_idx" ON "Wallet"("userId");

-- Performance: OTP expiry cleanup
CREATE INDEX IF NOT EXISTS "User_otpExpires_idx" ON "User"("otpExpires");

-- Performance: Password reset token lookups
CREATE INDEX IF NOT EXISTS "User_passwordResetToken_idx" ON "User"("passwordResetToken");

-- Performance: Password reset expiry cleanup
CREATE INDEX IF NOT EXISTS "User_passwordResetExpires_idx" ON "User"("passwordResetExpires");