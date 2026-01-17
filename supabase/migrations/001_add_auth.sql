-- Migration: Switch from anonymous to authenticated access
-- Run this if you already have a database with the old anonymous policies

-- Drop old anonymous policies
DROP POLICY IF EXISTS "Allow all for anon" ON certificates;
DROP POLICY IF EXISTS "Allow all for anon" ON soldier_statuses;
DROP POLICY IF EXISTS "Allow all for anon" ON platoons;
DROP POLICY IF EXISTS "Allow all for anon" ON squads;
DROP POLICY IF EXISTS "Allow all for anon" ON soldiers;
DROP POLICY IF EXISTS "Allow all for anon" ON soldier_certificates;
DROP POLICY IF EXISTS "Allow all for anon" ON missions;
DROP POLICY IF EXISTS "Allow all for anon" ON mission_certificates;
DROP POLICY IF EXISTS "Allow all for anon" ON shifts;

-- Create new policies for authenticated users
CREATE POLICY "Allow all for authenticated" ON certificates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON soldier_statuses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON platoons FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON squads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON soldiers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON soldier_certificates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON missions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON mission_certificates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);
