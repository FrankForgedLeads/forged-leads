-- ============================================================================
-- Beeyond Vault — initial schema
-- Run this once in the Supabase SQL editor (or `supabase db push`) on a fresh
-- project, in order, top to bottom. See SETUP.md (Phase 8) for the
-- click-by-click version of this step.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- ADMIN CONTROL
--
-- Decision: admin access is granted by row, not by hardcoding ADMIN_EMAIL into
-- SQL. Nobody can read this table directly (RLS denies all direct access);
-- the is_admin() function below is SECURITY DEFINER so it can check
-- membership without exposing the table itself. After running this
-- migration, add yourself with:
--   insert into public.admins (email) values ('you@example.com');
-- (Use the same address as the ADMIN_EMAIL env var so the app and the
-- database agree on who's an admin.)
-- ----------------------------------------------------------------------------

create table if not exists public.admins (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- No policies = no direct access for anon/authenticated. Only service_role
-- (which bypasses RLS) or the SECURITY DEFINER function below can read it.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admins a
    where a.email = (auth.jwt() ->> 'email')
  );
$$;

-- ----------------------------------------------------------------------------
-- TEAMS
-- ----------------------------------------------------------------------------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  seat_limit integer not null default 5,
  created_at timestamptz not null default now()
);

create index if not exists teams_owner_id_idx on public.teams(owner_id);

-- ----------------------------------------------------------------------------
-- PROFILES (1:1 with auth.users)
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  company text,
  phone text,
  role text check (role in ('roofer', 'restoration', 'pa', 'gc', 'other')),
  plan text check (plan in ('solo', 'crew')),
  stripe_customer_id text,
  stripe_subscription_id text,
  -- Mirrors Stripe subscription statuses: trialing, active, past_due,
  -- canceled, unpaid, incomplete, incomplete_expired. NULL = never
  -- subscribed (paywall sends them to /subscribe).
  subscription_status text,
  trial_ends_at timestamptz,
  team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_team_id_idx on public.profiles(team_id);
create index if not exists profiles_stripe_customer_id_idx on public.profiles(stripe_customer_id);

-- Now that both tables exist, point teams.owner_id's implicit "one owner
-- profile" relationship the other way isn't needed — owner_id already
-- references auth.users directly above, which is enough for RLS.

-- ----------------------------------------------------------------------------
-- TEAM INVITES
-- ----------------------------------------------------------------------------

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists team_invites_team_id_idx on public.team_invites(team_id);
create index if not exists team_invites_email_idx on public.team_invites(email);

-- ----------------------------------------------------------------------------
-- ITEMS (the Vault)
-- ----------------------------------------------------------------------------

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (
    category in (
      'roofing', 'water_mitigation', 'mold', 'interior',
      'exterior', 'general_conditions', 'code_upgrades'
    )
  ),
  title text not null,
  description text,
  why_owed text,
  xactimate_code text,
  code_citation text,
  low_amount numeric(10, 2),
  high_amount numeric(10, 2),
  unit text, -- e.g. SQ, LF, SF, EA, day, visit
  region_note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Full-text search across the fields a contractor would actually search by.
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(xactimate_code, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(code_citation, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(why_owed, '')), 'C')
  ) stored
);

create index if not exists items_category_idx on public.items(category);
create index if not exists items_is_active_idx on public.items(is_active);
create index if not exists items_search_vector_idx on public.items using gin(search_vector);

-- ----------------------------------------------------------------------------
-- CLAIMS
-- ----------------------------------------------------------------------------

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  claim_number text,
  insured_name text,
  property_address text,
  carrier text,
  adjuster_name text,
  date_of_loss date,
  loss_type text, -- free text, e.g. wind, hurricane, water, fire, other
  status text not null default 'open' check (
    status in ('open', 'in_progress', 'submitted', 'partially_approved', 'resolved', 'closed')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists claims_user_id_idx on public.claims(user_id);
create index if not exists claims_team_id_idx on public.claims(team_id);

-- ----------------------------------------------------------------------------
-- CLAIM ITEMS (items attached to a claim)
-- ----------------------------------------------------------------------------

create table if not exists public.claim_items (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  quantity numeric(10, 2) not null default 1,
  -- Overrides the item's low/high range with a specific $ amount for this claim.
  custom_amount numeric(10, 2),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists claim_items_claim_id_idx on public.claim_items(claim_id);
create index if not exists claim_items_item_id_idx on public.claim_items(item_id);

-- ----------------------------------------------------------------------------
-- LETTERS
-- ----------------------------------------------------------------------------

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  template_key text not null check (
    template_key in (
      'initial_scope_clarification',
      'follow_up_no_response',
      'response_to_partial_approval'
    )
  ),
  generated_at timestamptz not null default now(),
  pdf_meta jsonb -- snapshot of the fields used to render the PDF (company block, edits, etc.)
);

create index if not exists letters_claim_id_idx on public.letters(claim_id);

-- ----------------------------------------------------------------------------
-- LEADS (Scope Checker capture — Phase 5, schema included now so the app
-- doesn't need a second migration)
-- ----------------------------------------------------------------------------

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  phone text,
  company text,
  -- Which of the 12 checklist items they had checked, and the running total shown.
  answers jsonb,
  estimated_total numeric(10, 2),
  source text not null default 'scope_checker',
  contacted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists leads_email_idx on public.leads(email);
create index if not exists leads_created_at_idx on public.leads(created_at desc);

-- ----------------------------------------------------------------------------
-- updated_at maintenance
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.items;
create trigger set_updated_at before update on public.items
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.claims;
create trigger set_updated_at before update on public.claims
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Auto-create a profile row when someone signs up via magic link.
-- subscription_status stays NULL until Stripe checkout completes (Phase 6
-- webhook sets plan/status/trial_ends_at from the actual subscription).
--
-- Also auto-accepts a pending Crew team invite sent to this email (Phase
-- 7's invite-teammate function inserts the team_invites row before the
-- invited person has ever signed in) — attaches the new profile to that
-- team and marks the invite accepted, atomically with profile creation.
-- Known v1 limitation: this only fires on a brand-new auth.users row, so
-- inviting someone who already has a Beeyond Vault account needs a manual
-- fix (update their profiles.team_id) rather than auto-accepting here.
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_invite record;
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  select * into matched_invite
  from public.team_invites
  where email = new.email and accepted_at is null
  order by created_at desc
  limit 1;

  if matched_invite.id is not null then
    update public.profiles set team_id = matched_invite.team_id where id = new.id;
    update public.team_invites set accepted_at = now() where id = matched_invite.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.team_invites enable row level security;
alter table public.items enable row level security;
alter table public.claims enable row level security;
alter table public.claim_items enable row level security;
alter table public.letters enable row level security;
alter table public.leads enable row level security;

-- Helper: the caller's team_id, or null. Used inline below to avoid repeating
-- the subquery on every policy.
create or replace function public.my_team_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select team_id from public.profiles where id = auth.uid();
$$;

-- --- profiles ---------------------------------------------------------------
-- Readable/writable only by the owner, by admins (subscriber list), or by a
-- fellow team member (Crew — so the owner's Account page can show who's on
-- the team; my_team_id() already backs the same pattern for claims).

create policy "profiles_select_own_admin_or_teammate" on public.profiles
  for select using (
    id = auth.uid()
    or public.is_admin()
    or (team_id is not null and team_id = public.my_team_id())
  );

create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

-- --- teams --------------------------------------------------------------
-- Owner manages their team; team members can view it; admins see everything.

create policy "teams_select_member_or_admin" on public.teams
  for select using (
    owner_id = auth.uid()
    or id = public.my_team_id()
    or public.is_admin()
  );

create policy "teams_insert_owner" on public.teams
  for insert with check (owner_id = auth.uid());

create policy "teams_update_owner_or_admin" on public.teams
  for update using (owner_id = auth.uid() or public.is_admin());

create policy "teams_delete_owner_or_admin" on public.teams
  for delete using (owner_id = auth.uid() or public.is_admin());

-- --- team_invites ---------------------------------------------------------
-- Team owner manages invites for their team. An invited user can see (and
-- accept) the invite addressed to their own email.

create policy "team_invites_select" on public.team_invites
  for select using (
    exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
    or email = (auth.jwt() ->> 'email')
    or public.is_admin()
  );

create policy "team_invites_insert_owner" on public.team_invites
  for insert with check (
    exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
  );

create policy "team_invites_update" on public.team_invites
  for update using (
    exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
    or email = (auth.jwt() ->> 'email')
  );

create policy "team_invites_delete_owner" on public.team_invites
  for delete using (
    exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
  );

-- --- items ------------------------------------------------------------------
-- Read-only reference data for any signed-in user. Only admins write.

create policy "items_select_authenticated" on public.items
  for select using (auth.role() = 'authenticated' or public.is_admin());

create policy "items_insert_admin" on public.items
  for insert with check (public.is_admin());

create policy "items_update_admin" on public.items
  for update using (public.is_admin());

create policy "items_delete_admin" on public.items
  for delete using (public.is_admin());

-- --- claims -------------------------------------------------------------
-- Owner or teammate (shared team_id) can read/write; admins see everything.

create policy "claims_select" on public.claims
  for select using (
    user_id = auth.uid()
    or (team_id is not null and team_id = public.my_team_id())
    or public.is_admin()
  );

create policy "claims_insert" on public.claims
  for insert with check (
    user_id = auth.uid()
    and (team_id is null or team_id = public.my_team_id())
  );

create policy "claims_update" on public.claims
  for update using (
    user_id = auth.uid()
    or (team_id is not null and team_id = public.my_team_id())
    or public.is_admin()
  );

create policy "claims_delete" on public.claims
  for delete using (
    user_id = auth.uid()
    or public.is_admin()
  );

-- --- claim_items --------------------------------------------------------
-- Access follows the parent claim.

create policy "claim_items_select" on public.claim_items
  for select using (
    exists (
      select 1 from public.claims c
      where c.id = claim_id
        and (
          c.user_id = auth.uid()
          or (c.team_id is not null and c.team_id = public.my_team_id())
          or public.is_admin()
        )
    )
  );

create policy "claim_items_insert" on public.claim_items
  for insert with check (
    exists (
      select 1 from public.claims c
      where c.id = claim_id
        and (
          c.user_id = auth.uid()
          or (c.team_id is not null and c.team_id = public.my_team_id())
        )
    )
  );

create policy "claim_items_update" on public.claim_items
  for update using (
    exists (
      select 1 from public.claims c
      where c.id = claim_id
        and (
          c.user_id = auth.uid()
          or (c.team_id is not null and c.team_id = public.my_team_id())
          or public.is_admin()
        )
    )
  );

create policy "claim_items_delete" on public.claim_items
  for delete using (
    exists (
      select 1 from public.claims c
      where c.id = claim_id
        and (
          c.user_id = auth.uid()
          or (c.team_id is not null and c.team_id = public.my_team_id())
          or public.is_admin()
        )
    )
  );

-- --- letters --------------------------------------------------------------
-- Access follows the parent claim, same shape as claim_items.

create policy "letters_select" on public.letters
  for select using (
    exists (
      select 1 from public.claims c
      where c.id = claim_id
        and (
          c.user_id = auth.uid()
          or (c.team_id is not null and c.team_id = public.my_team_id())
          or public.is_admin()
        )
    )
  );

create policy "letters_insert" on public.letters
  for insert with check (
    exists (
      select 1 from public.claims c
      where c.id = claim_id
        and (
          c.user_id = auth.uid()
          or (c.team_id is not null and c.team_id = public.my_team_id())
        )
    )
  );

create policy "letters_delete" on public.letters
  for delete using (
    exists (
      select 1 from public.claims c
      where c.id = claim_id
        and (
          c.user_id = auth.uid()
          or (c.team_id is not null and c.team_id = public.my_team_id())
          or public.is_admin()
        )
    )
  );

-- --- leads ------------------------------------------------------------------
-- Anyone (including anonymous visitors on the public Scope Checker) can
-- submit a lead. Only admins can read the list back.

create policy "leads_insert_anyone" on public.leads
  for insert with check (true);

create policy "leads_select_admin" on public.leads
  for select using (public.is_admin());

-- ============================================================================
-- PHASE 2 — ESTIMATE REVIEW: uploads + storage
--
-- Decision: "claims" becomes the one record that eventually holds a project's
-- estimate, documentation, analysis, and generated documents together (the
-- product spec's "Projects/Reviews" entity) — so this extends the existing
-- claims table with the review/project-info fields instead of creating a
-- second, parallel table that would need merging with claims later. The
-- claims -> Projects/Reviews UI relabel is its own later phase; this is just
-- the schema and storage groundwork. Written as ALTER ... IF NOT EXISTS
-- throughout so this section is safe to re-run whether claims was just
-- created above or already existed from an earlier run of this file.
-- ============================================================================

alter table public.claims add column if not exists project_type text;
alter table public.claims add column if not exists trade text;
alter table public.claims add column if not exists estimate_total numeric(12, 2);
alter table public.claims add column if not exists description text;
alter table public.claims add column if not exists notes text;

-- Replace the old insurance-specific status vocabulary with the product
-- spec's review-workflow vocabulary. Remap any existing rows first so the
-- new, stricter check constraint never rejects data already in the table.
update public.claims set status = case status
  when 'open' then 'new'
  when 'in_progress' then 'under_review'
  when 'submitted' then 'under_review'
  when 'partially_approved' then 'under_review'
  when 'resolved' then 'completed'
  when 'closed' then 'completed'
  else status
end
where status in ('open', 'in_progress', 'submitted', 'partially_approved', 'resolved', 'closed');

alter table public.claims drop constraint if exists claims_status_check;
alter table public.claims add constraint claims_status_check check (
  status in ('new', 'under_review', 'findings_reviewed', 'documentation_complete', 'completed')
);
alter table public.claims alter column status set default 'new';

-- ----------------------------------------------------------------------------
-- REVIEW FILES (uploaded estimate PDFs, photos, and supporting documents)
-- ----------------------------------------------------------------------------

create table if not exists public.review_files (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  -- 'estimate' = the uploaded estimate PDF; 'photo' = a damage/property
  -- photo; 'document' = anything else (scope notes, invoices, moisture
  -- maps, measurements, etc).
  file_type text not null check (file_type in ('estimate', 'photo', 'document')),
  -- Path within the private 'review-files' storage bucket, always prefixed
  -- with the uploader's auth.uid() — see the storage.objects policies
  -- below, which key off that same prefix.
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists review_files_claim_id_idx on public.review_files(claim_id);

alter table public.review_files enable row level security;

-- Access follows the parent claim, same shape as claim_items/letters.
create policy "review_files_select" on public.review_files
  for select using (
    exists (
      select 1 from public.claims c
      where c.id = claim_id
        and (
          c.user_id = auth.uid()
          or (c.team_id is not null and c.team_id = public.my_team_id())
          or public.is_admin()
        )
    )
  );

create policy "review_files_insert" on public.review_files
  for insert with check (
    exists (
      select 1 from public.claims c
      where c.id = claim_id
        and (
          c.user_id = auth.uid()
          or (c.team_id is not null and c.team_id = public.my_team_id())
        )
    )
  );

create policy "review_files_delete" on public.review_files
  for delete using (
    exists (
      select 1 from public.claims c
      where c.id = claim_id
        and (
          c.user_id = auth.uid()
          or (c.team_id is not null and c.team_id = public.my_team_id())
          or public.is_admin()
        )
    )
  );

-- ----------------------------------------------------------------------------
-- STORAGE — private 'review-files' bucket
--
-- Objects are stored at `${auth.uid()}/${claim_id}/${generated filename}`.
-- Access is scoped to the top-level folder matching the caller's own
-- auth.uid() — the standard Supabase Storage per-user-folder RLS pattern.
-- Known v1 limitation: a Crew teammate can see a shared claim's *rows* in
-- review_files (per the policies above) but not fetch the actual file bytes
-- of a teammate's upload, since storage access is scoped by uploader, not by
-- team. Acceptable for v1 — revisit if team-shared file access becomes a
-- real ask; the fix is a storage policy that joins storage.objects back to
-- review_files/claims the same way the table policies above do.
-- 15 MB per file cap and an allow-list of the file types the upload UI
-- actually offers — enforced by Postgres here, not just client-side, so a
-- direct API call can't bypass it and blow through the Storage free tier.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-files',
  'review-files',
  false,
  15728640, -- 15 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "review_files_storage_select" on storage.objects
  for select using (
    bucket_id = 'review-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy "review_files_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'review-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "review_files_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'review-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- ============================================================================
-- PHASE 3 — ESTIMATE REVIEW: structured analysis engine
--
-- review_findings holds each candidate scope gap the analysis engine
-- surfaces, always pending human review (status defaults to 'new' and only
-- moves to 'added'/'dismissed'/'needs_info' when the contractor acts on it
-- — see RequireSubscription-gated ClaimDetail UI). analysis_runs is both an
-- audit trail and the cost-control table: every analysis attempt gets a
-- row, success or failure, so a per-user rate limit can be enforced without
-- guessing, and nothing here ever lets the analysis function itself decide
-- something is "owed" — it only ever writes candidate rows for the human to
-- act on.
-- ============================================================================

create table if not exists public.review_findings (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  -- References analysis_runs, added via ALTER TABLE below once that table
  -- exists — can't forward-reference it here.
  analysis_run_id uuid,
  -- The matched Vault item, when the model could confidently tie this
  -- finding to a real, existing item. Null is allowed and expected for
  -- findings that don't map cleanly to one item (e.g. a quantity mismatch)
  -- — the model is instructed never to invent a new Vault item to fill
  -- this in.
  item_id uuid references public.items(id) on delete set null,
  title text not null,
  -- Distinguishes "this line item's text wasn't found in the estimate" (an
  -- absence) from "the documentation indicates this is required" (a much
  -- stronger, rarer claim) — see the product spec: those are not the same
  -- thing and must never be worded the same way in the UI.
  scope_status text not null check (
    scope_status in ('not_found_in_estimate', 'quantity_mismatch', 'code_required')
  ),
  reason text not null,
  evidence text,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  suggested_quantity numeric(10, 2),
  suggested_unit text,
  potential_amount_low numeric(10, 2),
  potential_amount_high numeric(10, 2),
  xactimate_code text,
  code_reference text,
  requires_human_verification boolean not null default true,
  -- Human-in-the-loop state. Never set by the analysis engine itself —
  -- only by the contractor's own action in the UI.
  status text not null default 'new' check (status in ('new', 'added', 'dismissed', 'needs_info')),
  claim_item_id uuid references public.claim_items(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists review_findings_claim_id_idx on public.review_findings(claim_id);

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  error_message text,
  model text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(10, 4),
  findings_count integer,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists analysis_runs_claim_id_idx on public.analysis_runs(claim_id);
create index if not exists analysis_runs_user_id_started_at_idx on public.analysis_runs(user_id, started_at desc);

-- review_findings.analysis_run_id references analysis_runs, which is
-- defined after it above for readability — add the FK now that both tables
-- exist (can't forward-reference a not-yet-created table in the column
-- definition itself).
alter table public.review_findings
  drop constraint if exists review_findings_analysis_run_id_fkey;
alter table public.review_findings
  add constraint review_findings_analysis_run_id_fkey
  foreign key (analysis_run_id) references public.analysis_runs(id) on delete set null;

alter table public.review_findings enable row level security;
alter table public.analysis_runs enable row level security;

-- Access follows the parent claim, same shape as review_files. Findings
-- and runs are never writable by the client directly — only the
-- analyze-review Netlify Function (using the service-role key) creates
-- them; the client can only update a finding's own status (add/dismiss).
create policy "review_findings_select" on public.review_findings
  for select using (
    exists (
      select 1 from public.claims c
      where c.id = claim_id
        and (
          c.user_id = auth.uid()
          or (c.team_id is not null and c.team_id = public.my_team_id())
          or public.is_admin()
        )
    )
  );

create policy "review_findings_update_status" on public.review_findings
  for update using (
    exists (
      select 1 from public.claims c
      where c.id = claim_id
        and (
          c.user_id = auth.uid()
          or (c.team_id is not null and c.team_id = public.my_team_id())
        )
    )
  );

create policy "analysis_runs_select" on public.analysis_runs
  for select using (
    exists (
      select 1 from public.claims c
      where c.id = claim_id
        and (
          c.user_id = auth.uid()
          or (c.team_id is not null and c.team_id = public.my_team_id())
          or public.is_admin()
        )
    )
  );

-- ============================================================================
-- PHASE 5 — VAULT KNOWLEDGE BASE: verification tracking
--
-- The product spec is explicit and marked CRITICAL: "Do not present
-- automatically generated code citations as verified facts. Every code
-- citation should have: Last Verified and Verify applicability before
-- submission." These columns are deliberately left NULL for every existing
-- seeded item (see seed_items.sql's own long-standing disclaimer that all
-- of it is draft data pending Frankie's review) rather than backfilled with
-- a fabricated date — an unset last_verified_date IS the honest signal
-- that an item hasn't been through admin review yet, and the UI (Vault
-- browse, admin list, and every Estimate Review finding) renders that
-- absence as "Not yet verified," never silently as blank.
-- ============================================================================

alter table public.items add column if not exists jurisdiction_notes text;
alter table public.items add column if not exists required_documentation text;
alter table public.items add column if not exists common_exclusions text;
alter table public.items add column if not exists last_verified_date date;
alter table public.items add column if not exists source_notes text;

-- ============================================================================
-- SECURITY FIX (Phase 10 audit) — profiles/team_invites column privileges
--
-- Vulnerability: "profiles_update_own_or_admin" (defined earlier in this
-- file) and "team_invites_update" both use `for update using (...)` with
-- no `with check` clause. Postgres RLS reuses the USING expression as the
-- check on the NEW row when no WITH CHECK is given — so the *only* thing
-- either policy actually enforces is "this row belongs to me." Neither
-- restricts which COLUMNS a permitted update can change. Concretely, any
-- signed-in user could send `PATCH .../profiles?id=eq.<their own id>` with
-- body `{"team_id": "<any other team's uuid>"}` and it would succeed —
-- since every Crew-sharing policy in this file (teams, claims, claim_items,
-- letters, review_files, review_findings, analysis_runs) grants access
-- based on `team_id = public.my_team_id()`, and my_team_id() just reads
-- the caller's own profiles.team_id, this let any user grant themselves
-- read/write access to an arbitrary team's claims, documents, and
-- Estimate Review findings by editing one column on their own row.
--
-- Fix: column-level privileges, not a trickier RLS rewrite. Postgres
-- checks table/column grants before it ever evaluates RLS — an UPDATE
-- naming a column the role has no privilege on fails outright, regardless
-- of policy content. This is simpler to get right than a self-referential
-- WITH CHECK subquery and fully closes the hole either way. The
-- `authenticated` role only legitimately needs to update the columns the
-- Account page actually lets a user edit (full_name, company, phone,
-- role) — team_id, plan, the Stripe fields, subscription_status, and
-- trial_ends_at are all written exclusively by the Stripe webhook or the
-- signup trigger, both of which run as service_role and are unaffected by
-- these grants (service_role bypasses RLS and column privileges alike).
--
-- team_invites_update is revoked outright: grepping the app confirms the
-- client never calls .update() on team_invites (only .select() and
-- .delete() — see src/lib/api/team.js) and invite acceptance is handled
-- entirely inside handle_new_user(), a SECURITY DEFINER trigger that also
-- runs as its owner, not as the calling session. The policy was dead code
-- providing only attack surface (the same missing-WITH-CHECK gap would
-- have let an invited user repoint their own pending invite to a
-- different team's id).
-- ============================================================================

revoke update on public.profiles from authenticated;
grant update (full_name, company, phone, role) on public.profiles to authenticated;

revoke update on public.team_invites from authenticated;

-- ----------------------------------------------------------------------------
-- Same missing-WITH-CHECK gap, found by re-checking every other `for update`
-- policy in this file after the profiles/team_invites fix above, rather than
-- assuming it was the only instance:
--
-- - teams_update_owner_or_admin: same as team_invites — the client never
--   calls .update() on teams at all (grep confirms only .select() in
--   src/lib/api/team.js). Dead policy, pure attack surface. Revoked outright.
-- - claims_update / claim_items_update / review_findings_update_status: all
--   three grant "can update this row" based on team/ownership, without
--   restricting which columns. Without a column restriction, a legitimate
--   teammate (who has genuine, intended update access to a shared claim)
--   could re-parent that row's claim_id/team_id-linked ownership — e.g. set
--   claims.team_id or claim_items.claim_id or review_findings.claim_id to a
--   team/claim they don't belong to, injecting content into a victim's
--   claim — or, on review_findings specifically, rewrite the AI's own
--   output after the fact: reason, confidence, scope_status, and critically
--   requires_human_verification, which the analysis engine (see
--   estimateAnalysisService.js) deliberately never lets the model set to
--   anything but true. None of that should be client-writable — the app
--   only ever updates a narrow field set on each of these tables (verified
--   by grepping every real call site), so grant only that set.
-- ----------------------------------------------------------------------------

revoke update on public.teams from authenticated;

revoke update on public.claims from authenticated;
grant update (
  status, project_type, trade, property_address, insured_name, estimate_total,
  date_of_loss, loss_type, claim_number, carrier, adjuster_name, description, notes
) on public.claims to authenticated;

revoke update on public.claim_items from authenticated;
grant update (quantity, custom_amount, note) on public.claim_items to authenticated;

revoke update on public.review_findings from authenticated;
grant update (status, claim_item_id) on public.review_findings to authenticated;

-- ============================================================================
-- Phase 7 — Review Summary PDF export
--
-- Reuses the existing `letters` table (client-side snapshot record of a
-- generated PDF, same shape needed for both) rather than adding a parallel
-- table, so the only schema change is widening the template_key check
-- constraint to also allow "review_summary". No RLS change: letters_select/
-- insert/delete already key off the parent claim generically and don't
-- special-case template_key.
-- ============================================================================

alter table public.letters drop constraint if exists letters_template_key_check;
alter table public.letters add constraint letters_template_key_check check (
  template_key in (
    'initial_scope_clarification',
    'follow_up_no_response',
    'response_to_partial_approval',
    'review_summary'
  )
);

-- ============================================================================
-- End of migration.
-- Next: run supabase/seed_items.sql to load the Vault's starting item set.
-- ============================================================================
