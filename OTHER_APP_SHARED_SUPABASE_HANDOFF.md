# Other App Handoff: Paid Access + Premium Insights

This file is for the landing-page / payment app.

That app is now responsible for deciding:

- who has paid access
- who has premium actionable insights

The tracking dashboard reads that from shared Supabase.

## Shared rule

Use the customer email as identity.

Do not key access by:

- business name
- website
- company spelling

Those change. Email is the stable link between both apps.

## Table to write

The landing app needs to create or update:

- `public.entitlements`

Important columns:

- `email`
- `status`
- `plan`
- `premium_insights`
- `source_app`
- `paid_at`
- `updated_at`

## Recommended values

### Regular paid tracking user

```sql
status = 'active'
plan = 'gleo-tracking'
premium_insights = false
```

### Premium reoptimization user

```sql
status = 'active'
plan = 'gleo-premium'
premium_insights = true
```

## Why this shape is better

Keep:

- `status` for access
- `premium_insights` for feature gating

That way the dashboard can clearly answer two different questions:

1. are they allowed in at all?
2. do they get the premium insights flow?

## Exact SQL pattern

```sql
insert into public.entitlements (email, status, plan, premium_insights, source_app, paid_at, updated_at)
values (
  'customer@example.com',
  'active',
  'gleo-premium',
  true,
  'gleo-landing',
  now(),
  now()
)
on conflict (email) do update
set
  status = excluded.status,
  plan = excluded.plan,
  premium_insights = excluded.premium_insights,
  source_app = excluded.source_app,
  paid_at = excluded.paid_at,
  updated_at = excluded.updated_at;
```

## Dashboard behavior

If the row says:

- `status='active'`
- `premium_insights=false`

Then the user gets:

- dashboard access
- scans
- no premium insights tab

If the row says:

- `status='active'`
- `premium_insights=true`

Then the user gets:

- dashboard access
- scans
- premium welcome treatment
- `Actionable Insights` tab
- premium reoptimization request button

## Short version

What the landing app needs to do:

1. use the same shared Supabase project
2. upsert `entitlements` by email after payment
3. set `premium_insights=true` only for the premium tier
4. keep `status='active'` for users who should be allowed into the dashboard
