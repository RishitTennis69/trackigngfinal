# Admin Auth Setup

The admin room now supports a real sign-in flow.

## Recommended production setup

Put these in your environment:

```env
ADMIN_DASHBOARD_PATH=quiet-copper-room
ADMIN_EMAIL=gleo.outreach@gmail.com
ADMIN_PASSWORD_HASH=your-generated-hash
ADMIN_SESSION_SECRET=replace-with-a-long-random-secret
```

## Easier local setup

You can also use:

```env
ADMIN_DASHBOARD_PATH=quiet-copper-room
ADMIN_EMAIL=gleo.outreach@gmail.com
ADMIN_PASSWORD=change-this-admin-password
ADMIN_SESSION_SECRET=replace-with-a-long-random-secret
```

That works, but the hashed version is better for production.

## Copy-ready example

If you want something you can copy and then edit:

```env
ADMIN_DASHBOARD_PATH=quiet-copper-room
ADMIN_EMAIL=gleo.outreach@gmail.com
ADMIN_PASSWORD=change-this-admin-password
ADMIN_SESSION_SECRET=replace-with-a-long-random-secret
```

## What the session secret is for

The session secret is **not** your password.

It is the private server secret used to sign the admin login session cookie.

Plain English:

- you sign in once with email and password
- the server gives the browser a session cookie
- the server signs that cookie with `ADMIN_SESSION_SECRET`
- later, when the browser comes back, the server checks the signature
- if the signature is valid, you stay signed in
- if someone tampers with the cookie, the signature check fails

So the session secret protects the integrity of the login session.

That means it should be:

- long
- random
- private
- different from your admin password

Good example shape:

```env
ADMIN_SESSION_SECRET=9d4f7c28b4d146f5a63fb4c19d6f1f7e2c7a9d9d85f24398aebf6bc1a0d2e4ab
```

You can generate one with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

## Current migration fallback

If you only set:

```env
ADMIN_DASHBOARD_PATH=...
ADMIN_DASHBOARD_KEY=...
RESEND_DEVELOPER_EMAIL=...
```

the app can temporarily use:

- `RESEND_DEVELOPER_EMAIL` as the admin email
- `ADMIN_DASHBOARD_KEY` as the admin password

This is just to keep you moving while you switch to dedicated admin credentials.

## How to generate `ADMIN_PASSWORD_HASH`

Run this in the project folder:

```bash
node -e "const crypto=require('node:crypto'); const password=process.argv[1]; const salt=crypto.randomBytes(16).toString('hex'); const hash=crypto.scryptSync(password,salt,64).toString('hex'); console.log(`${salt}:${hash}`)" "your-password-here"
```

Then put the printed value into:

```env
ADMIN_PASSWORD_HASH=...
```
