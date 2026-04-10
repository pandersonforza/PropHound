-- Add projectGroup to PipelineProject with default "F7B" for all existing rows
ALTER TABLE "PipelineProject" ADD COLUMN "projectGroup" TEXT NOT NULL DEFAULT 'F7B';
