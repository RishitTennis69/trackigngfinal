# Deployed Landing QA Handoff

Deployed site tested:

- `https://gleo-ai-visibility-landing-page.vercel.app/`

Test date:

- June 4, 2026

Goal of this handoff:

- these are bugs on the landing / payment site, not the dashboard repo
- please fix them in the landing project and redeploy

## Highest Priority

### 1. Free audit flow fails on the final step with `Failed to fetch`

Severity:

- Critical

Repro:

1. Open the deployed landing page
2. Click `Get my free audit`
3. Fill:
   - business name: `Little Bytes Dental`
   - website: `https://littlebytes.dental`
   - email: any valid email
   - industry: `Healthcare / Dental`
   - location: `Palo Alto, CA`
4. Click `Run snapshot`

Actual:

- the page stays on the final audit step
- a red error message appears: `Failed to fetch`

Expected:

- the audit should submit successfully and continue into the snapshot / next state

Notes:

- this is currently blocking the most important public path on the deployed site

### 2. Production bundle is still calling a localhost checkout backend

Severity:

- Critical

Evidence found in the deployed JS bundle:

- bundle: `https://gleo-ai-visibility-landing-page.vercel.app/assets/index-DXo8cGX7.js`
- hardcoded value found in bundle:
  - `const Ix="http://127.0.0.1:8787"`
- checkout call found in bundle:
  - ``fetch(`${Ix}/api/create-checkout-session`, ...)``

Actual:

- the deployed site still references a local machine backend for checkout creation

Expected:

- production should point to a real deployed backend or environment-driven API base

Likely impact:

- checkout and other backend-backed landing flows can fail in production even if they work locally

### 3. Direct `/checkout` route returns Vercel `404 NOT_FOUND`

Severity:

- High

Repro:

1. Open `https://gleo-ai-visibility-landing-page.vercel.app/checkout`

Actual:

- Vercel `404: NOT_FOUND`

Expected:

- the checkout route should resolve normally if this is a valid SPA route
- if the route should not be public, the app should not reference it as a real screen

Notes:

- the deployed bundle still contains a route definition for `/checkout`
- this strongly suggests the app expects the route to exist

## Medium Priority

### 4. Deployed app bundle still contains `/checkout` and `/welcome` route definitions, but deployed routing is incomplete

Severity:

- Medium

Evidence:

- route definitions were found in the deployed JS bundle for:
  - `/audit`
  - `/checkout`
  - `/welcome`

Risk:

- even if some flows navigate client-side, refreshes or direct links can still break in production

Suggested fix:

- make sure Vercel SPA rewrites cover all app routes

### 5. `Skip payment testing` is not present in the deployed bundle

Severity:

- Medium

What I checked:

- searched the deployed bundle for:
  - `Skip payment testing`
  - `skip payment testing`
  - `skip payment`

Actual:

- no match found in the deployed bundle

Expected:

- if this is supposed to exist in deployed testing, it needs to be included in the deployed build
- if it is intentionally local-only, then that is fine, but the QA path needs another testable paid bypass

## Lower Confidence / Needs Product Confirmation

### 6. Paid plan CTAs currently route into the audit flow

Observed:

- clicking pricing CTAs like `Start tracking` and `Get started` routed into `/audit`

This may be correct if:

- you intentionally want audit first, then checkout

This may be a bug if:

- a paid plan CTA should start a checkout-specific flow directly

Please confirm expected behavior before changing this one.

## Suggested Fix Order

1. remove localhost backend references from the production bundle
2. fix the audit submit fetch path
3. fix production routing for `/checkout` and other SPA routes
4. confirm whether the skip-payment QA control should exist in deployed
5. confirm whether paid CTAs should go to audit or checkout
