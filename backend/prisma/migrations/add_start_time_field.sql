-- Add startTime field to League model for first match kickoff time
-- This replaces FPL deadline with actual first match kickoff for entry closure

ALTER TABLE "League" ADD COLUMN "startTime" DATETIME;

-- Create index for performance on startTime queries
CREATE INDEX "League_startTime_idx" ON "League"("startTime");
