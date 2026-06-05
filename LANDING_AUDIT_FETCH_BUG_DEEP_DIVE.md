# Landing Audit `Failed to fetch` Bug Deep Dive

Site:

- `https://gleo-ai-visibility-landing-page.vercel.app/`

Date observed:

- June 4, 2026

Priority:

- Critical

Why this matters:

- this is the main public front-door path
- a first-time visitor can successfully move through the audit steps, but the actual submit fails at the final step
- that means the site can collect intent and then drop the user right before value delivery

## Short Version

The deployed landing site still appears to be shipping code that depends on a local backend for at least part of its production flow. The strongest evidence is in the deployed JS bundle, which contains a hardcoded localhost backend URL:

- `http://127.0.0.1:8787`

When the user reaches the final audit step and clicks `Run snapshot`, the UI shows:

- `Failed to fetch`

That strongly suggests the deployed frontend is trying to call a backend endpoint that is unreachable in production.

## Exact Reproduction

1. Open:
   - `https://gleo-ai-visibility-landing-page.vercel.app/`
2. Click:
   - `Get my free audit`
3. Fill the audit steps with valid-looking data:
   - business name: `Little Bytes Dental`
   - website: `https://littlebytes.dental`
   - email: any valid email
   - industry: `Healthcare / Dental`
   - location: `Palo Alto, CA`
4. Click:
   - `Run snapshot`

## Actual Result

- the user stays on the final audit step
- a red inline error appears:
  - `Failed to fetch`

## Expected Result

- the audit request should submit successfully
- the user should move into the snapshot result / next-step flow
- no generic fetch error should be visible

## Strong Evidence Found in the Deployed Bundle

I inspected the currently deployed JS bundle:

- `https://gleo-ai-visibility-landing-page.vercel.app/assets/index-DXo8cGX7.js`

Inside that bundle, I found this hardcoded production-breaking reference:

- `const Ix="http://127.0.0.1:8787"`

And this checkout fetch pattern:

- ``fetch(`${Ix}/api/create-checkout-session`, ...)``

This proves the deployed build still contains localhost backend references.

## Why This Is Probably the Root Cause

Even though the exact audit submit function name was not isolated in this pass, the production build already demonstrates the core failure pattern:

- the deployed frontend contains hardcoded localhost API usage
- the user-facing failure is a classic browser fetch failure
- the failure happens at the point where the frontend must talk to a backend service

So the most likely cause is:

- the audit submit code is also using a wrong backend base URL
- or it is relying on a local-only service path that is not available from the deployed site

## Related Production Routing Problem

There is another deployed-site issue that reinforces the same conclusion:

- opening `https://gleo-ai-visibility-landing-page.vercel.app/checkout` directly returns Vercel `404 NOT_FOUND`

That means production routing is also not fully aligned with the app’s own route model.

This may be separate from the fetch bug, but together they suggest the deployed app is not fully production-wired.

## Most Likely Root Cause Categories

Please check these in the landing project:

### 1. Hardcoded API base in frontend code

Look for things like:

- `http://127.0.0.1:8787`
- `http://localhost:...`
- `const API_BASE = ...`
- direct `fetch()` calls that do not use an environment-driven production URL

### 2. Environment variables not injected into the production build

Check whether the landing app expects something like:

- `VITE_API_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- or another build-time env var

If that variable is missing in Vercel, the app may be falling back to localhost.

### 3. Audit submit endpoint not deployed or not reachable from browser

Check whether the audit flow is supposed to call:

- a serverless function
- a separate API service
- or an internal route

Make sure the deployed app is calling a real deployed URL, not a local dev backend.

### 4. Mixed flow between audit, checkout, and welcome screens

The bundle also contains route definitions for:

- `/audit`
- `/checkout`
- `/welcome`

Please verify that:

- the audit flow
- checkout flow
- and post-checkout / welcome flow

all point to the same correct production backend configuration.

## What the Other Codex Should Search For First

I would start with these searches in the landing project:

1. search for:
   - `127.0.0.1`
   - `localhost`
   - `8787`
2. search for:
   - `create-checkout-session`
   - `Run snapshot`
   - `snapshot`
   - `audit`
3. inspect the env setup for production:
   - Vercel project env vars
   - build-time frontend env usage
4. verify SPA rewrites / routing config for:
   - `/audit`
   - `/checkout`
   - `/welcome`

## What a Correct Fix Should Look Like

After the fix:

1. the deployed bundle should contain no localhost backend URLs
2. the audit flow should submit successfully in production
3. `Run snapshot` should not show `Failed to fetch`
4. direct SPA routes should resolve correctly in production if they are meant to be navigable

## Acceptance Test

Use this as the final verification:

1. deploy the landing fix
2. open the deployed site
3. complete the full free audit flow
4. confirm the final submit succeeds
5. inspect the deployed JS bundle for:
   - no `127.0.0.1`
   - no `localhost`
6. open `/checkout` directly if that route is intended to exist
7. confirm it no longer returns Vercel `404`
