## Tracking Dashboard Test Scenarios

Use this as a simple manual checklist after each meaningful change.

## Start Here

If you only test a few things, do these in this order:

### Priority 1

1. Paid user, first-time signup from the landing CTA
2. Existing paid user signs in
3. Existing paid user tries to sign up again
4. First scan returns no completed answers

These cover the highest-risk path:
- payment access exists
- account gets created
- duplicate-account handling works
- first scan state is honest

### Priority 2

5. Unpaid user tries to sign up
6. Unpaid user tries to sign in directly
7. Browser refresh during tracking-started state

These catch access-control and session weirdness.

### Priority 3

8. Included-month user
9. Premium user
10. Change business info later
11. Sidebar profile block
12. Direct admin-path checks

These are still important, but they are less likely to break the core business flow first.

### 1. Paid user, first-time signup from the landing CTA

1. Start on the landing page.
2. Enter a business name and website in the hero form.
3. Click the signup path.
4. Enter:
   - name
   - email
   - password
5. Submit.

Expected:
- no browser alert appears
- you do not skip around to a weird in-between page by accident
- you land on the tracking-started screen
- while the first scan is still running, there is no dashboard button
- once the first score is ready, the dashboard button appears
- opening the dashboard shows real data, not an empty shell

### 2. Paid user, first-time signup without using the hero CTA first

1. Open signup directly.
2. Enter name, email, password.
3. Continue to the business step.
4. Enter business name and website.
5. Submit.

Expected:
- the second step appears normally
- business info is saved once
- the first scan starts after signup
- no duplicate account is created

### 3. Existing paid user signs in

1. Go to sign in.
2. Enter the same:
   - name
   - email
   - password
3. Submit.

Expected:
- you sign in cleanly
- you do not get sent through signup again
- existing business info is preserved
- the dashboard shows the latest stored scan if one already exists

### 4. Existing paid user tries to sign up again

1. Go to signup with an email that already has an account.
2. Enter the correct name, email, and password.
3. Submit.

Expected:
- the app says it is signing you in
- it does not create a second user
- it does not overwrite the user unexpectedly

### 5. Paid user signs in with the wrong password

1. Go to sign in.
2. Enter the correct name and email, but the wrong password.
3. Submit.

Expected:
- sign-in is blocked
- the app stays on sign in
- no session is created

### 6. Unpaid user tries to sign up

1. Use an email that does not have an active entitlement in Supabase.
2. Attempt signup.

Expected:
- signup is blocked
- the app explains that paid access is required first
- no account is created

### 7. Unpaid user tries to sign in directly

1. Go straight to the dashboard app without paying.
2. Try to sign in with an email that has no active entitlement.

Expected:
- sign-in is blocked
- no dashboard access is granted

### 8. Included-month user

1. Use an entitlement row with:
   - `status = trialing`
   - a future `trial_ends_at`
2. Sign up or sign in.

Expected:
- access works
- the profile area shows included access
- premium insights do not appear
- the dashboard messaging reflects included-month access

### 9. Expired included-month user

1. Use an entitlement row with:
   - `status = trialing`
   - a past `trial_ends_at`
2. Try to sign in.

Expected:
- access is blocked
- the app explains that the included month has ended

### 10. Premium user

1. Use an entitlement row with premium access.
2. Sign in.

Expected:
- premium access copy appears
- the premium tab is visible
- standard users do not see that tab

### 11. First scan returns no completed answers

1. Sign up with a valid paid account.
2. Force a bad scan outcome by temporarily removing provider access or using a setup that produces zero completed answers.

Expected:
- the app does not pretend the dashboard is ready
- the launch screen explains that the first score is not ready yet
- the dashboard does not open automatically into a confusing empty state
- a retry path is visible

### 12. Sidebar profile block

1. Sign in as:
   - standard
   - included-month
   - premium
2. Check the bottom of the sidebar each time.

Expected:
- the profile block stays compact
- the badge does not wrap awkwardly
- included and premium labels look intentional

### 13. Direct admin-path checks

1. Visit `/admin`
2. Visit `/admin.html`
3. Visit your private admin route without logging in

Expected:
- public admin paths return not found
- the private admin route shows the admin sign-in flow
- no customer-facing user should discover an obvious admin page

### 14. Browser refresh during tracking-started state

1. Sign up and land on the tracking-started page.
2. Refresh before the scan is done.

Expected:
- the session survives
- the app either resumes the scan state or safely restarts it
- no duplicate user is created

### 15. Change business info later

1. Sign in to an existing account.
2. Run a new scan with a changed business website from inside the dashboard flow.

Expected:
- no new user account is created
- the scan belongs to the same user
- identity still keys off email, not business name or website
