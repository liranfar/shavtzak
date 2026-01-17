-- Migration: Add leave date fields to soldiers table
-- Run this if you already have a database and need to add the leave date columns

ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS leave_start TIMESTAMPTZ;
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS leave_end TIMESTAMPTZ;
