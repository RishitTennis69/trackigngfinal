Use this exact prompt with the other Codex:

---

We now need the landing/payment app to write explicit workspace setup metadata into the shared Supabase project so the tracking dashboard admin view can show real customer setup state instead of inferred guesses.

Please update the landing/payment app so it writes these fields into `public.workspaces`:

- `cms_platform`
- `implementation_mode`
- `implementation_status`
- `add_us_status`

Requirements:

1. Keep using email as the stable identity key.
2. Resolve the shared `profiles.id` / `workspaces.user_id` for that email.
3. Upsert `public.workspaces` by `user_id`.
4. Write:
   - `business_name`
   - `website`
   - `cms_platform`
   - `implementation_mode`
   - `implementation_status`
   - `add_us_status`
5. Use these exact value shapes:
   - `implementation_mode`:
     - `Editing existing site`
     - `Starting from scratch`
   - `implementation_status`:
     - `Not started`
     - `In progress`
     - `Done`
   - `add_us_status`:
     - `Not started`
     - `In progress`
     - `Done`
6. Do not create duplicate users if business details change later.

Important:

- Run this SQL first in the shared Supabase project:
  - `shared-supabase-workspace-metadata.sql`

Target table shape:

```sql
alter table public.workspaces
  add column if not exists cms_platform text,
  add column if not exists implementation_mode text,
  add column if not exists implementation_status text,
  add column if not exists add_us_status text;
```

Example upsert shape:

```sql
insert into public.workspaces (
  user_id,
  business_name,
  website,
  cms_platform,
  implementation_mode,
  implementation_status,
  add_us_status,
  created_at,
  updated_at
)
values (
  'resolved-user-id',
  'Little Bytes',
  'https://littlebytes.dental',
  'WordPress',
  'Editing existing site',
  'In progress',
  'Not started',
  now(),
  now()
)
on conflict (user_id) do update
set
  business_name = excluded.business_name,
  website = excluded.website,
  cms_platform = excluded.cms_platform,
  implementation_mode = excluded.implementation_mode,
  implementation_status = excluded.implementation_status,
  add_us_status = excluded.add_us_status,
  updated_at = excluded.updated_at;
```

Please implement this and verify the written values appear in the shared `workspaces` row.

---
