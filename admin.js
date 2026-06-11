const els = {
  adminAuth: document.querySelector("#adminAuth"),
  adminBoard: document.querySelector("#adminBoard"),
  adminLoginForm: document.querySelector("#adminLoginForm"),
  adminEmailInput: document.querySelector("#adminEmailInput"),
  adminPasswordInput: document.querySelector("#adminPasswordInput"),
  adminLoginButton: document.querySelector("#adminLoginButton"),
  adminLogoutButton: document.querySelector("#adminLogoutButton"),
  adminAuthStatus: document.querySelector("#adminAuthStatus"),
  adminClientForm: document.querySelector("#adminClientForm"),
  adminClientNameInput: document.querySelector("#adminClientNameInput"),
  adminClientEmailInput: document.querySelector("#adminClientEmailInput"),
  adminClientPasswordInput: document.querySelector("#adminClientPasswordInput"),
  adminClientSubmitButton: document.querySelector("#adminClientSubmitButton"),
  adminClientStatus: document.querySelector("#adminClientStatus"),
  statsGrid: document.querySelector("#statsGrid"),
  requestList: document.querySelector("#requestList"),
  usersTable: document.querySelector("#usersTable"),
  refreshButton: document.querySelector("#refreshButton"),
  adminStatus: document.querySelector("#adminStatus"),
  openClientModalButton: document.querySelector("#openClientModalButton"),
  adminClientModal: document.querySelector("#adminClientModal"),
  clearAllUsersButton: document.querySelector("#clearAllUsersButton"),
  clearAllUsersButtonTable: document.querySelector("#clearAllUsersButtonTable"),
};

function initClientModal() {
  els.openClientModalButton?.addEventListener("click", openClientModal);
  els.adminClientModal?.querySelectorAll("[data-modal-close]").forEach((node) => {
    node.addEventListener("click", closeClientModal);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.adminClientModal?.classList.contains("hidden")) {
      closeClientModal();
    }
  });
}

function openClientModal() {
  if (!els.adminClientModal) return;
  els.adminClientModal.classList.remove("hidden");
  document.body.classList.add("admin-modal-open");
  els.adminClientNameInput?.focus();
}

function closeClientModal() {
  if (!els.adminClientModal) return;
  els.adminClientModal.classList.add("hidden");
  document.body.classList.remove("admin-modal-open");
  clearClientStatus();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

function init() {
  initClientModal();
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
  els.adminClientForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createClientAccount();
  });
  els.clearAllUsersButton?.addEventListener("click", () => {
    void clearAllUserData();
  });
  els.clearAllUsersButtonTable?.addEventListener("click", () => {
    void clearAllUserData();
  });
  els.usersTable?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-copy-password]");
    if (!button) return;
    void copyPassword(button.dataset.copyPassword || "", button);
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

async function createClientAccount() {
  const payload = {
    name: els.adminClientNameInput?.value.trim() || "",
    email: els.adminClientEmailInput?.value.trim() || "",
    password: els.adminClientPasswordInput?.value || "",
  };
  if (!payload.name || !payload.email || !payload.password) {
    setClientStatus("Fill in every client field.");
    return;
  }
  if (payload.password.length < 8) {
    setClientStatus("Use a password with at least 8 characters.");
    return;
  }

  setClientStatus("Creating client account...");
  toggleClientBusy(true);
  try {
    const result = await fetchJson("/api/admin/clients", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setClientStatus(`Created ${result.user?.email || payload.email}. Send them their login details.`, "success");
    els.adminClientForm?.reset();
    await loadAdminData();
    window.setTimeout(closeClientModal, 1400);
  } catch (error) {
    setClientStatus(error.message || "Could not create the client account.");
  } finally {
    toggleClientBusy(false);
  }
}

function toggleClientBusy(isBusy) {
  if (els.adminClientSubmitButton) {
    els.adminClientSubmitButton.disabled = isBusy;
    els.adminClientSubmitButton.textContent = isBusy ? "Creating..." : "Create client account";
  }
}

function setClientStatus(message, tone = "error") {
  if (!els.adminClientStatus) return;
  els.adminClientStatus.textContent = message;
  els.adminClientStatus.classList.remove("hidden", "success");
  if (tone === "success") els.adminClientStatus.classList.add("success");
}

function clearClientStatus() {
  if (!els.adminClientStatus) return;
  els.adminClientStatus.textContent = "";
  els.adminClientStatus.classList.add("hidden");
  els.adminClientStatus.classList.remove("success");
}

async function clearAllUserData() {
  const confirmed = window.confirm(
    "Delete every client account, entitlement, scan, and session? This cannot be undone.",
  );
  if (!confirmed) return;

  const typed = window.prompt('Type DELETE ALL USERS to confirm.');
  if (typed !== "DELETE ALL USERS") {
    setStatus("Clear cancelled. Confirmation text did not match.");
    return;
  }

  setStatus("Clearing all user data...");
  toggleClearUsersBusy(true);
  try {
    const result = await fetchJson("/api/admin/users", {
      method: "DELETE",
      body: JSON.stringify({ confirm: "DELETE ALL USERS" }),
    });
    clearStatus();
    setClientStatus(result.message || "All user data cleared.", "success");
    await loadAdminData();
  } catch (error) {
    setStatus(error.message || "Could not clear user data.");
  } finally {
    toggleClearUsersBusy(false);
  }
}

function toggleClearUsersBusy(isBusy) {
  for (const button of [els.clearAllUsersButton, els.clearAllUsersButtonTable]) {
    if (!button) continue;
    button.disabled = isBusy;
  }
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
        <article class="admin-stat-card">
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
      <article class="admin-empty-card">
        <p>No premium requests yet</p>
        <p>When a premium customer asks for reoptimization, it will show up here.</p>
      </article>
    `;
    return;
  }

  els.requestList.innerHTML = requests
    .map(
      (request) => `
        <article class="admin-request-card">
          <div class="admin-request-top">
            <div>
              <strong>${escapeHtml(request.businessName || "Unknown business")}</strong>
              <p>${escapeHtml(request.requestedBy?.email || "No requester email")}</p>
            </div>
            <div class="admin-request-badges">
              <span class="admin-badge ${request.status === "requested" ? "blue" : ""}">${escapeHtml(request.status || "requested")}</span>
              <span class="admin-badge subtle">${escapeHtml(request.deliveryProvider || "supabase_queue")}</span>
            </div>
          </div>
          <p class="admin-request-summary">${escapeHtml(request.summary || "Premium reoptimization request saved.")}</p>
          <div class="admin-request-meta">
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
        <td colspan="7">No shared users found yet.</td>
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
          <td>${renderPasswordCell(user.password)}</td>
          <td>
            <div class="stack-cell">
              <span class="admin-badge ${user.premiumInsights ? "gold" : "subtle"}">${escapeHtml(user.premiumInsights ? "Premium" : "Standard")}</span>
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
              <span class="admin-badge blue">${escapeHtml(user.setupStatus || "Unknown")}</span>
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

function renderPasswordCell(password) {
  if (!password) {
    return `<span class="table-subcopy password-missing">Not on file</span>`;
  }
  return `
    <div class="password-cell">
      <code class="password-value">${escapeHtml(password)}</code>
      <button class="ghost-button password-copy-button" type="button" data-copy-password="${escapeAttr(password)}">Copy</button>
    </div>
  `;
}

async function copyPassword(password, button) {
  if (!password) return;
  try {
    await navigator.clipboard.writeText(password);
    const original = button.textContent;
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = original;
    }, 1400);
  } catch {
    window.prompt("Copy this password:", password);
  }
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

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

