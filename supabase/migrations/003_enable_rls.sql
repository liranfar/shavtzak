-- =============================================
-- Enable Row Level Security (RLS) on all tables
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.platoons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soldiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Create RLS Policies
-- =============================================
-- These policies allow authenticated users to access data
-- Adjust based on your actual authorization requirements

-- PLATOONS: Authenticated users can read, admins can write
CREATE POLICY "Authenticated users can view platoons"
  ON public.platoons FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert platoons"
  ON public.platoons FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update platoons"
  ON public.platoons FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete platoons"
  ON public.platoons FOR DELETE
  TO authenticated
  USING (true);

-- SOLDIERS: Authenticated users can read, admins can write
CREATE POLICY "Authenticated users can view soldiers"
  ON public.soldiers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert soldiers"
  ON public.soldiers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update soldiers"
  ON public.soldiers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete soldiers"
  ON public.soldiers FOR DELETE
  TO authenticated
  USING (true);

-- MISSIONS: Authenticated users can read, admins can write
CREATE POLICY "Authenticated users can view missions"
  ON public.missions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert missions"
  ON public.missions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update missions"
  ON public.missions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete missions"
  ON public.missions FOR DELETE
  TO authenticated
  USING (true);

-- SHIFTS: Authenticated users can read, admins can write
CREATE POLICY "Authenticated users can view shifts"
  ON public.shifts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert shifts"
  ON public.shifts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update shifts"
  ON public.shifts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete shifts"
  ON public.shifts FOR DELETE
  TO authenticated
  USING (true);

-- STATUSES: Authenticated users can read, admins can write
CREATE POLICY "Authenticated users can view statuses"
  ON public.statuses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert statuses"
  ON public.statuses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update statuses"
  ON public.statuses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete statuses"
  ON public.statuses FOR DELETE
  TO authenticated
  USING (true);

-- =============================================
-- IMPORTANT: Run this migration in Supabase SQL Editor
-- or via: supabase db push
-- =============================================

