# Your Next Steps

I handled the app-side work already.

Here is what you still need to do outside the code:

## 1. Run the premium SQL upgrade

If you already ran the shared schema before, run:

- [premium-tier-migration.sql](</C:/Users/Krish Grover/Documents/trackigngnfinal/trackigngfinal/premium-tier-migration.sql>)

## 2. Decide whether you want Twilio right now

You have two modes:

### Easiest right now

Do nothing with Twilio yet.

Result:

- premium requests are still saved in Supabase
- no text alert is sent

### If you want text alerts

Fill these in inside `.env`:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
TWILIO_TO_NUMBER=
```

Then restart the backend.

## 3. Send the other project the handoff

Send them one of these:

- [OTHER_APP_SHARED_SUPABASE_HANDOFF.md](</C:/Users/Krish Grover/Documents/trackigngnfinal/trackigngfinal/OTHER_APP_SHARED_SUPABASE_HANDOFF.md>)
- [OTHER_CODEX_PREMIUM_PROMPT.md](</C:/Users/Krish Grover/Documents/trackigngnfinal/trackigngfinal/OTHER_CODEX_PREMIUM_PROMPT.md>)

## 4. Add one premium test user

In Supabase, make your own email premium:

```sql
insert into public.entitlements (email, status, plan, premium_insights, source_app, paid_at, updated_at)
values (
  'you@example.com',
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

## 5. Test the flow

1. sign in with that premium email
2. run a scan
3. open `Actionable Insights`
4. click `Request Reoptimization`
5. check Supabase `service_requests`

If Twilio is configured, you should also get a text.
