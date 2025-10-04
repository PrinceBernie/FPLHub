/*
  Migration: Add Wallet System
  This migration adds the wallet and payment system models.
*/

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_League" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "gameweek" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "entryFee" REAL NOT NULL DEFAULT 0,
    "maxTeams" INTEGER NOT NULL DEFAULT 1000,
    "prizePool" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_League" ("createdAt", "endTime", "entryFee", "gameweek", "id", "maxTeams", "name", "prizePool", "season", "startTime", "status", "type", "updatedAt") SELECT "createdAt", "endTime", "entryFee", "gameweek", "id", "maxTeams", "name", "prizePool", "season", "startTime", "status", "type", "updatedAt" FROM "League";
DROP TABLE "League";
ALTER TABLE "new_League" RENAME TO "League";
CREATE UNIQUE INDEX "League_name_gameweek_season_key" ON "League"("name", "gameweek", "season");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
