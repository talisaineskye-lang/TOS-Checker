-- ============================================================================
-- RLS Policies for: audit_log, teams, team_members, vendor_contracts
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================

-- ============================================================================
-- 1. AUDIT_LOG
-- ============================================================================
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only read their own audit log entries
CREATE POLICY "Users can read own audit logs"
  ON public.audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Only service role can insert (server-side via logAuditEvent)
-- No policy needed — service role bypasses RLS.
-- Authenticated users cannot insert directly.
CREATE POLICY "Service role inserts audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (false);

-- No UPDATE or DELETE policies — audit logs are immutable

-- ============================================================================
-- 2. TEAMS
-- ============================================================================
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see teams they own or are a member of
CREATE POLICY "Users can read teams they belong to"
  ON public.teams FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- INSERT: Authenticated users can create a team
CREATE POLICY "Authenticated users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- UPDATE: Only the team owner can update team details
CREATE POLICY "Team owners can update their team"
  ON public.teams FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- DELETE: Only the team owner can delete
CREATE POLICY "Team owners can delete their team"
  ON public.teams FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- 3. TEAM_MEMBERS
-- ============================================================================
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see members of teams they belong to
CREATE POLICY "Users can read members of their teams"
  ON public.team_members FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
    OR team_id IN (
      SELECT team_id FROM public.team_members AS tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

-- INSERT: Only team owners can add members
CREATE POLICY "Team owners can invite members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
  );

-- UPDATE: Team owners can change roles/status, or users can update their own record (accept invite)
CREATE POLICY "Team owners or self can update members"
  ON public.team_members FOR UPDATE
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  )
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- DELETE: Team owners can hard-delete members (soft-delete via status='removed' is preferred)
CREATE POLICY "Team owners can delete members"
  ON public.team_members FOR DELETE
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- ============================================================================
-- 4. VENDOR_CONTRACTS
-- ============================================================================
ALTER TABLE public.vendor_contracts ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see their own contracts or contracts belonging to their team
CREATE POLICY "Users can read own or team contracts"
  ON public.vendor_contracts FOR SELECT
  USING (
    user_id = auth.uid()
    OR team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
    OR team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- INSERT: Users can create contracts for themselves or their team
CREATE POLICY "Users can create own or team contracts"
  ON public.vendor_contracts FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
    OR team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- UPDATE: Contract owner or team members can update
CREATE POLICY "Users can update own or team contracts"
  ON public.vendor_contracts FOR UPDATE
  USING (
    user_id = auth.uid()
    OR team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
    OR team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
    OR team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- DELETE: Only contract owner or team owner can delete
CREATE POLICY "Owner or team owner can delete contracts"
  ON public.vendor_contracts FOR DELETE
  USING (
    user_id = auth.uid()
    OR team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
  );
