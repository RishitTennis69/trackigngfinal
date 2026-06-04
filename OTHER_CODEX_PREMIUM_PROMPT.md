Use this exact prompt with the other Codex:

---

We now have one shared Supabase project between the Gleo landing/payment app and the tracking dashboard.

Please update the landing/payment app so that after payment it writes the customer's access row into `public.entitlements`.

Requirements:

1. Use the customer's email as the identity key.
2. Upsert `public.entitlements` by `email`.
3. For normal tracking customers, write:
   - `status = 'active'`
   - `plan = 'gleo-tracking'`
   - `premium_insights = false`
4. For premium reoptimization customers, write:
   - `status = 'active'`
   - `plan = 'gleo-premium'`
   - `premium_insights = true`
5. Also write:
   - `source_app = 'gleo-landing'`
   - `paid_at = now()`
   - `updated_at = now()`
6. Do not use business name or website as identity.
7. If the same person changes their business website later, do not create a new entitlement row.

Use this SQL shape:

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

Please implement the full payment-to-entitlement wiring in that project and verify that both a normal customer and a premium customer produce the correct entitlement row.

---
