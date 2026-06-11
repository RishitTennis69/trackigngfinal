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

async function request(pathname, { method = "GET", body, headers = {}, cookie = "" } = {}) {
  const response = await fetch(`${BASE}${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  const setCookie = response.headers.getSetCookie?.() || [];
  return { ok: response.ok, status: response.status, data, setCookie };
}

function cookieFrom(setCookie = []) {
  return setCookie.map((entry) => entry.split(";")[0]).join("; ");
}

loadEnv();

const adminEmail = process.env.ADMIN_EMAIL || "";
const adminPassword = process.env.ADMIN_PASSWORD || process.env.LOCAL_TEST_ADMIN_PASSWORD || "";
const testEmail = `scan-test-${Date.now()}@local.gleo.test`;
const testPassword = "LocalScan-Test-2026!";
const testUser = {
  name: "Scan Test",
  email: testEmail,
  password: testPassword,
  businessName: "Willow Creek Dental",
  website: "https://example.com",
};

console.log("=== Gleo local scan test ===");
console.log(`API: ${BASE}`);

const configRes = await request("/api/config");
if (!configRes.ok) {
  console.error("FAIL: /api/config unreachable", configRes.status, configRes.data);
  process.exit(1);
}

const providers = configRes.data.providers || {};
const configured = Object.entries(providers)
  .filter(([, value]) => value.configured)
  .map(([key]) => key);
console.log("Configured providers:", configured.join(", ") || "(none)");

if (!configured.length) {
  console.error("FAIL: No provider API keys configured in .env");
  process.exit(1);
}

let adminCookie = "";
if (adminEmail && adminPassword) {
  const adminLogin = await request("/api/admin/login", {
    method: "POST",
    body: { email: adminEmail, password: adminPassword },
  });
  if (adminLogin.ok) {
    adminCookie = cookieFrom(adminLogin.setCookie);
    console.log("Admin login: OK");
  } else {
    console.log("Admin login: skipped or failed", adminLogin.status, adminLogin.data.error || adminLogin.data.raw || "");
  }
}

let userToken = "";
if (adminCookie) {
  const createRes = await request("/api/admin/clients", {
    method: "POST",
    cookie: adminCookie,
    body: testUser,
  });
  if (!createRes.ok) {
    console.error("FAIL: could not create test client", createRes.status, createRes.data);
    process.exit(1);
  }
  console.log("Test client created:", testEmail);
}

const loginRes = await request("/api/auth/login", {
  method: "POST",
  body: { email: testEmail, password: testPassword },
});
if (!loginRes.ok) {
  console.error("FAIL: user login", loginRes.status, loginRes.data.error || loginRes.data);
  process.exit(1);
}
userToken = loginRes.data.token;
console.log("User login: OK");

const scanPayload = {
  businessName: testUser.businessName,
  website: testUser.website,
  location: "Palo Alto, CA",
  industry: "Dental Practice",
  platforms: configured,
};

console.log(`Starting scan (platforms: ${scanPayload.platforms.join(", ")})...`);
const started = Date.now();
const scanRes = await request("/api/scan", {
  method: "POST",
  headers: { Authorization: `Bearer ${userToken}` },
  body: scanPayload,
});

if (!scanRes.ok) {
  console.error("FAIL: /api/scan", scanRes.status, scanRes.data.error || scanRes.data);
  process.exit(1);
}

let scan = scanRes.data.scan || null;
if (!scan) {
  console.log(`Scan accepted as background job (${scanRes.status}). Polling for result...`);
  const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const latest = await request("/api/scans/latest", {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (latest.data.scanJob?.status === "failed") {
      console.error("FAIL: scan job failed:", latest.data.scanJob.error);
      process.exit(1);
    }
    if (latest.data.scan) {
      scan = latest.data.scan;
      break;
    }
  }
  if (!scan) {
    console.error("FAIL: scan did not complete within 8 minutes.");
    process.exit(1);
  }
}
const elapsed = ((Date.now() - started) / 1000).toFixed(1);

const metrics = scan.metrics || {};
const errors = (scan.results || []).filter((row) => row.error);
const completed = metrics.completedAnswers ?? 0;
const total = metrics.totalAnswers ?? 0;

console.log(`Scan finished in ${elapsed}s`);
console.log(`Answers: ${completed}/${total}`);
console.log(`Visibility score: ${metrics.visibilityScore ?? "n/a"}`);
console.log(`Missing platforms: ${(scan.missingPlatforms || []).join(", ") || "none"}`);
if (errors.length) {
  console.log(`Provider errors (${errors.length}):`);
  for (const row of errors.slice(0, 5)) {
    console.log(`  - ${row.platformLabel}: ${row.error}`);
  }
}

console.log(completed > 0 ? "RESULT: Local scan works." : "RESULT: Scan ran but no answers completed.");
