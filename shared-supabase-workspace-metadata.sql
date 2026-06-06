alter table public.workspaces
  add column if not exists cms_platform text,
  add column if not exists implementation_mode text,
  add column if not exists implementation_status text,
  add column if not exists add_us_status text;
