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
-- End of migration.
-- Next: run supabase/seed_items.sql to load the Vault's starting item set.
-- ============================================================================
