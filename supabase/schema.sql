-- Supabase Schema for Shavtzak
-- Run this in Supabase SQL Editor to create the database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS mission_certificates CASCADE;
DROP TABLE IF EXISTS soldier_certificates CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS soldiers CASCADE;
DROP TABLE IF EXISTS missions CASCADE;
DROP TABLE IF EXISTS squads CASCADE;
DROP TABLE IF EXISTS platoons CASCADE;
DROP TABLE IF EXISTS soldier_statuses CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;

-- Certificates (reference table)
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Soldier statuses (reference table)
CREATE TABLE soldier_statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platoons
CREATE TABLE platoons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company_id TEXT DEFAULT 'company-1',
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Squads
CREATE TABLE squads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  platoon_id UUID REFERENCES platoons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Soldiers
CREATE TABLE soldiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  personal_number TEXT,
  phone_number TEXT,
  role TEXT CHECK (role IN ('officer', 'nco', 'soldier')) DEFAULT 'soldier',
  status_id UUID REFERENCES soldier_statuses(id),
  platoon_id UUID REFERENCES platoons(id) ON DELETE SET NULL,
  squad_id UUID REFERENCES squads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Soldier certificates (junction table)
CREATE TABLE soldier_certificates (
  soldier_id UUID REFERENCES soldiers(id) ON DELETE CASCADE,
  certificate_id UUID REFERENCES certificates(id) ON DELETE CASCADE,
  PRIMARY KEY (soldier_id, certificate_id)
);

-- Missions
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  required_soldiers INTEGER NOT NULL DEFAULT 1,
  platoon_id UUID REFERENCES platoons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mission certificates (junction table)
CREATE TABLE mission_certificates (
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  certificate_id UUID REFERENCES certificates(id) ON DELETE CASCADE,
  PRIMARY KEY (mission_id, certificate_id)
);

-- Shifts
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  soldier_id UUID REFERENCES soldiers(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')) DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_soldiers_platoon ON soldiers(platoon_id);
CREATE INDEX idx_soldiers_squad ON soldiers(squad_id);
CREATE INDEX idx_soldiers_status ON soldiers(status_id);
CREATE INDEX idx_squads_platoon ON squads(platoon_id);
CREATE INDEX idx_shifts_mission ON shifts(mission_id);
CREATE INDEX idx_shifts_soldier ON shifts(soldier_id);
CREATE INDEX idx_shifts_time ON shifts(start_time, end_time);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER soldiers_updated_at
  BEFORE UPDATE ON soldiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER missions_updated_at
  BEFORE UPDATE ON missions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security on all tables
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE soldier_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE platoons ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE soldiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE soldier_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users only
CREATE POLICY "Allow all for authenticated" ON certificates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON soldier_statuses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON platoons FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON squads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON soldiers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON soldier_certificates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON missions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON mission_certificates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);
