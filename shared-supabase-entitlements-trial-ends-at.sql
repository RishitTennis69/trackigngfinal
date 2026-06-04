alter table public.entitlements
  add column if not exists trial_ends_at timestamptz;
