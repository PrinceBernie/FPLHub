-- Migration: Add League Lifecycle States (SQLite compatible)
-- This migration adds proper gameweek lifecycle management to leagues

-- Add new columns to League table (SQLite doesn't support ENUM, we'll use TEXT with CHECK constraint)
ALTER TABLE "League" ADD COLUMN "leagueState" TEXT DEFAULT 'OPEN_FOR_ENTRY' CHECK ("leagueState" IN ('OPEN_FOR_ENTRY', 'IN_PROGRESS', 'WAITING_FOR_UPDATES', 'FINALIZED'));
ALTER TABLE "League" ADD COLUMN "softFinalizedAt" DATETIME;
ALTER TABLE "League" ADD COLUMN "finalizedAt" DATETIME;
ALTER TABLE "League" ADD COLUMN "stabilityWindowMinutes" INTEGER DEFAULT 60;
ALTER TABLE "League" ADD COLUMN "lastPointsCheck" DATETIME;
ALTER TABLE "League" ADD COLUMN "pointsStabilityHash" TEXT;

-- Add indexes for performance
CREATE INDEX "League_leagueState_idx" ON "League"("leagueState");
CREATE INDEX "League_startGameweek_leagueState_idx" ON "League"("startGameweek", "leagueState");

-- Update existing leagues to have proper state
UPDATE "League" 
SET "leagueState" = CASE 
  WHEN "status" = 'OPEN' THEN 'OPEN_FOR_ENTRY'
  WHEN "status" = 'IN_PROGRESS' THEN 'IN_PROGRESS'
  WHEN "status" = 'COMPLETED' THEN 'FINALIZED'
  ELSE 'OPEN_FOR_ENTRY'
END;
