# Dashboard QA Notes

App tested:

- `http://127.0.0.1:4173/`

Test date:

- June 4, 2026

Purpose of this file:

- this is the dashboard-side bug list and test ledger for this repo
- landing-site bugs live in `OTHER_SITE_DEPLOYED_BUGS.md`

## Top-5 Priority Pass

These were tested in the order of the ranked checklist.

### 1. Paid user, first-time signup from the landing CTA

Status:

- Blocked by landing-site production bug

Reason:

- the deployed landing flow fails on `Run snapshot` with `Failed to fetch`
- because of that, I could not complete the true end-to-end deployed CTA -> paid access -> dashboard handoff path

What this means:

- this is not yet a confirmed dashboard bug
- we need the landing deploy fixed before this path can be judged fairly

### 2. Existing paid user signs in

Status:

- Passed at the backend/API level

Result:

- `200 OK`
- existing business info was preserved

Notes:

- this still deserves one clean browser retest after the landing path is fixed

### 3. Existing paid user tries to sign up again

Status:

- Passed at the backend/API level

Result:

- backend returns `409`
- duplicate account is not created

Important frontend expectation:

- the UI should catch that and say `Signing you in...`

Notes:

- browser-level confirmation of the message is still worth rechecking in a fresh UI pass

### 4. First scan returns no completed answers

Status:

- Mixed

What passed:

- the scan endpoint now works and stores a real scan row
- in direct testing, the first scan completed successfully
- a real `dashboard_scans` row was written to Supabase

What is still concerning:

- the scan took about `121s`
- earlier UI tests showed a confusing first-run state with no visible data
- because the scan is slow, the app can still feel broken during the wait

Important extra finding:

- Gemini is currently hitting quota limits during the scan
- that did not prevent a completed scan overall, but it does cause partial provider failure

Current interpretation:

- this is no longer a clear backend failure
- it is now more of a first-run UX / timing / user-guidance risk

### 5. Unpaid user tries to sign up

Status:

- Passed

Result:

- `403`
- message correctly says paid access is required first

## Confirmed Dashboard Issues Still Worth Fixing

### A. First-run experience is still vulnerable to feeling empty or incomplete

Why this still matters:

- the scan can take around two minutes
- if the user reaches the dashboard shell too early, it can feel like nothing happened
- this was the root of the earlier confusion you reported

Suggested follow-up:

- keep the user in a stronger waiting state until either:
  - a completed scan exists, or
  - the scan fails clearly and offers retry

### B. Provider quota failures are surfacing in real scans

Observed:

- Gemini returned quota-exceeded errors during the direct scan test

Impact:

- overall scan still completed because other providers answered
- but provider-level consistency is not stable right now

Suggested follow-up:

- decide whether to:
  - hide temporarily failing providers from the scan request
  - show clearer partial-results language
  - or add provider health messaging in the launch state

## Already Improved in This Repo

These are not current open bugs, but they were fixed recently and should stay on the watchlist:

- ugly browser `alert()` flow replaced with in-app toasts
- duplicate signup no longer silently creates or mutates a user
- signup/sign-in are gated by paid entitlement
- admin empty-state timeout issue was fixed by changing the server-side Supabase request path
- sidebar access badge wrapping was tightened
- tracking-started screen was made more honest about first-score readiness

## Best Next Dashboard Tests

After the landing deploy is fixed, rerun these in the browser:

1. paid CTA -> signup -> first scan -> open dashboard
2. duplicate signup from the real UI and confirm `Signing you in...`
3. refresh during the tracking-started wait state
4. premium user sign-in
5. included-month user sign-in

## Direct Test Results Snapshot

From the latest direct pass:

- paid first signup: `200`
- existing paid sign-in: `200`
- duplicate signup: `409`
- first scan after signup: `200`
- stored scan row after first scan: `1`
- unpaid signup: `403`
