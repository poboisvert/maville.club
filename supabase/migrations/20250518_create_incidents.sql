/*
  # Street incident reporting — incidents table

  1. New Tables
    - `incidents`
      - Links to streets via cote_rue_id and to auth.users via reported_by
      - type constrained to pot_hole (extensible later)
      - priority: low | medium | high
      - Moderation flags: is_approved, is_banned

  2. Security
    - RLS enabled
    - SELECT: public (all incidents visible immediately)
    - INSERT: authenticated users (reported_by must match auth.uid())
    - UPDATE/DELETE: admin only (role in JWT app_metadata)

  3. Admin role
    - Assign via: UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}' WHERE id = '<uuid>';
    - Checked with public.is_admin()
*/

-- Admin check (app_metadata.role, with fallback to top-level role claim)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() ->> 'role'
  ) = 'admin';
$$;

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cote_rue_id bigint NOT NULL REFERENCES streets(cote_rue_id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'pot_hole' CHECK (type = 'pot_hole'),
  photo_url text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_approved boolean NOT NULL DEFAULT false,
  is_banned boolean NOT NULL DEFAULT false,
  reported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incidents_cote_rue_id_idx ON incidents (cote_rue_id);
CREATE INDEX IF NOT EXISTS incidents_reported_by_idx ON incidents (reported_by);
CREATE INDEX IF NOT EXISTS incidents_created_at_idx ON incidents (created_at DESC);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Incidents are visible to everyone" ON incidents;
CREATE POLICY "Incidents are visible to everyone"
  ON incidents FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can report incidents" ON incidents;
CREATE POLICY "Authenticated users can report incidents"
  ON incidents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

DROP POLICY IF EXISTS "Only admins can update incidents" ON incidents;
CREATE POLICY "Only admins can update incidents"
  ON incidents FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can delete incidents" ON incidents;
CREATE POLICY "Only admins can delete incidents"
  ON incidents FOR DELETE
  TO authenticated
  USING (public.is_admin());
