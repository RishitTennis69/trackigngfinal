import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BASE = process.argv[2] || "https://trackigngfinal-production.up.railway.app";

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

const cookie = login.setCookie.map((entry) => entry.split(";")[0]).join("; ");
const overview = await request("/api/admin/overview", { cookie });
if (!overview.ok) {
  console.error("Overview failed", overview.status, overview.data);
  process.exit(1);
}

const users = overview.data.users || [];
const now = Date.now();
const recent = users
  .filter((user) => user.latestScanAt)
  .sort((a, b) => String(b.latestScanAt).localeCompare(String(a.latestScanAt)));

console.log(`API: ${BASE}`);
console.log("=== Most recent scan activity ===");
for (const user of recent.slice(0, 10)) {
  const ageMs = now - new Date(user.latestScanAt).getTime();
  console.log(
    JSON.stringify({
      name: user.name,
      email: user.email,
      scanCount: user.scanCount,
      setupStatus: user.setupStatus,
      latestScanAt: user.latestScanAt,
      minutesAgo: Math.round(ageMs / 60000),
      visibilityScore: user.latestVisibilityScore,
      completedAnswers: user.latestMentionRate != null ? "see scan row" : null,
    }),
  );
}

const ali = users.find((user) => /zaidi/i.test(user.email || "") || /zaidi/i.test(user.name || ""));
console.log("\n=== Ali Zaidi ===");
console.log(JSON.stringify(ali || { found: false }, null, 2));

const pending = users.filter((user) => user.setupStatus === "Signed up, first scan pending");
console.log(`\n=== Still pending first scan (${pending.length}) ===`);
for (const user of pending.slice(0, 15)) {
  console.log(`- ${user.email} | ${user.businessName} | signup ${user.signupAt}`);
}
