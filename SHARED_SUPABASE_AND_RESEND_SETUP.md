# Shared Supabase + Premium Tier Setup

This file is for the tracking dashboard project.

It covers:

1. shared Supabase access
2. premium actionable insights gating
3. premium request storage
4. optional Twilio text alerts

## What changed

The dashboard now supports two levels:

- regular paid access
- premium paid access with actionable insights

Regular paid users can:

- sign up
- sign in
- run scans
- use the normal tracking dashboard

Premium paid users can also:

- open the `Actionable Insights` tab
- review the latest premium recommendations
- click `Request Reoptimization`

When they click that button:

- the frontend calls the backend once
- the backend stores a `service_requests` row
- if Twilio is configured, the backend also sends you a text alert
- if Twilio is not configured, nothing breaks and the request still stays saved in Supabase

## Step 1: Run the right SQL

If you have not created the shared tables yet, run:

- [shared-supabase-schema.sql](</C:/Users/Krish Grover/Documents/trackigngnfinal/trackigngfinal/shared-supabase-schema.sql>)

If you already created the shared tables earlier, run this upgrade instead:

- [premium-tier-migration.sql](</C:/Users/Krish Grover/Documents/trackigngnfinal/trackigngfinal/premium-tier-migration.sql>)

That upgrade adds:

- `premium_insights` on `entitlements`
- `service_requests`

## Step 2: Fill in `.env`

Use:

- [.env.example](</C:/Users/Krish Grover/Documents/trackigngnfinal/trackigngfinal/.env.example>)

Important values:

```env
SUPABASE_PROJECT_MODE=shared
ENTITLEMENT_ALLOWED_STATUSES=active,trialing
PREMIUM_ENTITLEMENT_PLANS=gleo-premium,gleo-reoptimization,tracking-premium
```

Optional Twilio values:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
TWILIO_TO_NUMBER=
```

If Twilio is blank:

- premium requests still work
- they are just saved in Supabase without texting you

## Step 3: How the premium gate works

The dashboard checks `entitlements`.

A user is allowed into the dashboard when:

- `status` is in `ENTITLEMENT_ALLOWED_STATUSES`

A user gets premium actionable insights when either is true:

- `premium_insights = true`
- or `plan` matches one of `PREMIUM_ENTITLEMENT_PLANS`

Recommended setup:

- keep `status='active'`
- use `premium_insights=true` for the premium tier

That is clearer than inventing a strange new access status.

## Step 4: Test one normal user

Example:

```sql
insert into public.entitlements (email, status, plan, premium_insights, source_app, paid_at, updated_at)
values (
  'regular@example.com',
  'active',
  'gleo-tracking',
  false,
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

## Step 5: Test one premium user

Example:

```sql
insert into public.entitlements (email, status, plan, premium_insights, source_app, paid_at, updated_at)
values (
  'premium@example.com',
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

Expected result:

- that user sees the premium welcome treatment
- that user sees the `Actionable Insights` tab
- that user can submit a premium request

## Step 6: Twilio notes

Twilio is optional.

What the app does today:

- if Twilio env vars are filled in, it tries to send you a text
- if Twilio is not configured or the send fails, the request is still stored

So the durable record is always the Supabase `service_requests` table.

## Step 7: What the other app must do

The landing-page/payment app must write the entitlement row correctly.

Send that team this file:

- [OTHER_APP_SHARED_SUPABASE_HANDOFF.md](</C:/Users/Krish Grover/Documents/trackigngnfinal/trackigngfinal/OTHER_APP_SHARED_SUPABASE_HANDOFF.md>)

And if they want an exact prompt, send them:

- [OTHER_CODEX_PREMIUM_PROMPT.md](</C:/Users/Krish Grover/Documents/trackigngnfinal/trackigngfinal/OTHER_CODEX_PREMIUM_PROMPT.md>)
