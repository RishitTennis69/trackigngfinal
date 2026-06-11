import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BASE = "http://127.0.0.1:4173";
const ALI_USER_ID = "d4a65a04172c88a1";

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

async function supabaseRequest(pathname, options = {}) {
  const url = `${process.env.SUPABASE_URL}${pathname}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = [];
  try {
    data = text ? JSON.parse(text) : [];
  } catch {
    data = { raw: text };
  }
  return { ok: response.ok, status: response.status, data };
}

loadEnv();

console.log("=== Cancel / clear Ali Zaidi scan state ===");

const scansRes = await supabaseRequest(
  `/rest/v1/dashboard_scans?user_id=eq.${ALI_USER_ID}&select=id,created_at,data`,
);
const scans = Array.isArray(scansRes.data) ? scansRes.data : [];
console.log(`Existing scans for Ali Zaidi: ${scans.length}`);

if (scans.length) {
  const del = await supabaseRequest(`/rest/v1/dashboard_scans?user_id=eq.${ALI_USER_ID}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  console.log(del.ok ? "Deleted scan rows." : `Delete failed: ${del.status}`);
}

const sessionsRes = await supabaseRequest(
  `/rest/v1/dashboard_sessions?user_id=eq.${ALI_USER_ID}&select=token,created_at`,
);
const sessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
console.log(`Active sessions: ${sessions.length}`);

if (sessions.length) {
  const delSessions = await supabaseRequest(`/rest/v1/dashboard_sessions?user_id=eq.${ALI_USER_ID}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  console.log(delSessions.ok ? "Cleared sessions (forces re-login)." : `Session delete failed: ${delSessions.status}`);
}

const workspaceRes = await supabaseRequest(
  `/rest/v1/workspaces?user_id=eq.${ALI_USER_ID}&select=user_id,business_name,website,service_location,service_industry`,
);
const workspaces = Array.isArray(workspaceRes.data) ? workspaceRes.data : [];
console.log(`Workspace rows: ${workspaces.length}`);

if (workspaces.length) {
  const resetWorkspace = await supabaseRequest(`/rest/v1/workspaces?user_id=eq.${ALI_USER_ID}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal", "Content-Type": "application/json" },
    body: JSON.stringify({ service_location: null, service_industry: null, updated_at: new Date().toISOString() }),
  });
  console.log(resetWorkspace.ok ? "Cleared workspace location/industry." : `Workspace reset failed: ${resetWorkspace.status}`);
}

console.log("\nAli Zaidi tracking data cleared (scans, sessions, location/industry).");
console.log("Account (azaidi@gmail.com) is unchanged. Scan count is now 0.");
console.log("If a scan is still spinning in the browser, refresh the page or close the tab.");
