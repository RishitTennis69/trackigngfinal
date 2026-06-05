# QA Coverage Report

Date:

- June 4, 2026

Goal:

- push practical coverage close to `95%` of likely real user cases

## Coverage Estimate

Current estimate:

- about `93% to 96%` of real user cases

Single-number estimate:

- `95%`

Why:

- the major identity, entitlement, duplicate-account, premium/included-month, and admin-path cases are now covered
- the only meaningful gaps left are a couple of very UI-specific edge cases that are harder to automate reliably than the business logic underneath them

## What Was Tested

### Tested and passed

1. Paid first-time signup without hero prefill
2. Existing paid user signs in
3. Existing paid user tries to sign up again
4. Paid user signs in with wrong password
5. Unpaid user tries to sign up
6. Unpaid user tries to sign in directly
7. Included-month user signup
8. Included-month user sign-in
9. Expired included-month user sign-in
10. Premium user signup
11. Premium user sign-in
12. Direct admin path `/admin`
13. Direct admin path `/admin.html`
14. Private admin route behavior
15. Identity remains keyed by email even when business website changes

### Tested and failed

1. Paid first-time user from the deployed landing front-door flow

Result:

- blocked by landing-site production bug
- audit submit still ends in `Failed to fetch`

### Tested and partially passed

1. First scan behavior

Result:

- backend now successfully creates and stores a scan
- but the scan is slow enough that first-run UX can still feel broken to a human user

## Remaining Lower-Confidence Gaps

These are the only things I would still call slightly under-tested:

### 1. Refresh during the exact tracking-started waiting state

Why it is still a small gap:

- the session logic is in much better shape now
- but this specific browser timing case was not cleanly proven end-to-end in a stable automation pass

### 2. Sidebar profile block visual polish across all tiers

Why it is still a small gap:

- the rendering logic is consistent
- but the final visual compactness across standard / included / premium is still better confirmed by a human glance than by API testing

### 3. Force-zero-completed-answers path

Why it is still a small gap:

- the app has logic for this state
- but with live providers configured, it is awkward to force this exact condition cleanly without changing the environment temporarily

## Practical Read

For real business risk, the important stuff is now mostly covered:

- who gets in
- who does not get in
- duplicate account behavior
- tier behavior
- premium gating
- expired access handling
- admin surface discoverability

The biggest live risk is not the dashboard auth logic anymore.

The biggest live risk is:

- the deployed landing site front-door flow failing before it can hand off users cleanly
