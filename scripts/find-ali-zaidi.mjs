import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BASE = "http://127.0.0.1:4173";

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function request(pathname, { method = "GET", body, cookie = "" } = {}) {
  const response = await fetch(`${BASE}${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  const setCookie = response.headers.getSetCookie?.() || [];
  return { ok: response.ok, status: response.status, data, setCookie };
}

loadEnv();
const adminPassword = process.env.ADMIN_PASSWORD || process.env.LOCAL_TEST_ADMIN_PASSWORD || "";
const adminEmail = process.env.ADMIN_EMAIL || "";

const login = await request("/api/admin/login", {
  method: "POST",
  body: { email: adminEmail, password: adminPassword },
});
if (!login.ok) {
  console.error("Admin login failed", login.status, login.data);
  process.exit(1);
}
const cookie = login.setCookie.map((e) => e.split(";")[0]).join("; ");
const overview = await request("/api/admin/overview", { cookie });
if (!overview.ok) {
  console.error("Overview failed", overview.status);
  process.exit(1);
}

const users = overview.data.users || [];
const matches = users.filter((u) => /zaidi/i.test(u.name || "") || /zaidi/i.test(u.email || ""));
console.log(JSON.stringify(matches, null, 2));
if (!matches.length) {
  console.log("No user matching Zaidi found in admin overview.");
}
