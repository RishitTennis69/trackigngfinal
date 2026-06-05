# Production Review - 2026-06-05

Reviewed URLs:

- Dashboard: `https://trackigngfinal.vercel.app/`
- Landing: `https://gleo-ai-visibility-landing-page.vercel.app/`
- Railway API: `https://trackigngfinal-production.up.railway.app/`

## Summary

This pass focused on:

1. real production tracking signup flow
2. light free-audit repeat testing on the landing page
3. admin exposure checks
4. low-usage testing where possible

## Tracking Dashboard Production

### What passed

#### 1. Production signup flow now reaches the tracking-started state

Result:

- passed

Observed behavior:

- sign up page works
- account step works
- business step submits
- user reaches:
  - `Your tracking has been started.`
  - `We are scanning Little Bytes now. This usually takes a few minutes.`

This is a real improvement over the earlier broken production state.

#### 2. Railway backend is live and production API responds

Result:

- passed

Observed:

- Railway API responds at:
  - `/api/config`
  - `/api/scans/latest`
  - `/api/auth/me`

#### 3. Cross-origin frontend-to-Railway wiring is now partly working

Result:

- improved

Observed:

- Vercel frontend is no longer failing immediately from missing API routes
- the app successfully gets through signup and into the waiting state

### What still fails

#### 4. Refresh during first scan still drops user into an empty dashboard shell

Result:

- failed

Observed behavior:

- after reaching the production `tracking started` waiting state
- refreshing the page sends the user into the dashboard shell
- metrics are empty
- dashboard says effectively:
  - no scan results yet

Why this matters:

- this is the exact first-scan continuity bug we were trying to eliminate
- it means the production deploy is either:
  - still missing the newest first-scan fix
  - or the fix is incomplete under production timing

Current interpretation:

- first-scan persistence is still not fully solved in production

## Landing Production

### What passed

#### 5. Free audit flow is reachable and submittable

Result:

- partially passed

Observed:

- I could move through the full audit flow:
  - business name
  - website
  - email
  - industry
  - location

#### 6. Repeated free audit submits did not hard-cut me off immediately

Result:

- passed in the narrow sense

Observed:

- repeated submits did not trigger an obvious rate-limit lockout
- no visible “too many requests” style block appeared during this light test

### What still fails

#### 7. Free audit returns `Unable to analyze this website.`

Result:

- failed

Observed:

- using `https://littlebytes.dental`
- final result repeatedly came back:
  - `Unable to analyze this website.`

This happened consistently across repeated attempts.

Current interpretation:

- the old raw `Failed to fetch` production issue appears improved
- but the audit is still not functionally healthy for this test site
- now the failure is at the analysis stage, not basic routing/fetch

## Admin Exposure

### 8. `/admin` is blocked

Result:

- passed

Observed:

- `/admin` returns not found

### 9. `/quiet-copper-room` is blocked publicly

Result:

- passed

Observed:

- direct access returns not found

### 10. `/admin.html` is still publicly reachable

Result:

- failed

Observed:

- `https://trackigngfinal.vercel.app/admin.html` loads the admin sign-in page

Why this matters:

- even if auth still protects the data
- the page is still discoverable
- that is exactly the kind of thing you said feels unprofessional

## API Usage / Key Pressure

I kept this pass lighter than a full scan battery.

What likely consumed real provider usage:

- one real production tracking scan start

What likely did not consume much or any provider usage:

- admin route checks
- direct API route checks
- public shell checks

Landing audit usage:

- difficult to know exactly from here
- but the repeated audit failures happened early enough that I do not think this was a heavy burn compared with a full successful tracking scan

What I did not see:

- no explicit OpenAI / Gemini / OpenRouter quota error surfaced in this pass

## Biggest Remaining Production Issues

1. tracking dashboard refresh during first scan still breaks continuity
2. landing free audit still fails analysis for the tested site
3. `/admin.html` is still publicly reachable

## Follow-up Production Check

This later pass intentionally skipped the Free Audit flow.

### What Now Looks Better

- `/admin.html` on the production dashboard now returns `404`
- `/quiet-copper-room` on the production dashboard now returns `404`
- the production dashboard HTML now includes the upgraded tracking launch markup:
  - `tracking-launch-core`
  - the new waiting-state shell
- the Railway backend is live and `GET /api/config` returns configured provider JSON
- the landing page `/checkout` route returns `200`

### What Still Needs A True Browser Run

1. a real first-time paid signup through production
2. a refresh during the first waiting state to prove the empty-dashboard-shell bug is gone end to end

### Important Note

An earlier `HEAD` request to the Railway API returned `404`, but a normal `GET` request to `/api/config` returned valid JSON. So the backend is up; that earlier result was a request-method mismatch, not a dead deployment.

## Later Production Pass

This pass checked the currently deployed landing and dashboard production builds again.

### Dashboard Production

Confirmed:

- `https://trackigngfinal.vercel.app/` is live
- the deployed dashboard HTML includes the new first-scan progress bar state
- the deployed frontend bundle still points production API calls at:
  - `https://trackigngfinal-production.up.railway.app`
- `https://trackigngfinal.vercel.app/admin.html` returns `404`
- `https://trackigngfinal.vercel.app/quiet-copper-room` returns `404`
- the Railway backend returns valid JSON for:
  - `GET /api/config`

Current confidence:

- production routing and admin hiding are in much better shape
- the dashboard/railway connection is intact
- a full interactive paid signup flow is still the main browser-level check worth re-running

### Landing Production

Confirmed:

- `/` returns `200`
- `/audit` returns `200`

## Latest Production Pass

This pass skipped Free Audit interaction and focused on the live dashboard auth and admin chain.

### What passed

1. Public production routes are healthy
   - `https://trackigngfinal.vercel.app/` returns `200`
   - `https://trackigngfinal.vercel.app/admin.html` returns `404`
   - `https://trackigngfinal.vercel.app/quiet-copper-room` returns `404`
   - landing `/`, `/audit`, `/checkout`, and `/welcome` all return `200`

2. Railway public pages are reachable
   - Railway app root returns `200`
   - Railway `GET /api/config` returns valid provider JSON
   - Railway private admin page route can return the admin shell page

3. A real production signup can succeed
   - fresh active entitlement row inserted successfully
   - fresh production signup returned `200`

4. Wrong-password handling works
   - production login with a bad password returned `401`
   - message: `Incorrect password.`

### What went wrong

1. Railway POST stability is still flaky under a fuller production pass
   - after the first successful signup, follow-up requests started returning:
     - `502 Application failed to respond`
   - affected routes in the failing pass included:
     - duplicate signup
     - successful login
     - unpaid signup
     - trial signup
     - admin login
     - authenticated scan routes

2. Railway private admin route is not consistently healthy
   - in some checks it serves the sign-in page
   - in the broader pass it fell back to `502`
   - user screenshots still show that it can work in a normal browser session, so this currently looks intermittent rather than fully dead

3. Authenticated scan continuity is still not proven in production
   - because the authenticated follow-up routes became unstable
   - I could not finish:
     - first scan
     - latest scan fetch
     - scan list fetch
     - refresh-during-first-scan proof

### Likely Root Cause

The most suspicious layer was the custom HTTPS Supabase helper in the dashboard backend. I replaced that helper locally with the normal Node `fetch` path plus a timeout, which should behave more like the successful browser traffic already reaching Railway.

This fix is local in the repo right now and still needs deployment before I can rerun the production pass against it.

## Final Production Auth Pass

After the Railway redeploy caught up, the dashboard production auth flow behaved much more cleanly.

### What passed

1. Active paid signup
   - returned `200`

2. Existing-user login
   - returned `200`

3. Wrong-password sign-in
   - returned `401`
   - message: `Incorrect password.`

4. Trial signup and trial login
   - both returned `200`

5. Expired included-month signup
   - returned `403`
   - message: `Your included month of tracking has ended. Choose a monthly plan to keep monitoring your AI visibility.`

6. Unpaid signup
   - returned `403`
   - message: `No paid Gleo access was found for this email yet. Complete payment on the Gleo landing page first.`

7. Duplicate signup
   - returned `409`
   - message: `An account with this email already exists.`

8. Admin auth and data
   - admin login returned `200`
   - admin overview returned `200`

9. First real scan after signup
   - scan request returned `200`
   - latest scan endpoint returned a saved scan afterward
   - scans list returned `1`
   - completed answers: `18`
   - visibility score: `62`

### What this means now

- The production dashboard backend is no longer masking normal auth/product rules as `502` errors.
- The paid-access gate is behaving correctly.
- The first real production scan path is working again.

### Still not fully proven

- Browser-level refresh during the first waiting state on the production dashboard still deserves one true visual pass.
- The landing Free Audit interaction itself was not the focus of this last auth/scan pass, so that remains a separate browser test.
- `/checkout` returns `200`
- `/welcome` returns `200`
- the landing production bundle does **not** contain:
  - `localhost`
  - `127.0.0.1`
- the landing production bundle references the real dashboard domain:
  - `https://trackigngfinal.vercel.app/`

Interpretation:

- the old class of “production still points to local stuff” bug looks resolved on the landing side too
- the next meaningful landing test is the actual free-audit interaction path, not basic routing or domain wiring

## Final Browser Pass

### Dashboard refresh continuity

Result:

- passed

What I tested:

1. seeded a fresh paid entitlement
2. completed a real production signup on `https://trackigngfinal.vercel.app/`
3. reached the `Tracking started` waiting state
4. refreshed the page before the first scan finished

Observed:

- before refresh, the waiting state was visible
- after refresh, the waiting state was still visible
- the page did **not** drop into the empty dashboard shell

Conclusion:

- the production first-scan refresh continuity fix is now working

### Landing Free Audit browser flow

Result:

- failed in the browser

What I tested:

1. opened `https://gleo-ai-visibility-landing-page.vercel.app/audit`
2. filled:
   - business name
   - website URL
   - email
   - industry
   - service area
3. clicked `Run snapshot`

Observed:

- the page stayed on the final step
- the UI showed: `Failed to fetch`
- the failed request was:
  - `POST https://gleo-ai-visibility-landing-page-production.up.railway.app/api/analyze-audit`
- browser failure:
  - `net::ERR_FAILED`

Important nuance:

- the backend endpoint itself **does** return `200` when called directly with the right payload
- so this now looks like a browser-side connectivity issue, most likely CORS / origin handling, not a dead audit backend
