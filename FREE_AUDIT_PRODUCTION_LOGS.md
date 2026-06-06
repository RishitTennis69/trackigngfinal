# Free Audit Production Logs

Test date:

- June 5, 2026

Public page tested:

- `https://gleo-ai-visibility-landing-page.vercel.app/audit`

Backend target reached by the browser:

- `https://gleo-ai-visibility-landing-page-production.up.railway.app/api/analyze-audit`

## Browser repro

Filled these production audit steps:

1. business name: `Little Bytes`
2. website URL: `https://littlebytes.dental`
3. email: test email
4. industry: `Healthcare / Dental`
5. service area: `Palo Alto, CA`

Clicked:

- `Run snapshot`

Browser result:

- UI stayed on the final step
- error shown: `Failed to fetch`

## Failed browser request

Failed request captured from the live browser flow:

```text
POST https://gleo-ai-visibility-landing-page-production.up.railway.app/api/analyze-audit
```

Browser failure:

```text
net::ERR_FAILED
```

No successful API response was visible in the browser for that request.

## Important backend sanity check

The audit backend itself is not dead.

When called directly with the correct payload shape, the same endpoint returned:

```text
200 OK
```

Direct payload shape that worked:

```json
{
  "businessName": "Little Bytes",
  "websiteUrl": "https://littlebytes.dental",
  "email": "qa-audit@example.com",
  "industry": "Healthcare / Dental",
  "serviceArea": "Palo Alto, CA"
}
```

That means:

- the browser flow is failing before or during cross-origin delivery
- the audit backend can still complete successfully when reached directly

## Preflight evidence

Observed preflight response:

```text
OPTIONS /api/analyze-audit -> 204
```

Important response header:

```text
Access-Control-Allow-Origin: https://gleo-ai-visibility-landing-page.vercel.app/
```

Note the trailing slash.

Real browser origin:

```text
https://gleo-ai-visibility-landing-page.vercel.app
```

That mismatch is suspicious because browser origin matching is exact.

## Likely issue

Most likely cause:

- CORS / origin handling on the landing Railway backend

Why:

1. browser request fails with `net::ERR_FAILED`
2. endpoint works when called directly
3. allow-origin header currently includes a trailing slash
4. browser origin string does not

## Suggested fix

1. return the exact origin string with no trailing slash:
   - `https://gleo-ai-visibility-landing-page.vercel.app`
2. verify the backend also allows:
   - `Content-Type`
   - `POST`
   - preflight `OPTIONS`
3. rerun the real browser audit flow after deploy
