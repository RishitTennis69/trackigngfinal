const els = {
  adminAuth: document.querySelector("#adminAuth"),
  adminBoard: document.querySelector("#adminBoard"),
  adminLoginForm: document.querySelector("#adminLoginForm"),
  adminEmailInput: document.querySelector("#adminEmailInput"),
  adminPasswordInput: document.querySelector("#adminPasswordInput"),
  adminLoginButton: document.querySelector("#adminLoginButton"),
  adminLogoutButton: document.querySelector("#adminLogoutButton"),
  adminAuthStatus: document.querySelector("#adminAuthStatus"),
  statsGrid: document.querySelector("#statsGrid"),
  requestList: document.querySelector("#requestList"),
  usersTable: document.querySelector("#usersTable"),
  refreshButton: document.querySelector("#refreshButton"),
  adminStatus: document.querySelector("#adminStatus"),
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

function init() {
  els.refreshButton?.addEventListener("click", () => {
    void loadAdminData();
  });
  els.adminLogoutButton?.addEventListener("click", () => {
    void logoutAdmin();
  });
  els.adminLoginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void loginAdmin();
  });
  void restoreAdminSession();
}

async function restoreAdminSession() {
  try {
    const data = await fetchJson("/api/admin/me");
    if (!data.authenticated) throw new Error("Not authenticated.");
    showAdminBoard();
    await loadAdminData();
  } catch {
    showAdminLogin();
  }
}

async function loginAdmin() {
  const email = els.adminEmailInput?.value.trim() || "";
  const password = els.adminPasswordInput?.value || "";
  if (!email || !password) {
    setAuthStatus("Enter your admin email and password.");
    return;
  }

  setAuthStatus("Signing in...");
  toggleLoginBusy(true);
  try {
    await fetchJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (els.adminPasswordInput) els.adminPasswordInput.value = "";
    clearAuthStatus();
    showAdminBoard();
    await loadAdminData();
  } catch (error) {
    setAuthStatus(error.message || "Could not sign you in.");
  } finally {
    toggleLoginBusy(false);
  }
}

async function logoutAdmin() {
  try {
    await fetchJson("/api/admin/logout", { method: "POST" });
  } catch {
    // ignore logout errors
  }
  showAdminLogin();
}

async function loadAdminData() {
  setStatus("Loading shared Supabase data...");
  try {
    const data = await fetchJson("/api/admin/overview");
    renderStats(data.stats || {});
    renderRequests(data.serviceRequests || []);
    renderUsers(data.users || []);
    if (!data.sharedMode) {
      setStatus(data.message || "This admin view is waiting for shared Supabase mode.");
    } else {
      clearStatus();
    }
  } catch (error) {
    if (error.status === 401) {
      showAdminLogin();
      setAuthStatus("Your admin session expired. Sign in again.");
      return;
    }
    setStatus(error.message || "Could not load the admin view.");
    renderStats({});
    renderRequests([]);
    renderUsers([]);
  }
}

function showAdminLogin() {
  els.adminAuth?.classList.remove("hidden");
  els.adminBoard?.classList.add("hidden");
}

function showAdminBoard() {
  els.adminAuth?.classList.add("hidden");
  els.adminBoard?.classList.remove("hidden");
}

function toggleLoginBusy(isBusy) {
  if (els.adminLoginButton) {
    els.adminLoginButton.disabled = isBusy;
    els.adminLoginButton.textContent = isBusy ? "Signing In..." : "Sign In";
  }
}

function setAuthStatus(message) {
  if (!els.adminAuthStatus) return;
  els.adminAuthStatus.textContent = message;
  els.adminAuthStatus.classList.remove("hidden");
}

function clearAuthStatus() {
  if (!els.adminAuthStatus) return;
  els.adminAuthStatus.textContent = "";
  els.adminAuthStatus.classList.add("hidden");
}

function renderStats(stats) {
  const rows = [
    { label: "Total users", value: stats.totalUsers ?? 0 },
    { label: "Premium users", value: stats.premiumUsers ?? 0 },
    { label: "Pending requests", value: stats.pendingServiceRequests ?? 0 },
    { label: "Total scans", value: stats.totalScans ?? 0 },
  ];

  els.statsGrid.innerHTML = rows
    .map(
      (row) => `
        <article class="stat-card">
          <span>${escapeHtml(row.label)}</span>
          <strong>${escapeHtml(String(row.value))}</strong>
        </article>
      `,
    )
    .join("");
}

function renderRequests(requests) {
  if (!requests.length) {
    els.requestList.innerHTML = `
      <article class="empty-card">
        <p>No premium requests yet</p>
        <p>When a premium customer asks for reoptimization, it will show up here.</p>
      </article>
    `;
    return;
  }

  els.requestList.innerHTML = requests
    .map(
      (request) => `
        <article class="request-card">
          <div class="request-top">
            <div>
              <strong>${escapeHtml(request.businessName || "Unknown business")}</strong>
              <p>${escapeHtml(request.requestedBy?.email || "No requester email")}</p>
            </div>
            <div class="request-badges">
              <span class="badge ${request.status === "requested" ? "blue" : ""}">${escapeHtml(request.status || "requested")}</span>
              <span class="badge subtle">${escapeHtml(request.deliveryProvider || "supabase_queue")}</span>
            </div>
          </div>
          <p class="request-summary">${escapeHtml(request.summary || "Premium reoptimization request saved.")}</p>
          <div class="request-meta">
            <span>${escapeHtml(request.actionCount)} insight${request.actionCount === 1 ? "" : "s"}</span>
            <span>${escapeHtml(formatDate(request.createdAt))}</span>
            <span>${escapeHtml(request.deliveryStatus || "saved_only")}</span>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderUsers(users) {
  if (!users.length) {
    els.usersTable.innerHTML = `
      <tr>
        <td colspan="6">No shared users found yet.</td>
      </tr>
    `;
    return;
  }

  els.usersTable.innerHTML = users
    .map(
      (user) => `
        <tr>
          <td>
            <strong>${escapeHtml(user.name || "Unknown user")}</strong>
            <div class="table-subcopy">${escapeHtml(user.email || "")}</div>
            <div class="table-subcopy">Signed up ${escapeHtml(formatDate(user.signupAt || user.createdAt))}</div>
          </td>
          <td>
            <div class="stack-cell">
              <span class="badge ${user.premiumInsights ? "gold" : "subtle"}">${escapeHtml(user.premiumInsights ? "Premium" : "Standard")}</span>
              <span class="table-subcopy">${escapeHtml(user.status || "missing")}${user.plan ? ` · ${escapeHtml(user.plan)}` : ""}</span>
            </div>
          </td>
          <td>
            <strong>${escapeHtml(user.businessName || "No business")}</strong>
            <div class="table-subcopy">${escapeHtml(user.website || "")}</div>
            <div class="table-subcopy">CMS: ${escapeHtml(user.cms || "Unknown")}</div>
          </td>
          <td>
            <div class="stack-cell stack-cell-tight">
              <span class="badge blue">${escapeHtml(user.setupStatus || "Unknown")}</span>
              <span class="table-subcopy">${escapeHtml(user.implementationPath || "Unknown")}</span>
              <span class="table-subcopy">Add us: ${escapeHtml(user.addUsStatus || "Not tracked yet")}</span>
            </div>
          </td>
          <td>
            <strong>${escapeHtml(String(user.scanCount ?? 0))}</strong>
            <div class="table-subcopy">Latest score: ${escapeHtml(String(user.latestVisibilityScore ?? "-"))}</div>
          </td>
          <td>${escapeHtml(formatDate(user.updatedAt || user.createdAt))}</td>
        </tr>
      `,
    )
    .join("");
}

function setStatus(message) {
  if (!els.adminStatus) return;
  els.adminStatus.textContent = message;
  els.adminStatus.classList.remove("hidden");
}

function clearStatus() {
  if (!els.adminStatus) return;
  els.adminStatus.textContent = "";
  els.adminStatus.classList.add("hidden");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "same-origin",
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

