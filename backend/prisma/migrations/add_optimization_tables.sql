-- Migration: Add optimization and performance tracking tables
-- Created: 2025-01-28

-- League configuration table for storing optimal batch sizes
CREATE TABLE IF NOT EXISTS "LeagueConfiguration" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "optimalBatchSize" INTEGER NOT NULL DEFAULT 20,
    "lastOptimizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPerformance" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "LeagueConfiguration_pkey" PRIMARY KEY ("id")
);

-- Performance metrics table for tracking service performance
CREATE TABLE IF NOT EXISTS "PerformanceMetrics" (
    "id" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "leagueId" TEXT,
    "metricType" TEXT NOT NULL, -- 'batch_performance', 'api_performance', 'websocket_performance'
    "metricData" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "PerformanceMetrics_pkey" PRIMARY KEY ("id")
);

-- Live standings cache table for storing incremental diffs
CREATE TABLE IF NOT EXISTS "LiveStandingsCache" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "gameweekId" INTEGER NOT NULL,
    "standingsData" JSONB NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "LiveStandingsCache_pkey" PRIMARY KEY ("id")
);

-- Create indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS "LeagueConfiguration_leagueId_key" ON "LeagueConfiguration"("leagueId");
CREATE INDEX IF NOT EXISTS "PerformanceMetrics_serviceName_timestamp_idx" ON "PerformanceMetrics"("serviceName", "timestamp");
CREATE INDEX IF NOT EXISTS "PerformanceMetrics_leagueId_timestamp_idx" ON "PerformanceMetrics"("leagueId", "timestamp");
CREATE INDEX IF NOT EXISTS "LiveStandingsCache_leagueId_gameweekId_idx" ON "LiveStandingsCache"("leagueId", "gameweekId");
CREATE INDEX IF NOT EXISTS "LiveStandingsCache_expiresAt_idx" ON "LiveStandingsCache"("expiresAt");

-- Add foreign key constraints
ALTER TABLE "LeagueConfiguration" ADD CONSTRAINT "LeagueConfiguration_leagueId_fkey" 
    FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PerformanceMetrics" ADD CONSTRAINT "PerformanceMetrics_leagueId_fkey" 
    FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveStandingsCache" ADD CONSTRAINT "LiveStandingsCache_leagueId_fkey" 
    FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
