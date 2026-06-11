const state = {
  config: null,
  scans: [],
  currentScan: null,
  isScanning: false,
  setupForcedOpen: false,
  scanStartedAt: null,
  longScanTimer: null,
  metricFilters: {
    platform: "",
    category: "",
  },
  competitorMode: false,
  sentimentFilter: "",
  sentimentAnimationScanId: "",
  trendRangeDays: 7,
  pendingStart: null,
  pendingSignupUser: null,
  user: null,
  useMockData: false,
  autoScanRequestedFor: "",
  firstScanPollTimer: null,
  firstScanPollAttempts: 0,
  trackingProgressRaf: null,
  trackingProgressTimer: null,
  trackingProgressStartedAt: null,
  premiumRequestPending: false,
};

const FIRST_SCAN_PENDING_STORAGE_KEY = "gleoFirstScanPendingUserId";
const FIRST_SCAN_PENDING_AT_KEY = "gleoFirstScanPendingAt";
const FIRST_SCAN_POLL_INTERVAL_MS = 5000;
const FIRST_SCAN_POLL_MAX_ATTEMPTS = 36;
const FIRST_SCAN_PENDING_MAX_MS = 20 * 60 * 1000;
const SCAN_REQUEST_TIMEOUT_MS = 12 * 60 * 1000;
const TRACKING_PROGRESS_DURATION_MS = 150000;
const SERVICE_LOCATION_STORAGE_PREFIX = "gleoServiceLocation:";
const SERVICE_INDUSTRY_STORAGE_PREFIX = "gleoServiceIndustry:";
const API_BASE_URL = resolveApiBaseUrl();

const els = {
  landingPage: document.querySelector("#landingPage"),
  loginPage: document.querySelector("#loginPage"),
  signInPage: document.querySelector("#signInPage"),
  businessSetupPage: document.querySelector("#businessSetupPage"),
  trackingLaunchPage: document.querySelector("#trackingLaunchPage"),
  premiumLaunchBadge: document.querySelector("#premiumLaunchBadge"),
  businessSetupIntro: document.querySelector("#businessSetupIntro"),
  businessSetupForm: document.querySelector("#businessSetupForm"),
  businessSetupNameInput: document.querySelector("#businessSetupNameInput"),
  businessSetupWebsiteInput: document.querySelector("#businessSetupWebsiteInput"),
  businessSetupLocationInput: document.querySelector("#businessSetupLocationInput"),
  businessSetupIndustryInput: document.querySelector("#businessSetupIndustryInput"),
  locationSetupPage: document.querySelector("#locationSetupPage"),
  locationSetupIntro: document.querySelector("#locationSetupIntro"),
  locationSetupForm: document.querySelector("#locationSetupForm"),
  locationSetupInput: document.querySelector("#locationSetupInput"),
  locationSetupIndustryInput: document.querySelector("#locationSetupIndustryInput"),
  locationInput: document.querySelector("#locationInput"),
  industryInput: document.querySelector("#industryInput"),
  backToSignupButton: document.querySelector("#backToSignupButton"),
  trackingLaunchTitle: document.querySelector("#trackingLaunchTitle"),
  trackingLaunchText: document.querySelector("#trackingLaunchText"),
  trackingLaunchHint: document.querySelector("#trackingLaunchHint"),
  openDashboardButton: document.querySelector("#openDashboardButton"),
  trackingLaunchProgressFill: document.querySelector("#trackingLaunchProgressFill"),
  appToast: document.querySelector("#appToast"),
  appShell: document.querySelector("#appShell"),
  landingStartForm: document.querySelector("#landingStartForm"),
  landingWebsiteInput: document.querySelector("#landingWebsiteInput"),
  landingBusinessInput: document.querySelector("#landingBusinessInput"),
  signupForm: document.querySelector("#signupForm"),
  signupNameInput: document.querySelector("#signupNameInput"),
  signupEmailInput: document.querySelector("#signupEmailInput"),
  signupPasswordInput: document.querySelector("#signupPasswordInput"),
  signInForm: document.querySelector("#signInForm"),
  signInNameInput: document.querySelector("#signInNameInput"),
  signInEmailInput: document.querySelector("#signInEmailInput"),
  signInPasswordInput: document.querySelector("#signInPasswordInput"),
  profileName: document.querySelector("#profileName"),
  profileAvatar: document.querySelector("#profileAvatar"),
  profileWorkspaceName: document.querySelector("#profileWorkspaceName"),
  profileRoleLabel: document.querySelector("#profileRoleLabel"),
  backToLandingButton: document.querySelector("#backToLandingButton"),
  signInBackToLandingButton: document.querySelector("#signInBackToLandingButton"),
  forgotPasswordButton: document.querySelector("#forgotPasswordButton"),
  signupForgotPasswordButton: document.querySelector("#signupForgotPasswordButton"),
  profileMenuButton: document.querySelector("#profileMenuButton"),
  profileMenu: document.querySelector("#profileMenu"),
  profileBusinessLabel: document.querySelector("#profileBusinessLabel"),
  logoutButton: document.querySelector("#logoutButton"),
  scanForm: document.querySelector("#scanForm"),
  websiteInput: document.querySelector("#websiteInput"),
  businessInput: document.querySelector("#businessInput"),
  runButton: document.querySelector("#runButton"),
  propertyBar: document.querySelector("#propertyBar"),
  scanProgressCard: document.querySelector("#scanProgressCard"),
  scanProgressTitle: document.querySelector("#scanProgressTitle"),
  scanProgressText: document.querySelector("#scanProgressText"),
  newScanButton: document.querySelector("#newScanButton"),
  overviewPanel: document.querySelector("#overview"),
  statusStrip: document.querySelector("#statusStrip"),
  statusText: document.querySelector("#statusText"),
  setupCard: document.querySelector("#setupCard"),
  providerStatus: document.querySelector("#providerStatus"),
  scoreHero: document.querySelector("#scoreHero"),
  mainScore: document.querySelector("#mainScore"),
  scoreSubtext: document.querySelector("#scoreSubtext"),
  platformPills: document.querySelector("#platformPills"),
  sideScore: document.querySelector("#sideScore"),
  mentionRate: document.querySelector("#mentionRate"),
  avgRank: document.querySelector("#avgRank"),
  overviewSentiment: document.querySelector("#overviewSentiment"),
  scoreDelta: document.querySelector("#scoreDelta"),
  mentionDelta: document.querySelector("#mentionDelta"),
  rankDelta: document.querySelector("#rankDelta"),
  sentimentDelta: document.querySelector("#sentimentDelta"),
  positiveRate: document.querySelector("#positiveRate"),
  sentimentBreakdown: document.querySelector("#sentimentBreakdown"),
  miniScore: document.querySelector("#miniScore"),
  trendLabel: document.querySelector("#trendLabel"),
  trendChart: document.querySelector("#trendChart"),
  trendRangeSelect: document.querySelector("#trendRangeSelect"),
  premiumPlanBadge: document.querySelector("#premiumPlanBadge"),
  factorList: document.querySelector("#factorList"),
  sourceList: document.querySelector("#sourceList"),
  pageList: document.querySelector("#pageList"),
  actionList: document.querySelector("#actionList"),
  categoryList: document.querySelector("#categoryList"),
  overviewCompetitorList: document.querySelector("#overviewCompetitorList"),
  metricsPlatformSelect: document.querySelector("#metricsPlatformSelect"),
  metricsCategorySelect: document.querySelector("#metricsCategorySelect"),
  competitorModeToggle: document.querySelector("#competitorModeToggle"),
  metricsPlatformIcon: document.querySelector("#metricsPlatformIcon"),
  metricsEmptyState: document.querySelector("#metricsEmptyState"),
  metricsResults: document.querySelector("#metricsResults"),
  promptGrid: document.querySelector("#promptGrid"),
  competitorGrid: document.querySelector("#competitorGrid"),
  sourceDetailList: document.querySelector("#sourceDetailList"),
  pageDetailList: document.querySelector("#pageDetailList"),
  sentimentGrid: document.querySelector("#sentimentGrid"),
  premiumNavItem: document.querySelector("#premiumNavItem"),
  premiumGrid: document.querySelector("#premiumGrid"),
  evidenceRows: document.querySelector("#evidenceRows"),
  limitList: document.querySelector("#limitList"),
  emptyState: document.querySelector("#emptyState"),
  emptyStateTitle: document.querySelector("#emptyStateTitle"),
  emptyStateText: document.querySelector("#emptyStateText"),
  answerDialog: document.querySelector("#answerDialog"),
  dialogContent: document.querySelector("#dialogContent"),
  loginSwitch: document.querySelector("#loginSwitch"),
  clearResultsButton: document.querySelector("#clearResultsButton"),
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

async function init() {
  await restoreUserSession();
  bindNavigation();
  bindScan();
  bindClear();
  bindMetricFilters();
  bindTrendRange();
  bindPremiumInsights();
  bindPasswordToggles();
  await loadInitialData();
  bindLanding();
}

function resolveApiBaseUrl() {
  const configured =
    globalThis.__API_BASE_URL__ ||
    document.documentElement?.dataset.apiBaseUrl ||
    document.body?.dataset.apiBaseUrl ||
    "";
  if (configured) return String(configured).replace(/\/$/, "");

  const host = window.location.hostname;
  if (host === "trackigngfinal.vercel.app") {
    return "https://trackigngfinal-production.up.railway.app";
  }
  return "";
}

function apiUrl(pathname) {
  if (!API_BASE_URL) return pathname;
  return `${API_BASE_URL}${pathname}`;
}

function isAwaitingFirstScan(user = state.user) {
  if (!user?.id) return false;
  if (state.currentScan?.metrics?.completedAnswers) return false;
  if (pendingFirstScanIsStale()) return false;
  return getPendingFirstScanUserId() === user.id || state.autoScanRequestedFor === user.id || state.isScanning;
}

async function restoreUserSession() {
  const token = localStorage.getItem("gleoAuthToken");
  if (!token) {
    setPendingFirstScanUserId("");
    stopFirstScanPolling();
    try {
      const raw = localStorage.getItem("gleoUser");
      state.user = raw ? JSON.parse(raw) : null;
    } catch {
      state.user = null;
    }
    localStorage.removeItem("gleoLoggedIn");
    renderUserProfile();
    return;
  }

  try {
    const { user } = await fetchJson("/api/auth/me");
    state.user = hydrateUserTrackingContext(user);
    localStorage.setItem("gleoUser", JSON.stringify(state.user));
  } catch {
    localStorage.removeItem("gleoAuthToken");
    localStorage.removeItem("gleoUser");
    localStorage.removeItem("gleoLoggedIn");
    setPendingFirstScanUserId("");
    stopFirstScanPolling();
    state.user = null;
  }
  renderUserProfile();
}

function readSignupForm() {
  return {
    name: titleCaseWords(els.signupNameInput?.value.trim() || ""),
    email: els.signupEmailInput?.value.trim() || "",
    password: els.signupPasswordInput?.value || "",
  };
}

function titleCaseWords(value) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part))
        .join("-"),
    )
    .join(" ");
}

function validateSignup(data) {
  if (!data.name) return "Enter your full name.";
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "Enter a valid email address.";
  if (!data.password || data.password.length < 8) return "Enter a password with at least 8 characters.";
  return "";
}

function normalizeWebsiteInput(value) {
  if (!value) return "";
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function validateSignIn(data) {
  if (!data.name) return "Enter your full name.";
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "Enter a valid email address.";
  if (!data.password) return "Enter your password.";
  return "";
}

function getUserServiceLocation(user = state.user) {
  if (!user?.id) return "";
  return (
    cleanText(user.serviceLocation || "") ||
    cleanText(localStorage.getItem(`${SERVICE_LOCATION_STORAGE_PREFIX}${user.id}`) || "")
  );
}

function setUserServiceLocation(userId, location) {
  const normalized = titleCaseWords(String(location || "").replace(/\s+/g, " ").trim());
  if (!userId || !normalized) return "";
  localStorage.setItem(`${SERVICE_LOCATION_STORAGE_PREFIX}${userId}`, normalized);
  if (state.user?.id === userId) state.user.serviceLocation = normalized;
  return normalized;
}

function getUserServiceIndustry(user = state.user) {
  if (!user?.id) return "";
  return (
    cleanText(user.serviceIndustry || "") ||
    cleanText(localStorage.getItem(`${SERVICE_INDUSTRY_STORAGE_PREFIX}${user.id}`) || "")
  );
}

function setUserServiceIndustry(userId, industry) {
  const normalized = titleCaseWords(String(industry || "").replace(/\s+/g, " ").trim());
  if (!userId || !normalized) return "";
  localStorage.setItem(`${SERVICE_INDUSTRY_STORAGE_PREFIX}${userId}`, normalized);
  if (state.user?.id === userId) state.user.serviceIndustry = normalized;
  return normalized;
}

function needsLocationSetup(user = state.user) {
  return Boolean(user?.id) && !getUserServiceLocation(user);
}

function needsIndustrySetup(user = state.user) {
  return Boolean(user?.id) && !getUserServiceIndustry(user);
}

function needsTrackingSetup(user = state.user) {
  return needsLocationSetup(user) || needsIndustrySetup(user);
}

function hydrateUserTrackingContext(user) {
  if (!user?.id) return user;
  const storedLocation = getUserServiceLocation(user);
  const storedIndustry = getUserServiceIndustry(user);
  if (storedLocation && !user.serviceLocation) user.serviceLocation = storedLocation;
  if (storedIndustry && !user.serviceIndustry) user.serviceIndustry = storedIndustry;
  return user;
}

function hydrateUserLocation(user) {
  return hydrateUserTrackingContext(user);
}

async function saveUserTrackingContext({ location, industry } = {}) {
  const normalizedLocation = location !== undefined ? setUserServiceLocation(state.user?.id, location) : getUserServiceLocation();
  const normalizedIndustry = industry !== undefined ? setUserServiceIndustry(state.user?.id, industry) : getUserServiceIndustry();
  if (!normalizedLocation) throw new Error("Enter a city or region where customers search for you.");
  if (!normalizedIndustry) throw new Error("Enter the industry or business category you want tracked.");
  try {
    const result = await fetchJson("/api/workspace/location", {
      method: "PATCH",
      body: JSON.stringify({ location: normalizedLocation, industry: normalizedIndustry }),
    });
    if (result.user) {
      state.user = hydrateUserTrackingContext(result.user);
      localStorage.setItem("gleoUser", JSON.stringify(state.user));
    }
  } catch {
    // Keep local copies if workspace columns are not migrated yet.
  }
  return { location: normalizedLocation, industry: normalizedIndustry };
}

async function saveUserServiceLocation(location) {
  return saveUserTrackingContext({ location, industry: getUserServiceIndustry() });
}

function buildScanPayload(overrides = {}) {
  return {
    website: overrides.website || state.user?.website || els.websiteInput?.value.trim() || "",
    businessName: overrides.businessName || state.user?.businessName || els.businessInput?.value.trim() || "",
    location: overrides.location || getUserServiceLocation() || els.locationInput?.value.trim() || "",
    industry: overrides.industry || getUserServiceIndustry() || els.industryInput?.value.trim() || "",
    platforms: overrides.platforms || getConfiguredPlatformKeys(),
  };
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function continueAfterAuth() {
  if (needsTrackingSetup()) {
    renderUserProfile();
    renderAll();
    showLocationSetupPage();
    return true;
  }

  const started = await maybeStartAutoScan({ background: true });
  if (state.currentScan?.metrics?.completedAnswers) {
    showAppShell(true);
  } else if (started.started) {
    showTrackingLaunchPage();
  } else {
    showAppShell(true);
  }
  state.pendingStart = null;
  return true;
}

function validateBusinessDetails(data) {
  if (!data.businessName) return "Enter your business name.";
  if (!data.website) return "Enter your business website.";
  if (!data.location) return "Enter the city or region where customers search for you.";
  if (!data.industry) return "Enter the industry or business category you want tracked.";
  return "";
}

async function completeSignup(data) {
  const error = validateSignup(data);
  if (error) {
    showToast(error);
    return false;
  }

  try {
    const result = await fetchJson("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
    state.user = hydrateUserTrackingContext(result.user);
    if (data.location) setUserServiceLocation(result.user.id, data.location);
    if (data.industry) setUserServiceIndustry(result.user.id, data.industry);
    localStorage.setItem("gleoAuthToken", result.token);
    localStorage.setItem("gleoLoggedIn", "true");
    localStorage.setItem("gleoUser", JSON.stringify(state.user));
    localStorage.setItem("gleoLastLoginEmail", result.user.email);
  } catch (signupError) {
    if (signupError?.status === 409) {
      setStatus("Account already exists. Signing you in...", "working");
      return completeLogin(
        {
          name: data.name,
          email: data.email,
          password: data.password,
        },
        { statusMessage: "Signing you in..." },
      );
    }
    showToast(signupError.message || "Could not create your account.");
    return false;
  }

  await loadUserScans(state.user);
  state.setupForcedOpen = false;
  state.pendingSignupUser = null;

  renderUserProfile();
  renderAll();
  setStatus(buildDashboardStatusMessage(), "ready");
  return continueAfterAuth();
}

function getStoredLoginEmail() {
  const savedEmail = localStorage.getItem("gleoLastLoginEmail");
  if (savedEmail) return savedEmail;
  try {
    return JSON.parse(localStorage.getItem("gleoUser") || "null")?.email || "";
  } catch {
    return "";
  }
}

async function completeLogin({ name, email, password }, options = {}) {
  const error = validateSignIn({ name, email, password });
  if (error) {
    showToast(error);
    return false;
  }
  const statusMessage = options.statusMessage || "";
  if (statusMessage) {
    setStatus(statusMessage, "working");
  }
  try {
    const result = await fetchJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ name: titleCaseWords(name), email, password }),
    });
    state.user = hydrateUserTrackingContext(result.user);
    localStorage.setItem("gleoAuthToken", result.token);
    localStorage.setItem("gleoLoggedIn", "true");
    localStorage.setItem("gleoUser", JSON.stringify(state.user));
    localStorage.setItem("gleoLastLoginEmail", result.user.email);
  } catch (loginError) {
    showToast(loginError.message || "Could not sign you in.");
    return false;
  }

  await loadUserScans(state.user);
  state.setupForcedOpen = false;
  state.pendingSignupUser = null;

  renderUserProfile();
  renderAll();
  setStatus(buildDashboardStatusMessage(), "ready");
  return continueAfterAuth();
}

function showForgotPasswordNotice() {
  showToast("Password reset is not available yet. Sign up with email to create or update your account.");
}

async function loadUserScans(user) {
  const scansData = await fetchJson("/api/scans");
  const serverScans = (scansData.scans || []).filter((scan) =>
    isComparableScan(scan, { website: user.website, businessName: user.businessName }),
  );

  if (serverScans.length) {
    stopFirstScanPolling();
    setPendingFirstScanUserId("");
    state.useMockData = false;
    state.scans = serverScans;
    state.currentScan = serverScans.at(-1) || null;
    return;
  }

  state.useMockData = false;
  state.scans = [];
  state.currentScan = null;
}

function buildDashboardStatusMessage() {
  if (!state.user) return "Dashboard loaded.";
  const accessTier = getAccessTier();
  const trialEndLabel = formatAccessDate(state.user?.trialEndsAt);
  if (!state.currentScan) {
    if (accessTier === "premium") {
      return `Monthly Retainer is active. Premium insights are unlocked for ${state.user.businessName}.`;
    }
    if (accessTier === "included_month") {
      return `Tracking is included for your first month. Access ends on ${trialEndLabel || "your trial end date"} unless you choose a monthly plan.`;
    }
    return `Tracking is active. You are on AI Mention Tracking for ${state.user.businessName}. Premium actionable insights are available with Monthly Retainer.`;
  }
  if (state.useMockData) {
    return `Demo dashboard for ${state.user.businessName}. Connect API keys and run a scan for live results.`;
  }
  if (accessTier === "premium") {
    return "Monthly Retainer is active. Premium insights are unlocked and actionable insights are live.";
  }
  if (accessTier === "included_month") {
    return `Tracking is included for your first month. Access ends on ${trialEndLabel || "your trial end date"}. Premium actionable insights are not included on this access tier.`;
  }
  return "Tracking is active. You are on AI Mention Tracking. Premium actionable insights are available with Monthly Retainer.";
}

function hasPremiumInsightsAccess() {
  return Boolean(state.user?.premiumInsights);
}

function getAccessTier() {
  return state.user?.accessTier || "";
}

function formatAccessDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
  } catch {
    return "";
  }
}

function getPendingFirstScanUserId() {
  return localStorage.getItem(FIRST_SCAN_PENDING_STORAGE_KEY) || "";
}

function markPendingFirstScan(userId, { resetClock = false } = {}) {
  if (!userId) {
    localStorage.removeItem(FIRST_SCAN_PENDING_STORAGE_KEY);
    localStorage.removeItem(FIRST_SCAN_PENDING_AT_KEY);
    return;
  }
  localStorage.setItem(FIRST_SCAN_PENDING_STORAGE_KEY, userId);
  if (resetClock || !localStorage.getItem(FIRST_SCAN_PENDING_AT_KEY)) {
    localStorage.setItem(FIRST_SCAN_PENDING_AT_KEY, String(Date.now()));
  }
}

function setPendingFirstScanUserId(userId) {
  markPendingFirstScan(userId, { resetClock: true });
}

function authJsonHeaders(extra = {}) {
  const headers = { "Content-Type": "application/json", ...extra };
  const token = localStorage.getItem("gleoAuthToken");
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function applyCompletedScan(scan, { openDashboard = false } = {}) {
  clearPendingFirstScanState();
  state.currentScan = scan;
  if (!state.scans.some((entry) => entry.id === scan.id)) {
    state.scans.push(scan);
  }
  state.useMockData = false;
  state.setupForcedOpen = false;
  startTrackingLaunchProgress({ complete: true });
  renderAll();

  const completed = scan.metrics?.completedAnswers || 0;
  if (completed > 0 && openDashboard) {
    showAppShell(true);
  } else if (!els.trackingLaunchPage?.classList.contains("hidden")) {
    showTrackingLaunchPage();
  }

  const missing = scan.missingPlatforms?.length
    ? ` Missing keys: ${scan.missingPlatforms.map(providerLabel).join(", ")}.`
    : "";
  setStatus(
    completed > 0
      ? `Scan complete. ${completed} AI answers analyzed.${missing}`
      : "The scan finished but no AI answers completed. Open the dashboard to retry.",
    completed > 0 ? "ready" : "error",
  );
  return completed > 0;
}

function pendingFirstScanIsStale() {
  const pendingUserId = getPendingFirstScanUserId();
  if (!pendingUserId) return false;
  const startedAt = Number(localStorage.getItem(FIRST_SCAN_PENDING_AT_KEY) || 0);
  if (!startedAt) return true;
  return Date.now() - startedAt > FIRST_SCAN_PENDING_MAX_MS;
}

function clearPendingFirstScanState() {
  stopFirstScanPolling();
  state.autoScanRequestedFor = "";
  state.trackingProgressStartedAt = null;
  setPendingFirstScanUserId("");
  stopTrackingLaunchProgress();
}

function expireStalePendingFirstScan() {
  if (!pendingFirstScanIsStale()) return false;
  clearPendingFirstScanState();
  setScanning(false);
  return true;
}

function stopTrackingLaunchProgress() {
  if (state.trackingProgressRaf) {
    cancelAnimationFrame(state.trackingProgressRaf);
    state.trackingProgressRaf = null;
  }
  if (state.trackingProgressTimer) {
    window.clearTimeout(state.trackingProgressTimer);
    state.trackingProgressTimer = null;
  }
}

function setTrackingLaunchProgress(scale, opacity = 1) {
  if (!els.trackingLaunchProgressFill) return;
  els.trackingLaunchProgressFill.style.transform = `scaleX(${Math.max(0.08, scale)})`;
  els.trackingLaunchProgressFill.style.opacity = String(opacity);
}

function startTrackingLaunchProgress({ fromStart = false, complete = false } = {}) {
  if (!els.trackingLaunchProgressFill) return;

  if (complete) {
    stopTrackingLaunchProgress();
    setTrackingLaunchProgress(1, 1);
    return;
  }

  if (state.trackingProgressTimer) return;

  if (fromStart || !state.trackingProgressStartedAt) {
    stopTrackingLaunchProgress();
    state.trackingProgressStartedAt = Date.now();
    setTrackingLaunchProgress(0.08, 0.85);
  }

  const startedAt = state.trackingProgressStartedAt;
  const maxScale = 0.94;

  const tick = () => {
    if (!els.trackingLaunchProgressFill || !startedAt) return;
    const elapsed = Date.now() - startedAt;
    const t = Math.min(1, elapsed / TRACKING_PROGRESS_DURATION_MS);
    const eased = 1 - Math.pow(1 - t, 2.2);
    setTrackingLaunchProgress(0.08 + eased * (maxScale - 0.08), 0.72 + eased * 0.28);
    if (t < 1) {
      state.trackingProgressTimer = window.setTimeout(tick, 250);
    } else {
      state.trackingProgressTimer = null;
    }
  };
  tick();
}

function stopFirstScanPolling() {
  if (state.firstScanPollTimer) {
    window.clearTimeout(state.firstScanPollTimer);
    state.firstScanPollTimer = null;
  }
  state.firstScanPollAttempts = 0;
}

async function pollLatestFirstScan({ resetAttempts = false } = {}) {
  if (!state.user) return null;
  if (resetAttempts) state.firstScanPollAttempts = 0;

  if (state.firstScanPollAttempts >= FIRST_SCAN_POLL_MAX_ATTEMPTS) {
    clearPendingFirstScanState();
    if (!state.currentScan) {
      showTrackingLaunchPage();
      setStatus("The first scan is taking longer than expected. You can open the dashboard and retry when ready.", "working");
    }
    return null;
  }

  state.firstScanPollAttempts += 1;

  try {
    const latest = await fetchJson("/api/scans/latest");
    const latestScan = latest.scan || null;
    if (latestScan?.metrics?.completedAnswers) {
      applyCompletedScan(latestScan, { openDashboard: true });
      return latestScan;
    }
    if (latestScan) {
      state.currentScan = latestScan;
      clearPendingFirstScanState();
      renderAll();
      showTrackingLaunchPage();
      setStatus("The scan finished without enough completed AI answers. Open the dashboard to retry.", "error");
      return latestScan;
    }
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      clearPendingFirstScanState();
      setStatus(error.message || "Your session expired. Sign in again.", "error");
      return null;
    }
  }

  state.firstScanPollTimer = window.setTimeout(() => {
    void pollLatestFirstScan();
  }, FIRST_SCAN_POLL_INTERVAL_MS);
  return null;
}

function startFirstScanPolling({ resetAttempts = true } = {}) {
  if (!state.user) return;
  stopFirstScanPolling();
  state.autoScanRequestedFor = state.user.id;
  markPendingFirstScan(state.user.id);
  void pollLatestFirstScan({ resetAttempts });
}

async function resumeOrStartFirstScan() {
  if (!state.user || !state.config) return { started: false };
  if (needsTrackingSetup()) return { started: false, needsTrackingSetup: true };

  const platforms = getConfiguredPlatformKeys();
  if (!platforms.length) {
    setStatus("We could not start the scan because the provider keys are missing on this server.", "error");
    return { started: false };
  }

  try {
    const latest = await fetchJson("/api/scans/latest");
    if (latest.scan?.metrics?.completedAnswers) {
      applyCompletedScan(latest.scan, { openDashboard: true });
      return { started: true, completed: true };
    }
    if (latest.scan) {
      state.currentScan = latest.scan;
      clearPendingFirstScanState();
      showTrackingLaunchPage();
      return { started: false, needsRetry: true };
    }
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      clearPendingFirstScanState();
      setStatus(error.message || "Your session expired. Sign in again.", "error");
      return { started: false };
    }
  }

  // No scan row on the server yet — polling cannot help. Re-POST unless this tab
  // already has an in-flight request (e.g. user refreshed mid-scan).
  if (!state.isScanning) {
    state.autoScanRequestedFor = state.user.id;
    markPendingFirstScan(state.user.id);
    void runScanRequest(buildScanPayload(), { auto: true });
    return { started: true, background: true, restarted: true };
  }

  startFirstScanPolling({ resetAttempts: false });
  return { started: true, background: true, resumed: true };
}

function renderUserProfile() {
  const name = state.user?.name || "Workspace";
  const initial = name.trim()[0]?.toUpperCase() || "G";
  const accessTier = getAccessTier();
  const shortName = name.split(" ")[0] || name;
  if (els.profileName) els.profileName.textContent = name.split(" ")[0] || name;
  if (els.profileAvatar) els.profileAvatar.textContent = initial;
  if (els.profileWorkspaceName) {
    els.profileWorkspaceName.textContent =
      accessTier === "premium"
        ? `${shortName} Premium Workspace`
        : accessTier === "included_month"
          ? `${shortName} Included Workspace`
          : `${shortName} Workspace`;
  }
  if (els.profileRoleLabel) {
    els.profileRoleLabel.textContent =
      accessTier === "premium" ? "Premium access" : accessTier === "included_month" ? "Included access" : "Workspace";
  }
  if (els.premiumPlanBadge) {
    els.premiumPlanBadge.hidden = !["premium", "included_month"].includes(accessTier);
    els.premiumPlanBadge.textContent =
      accessTier === "premium" ? "Premium" : accessTier === "included_month" ? "Included" : "Tracking";
  }
  if (els.premiumNavItem) {
    els.premiumNavItem.hidden = !hasPremiumInsightsAccess();
  }
  renderProfileMenu();
}

function generateMockScans({ businessName, website }) {
  const hostname = hostnameFor(website) || "yourbusiness.com";
  const location = "Palo Alto, CA";
  const vertical = inferMockVertical(businessName, website);
  const competitors = buildMockCompetitors(vertical);
  const categories = [
    `Top ${vertical} recommendations`,
    "Cost / value",
    "Availability / scheduling",
    "Trust / proof",
    `${vertical} visibility`,
    "Local discovery",
  ];
  const platforms = [
    { key: "openai", label: "ChatGPT", model: "gpt-5-nano" },
    { key: "gemini", label: "Gemini", model: "gemini-3.1-flash-lite" },
    { key: "openrouter", label: "Claude", model: "anthropic/claude-haiku-4.5" },
  ];
  const promptTemplates = [
    { category: categories[0], text: `best ${vertical} in ${location}` },
    { category: categories[1], text: `cost of ${vertical} near ${location}` },
    { category: categories[2], text: `${vertical} available for customers in ${location}` },
    { category: categories[3], text: `trusted ${vertical} for families near ${location}` },
    { category: categories[4], text: `best ${vertical} near ${location}` },
    { category: categories[5], text: `${vertical} near ${location} that customers recommend` },
  ];
  const prompts = promptTemplates.flatMap((template) =>
    [1, 2, 3].map((runIndex) => ({
      id: mockId(),
      category: template.category,
      text: template.text,
      runIndex,
      intent: "Measure AI visibility for a realistic customer query.",
      locationVariant: location,
      reason: "Generated from the business profile.",
      businessName,
      generatedFrom: "demo data",
    })),
  );

  const scoreProgression = [58, 66, 72];
  const daysAgo = [14, 7, 0];

  return scoreProgression.map((visibilityScore, scanIndex) => {
    const createdAt = new Date(Date.now() - daysAgo[scanIndex] * 24 * 60 * 60 * 1000).toISOString();
    const mentionRate = visibilityScore - 8;
    const firstChoiceRate = Math.max(28, mentionRate - 18);
    const avgRank = scanIndex === 0 ? 2.4 : scanIndex === 1 ? 1.8 : 1.4;
    const positiveRate = Math.min(78, 52 + scanIndex * 8);
    const results = [];

    for (const prompt of prompts) {
      for (const platform of platforms) {
        const ownMentioned = mockHash(`${scanIndex}-${prompt.id}-${platform.key}`) % 100 < mentionRate + 12;
        const rank = ownMentioned ? (mockHash(`${scanIndex}-rank-${prompt.id}-${platform.key}`) % 3) + 1 : null;
        const sentimentRoll = mockHash(`${scanIndex}-sent-${prompt.id}-${platform.key}`) % 100;
        const sentiment = !ownMentioned ? "not mentioned" : sentimentRoll < positiveRate ? "positive" : sentimentRoll < positiveRate + 22 ? "neutral" : "negative";
        const topCompetitor = competitors[mockHash(`${scanIndex}-comp-${prompt.id}`) % competitors.length];
        const businesses = ownMentioned ? [businessName, topCompetitor.name] : [topCompetitor.name, competitors[1].name];
        const answer = ownMentioned
          ? `${businessName} is a well-regarded ${vertical} in ${location}. Customers often mention strong service quality and clear local availability. ${topCompetitor.name} is another option in the area.`
          : `For ${prompt.text}, ${topCompetitor.name} and ${competitors[1].name} are commonly recommended in ${location}.`;

        results.push({
          id: mockId(),
          promptId: prompt.id,
          prompt: prompt.text,
          category: prompt.category,
          platform: platform.key,
          platformLabel: platform.label,
          model: platform.model,
          requestedAt: createdAt,
          location,
          businessName,
          website,
          answer,
          citations: ownMentioned ? [`https://${hostname}/services`, `https://yelp.com/biz/example`] : [`https://yelp.com/biz/example`],
          sources: ownMentioned
            ? [{ url: `https://${hostname}/services`, host: hostname }, { url: "https://yelp.com", host: "yelp.com" }]
            : [{ url: "https://yelp.com", host: "yelp.com" }],
          businesses,
          ownMentioned,
          rank,
          sentiment,
          context: ownMentioned ? "Mentioned as a trusted local recommendation." : "Not mentioned in the answer.",
        });
      }
    }

    const completed = results.filter((result) => result.answer);
    const mentions = completed.filter((result) => result.ownMentioned);
    const platformScores = platforms.map((platform) => {
      const items = completed.filter((result) => result.platform === platform.key);
      const platformMentions = items.filter((result) => result.ownMentioned);
      const ranks = platformMentions.map((result) => result.rank).filter(Number.isFinite);
      return {
        label: platform.label,
        attempts: items.length,
        mentionRate: percent(platformMentions.length, items.length),
        avgRank: ranks.length ? round(ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length, 1) : null,
        positiveRate: percent(platformMentions.filter((result) => result.sentiment === "positive").length, platformMentions.length),
        visibilityScore: Math.round(percent(platformMentions.length, items.length) * 0.72 + (ranks.length ? 20 : 0)),
      };
    });
    const categoryScores = categories.map((category) => {
      const items = completed.filter((result) => result.category === category);
      const categoryMentions = items.filter((result) => result.ownMentioned);
      const ranks = categoryMentions.map((result) => result.rank).filter(Number.isFinite);
      return {
        label: category,
        attempts: items.length,
        mentionRate: percent(categoryMentions.length, items.length),
        avgRank: ranks.length ? round(ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length, 1) : null,
        positiveRate: percent(categoryMentions.filter((result) => result.sentiment === "positive").length, categoryMentions.length),
        visibilityScore: Math.round(percent(categoryMentions.length, items.length) * 0.8),
      };
    });
    const previousScore = scanIndex > 0 ? scoreProgression[scanIndex - 1] : null;
    const previousMention = scanIndex > 0 ? scoreProgression[scanIndex - 1] - 8 : null;

    return {
      id: mockId(),
      createdAt,
      website,
      hostname,
      businessName,
      location,
      requestedPlatforms: platforms.map((platform) => platform.key),
      configuredPlatforms: platforms.map((platform) => platform.key),
      missingPlatforms: [],
      site: {
        startUrl: website,
        pageCount: 5,
        vertical: { label: vertical, specialty: vertical, customer: "customers", urgent: false },
        services: [`${vertical} services`, "Consultations", "Local support"],
        detectedLocations: [location],
        keywords: [vertical, location.split(",")[0].toLowerCase(), "local", "trusted"],
      },
      promptStrategy: {
        method: "Demo profile",
        summary: `Demo scan for ${businessName} across ${categories.length} customer intents.`,
        signals: [`vertical: ${vertical}`, `location: ${location}`],
        categories,
      },
      prompts,
      results,
      metrics: {
        completedAnswers: completed.length,
        ownMentionCount: mentions.length,
        totalAttempts: results.length,
        promptCount: prompts.length,
        mentionRate,
        firstChoiceRate,
        avgRank,
        visibilityScore,
        positiveRate,
        sentimentCounts: {
          positive: mentions.filter((result) => result.sentiment === "positive").length,
          neutral: mentions.filter((result) => result.sentiment === "neutral").length,
          negative: mentions.filter((result) => result.sentiment === "negative").length,
        },
        sourceQuality: 42 + scanIndex * 6,
        coverage: percent(new Set(mentions.map((result) => result.category)).size, categories.length),
        trend: {
          previousScanId: scanIndex > 0 ? "previous" : null,
          previousCreatedAt: scanIndex > 0 ? new Date(Date.now() - daysAgo[scanIndex - 1] * 24 * 60 * 60 * 1000).toISOString() : null,
          summary: scanIndex > 0 ? "Compared with the previous demo scan." : `This is the first comparable scan for ${businessName}.`,
          visibilityScoreDelta: previousScore === null ? null : visibilityScore - previousScore,
          mentionRateDelta: previousMention === null ? null : mentionRate - previousMention,
          avgRankDelta: scanIndex > 0 ? 0.6 : null,
          sourceQualityDelta: scanIndex > 0 ? 6 : null,
          positiveRateDelta: scanIndex > 0 ? 8 : null,
          categoryDeltas: categoryScores.map((category) => ({
            label: category.label,
            mentionRateDelta: scanIndex > 0 ? 4 : null,
            previousMentionRate: scanIndex > 0 ? Math.max(0, category.mentionRate - 4) : null,
            currentMentionRate: category.mentionRate,
          })),
        },
        riskFlags: scanIndex === 2 ? [] : [{ type: "verification", text: `${businessName} was mentioned with verification uncertainty in 2 answers.` }],
        platformScores,
        categoryScores,
        competitors: competitors.map((competitor, index) => ({
          name: competitor.name,
          mentions: 12 - index * 2,
          mentionRate: 38 - index * 7,
          avgRank: 1.6 + index * 0.4,
          topSource: competitor.source,
          why: competitor.why,
        })),
        sources: {
          topSources: [
            { host: "yelp.com", count: 14, examples: ["https://yelp.com/biz/example"] },
            { host: hostname, count: 9 + scanIndex, examples: [`https://${hostname}/services`] },
            { host: "google.com", count: 6, examples: ["https://google.com/maps"] },
          ],
          citedPages: [
            { url: `https://${hostname}/`, title: "Homepage", count: 4 + scanIndex },
            { url: `https://${hostname}/services`, title: "Services", count: 3 + scanIndex },
            { url: `https://${hostname}/contact`, title: "Contact", count: 2 },
          ],
          ownCitationCount: 9 + scanIndex,
          totalCitationCount: 29 + scanIndex,
        },
        actions: [
          {
            title: "Strengthen top-recommendation proof",
            impact: "Medium impact",
            reason: "Best/top prompts need stronger proof signals like reviews, awards, and service-area clarity.",
            evidence: `${categoryScores[0]?.mentionRate || mentionRate}% mention rate on top recommendation prompts.`,
            developerTasks: ["Add concise proof blocks for ratings, review count, and primary differentiators."],
          },
          {
            title: "Make availability and next steps clear",
            impact: "Medium impact",
            reason: "AI answers need clear booking, hours, or contact details before recommending the business.",
            evidence: `${categoryScores[2]?.mentionRate || mentionRate - 6}% mention rate on availability prompts.`,
            developerTasks: ["Make scheduling, hours, and contact details easy to crawl."],
          },
          {
            title: "Improve local-area coverage",
            impact: "High impact",
            reason: "Local discovery prompts should verify neighborhoods, nearby cities, and service radius.",
            evidence: `${categoryScores[5]?.mentionRate || mentionRate - 10}% mention rate on local discovery prompts.`,
            developerTasks: ["Add location/service-area sections with nearby neighborhoods and cities served."],
          },
        ],
      },
    };
  });
}

function inferMockVertical(businessName, website) {
  const text = `${businessName} ${website}`.toLowerCase();
  if (/dental|dentist|ortho|teeth/.test(text)) return "dentist";
  if (/plumb|hvac|heat|cool/.test(text)) return "plumber";
  if (/law|legal|attorney/.test(text)) return "law firm";
  if (/spa|salon|beauty|aesthetic/.test(text)) return "med spa";
  if (/temple|church|religious|pooja|puja/.test(text)) return "Hindu temple";
  if (/restaurant|cafe|dining|bistro/.test(text)) return "restaurant";
  if (/gym|fitness|yoga|pilates/.test(text)) return "fitness studio";
  return "local business";
}

function buildMockCompetitors(vertical) {
  const maps = {
    dentist: [
      { name: "Bay Smile Dental", source: "yelp.com", why: "More review proof" },
      { name: "Peninsula Family Dentistry", source: "google.com", why: "Clearer local citations" },
      { name: "Smile Studio Palo Alto", source: "healthgrades.com", why: "Stronger specialty proof" },
    ],
    "law firm": [
      { name: "Bay Area Legal Group", source: "avvo.com", why: "More attorney credentials" },
      { name: "Peninsula Counsel", source: "google.com", why: "Stronger local proof" },
      { name: "Summit Law Partners", source: "yelp.com", why: "Better review coverage" },
    ],
    default: [
      { name: "Northside Local Co.", source: "yelp.com", why: "More review proof" },
      { name: "Bay Area Specialists", source: "google.com", why: "Clearer service pages" },
      { name: "Premier Local Group", source: "answer text", why: "Repeated model recognition" },
    ],
  };
  return maps[vertical] || maps.default;
}

let mockIdCounter = 0;
function mockId() {
  mockIdCounter += 1;
  return `mock-${Date.now().toString(36)}-${mockIdCounter.toString(36)}`;
}

function mockHash(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isPublicSignupEnabled() {
  return state.config?.publicSignupEnabled === true;
}

function applyPublicSignupState() {
  const enabled = isPublicSignupEnabled();
  document.querySelectorAll(".signup-only").forEach((node) => {
    node.hidden = !enabled;
  });
  document.querySelectorAll(".landing-start-card button[type='submit']").forEach((button) => {
    button.textContent = enabled ? "Get started" : "Sign in";
  });
  if (els.loginSwitch) {
    els.loginSwitch.hidden = !enabled;
  }
  document.querySelectorAll(".signup-only-fallback").forEach((node) => {
    node.hidden = enabled;
  });
}

function bindLanding() {
  const isLoggedIn = Boolean(localStorage.getItem("gleoAuthToken") && state.user);
  if (isLoggedIn && needsTrackingSetup()) {
    showLocationSetupPage();
  } else if (isLoggedIn && isAwaitingFirstScan(state.user)) {
    showTrackingLaunchPage();
  } else {
    showAppShell(isLoggedIn);
  }

  document.querySelectorAll("[data-login-open]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!isPublicSignupEnabled()) {
        showSignInPage();
        showToast("Sign in with the login details Gleo sent you.");
        return;
      }
      showLoginPage();
    });
  });

  document.querySelectorAll("[data-signin-open]").forEach((button) => {
    button.addEventListener("click", () => showSignInPage());
  });

  els.landingPage?.addEventListener("submit", (event) => {
    const form = event.target.closest(".landing-start-card");
    if (!form) return;
    event.preventDefault();
    const businessInput = form.querySelector("[name='landingBusiness']");
    const websiteInput = form.querySelector("[name='landingWebsite']");
    if (!isPublicSignupEnabled()) {
      showSignInPage();
      showToast("Sign in with the login details Gleo sent you.");
      return;
    }
    state.pendingStart = {
      website: normalizeWebsiteInput(websiteInput?.value.trim() || ""),
      businessName: titleCaseWords(businessInput?.value.trim() || ""),
    };
    showLoginPage();
  });

  [els.landingBusinessInput, ...document.querySelectorAll("[name='landingBusiness']"), els.signupNameInput, els.signInNameInput, els.businessSetupNameInput]
    .filter(Boolean)
    .forEach((input) => {
      input.addEventListener("blur", () => {
        input.value = titleCaseWords(input.value);
      });
    });

  els.signupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const identity = readSignupForm();
    const error = validateSignup(identity);
    if (error) {
      showToast(error);
      return;
    }
    state.pendingSignupUser = {
      name: identity.name,
      email: identity.email,
      password: identity.password,
    };
    if (state.pendingStart?.businessName && state.pendingStart?.website) {
      await completeSignup({
        ...state.pendingSignupUser,
        businessName: state.pendingStart.businessName,
        website: state.pendingStart.website,
      });
      return;
    }
    showBusinessSetupPage();
  });

  els.signInForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await completeLogin({
      name: titleCaseWords(els.signInNameInput?.value.trim() || ""),
      email: els.signInEmailInput?.value.trim() || "",
      password: els.signInPasswordInput?.value || "",
    });
  });

  els.businessSetupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const businessDetails = {
      businessName: titleCaseWords(els.businessSetupNameInput?.value.trim() || ""),
      website: normalizeWebsiteInput(els.businessSetupWebsiteInput?.value.trim() || ""),
      location: titleCaseWords(els.businessSetupLocationInput?.value.trim() || ""),
      industry: titleCaseWords(els.businessSetupIndustryInput?.value.trim() || ""),
    };
    const error = validateBusinessDetails(businessDetails);
    if (error) {
      showToast(error);
      return;
    }
    if (!state.pendingSignupUser) {
      showToast("Start sign up again.");
      showLoginPage();
      return;
    }
    await completeSignup({
      ...state.pendingSignupUser,
      ...businessDetails,
    });
  });

  els.locationSetupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await saveUserTrackingContext({
        location: els.locationSetupInput?.value.trim() || "",
        industry: els.locationSetupIndustryInput?.value.trim() || "",
      });
    } catch (trackingError) {
      showToast(trackingError.message || "Enter your location and industry.");
      return;
    }
    await continueAfterAuth();
  });

  els.backToSignupButton?.addEventListener("click", () => {
    state.pendingSignupUser = null;
    showLoginPage();
  });

  els.forgotPasswordButton?.addEventListener("click", showForgotPasswordNotice);
  els.signupForgotPasswordButton?.addEventListener("click", showForgotPasswordNotice);

  els.backToLandingButton?.addEventListener("click", () => showAppShell(false));
  els.signInBackToLandingButton?.addEventListener("click", () => showAppShell(false));
  els.openDashboardButton?.addEventListener("click", () => {
    showAppShell(true);
    renderAll();
  });

  els.profileMenuButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleProfileMenu();
  });

  els.logoutButton?.addEventListener("click", async () => {
    try {
      await fetchJson("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout errors and clear local session anyway.
    }
    localStorage.removeItem("gleoAuthToken");
    localStorage.removeItem("gleoUser");
    localStorage.removeItem("gleoLoggedIn");
    setPendingFirstScanUserId("");
    stopFirstScanPolling();
    state.user = null;
    state.useMockData = false;
    state.currentScan = null;
    state.scans = [];
    state.autoScanRequestedFor = "";
    state.premiumRequestPending = false;
    closeProfileMenu();
    renderUserProfile();
    showAppShell(false);
  });

  document.addEventListener("click", (event) => {
    if (!els.profileMenu?.contains(event.target) && !els.profileMenuButton?.contains(event.target)) {
      closeProfileMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeProfileMenu();
  });
}

function showLoginPage() {
  els.landingPage?.classList.add("hidden");
  els.appShell?.classList.add("hidden");
  els.businessSetupPage?.classList.add("hidden");
  els.locationSetupPage?.classList.add("hidden");
  els.trackingLaunchPage?.classList.add("hidden");
  els.signInPage?.classList.add("hidden");
  els.loginPage?.classList.remove("hidden");
  els.signupNameInput?.focus();
}

function showSignInPage() {
  els.landingPage?.classList.add("hidden");
  els.appShell?.classList.add("hidden");
  els.businessSetupPage?.classList.add("hidden");
  els.locationSetupPage?.classList.add("hidden");
  els.trackingLaunchPage?.classList.add("hidden");
  els.loginPage?.classList.add("hidden");
  els.signInPage?.classList.remove("hidden");
}

function showBusinessSetupPage() {
  els.landingPage?.classList.add("hidden");
  els.appShell?.classList.add("hidden");
  els.loginPage?.classList.add("hidden");
  els.signInPage?.classList.add("hidden");
  els.locationSetupPage?.classList.add("hidden");
  els.trackingLaunchPage?.classList.add("hidden");
  els.businessSetupPage?.classList.remove("hidden");
  if (els.businessSetupIntro && state.pendingSignupUser) {
    els.businessSetupIntro.textContent = `You are all set as ${state.pendingSignupUser.name}. Add the business you want us to start tracking.`;
  }
  if (state.pendingStart) {
    if (els.businessSetupNameInput) els.businessSetupNameInput.value = state.pendingStart.businessName || "";
    if (els.businessSetupWebsiteInput) els.businessSetupWebsiteInput.value = state.pendingStart.website || "";
  }
  els.businessSetupNameInput?.focus();
}

function showLocationSetupPage() {
  const businessName = state.user?.businessName || "your business";
  els.landingPage?.classList.add("hidden");
  els.appShell?.classList.add("hidden");
  els.loginPage?.classList.add("hidden");
  els.signInPage?.classList.add("hidden");
  els.businessSetupPage?.classList.add("hidden");
  els.trackingLaunchPage?.classList.add("hidden");
  els.locationSetupPage?.classList.remove("hidden");
  if (els.locationSetupIntro) {
    els.locationSetupIntro.textContent = `Add the location and industry you want tracked for ${businessName}. We still scan your website for services and proof, but these fields drive the AI prompts.`;
  }
  if (els.locationSetupInput) {
    els.locationSetupInput.value = getUserServiceLocation() || "";
  }
  if (els.locationSetupIndustryInput) {
    els.locationSetupIndustryInput.value = getUserServiceIndustry() || "";
  }
  els.locationSetupInput?.focus();
}

function showTrackingLaunchPage() {
  const businessName = state.user?.businessName || "your business";
  const hasScanRecord = Boolean(state.currentScan);
  const hasCompletedScan = Boolean(state.currentScan?.metrics?.completedAnswers);
  const isPremium = hasPremiumInsightsAccess();
  const accessTier = getAccessTier();
  const trialEndLabel = formatAccessDate(state.user?.trialEndsAt);
  const isWaitingForResults = isAwaitingFirstScan(state.user) || (!hasScanRecord && state.autoScanRequestedFor === state.user?.id);
  const needsRetry = !hasCompletedScan && !isWaitingForResults;
  els.landingPage?.classList.add("hidden");
  els.appShell?.classList.add("hidden");
  els.loginPage?.classList.add("hidden");
  els.signInPage?.classList.add("hidden");
  els.businessSetupPage?.classList.add("hidden");
  els.locationSetupPage?.classList.add("hidden");
  els.trackingLaunchPage?.classList.remove("hidden");
  if (els.premiumLaunchBadge) {
    els.premiumLaunchBadge.hidden = !isPremium;
  }
  if (els.trackingLaunchTitle) {
    els.trackingLaunchTitle.textContent = hasCompletedScan
      ? `${businessName} is ready to review.`
      : needsRetry
        ? "We need one more pass to finish your first score."
      : accessTier === "included_month"
        ? "Your included tracking month has started."
        : isPremium
        ? "Your premium tracking has been started."
        : "Your tracking has been started.";
  }
  if (els.trackingLaunchText) {
    els.trackingLaunchText.textContent = hasCompletedScan
      ? `Your first scan is ready. Open the dashboard to see what AI is saying about ${businessName}.`
      : needsRetry
        ? `The first scan did not return enough completed AI answers to calculate a score for ${businessName} yet. Open the dashboard to retry the scan once you are ready.`
      : accessTier === "included_month"
        ? `Tracking is included for your first month and ends on ${trialEndLabel || "your trial end date"} unless you choose a monthly plan. Premium actionable insights are not included on this access tier.`
        : isPremium
        ? `We are scanning ${businessName} now and preparing your premium reoptimization insights. Open the dashboard soon to review the first results.`
        : `We are scanning ${businessName} now. This usually takes a few minutes. Open the dashboard soon to review the first results.`;
  }
  if (els.trackingLaunchHint) {
    els.trackingLaunchHint.textContent = hasCompletedScan
      ? "Your dashboard is ready."
      : needsRetry
        ? "Open the dashboard when you want to start a fresh retry."
        : "We will unlock the dashboard here as soon as the first score is ready.";
  }
  if (els.openDashboardButton) {
    els.openDashboardButton.hidden = !hasCompletedScan && !needsRetry;
    els.openDashboardButton.disabled = !hasCompletedScan && !needsRetry;
    els.openDashboardButton.textContent = hasCompletedScan ? "Open dashboard" : "Open dashboard and retry";
  }

  if (hasCompletedScan) {
    startTrackingLaunchProgress({ complete: true });
  } else if (isWaitingForResults) {
    startTrackingLaunchProgress({ fromStart: !state.trackingProgressStartedAt });
  } else {
    stopTrackingLaunchProgress();
    setTrackingLaunchProgress(needsRetry ? 0.35 : 0.06, 0.7);
  }
}

function showAppShell(isVisible) {
  els.appShell?.classList.toggle("hidden", !isVisible);
  els.landingPage?.classList.toggle("hidden", isVisible);
  els.loginPage?.classList.add("hidden");
  els.signInPage?.classList.add("hidden");
  els.businessSetupPage?.classList.add("hidden");
  els.locationSetupPage?.classList.add("hidden");
  els.trackingLaunchPage?.classList.add("hidden");
  if (!isVisible) {
    state.setupForcedOpen = false;
    state.pendingSignupUser = null;
  }
}

function applyPendingStart() {
  if (!state.pendingStart || !state.user) return;
  if (els.websiteInput) els.websiteInput.value = state.pendingStart.website || state.user.website || "";
  if (els.businessInput) els.businessInput.value = state.pendingStart.businessName || state.user.businessName || "";
  if (els.locationInput) els.locationInput.value = getUserServiceLocation() || "";
  if (els.industryInput) els.industryInput.value = getUserServiceIndustry() || "";
}

function bindNavigation() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.hidden) return;
      const panel = button.dataset.panel;
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".panels").forEach((item) => item.classList.toggle("active", item.id === panel));
      if (panel === "sentiment") renderSentiment();
      if (panel === "premium") renderPremiumInsights();
    });
  });
}

function toggleProfileMenu() {
  const willOpen = els.profileMenu?.classList.contains("hidden");
  els.profileMenu?.classList.toggle("hidden", !willOpen);
  els.profileMenuButton?.setAttribute("aria-expanded", willOpen ? "true" : "false");
  renderProfileMenu();
}

function closeProfileMenu() {
  els.profileMenu?.classList.add("hidden");
  els.profileMenuButton?.setAttribute("aria-expanded", "false");
}

function renderProfileMenu() {
  if (!els.profileBusinessLabel) return;
  const scan = state.currentScan;
  els.profileBusinessLabel.textContent = scan?.businessName
    ? `${scan.businessName} · ${hostnameFor(scan.website || "") || "Current Site"}`
    : "No business selected";
}

function bindScan() {
  els.newScanButton?.addEventListener("click", () => {
    state.setupForcedOpen = true;
    if (state.currentScan) {
      if (els.websiteInput) els.websiteInput.value = state.currentScan.website || "";
      if (els.businessInput) els.businessInput.value = state.currentScan.businessName || "";
    }
    renderSetupVisibility();
    els.websiteInput?.focus();
  });

  els.scanForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const platforms = [...new FormData(els.scanForm).getAll("platforms")];

    if (!platforms.length) {
      setStatus("Choose at least one AI platform.", "error");
      return;
    }

    await runScanRequest({
      ...buildScanPayload({
        website: els.websiteInput.value.trim(),
        businessName: els.businessInput.value.trim(),
        location: els.locationInput?.value.trim() || "",
        industry: els.industryInput?.value.trim() || "",
      }),
      platforms,
    });
  });
}

function getConfiguredPlatformKeys() {
  return Object.entries(state.config?.providers || {})
    .filter(([, provider]) => provider.configured)
    .map(([key]) => key);
}

async function maybeStartAutoScan({ background = false } = {}) {
  if (!state.user || !state.config || state.isScanning || state.setupForcedOpen) return { started: false };
  if (needsTrackingSetup()) return { started: false, needsTrackingSetup: true };
  if (state.currentScan?.metrics?.completedAnswers) return { started: false };
  if (state.autoScanRequestedFor === state.user.id && state.isScanning) return { started: false };

  if (getPendingFirstScanUserId() === state.user.id) {
    return resumeOrStartFirstScan();
  }

  const platforms = getConfiguredPlatformKeys();
  renderSetupVisibility();

  if (!platforms.length) {
    setStatus("We could not start the scan because the provider keys are missing on this server.", "error");
    renderSetupVisibility();
    return { started: false };
  }
  state.autoScanRequestedFor = state.user.id;
  const scanTask = runScanRequest(buildScanPayload({ platforms }), { auto: true });
  if (background) {
    void scanTask;
    return { started: true, background: true };
  }
  return { started: true, background: false, result: await scanTask };
}

async function runScanRequest(payload, { auto = false } = {}) {
  const requestPayload = {
    ...buildScanPayload(payload),
    platforms: payload.platforms || getConfiguredPlatformKeys(),
  };
  if (!requestPayload.location || !requestPayload.industry) {
    const message = !requestPayload.location
      ? "Enter your business location before running a scan."
      : "Enter your business industry before running a scan.";
    setStatus(message, "error");
    if (auto) showLocationSetupPage();
    else showToast(message);
    return { ok: false, needsTrackingSetup: true };
  }
  if (requestPayload.location) setUserServiceLocation(state.user?.id, requestPayload.location);
  if (requestPayload.industry) setUserServiceIndustry(state.user?.id, requestPayload.industry);

  setScanning(true, auto);
  if (auto && state.user) {
    state.autoScanRequestedFor = state.user.id;
    setPendingFirstScanUserId(state.user.id);
  }

  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), SCAN_REQUEST_TIMEOUT_MS);
    const response = await fetch(apiUrl("/api/scan"), {
      method: "POST",
      headers: authJsonHeaders(),
      body: JSON.stringify(requestPayload),
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);
    const data = await response.json();
    if (!response.ok) {
      const requestError = new Error(data.error || "Scan failed.");
      requestError.status = response.status;
      throw requestError;
    }

    applyCompletedScan(data.scan, { openDashboard: auto });
    return { ok: true, scan: data.scan };
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      clearPendingFirstScanState();
      const authMessage = error.message || "Your session expired. Sign in again.";
      setStatus(authMessage, "error");
      if (!auto) showToast(authMessage);
      return { ok: false, error };
    }

    if (error?.status === 400 && /location|industry/i.test(error.message || "")) {
      clearPendingFirstScanState();
      setStatus(error.message, "error");
      showLocationSetupPage();
      return { ok: false, error, needsTrackingSetup: true };
    }

    if (auto && state.user) state.autoScanRequestedFor = "";
    const message =
      error?.name === "AbortError"
        ? "The scan timed out before it could finish. Open the dashboard and try again."
        : error.message || "The scan could not complete.";
    setStatus(message, "error");
    if (!auto) showToast(message);
    if (auto && state.user) {
      startFirstScanPolling();
    } else {
      clearPendingFirstScanState();
    }
    return { ok: false, error };
  } finally {
    setScanning(false, auto);
    if (!els.trackingLaunchPage?.classList.contains("hidden")) {
      showTrackingLaunchPage();
    }
  }
}

function bindClear() {
  if (!els.clearResultsButton) return;
  els.clearResultsButton.addEventListener("click", () => {
    state.currentScan = null;
    renderAll();
    setStatus("View cleared. Previous scans are still stored on the local server.", "working");
  });
}

function bindMetricFilters() {
  [els.metricsPlatformSelect, els.metricsCategorySelect].filter(Boolean).forEach((select) => {
    select.addEventListener("change", () => {
      state.metricFilters[select === els.metricsPlatformSelect ? "platform" : "category"] = select.value;
      animateControlChange(select, els.metricsResults);
      renderPrompts();
    });
  });
  els.competitorModeToggle?.addEventListener("change", () => {
    state.competitorMode = els.competitorModeToggle.checked;
    animateControlChange(els.competitorModeToggle, els.metricsResults);
    renderPrompts();
  });
}

function bindTrendRange() {
  els.trendRangeSelect?.addEventListener("change", () => {
    state.trendRangeDays = Number(els.trendRangeSelect.value) || 7;
    animateControlChange(els.trendRangeSelect, els.trendChart);
    renderOverviewDeltas(state.currentScan?.metrics || null);
    renderTrend();
  });
}

function animateControlChange(control, target) {
  const wrappers = [control, control?.closest("label"), target].filter(Boolean);
  animateElements(wrappers);
}

function animateElements(items) {
  items.filter(Boolean).forEach((item) => {
    item.classList.remove("is-updating");
    void item.offsetWidth;
    item.classList.add("is-updating");
    window.setTimeout(() => item.classList.remove("is-updating"), 980);
  });
}

function showToast(message) {
  if (!els.appToast) return;
  els.appToast.textContent = message;
  els.appToast.classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.appToast?.classList.add("hidden");
  }, 4200);
}

async function loadInitialData() {
  const [config, scansData] = await Promise.all([fetchJson("/api/config"), fetchJson("/api/scans")]);
  state.config = config;
  applyPublicSignupState();
  const serverScans = scansData.scans || [];

  if (localStorage.getItem("gleoAuthToken") && state.user) {
    await loadUserScans(state.user);
  } else if (serverScans.length) {
    state.useMockData = false;
    state.scans = serverScans;
    state.currentScan = serverScans.at(-1) || null;
  } else {
    state.scans = [];
    state.currentScan = null;
  }

  renderConfig();
  renderAll();

  if (state.user && needsTrackingSetup()) {
    showLocationSetupPage();
    return;
  }

  const expiredStalePending = expireStalePendingFirstScan();
  const pendingFirstScanUserId = getPendingFirstScanUserId();
  if (pendingFirstScanUserId && pendingFirstScanUserId === state.user?.id && !state.currentScan?.metrics?.completedAnswers) {
    const resumed = await resumeOrStartFirstScan();
    if (!resumed.completed) {
      showTrackingLaunchPage();
      setStatus(`We are still pulling together ${state.user?.businessName || "your"} first scan.`, "working");
    }
  } else if (expiredStalePending && state.user && !state.currentScan?.metrics?.completedAnswers) {
    showTrackingLaunchPage();
    setStatus("The first scan did not finish in time. Open the dashboard to retry.", "error");
  } else {
    const started = await maybeStartAutoScan({ background: true });
    if (started.started && !state.currentScan?.metrics?.completedAnswers) {
      showTrackingLaunchPage();
      setStatus(`We are still pulling together ${state.user?.businessName || "your"} first scan.`, "working");
    }
  }

  if (state.currentScan?.metrics?.completedAnswers) {
    setStatus(buildDashboardStatusMessage(), "ready");
  } else if (!Object.values(state.config.providers).some((provider) => provider.configured)) {
    setStatus("Enter the website, business name, location, and industry, then start the scan.", "working");
  }
}

function renderAll() {
  [
    renderConfig,
    renderOverview,
    renderPrompts,
    renderSources,
    renderSentiment,
    renderPremiumInsights,
    renderEvidence,
    renderTrend,
    renderProfileMenu,
  ].forEach((render) => {
    try {
      render();
    } catch (error) {
      console.error(`${render.name} failed`, error);
      if (render.name === "renderSentiment") {
        const fallback = document.querySelector("#sentimentGrid");
        if (fallback) fallback.innerHTML = emptyCard("Sentiment Render Error", error.message || "Sentiment could not render.");
      }
    }
  });
}

function renderConfig() {
  if (!state.config) return;
  applyPublicSignupState();

  if (els.providerStatus) {
    els.providerStatus.innerHTML = Object.entries(state.config.providers)
      .map(([key, provider]) => {
        const klass = provider.configured ? "ready" : "missing";
        return `
          <div class="provider-row ${klass}">
            <strong>${provider.label}</strong>
            <span>${provider.configured ? provider.model : "Missing key"}</span>
          </div>
        `;
      })
      .join("");
  }

  els.limitList.innerHTML = `
    <div class="stack-item"><strong>Crawl depth</strong><span>${state.config.limits.maxCrawlPages} pages per scan</span></div>
    <div class="stack-item"><strong>Prompt count</strong><span>${state.config.limits.maxScanPrompts} prompts per scan</span></div>
  `;

  const configuredPlatforms = new Set(
    Object.entries(state.config.providers)
      .filter(([, provider]) => provider.configured)
      .map(([key]) => key),
  );
  document.querySelectorAll("input[name='platforms']").forEach((input) => {
    const row = input.closest("label");
    if (!row) return;
    row.title = configuredPlatforms.has(input.value) ? "Configured" : "Missing API key";
    row.classList.toggle("missing", !configuredPlatforms.has(input.value));
  });
}

function renderOverview() {
  const scan = state.currentScan;
  const hasScan = Boolean(scan);
  const hasCompletedAnswers = Boolean(scan?.metrics.completedAnswers);
  els.emptyState.classList.toggle("hidden", hasCompletedAnswers);
  if (els.setupCard) els.setupCard.classList.add("hidden");
  els.scoreHero.hidden = !hasScan || !hasCompletedAnswers;
  renderSetupVisibility();

  if (!scan || !hasCompletedAnswers) {
    if (els.emptyStateTitle && els.emptyStateText) {
      if (isAwaitingFirstScan(state.user)) {
        els.emptyStateTitle.textContent = "Your first scan is in progress";
        els.emptyStateText.textContent = `We are still calculating ${state.user?.businessName || "your business"}'s first score. Stay on the tracking started page for the cleanest handoff into the dashboard.`;
      } else if (!scan) {
        els.emptyStateTitle.textContent = "No scan results yet";
        els.emptyStateText.textContent = "Start with the business name, website, location, and industry. Gleo scans your site for services and proof, then checks what AI recommends in your area.";
      } else if (state.isScanning) {
        els.emptyStateTitle.textContent = "Your first scan is in progress";
        els.emptyStateText.textContent = `We are still calculating ${scan.businessName || "your business"}'s first score. The dashboard will fill in as soon as completed AI answers come back.`;
      } else {
        els.emptyStateTitle.textContent = "Your first score is not ready yet";
        els.emptyStateText.textContent = "The last scan did not return enough completed AI answers to calculate a score. Start a new scan from the dashboard to try again.";
      }
    }
    setSummaryValues();
    renderEmptyLists();
    return;
  }

  const metrics = scan.metrics;
  const score = valueOrDash(metrics.visibilityScore);
  els.mainScore.textContent = score;
  els.miniScore.textContent = metrics.visibilityScore === null ? "-" : `${metrics.visibilityScore}`;
  els.scoreSubtext.textContent = metrics.completedAnswers
    ? `${metrics.completedAnswers} answers analyzed across ${scan.configuredPlatforms.length} configured platform${scan.configuredPlatforms.length === 1 ? "" : "s"}.`
    : "No AI answers were completed. Check provider keys and try again.";
  setSummaryValues(metrics, scan);
  renderPlatformPills(metrics.platformScores);
}

function renderSetupVisibility() {
  if (!els.propertyBar) return;
  const hasCompletedScan = Boolean(state.currentScan?.metrics?.completedAnswers);
  const hideSetup = !state.setupForcedOpen;
  els.propertyBar.classList.toggle("hidden", hideSetup);
  const showManualForm = state.setupForcedOpen && !state.isScanning;
  els.scanForm?.classList.toggle("hidden", !showManualForm);
  els.scanProgressCard?.classList.add("hidden");
  if (els.newScanButton) {
    els.newScanButton.hidden = !hasCompletedScan || state.isScanning || state.setupForcedOpen;
  }
  els.overviewPanel?.classList.remove("setup-skipped");
}

function renderCategories() {
  const scan = state.currentScan;
  const scores = scan?.metrics?.categoryScores || [];
  if (!els.categoryList) return;

  if (!scan || !scores.length) {
    els.categoryList.innerHTML = emptyStack("Run a scan to see which customer intents mention the business.");
    return;
  }

  els.categoryList.innerHTML = scores
    .map((category) => {
      const delta = scan.metrics.trend?.categoryDeltas?.find((item) => item.label === category.label);
      const movement = delta ? formatDelta(delta.mentionRateDelta, "%") : "First Scan";
      const rank = category.avgRank ? `Avg. rank #${category.avgRank}` : "Not ranked yet";
      return `
        <article class="category-row">
          <div>
            <strong>${escapeHtml(category.label)}</strong>
            <p>${category.mentionRate}% mention rate | ${rank}</p>
          </div>
          <div class="category-meter" aria-label="${escapeAttr(category.label)} mention rate">
            <span style="--w:${category.mentionRate}%"></span>
          </div>
          <span class="tag ${delta?.mentionRateDelta < 0 ? "negative" : delta?.mentionRateDelta > 0 ? "" : "warning"}">${escapeHtml(movement)}</span>
        </article>
      `;
    })
    .join("");
}

function setSummaryValues(metrics = null, scan = null) {
  const firstChoiceRate = metrics ? metrics.firstChoiceRate ?? deriveFirstChoiceRate(scan) : null;
  els.mentionRate.textContent = metrics ? `${firstChoiceRate}%` : "-";
  els.avgRank.textContent = metrics?.avgRank ? `#${metrics.avgRank}` : "-";
  if (els.overviewSentiment) {
    els.overviewSentiment.innerHTML = metrics?.completedAnswers
      ? `<span class="sentiment-percent">${metrics.positiveRate}%</span><span class="sentiment-word">Positive</span>`
      : "-";
  }
  if (els.positiveRate) els.positiveRate.textContent = metrics ? `${metrics.positiveRate}%` : "-";
  els.miniScore.textContent = metrics?.visibilityScore === null || !metrics ? "-" : `${metrics.visibilityScore}`;
  renderOverviewDeltas(metrics);
}

function renderOverviewDeltas(metrics = null) {
  const trend = metrics?.trend || {};
  setDelta(els.scoreDelta, trend.visibilityScoreDelta, "", "since previous scan");
  [els.mentionDelta, els.rankDelta, els.sentimentDelta].forEach((element) => {
    if (!element) return;
    element.hidden = true;
    element.innerHTML = "";
  });
}

function deriveFirstChoiceRate(scan) {
  const completed = (scan?.results || []).filter((result) => result.answer && !result.error);
  if (!completed.length) return 0;
  return percent(completed.filter((result) => result.ownMentioned && result.rank === 1).length, completed.length);
}

function setDelta(element, value, suffix = "", label = "vs last scan") {
  if (!element) return;
  element.hidden = false;
  if (!Number.isFinite(value)) {
    element.className = "kpi-change neutral";
    element.innerHTML = `<span class="delta-muted">First scan</span>`;
    return;
  }
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const prefix = isPositive ? "+" : "";
  element.className = `kpi-change ${isPositive ? "positive" : value < 0 ? "negative" : "neutral"}`;
  element.innerHTML = `
    <span>${isNeutral ? "" : isPositive ? "▲" : "▼"} ${prefix}${formatCompactDelta(value)}${suffix}</span>
    <small>${escapeHtml(label)}</small>
  `;
}

function formatCompactDelta(value) {
  const rounded = Math.abs(value) >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return String(rounded).replace(/\.0$/, "");
}

function renderOverviewCompetitors() {
  if (!els.overviewCompetitorList) return;
  const scan = state.currentScan;
  if (!scan?.metrics?.completedAnswers) {
    els.overviewCompetitorList.innerHTML = emptyStack("Competitor share appears after completed AI answers.");
    return;
  }

  const rows = [
    { name: "You", initials: "Y", mentionRate: scan.metrics.mentionRate, isYou: true },
    ...(scan.metrics.competitors || []).slice(0, 3).map((competitor) => ({
      name: competitor.name,
      initials: competitor.name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      mentionRate: competitor.mentionRate,
    })),
  ];
  const max = Math.max(...rows.map((row) => row.mentionRate), 1);
  els.overviewCompetitorList.innerHTML = rows
    .map(
      (row) => `
        <article class="share-row ${row.isYou ? "you" : ""}">
          <span class="share-avatar">${escapeHtml(row.initials)}</span>
          <strong>${escapeHtml(row.name)}</strong>
          <b>${row.mentionRate}%</b>
          <div class="share-track"><i style="--w:${Math.max(6, (row.mentionRate / max) * 100)}%"></i></div>
        </article>
      `,
    )
    .join("");
}

function renderPlatformPills(platformScores = []) {
  els.platformPills.innerHTML = platformScores.length
    ? platformScores
        .map(
          (platform) => `
            <div class="platform-pill">
              <span>${platform.label}</span>
              <strong>${platform.mentionRate}%</strong>
            </div>
          `,
        )
        .join("")
    : `<div class="platform-pill"><span>No platform results</span><strong>-</strong></div>`;
}

function renderFactors(scan) {
  const metrics = scan.metrics;
  const factors = [];

  if (metrics.mentionRate >= 50) {
    factors.push({ kind: "good", title: "Strong mention coverage", text: `${scan.businessName} appears in ${metrics.mentionRate}% of completed AI answers.`, tag: "Strength" });
  } else {
    factors.push({ kind: "warning", title: "Low mention coverage", text: `${scan.businessName} appears in ${metrics.mentionRate}% of completed AI answers.`, tag: "Opportunity" });
  }

  if (metrics.sourceQuality >= 40) {
    factors.push({ kind: "good", title: "Your site is being cited", text: `${metrics.sourceQuality}% of tracked citations point to your own domain.`, tag: "Strength" });
  } else {
    factors.push({ kind: "warning", title: "Third-party sources dominate", text: "AI answers are leaning on external sources or uncited answer text.", tag: "Opportunity" });
  }

  if (metrics.avgRank && metrics.avgRank <= 2) {
    factors.push({ kind: "good", title: "High answer placement", text: `Average position is #${metrics.avgRank} when mentioned.`, tag: "Strength" });
  } else {
    factors.push({ kind: "warning", title: "Position can improve", text: metrics.avgRank ? `Average position is #${metrics.avgRank} when mentioned.` : "The business was not ranked in completed answers.", tag: "Opportunity" });
  }

  els.factorList.innerHTML = factors
    .map(
      (factor) => `
        <article class="factor ${factor.kind === "warning" ? "warning" : ""}">
          ${factorIcon(factor.kind)}
          <div><strong>${escapeHtml(factor.title)}</strong><p>${escapeHtml(factor.text)}</p></div>
          <span class="tag ${factor.kind === "warning" ? "warning" : ""}">${factor.tag}</span>
        </article>
      `,
    )
    .join("");
}

function renderActions(actions = []) {
  if (!els.actionList) return;
  els.actionList.innerHTML = actions.length
    ? `
      <article class="action action-compact">
        <strong>${escapeHtml(actions[0].title)}</strong>
        <p>${escapeHtml(actions[0].evidence || actions[0].reason)}</p>
      </article>
    `
    : `<article class="action"><div><strong>No action items yet</strong><p>Run a scan with completed AI answers to generate recommendations.</p></div></article>`;
}

function renderPrompts() {
  const scan = state.currentScan;
  renderMetricControls(scan);

  if (!scan) {
    setMetricsResultsVisible(false);
    return;
  }

  const filters = getMetricFilters();
  const filteredResults = getFilteredResults(scan, filters);

  if (!filters.platform || !filters.category) {
    setMetricsResultsVisible(false);
    return;
  }

  setMetricsResultsVisible(true);

  const visiblePrompts = scan.prompts.filter((prompt) => prompt.category === filters.category);
  const topicResults = scan.results.filter(
    (result) =>
      result.category === filters.category &&
      (filters.platform === "all" || result.platform === filters.platform),
  );
  els.promptGrid.innerHTML = visiblePrompts.length
    ? renderMetricTopicCard(filters.category, visiblePrompts, topicResults, scan.businessName)
    : emptyCard("No Topic Results", "No completed answers matched this LLM/topic selection.");

  els.promptGrid.querySelectorAll("button[data-result]").forEach((button) => {
    button.addEventListener("click", () => showAnswer(button.dataset.result));
  });
}

function renderMetricControls(scan) {
  if (!els.metricsPlatformSelect || !els.metricsCategorySelect) return;

  if (!scan) {
    els.metricsPlatformSelect.innerHTML = `<option value="">Choose LLM</option>`;
    els.metricsCategorySelect.innerHTML = `<option value="">Choose Topic</option>`;
    els.metricsPlatformSelect.disabled = true;
    els.metricsCategorySelect.disabled = true;
    if (els.competitorModeToggle) els.competitorModeToggle.disabled = true;
    if (els.metricsPlatformIcon) els.metricsPlatformIcon.innerHTML = platformIconSvg("");
    return;
  }

  const currentPlatform = state.metricFilters.platform || els.metricsPlatformSelect.value || "";
  const currentCategory = state.metricFilters.category || els.metricsCategorySelect.value || "";
  const platformRows = [...new Map(scan.results.map((result) => [result.platform, result.platformLabel])).entries()].map(
    ([value, label]) => {
      const completed = scan.results.some((result) => result.platform === value && result.answer && !result.error);
      return { value, label, completed };
    },
  );
  const categories = [...new Set(scan.prompts.map((prompt) => prompt.category))];
  const promptCounts = new Map(categories.map((category) => [category, scan.prompts.filter((prompt) => prompt.category === category).length]));

  els.metricsPlatformSelect.disabled = false;
  els.metricsCategorySelect.disabled = false;
  if (els.competitorModeToggle) {
    els.competitorModeToggle.disabled = false;
    els.competitorModeToggle.checked = state.competitorMode;
  }
  els.metricsPlatformSelect.innerHTML = [
    `<option value="">Choose LLM</option>`,
    ...platformRows.map(
      (row) =>
        `<option value="${escapeAttr(row.value)}">${escapeHtml(row.label)}${row.completed ? "" : " (No Completed Answers)"}</option>`,
    ),
  ].join("");
  els.metricsCategorySelect.innerHTML = [
    `<option value="">Choose Topic</option>`,
    ...categories.map((category) => {
      const count = promptCounts.get(category) || 0;
      return `<option value="${escapeAttr(category)}">${escapeHtml(titleCaseLabel(category))}${count > 1 ? ` (${count} Prompts)` : ""}</option>`;
    }),
  ].join("");

  els.metricsPlatformSelect.value = platformRows.some((row) => row.value === currentPlatform) ? currentPlatform : "";
  els.metricsCategorySelect.value = categories.includes(currentCategory) ? currentCategory : "";
  els.metricsPlatformSelect.closest("label")?.setAttribute("data-platform", els.metricsPlatformSelect.value || "");
  if (els.metricsPlatformIcon) els.metricsPlatformIcon.innerHTML = platformIconSvg(els.metricsPlatformSelect.value);
}

function getMetricFilters() {
  return {
    platform: els.metricsPlatformSelect?.value || "",
    category: els.metricsCategorySelect?.value || "",
  };
}

function platformIconSvg(platform) {
  if (platform === "openai") {
    return `
      <svg viewBox="0 0 24 24" fill-rule="evenodd" aria-hidden="true">
        <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 0 0-.856 0l-5.97 3.473Zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 0 1 .476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163ZM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898ZM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128Zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472Zm-5.637-5.303-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 0 1 4.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 0 1-.476 0Zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523Zm5.899 2.83a5.947 5.947 0 0 0 5.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0 0 10.205 0a5.947 5.947 0 0 0-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 0 0 4.162 1.713Z" />
      </svg>
    `;
  }
  if (platform === "openrouter") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2Z" />
    </svg>
  `;
}

function getFilteredResults(scan, { platform = "all", category = "all" } = {}) {
  return (scan?.results || []).filter(
    (result) =>
      result.answer &&
      !result.error &&
      (platform === "all" || result.platform === platform) &&
      (category === "all" || result.category === category),
  );
}

function setMetricsResultsVisible(isVisible) {
  els.metricsEmptyState?.classList.toggle("hidden", isVisible);
  els.metricsResults?.classList.toggle("hidden", !isVisible);
}

function renderMetricTopicCard(category, prompts, results, businessName) {
  const completedResults = results.filter((result) => result.answer && !result.error);
  const failedResults = results.filter((result) => result.error || !result.answer);
  const ownMentions = completedResults.filter((result) => result.ownMentioned).length;
  const ranks = completedResults.filter((result) => result.ownMentioned).map((result) => result.rank).filter(Number.isFinite);
  const avgRank = ranks.length ? `#${(ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length).toFixed(1).replace(/\.0$/, "")}` : "-";
  const topChoiceRows = completedResults.map((result) => topChoiceForResult(result, businessName)).filter(Boolean);
  const ownTopChoices = topChoiceRows.filter((choice) => choice.isYou).length;
  const competitorTopChoiceMap = new Map();
  const competitorMentionMap = new Map();

  for (const choice of topChoiceRows) {
    if (choice.isYou) continue;
    competitorTopChoiceMap.set(choice.name, (competitorTopChoiceMap.get(choice.name) || 0) + 1);
  }

  for (const result of completedResults) {
    for (const business of result.businesses || []) {
      if (sameBusinessName(business, businessName)) continue;
      competitorMentionMap.set(business, (competitorMentionMap.get(business) || 0) + 1);
    }
  }

  const competitorMentions = [...competitorMentionMap.values()].reduce((sum, value) => sum + value, 0);
  const competitorTopChoices = [...competitorTopChoiceMap.values()].reduce((sum, value) => sum + value, 0);
  const totalTopChoices = ownTopChoices + competitorTopChoices;
  const useTopChoiceShare = totalTopChoices > 0;
  const totalShareUnits = useTopChoiceShare ? totalTopChoices : ownMentions + competitorMentions;
  const ownShare = totalShareUnits ? percent(useTopChoiceShare ? ownTopChoices : ownMentions, totalShareUnits) : 0;
  const competitorShare = totalShareUnits ? 100 - ownShare : 0;
  const ownBarShare = ownShare > 0 ? Math.max(5, ownShare) : 0;
  const competitorBarShare = competitorShare > 0 ? Math.max(5, competitorShare) : 0;
  const competitorRows = [...competitorMentionMap.entries()]
    .map(([name, mentions]) => ({
      name,
      mentions,
      topChoices: competitorTopChoiceMap.get(name) || 0,
      mentionRate: percent(mentions, completedResults.length || 1),
      share: totalShareUnits
        ? percent(useTopChoiceShare ? competitorTopChoiceMap.get(name) || 0 : mentions, totalShareUnits)
        : 0,
    }))
    .sort((a, b) => b.topChoices - a.topChoices || b.mentions - a.mentions || a.name.localeCompare(b.name))
    .slice(0, 3);
  const competitorMode = state.competitorMode && competitorRows.length > 0;
  const modeLabel = useTopChoiceShare ? "#1 Choice Share" : "Mention Share";
  const youLabel = "You";
  const competitorLabel = "Competitors";
  const statusNote = !completedResults.length && failedResults.length
    ? buildProviderStatusNote(failedResults)
    : null;
  const completedCount = completedResults.length;
  const uniquePromptTexts = [...new Set(prompts.map((prompt) => prompt.text))];
  const competitorSegments = competitorMode
    ? competitorRows
        .map((competitor, index) => {
          const width = competitor.share > 0 ? Math.max(5, competitor.share) : 0;
          const label = `${competitor.name}: ${competitor.share}%`;
          const color = competitorColor(index);
          return width
            ? `<i class="competitor-segment competitor-segment-detail" title="${escapeAttr(label)}" style="--w:${width}%; --segment-color:${color}">
                <span class="segment-tooltip">
                  <b style="--tooltip-color:${color}">${competitor.share}% share</b>
                  <strong>${escapeHtml(competitor.name)}</strong>
                </span>
              </i>`
            : "";
        })
        .join("")
    : competitorShare > 0
      ? `<i class="competitor-segment" title="${escapeAttr(`${competitorLabel}: ${competitorShare}%`)}" style="--w:${competitorBarShare}%"></i>`
      : "";
  const shareLegend = `
    <div class="metric-share-legend metric-share-legend-simple">
      <span class="legend-you"><b>${ownShare}%</b> ${escapeHtml(youLabel)}</span>
      ${
        competitorShare > 0
          ? `<span class="legend-competitor"><b>${competitorShare}%</b> ${escapeHtml(competitorLabel)}</span>`
          : ""
      }
    </div>
  `;

  return `
    <article class="metric-result-card">
      <div class="metric-card-main">
        <span class="metric-section-label">Search Topic</span>
        <div class="metric-prompt-list">
          ${uniquePromptTexts.map((text) => `<span>${escapeHtml(text)}</span>`).join("")}
        </div>
      </div>
      <div class="metric-bar-wrap" aria-label="Mention share">
        <div class="metric-mode-label">${escapeHtml(modeLabel)}</div>
        <div class="segmented-mention-bar">
          <i class="you-segment" title="${escapeAttr(`${youLabel}: ${ownShare}%`)}" style="--w:${ownBarShare}%"></i>
          ${competitorSegments}
        </div>
        ${shareLegend}
      </div>
      <aside class="metric-rank-card">
        <span>Your Average Rank</span>
        <strong>${escapeHtml(avgRank)}</strong>
        <small>${completedCount ? `out of ${completedCount} result${completedCount === 1 ? "" : "s"}` : "no completed results"}</small>
      </aside>
      ${
        statusNote
          ? `<div class="metric-card-note">
              <strong>${escapeHtml(titleCaseLabel(statusNote.title))}</strong>
              <p>${escapeHtml(statusNote.body)}</p>
            </div>`
          : ""
      }
    </article>
  `;
}

function topChoiceForResult(result, businessName) {
  if (!result?.answer) return null;
  if (result.ownMentioned && result.rank === 1) {
    return { name: businessName, isYou: true };
  }
  const competitor = (result.businesses || []).find((business) => !sameBusinessName(business, businessName));
  return competitor ? { name: competitor, isYou: false } : null;
}

function competitorColor(index) {
  return ["#1d4ed8", "#0e8bb5", "#166534", "#92400e", "#991b1b"][index % 5];
}

function buildProviderStatusNote(results) {
  const first = results[0];
  const platform = first?.platformLabel || "This LLM";
  const reason = first?.error || "The provider returned no answer text for this prompt.";
  return {
    title: "No Completed Answer",
    body: `${platform} did not return usable answer text for this scan. ${reason}`,
  };
}

function buildPromptInsight({ ownRate, competitorRate, avgRank, topCompetitors, prompt, results }) {
  if (!results.length) {
    return {
      title: "No answer data yet",
      body: "This prompt did not return a completed AI answer for the selected LLM.",
    };
  }

  if (competitorRate > ownRate) {
    const competitorText = topCompetitors[0]?.name ? `${topCompetitors[0].name} is showing up more often here.` : "Competitors are showing up more often here.";
    return {
      title: "Visibility gap",
      body: `${competitorText} Strengthen the page content that directly answers this prompt: ${prompt.text}.`,
    };
  }

  if (ownRate > 0 && avgRank !== "-" && Number(avgRank.replace("#", "")) > 2) {
    return {
      title: "Ranking opportunity",
      body: "The business is mentioned, but it is not near the top of the answer. Add clearer proof, service-area wording, and comparison-friendly details.",
    };
  }

  if (ownRate > 0) {
    return {
      title: "Good coverage",
      body: "The business appears for this prompt. Keep the supporting page copy specific, crawlable, and aligned with this customer question.",
    };
  }

  return {
    title: "Missing mention",
    body: "The AI answer did not mention the business for this prompt. Add a direct FAQ or section using this customer-style wording.",
  };
}

function insightDriverForAction(action, scan) {
  const mentions = (scan.results || []).filter((result) => result.ownMentioned);
  const negativeCount = mentions.filter((result) => result.sentiment === "negative").length;
  const uncertainCount = mentions.filter((result) => /unclear|cannot verify|could not verify|limited information/i.test(`${result.answer} ${result.context}`)).length;
  const ownCitationCount = scan.metrics?.sources?.ownCitationCount || 0;
  const totalCitationCount = scan.metrics?.sources?.totalCitationCount || 0;
  const actionText = `${action.title} ${action.reason}`.toLowerCase();

  if (negativeCount && /sentiment|risk|proof|trust|recommendation/.test(actionText)) {
    return `${negativeCount} mention${negativeCount === 1 ? "" : "s"} had negative context.`;
  }

  if (uncertainCount && /verify|availability|hours|proof|trust|recommendation/.test(actionText)) {
    return `${uncertainCount} mention${uncertainCount === 1 ? "" : "s"} included uncertainty or limited-verification language.`;
  }

  if (totalCitationCount && /cite|source|page|crawl/.test(actionText)) {
    return `${ownCitationCount} of ${totalCitationCount} tracked citations pointed to your site.`;
  }

  const topContext = buildMentionContextTypes(mentions).sort((a, b) => b.value - a.value)[0];
  return topContext?.value ? `${topContext.label} appeared in ${topContext.value} mention${topContext.value === 1 ? "" : "s"}.` : "";
}

function renderCategoryPerformance(scan, results, filters) {
  if (!els.categoryList) return;
  if (!scan || !filters?.category) {
    els.categoryList.innerHTML = emptyStack("Choose an LLM and topic to view performance.");
    return;
  }

  const mentions = results.filter((result) => result.ownMentioned);
  const ranks = mentions.map((result) => result.rank).filter(Number.isFinite);
  const mentionRate = percent(mentions.length, results.length);
  const avgRank = ranks.length ? `#${(ranks.reduce((sum, value) => sum + value, 0) / ranks.length).toFixed(1).replace(/\.0$/, "")}` : "-";
  const sentiment = {
    positive: mentions.filter((result) => result.sentiment === "positive").length,
    neutral: mentions.filter((result) => result.sentiment === "neutral").length,
    negative: mentions.filter((result) => result.sentiment === "negative").length,
  };

  els.categoryList.innerHTML = `
    <article class="metric-summary-card">
          <span>${escapeHtml(titleCaseLabel(filters.category))}</span>
      <strong>${results.length ? `${mentionRate}%` : "-"}</strong>
      <p>Mention rate for this LLM/topic selection.</p>
    </article>
    <article class="metric-summary-card">
      <span>Average Rank</span>
      <strong>${avgRank}</strong>
      <p>Placement when the business is mentioned.</p>
    </article>
    <article class="metric-summary-card">
      <span>Sentiment</span>
      <strong>${sentiment.positive}/${sentiment.neutral}/${sentiment.negative}</strong>
      <p>Positive / Neutral / Negative mentions.</p>
    </article>
  `;
}

function renderFilteredCompetitors(scan, results) {
  if (!els.overviewCompetitorList) return;
  if (!scan || !results.length) {
    els.overviewCompetitorList.innerHTML = emptyStack("Competitor mentions appear after completed AI answers.");
    return;
  }

  const ownMentions = results.filter((result) => result.ownMentioned).length;
  const competitorMap = new Map();
  for (const result of results) {
    for (const business of result.businesses || []) {
      if (sameBusinessName(business, scan.businessName)) continue;
      const current = competitorMap.get(business) || { name: business, mentions: 0 };
      current.mentions += 1;
      competitorMap.set(business, current);
    }
  }

  const rows = [
    { name: "You", initials: "Y", mentionRate: percent(ownMentions, results.length), isYou: true },
    ...[...competitorMap.values()]
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5)
      .map((competitor) => ({
        name: competitor.name,
        initials: initialsFor(competitor.name),
        mentionRate: percent(competitor.mentions, results.length),
      })),
  ];
  const max = Math.max(...rows.map((row) => row.mentionRate), 1);

  els.overviewCompetitorList.innerHTML = rows
    .map(
      (row) => `
        <article class="share-row ${row.isYou ? "you" : ""}">
          <span class="share-avatar">${escapeHtml(row.initials)}</span>
          <strong>${escapeHtml(row.name)}</strong>
          <b>${row.mentionRate}%</b>
          <div class="share-track"><i style="--w:${Math.max(6, (row.mentionRate / max) * 100)}%"></i></div>
        </article>
      `,
    )
    .join("");
}

function renderCompetitors() {
  if (!els.competitorGrid) return;
  const competitors = state.currentScan?.metrics.competitors || [];
  els.competitorGrid.innerHTML = competitors.length
    ? competitors
        .map(
          (competitor, index) => `
            <article class="competitor-card">
              <span class="tag">${index === 0 ? "Top competitor" : `#${index + 1}`}</span>
              <strong>${escapeHtml(competitor.name)}</strong>
              <span class="rate">${competitor.mentionRate}%</span>
              <p>${competitor.mentions} mention${competitor.mentions === 1 ? "" : "s"}${competitor.avgRank ? `, avg. rank #${competitor.avgRank}` : ""}.</p>
              <div class="competitor-meta"><span class="tag warning">${escapeHtml(competitor.why)}</span></div>
            </article>
          `,
        )
        .join("")
    : emptyCard("No competitors detected yet", "Completed AI answers will be parsed for competing businesses.");
}

function renderSources() {
  const sources = state.currentScan?.metrics.sources.topSources || [];
  const pages = state.currentScan?.metrics.sources.citedPages || [];

  els.sourceDetailList.innerHTML = sources.length
    ? sources
        .map(
          (source) => `
            <article class="stack-item">
              <strong>${escapeHtml(source.host)}</strong>
              <p>${source.count} citation${source.count === 1 ? "" : "s"}</p>
              ${source.examples?.[0] ? `<a href="${escapeAttr(source.examples[0])}" target="_blank" rel="noreferrer">${escapeHtml(source.examples[0])}</a>` : ""}
            </article>
          `,
        )
        .join("")
    : emptyStack("No cited sources returned yet.");

  els.pageDetailList.innerHTML = pages.length
    ? pages
        .map(
          (page) => `
            <article class="stack-item">
              <strong>${escapeHtml(page.title)}</strong>
              <p>${page.count} citation${page.count === 1 ? "" : "s"}</p>
              <a href="${escapeAttr(page.url)}" target="_blank" rel="noreferrer">${escapeHtml(page.url)}</a>
            </article>
          `,
        )
        .join("")
    : emptyStack("No own-site pages were cited yet.");
}

function bindPremiumInsights() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("#premiumRequestButton");
    if (!button) return;
    void requestPremiumInsights();
  });
}

function renderPremiumInsights() {
  if (!els.premiumGrid || !els.premiumNavItem) return;
  const isPremium = hasPremiumInsightsAccess();
  els.premiumNavItem.hidden = !isPremium;

  if (!isPremium) {
    const premiumPanel = document.querySelector("#premium");
    if (premiumPanel?.classList.contains("active")) {
      document.querySelector('.nav-item[data-panel="overview"]')?.click();
    }
    return;
  }

  const scan = state.currentScan;
  if (!scan?.metrics?.completedAnswers) {
    els.premiumGrid.innerHTML = `
      <article class="insights-loading-card">
        <span class="insights-loading-orbit" aria-hidden="true"></span>
        <strong>Premium insights are warming up</strong>
        <p>We are waiting for the first completed scan so we can build grounded reoptimization recommendations for your business.</p>
      </article>
    `;
    return;
  }

  const actions = getPremiumActions(scan);
  if (!actions.length) {
    els.premiumGrid.innerHTML = emptyCard("No Premium Insights Yet", "Run another completed scan to refresh the reoptimization recommendations for this business.");
    return;
  }

  const requestLabel = state.premiumRequestPending ? "Submitting..." : "Request Reoptimization";
  const requestDisabled = state.premiumRequestPending ? "disabled" : "";
  const premiumSummary = `Premium request includes ${actions.length} grounded insight${actions.length === 1 ? "" : "s"} from the latest scan.`;

  els.premiumGrid.innerHTML = `
    <article class="insight-board ${actions.length === 1 ? "single-insight" : ""}">
      <div class="insight-board-list">
        <div class="insight-board-head">
          <span>Problem</span>
          <span>Recommended Fix</span>
        </div>
        ${actions
          .map(
            (action, index) => `
              <div class="insight-board-row">
                <span class="insight-row-icon" aria-hidden="true">${premiumInsightIcon(index)}</span>
                <div>
                  <strong>${escapeHtml(action.title)}</strong>
                  <p>${escapeHtml(action.reason || action.evidence || "AI visibility dropped in this area.")}</p>
                </div>
                <div>
                  <strong>${escapeHtml(action.impact || "Priority recommendation")}</strong>
                  <p>${escapeHtml(buildPremiumActionSolution(action))}</p>
                </div>
              </div>
            `,
          )
          .join("")}
      </div>
      <aside class="insight-send-panel">
        <span class="send-orb" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 3 7v6c0 4.9 3.2 9.4 9 10 5.8-.6 9-5.1 9-10V7l-9-4Z" /></svg></span>
        <strong>Premium Reoptimization</strong>
        <p>${escapeHtml(premiumSummary)} We store the request on the backend and alert you by text if Twilio is configured.</p>
        <button class="email-button insight-send-button border-beam-button" type="button" id="premiumRequestButton" ${requestDisabled}>
          ${escapeHtml(requestLabel)}
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.8 19.4 12l-6.2 6.2-1.4-1.4 3.8-3.8H4v-2h11.6l-3.8-3.8 1.4-1.4Z" /></svg>
        </button>
      </aside>
    </article>
  `;
}

function getPremiumActions(scan) {
  return Array.isArray(scan?.metrics?.actions) ? scan.metrics.actions.slice(0, 5) : [];
}

function buildPremiumActionSolution(action) {
  const task = Array.isArray(action?.developerTasks) ? action.developerTasks[0] : "";
  return task || action?.reason || action?.evidence || "Strengthen the crawlable proof and customer-facing copy for this topic.";
}

function premiumInsightIcon(index) {
  const icons = [
    `<svg viewBox="0 0 24 24"><path d="M12 2 4 5v6.1c0 5 3.4 9.7 8 10.9 4.6-1.2 8-5.9 8-10.9V5l-8-3Z" /></svg>`,
    `<svg viewBox="0 0 24 24"><path d="m12 2 2.2 4.9L19 8l-3.6 3.2.9 4.8-4.3-2.5-4.3 2.5.9-4.8L5 8l4.8-1.1L12 2Z" /></svg>`,
    `<svg viewBox="0 0 24 24"><path d="M4 6h16v12H4zM7 9h10M7 12h7M7 15h5" /></svg>`,
    `<svg viewBox="0 0 24 24"><path d="M12 3a8 8 0 1 0 8 8h-3l4 4 4-4h-3a10 10 0 1 1-2.9-7.1L17.7 5A8 8 0 0 0 12 3Z" /></svg>`,
  ];
  return icons[index % icons.length];
}

async function requestPremiumInsights() {
  const scan = state.currentScan;
  const actions = getPremiumActions(scan);
  if (!scan || !actions.length) {
    setStatus("Run a completed scan before requesting premium reoptimization.", "error");
    return;
  }

  state.premiumRequestPending = true;
  renderPremiumInsights();
  try {
    const result = await fetchJson("/api/premium-request", {
      method: "POST",
      body: JSON.stringify({
        scanId: scan.id,
        businessName: scan.businessName,
        website: scan.website,
        summary: `Premium reoptimization requested for ${scan.businessName}.`,
        actions: actions.map((action) => ({
          title: action.title,
          impact: action.impact,
          reason: action.reason,
          evidence: action.evidence,
          tasks: Array.isArray(action.developerTasks) ? action.developerTasks : [],
        })),
      }),
    });
    const delivery = result?.delivery?.status === "sent" ? "Text alert sent." : "Saved in Supabase queue.";
    setStatus(`Premium request received. ${delivery}`, "ready");
    showToast("Premium reoptimization request saved.");
  } catch (error) {
    setStatus(error.message || "Could not submit the premium request.", "error");
  } finally {
    state.premiumRequestPending = false;
    renderPremiumInsights();
  }
}

function renderSentiment() {
  const sentimentGrid = els.sentimentGrid || document.querySelector("#sentimentGrid");
  if (!sentimentGrid) return;
  els.sentimentGrid = sentimentGrid;
  const scan = state.currentScan;
  if (!scan?.metrics?.completedAnswers) {
    sentimentGrid.innerHTML = emptyCard("No Sentiment Yet", "Run a scan to see Positive, Neutral, and Negative AI mention context.");
    return;
  }

  const mentions = scan.results.filter((result) => result.ownMentioned);
  const selectedSentiment = ["positive", "neutral", "negative"].includes(state.sentimentFilter) ? state.sentimentFilter : "";
  const sentimentMentions = mentions;
  const contextMentions = selectedSentiment ? mentions.filter((result) => result.sentiment === selectedSentiment) : mentions;
  const sentimentCounts = {
    positive: sentimentMentions.filter((result) => result.sentiment === "positive").length,
    neutral: sentimentMentions.filter((result) => result.sentiment === "neutral").length,
    negative: sentimentMentions.filter((result) => result.sentiment === "negative").length,
  };
  const rows = [
    { label: "Positive", value: sentimentCounts.positive, className: "positive" },
    { label: "Neutral", value: sentimentCounts.neutral, className: "neutral" },
    { label: "Negative", value: sentimentCounts.negative, className: "negative" },
  ];
  const total = sentimentMentions.length || 1;
  const positiveShare = percent(sentimentCounts.positive, total);
  const activeFilterIcon = selectedSentiment || "all";
  const sentimentPanelActive = document.querySelector("#sentiment")?.classList.contains("active");
  const shouldAnimateSentiment = sentimentPanelActive && state.sentimentAnimationScanId !== scan.id;

  sentimentGrid.innerHTML = `
    <article class="dashboard-card sentiment-overview-card ${shouldAnimateSentiment ? "animate-in" : ""}">
      <div class="sentiment-gauge" data-score="${positiveShare}" style="--score:${shouldAnimateSentiment ? 0 : positiveShare}; --score-deg:${(shouldAnimateSentiment ? 0 : positiveShare) * 1.8}deg">
        <div class="gauge-arc"></div>
        <strong data-animated-number="${positiveShare}">${shouldAnimateSentiment ? 0 : positiveShare}</strong>
        <span>Mention Sentiment</span>
      </div>
      <div class="sentiment-side">
        <div class="sentiment-bars">
          ${rows
            .map(
              (row) => `
                <button class="sentiment-bar-row ${row.className} ${selectedSentiment === row.className ? "active" : ""}" type="button" data-sentiment-filter="${escapeAttr(row.className)}">
                  <span class="sentiment-face ${row.className}" aria-hidden="true">${sentimentFaceIcon(row.className)}</span>
                  <span>${row.label}</span>
                  <strong>${row.value}</strong>
                  <div class="bar-track"><i style="--w:${percent(row.value, total)}%"></i></div>
                </button>
              `,
            )
            .join("")}
        </div>
      </div>
    </article>
    <div class="sentiment-lower-grid">
      <article class="dashboard-card sentiment-topic-card-wide">
        <div class="mention-context-head">
          <h2>Mention Context</h2>
          <label class="context-filter-control ${escapeAttr(activeFilterIcon)}">
            <span>Filter</span>
            <span class="context-filter-face" aria-hidden="true">${sentimentFaceIcon(activeFilterIcon)}</span>
            <select id="sentimentContextSelect">
              <option value="">All Sentiment</option>
              <option value="positive" ${selectedSentiment === "positive" ? "selected" : ""}>Positive</option>
              <option value="neutral" ${selectedSentiment === "neutral" ? "selected" : ""}>Neutral</option>
              <option value="negative" ${selectedSentiment === "negative" ? "selected" : ""}>Negative</option>
            </select>
          </label>
        </div>
        <div class="topic-sentiment-result">
          ${renderSelectedTopicSentiment(null, contextMentions, scan.businessName, selectedSentiment)}
        </div>
      </article>
    </div>
  `;

  const contextSelect = document.querySelector("#sentimentContextSelect");
  if (shouldAnimateSentiment) {
    animateMentionSentiment(scan.id);
  }
  contextSelect?.addEventListener("change", () => {
    state.sentimentFilter = contextSelect.value;
    renderSentiment();
    animateElements([
      document.querySelector(".topic-sentiment-result"),
    ]);
  });
  document.querySelectorAll("[data-sentiment-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.sentimentFilter = state.sentimentFilter === button.dataset.sentimentFilter ? "" : button.dataset.sentimentFilter;
      renderSentiment();
      animateElements([
        document.querySelector(".topic-sentiment-result"),
      ]);
    });
  });
}

function sentimentFaceIcon(kind) {
  if (kind === "all") {
    return `<svg viewBox="0 0 24 24"><path d="M4 6h16v3H4V6Zm0 5h16v3H4v-3Zm0 5h16v3H4v-3Z" /></svg>`;
  }
  if (kind === "negative") {
    return `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8 9.5a1.2 1.2 0 1 1 2.4 0A1.2 1.2 0 0 1 8 9.5Zm5.6 0a1.2 1.2 0 1 1 2.4 0 1.2 1.2 0 0 1-2.4 0ZM8 17c.7-1.8 2.1-2.8 4-2.8s3.3 1 4 2.8h-2c-.4-.7-1.1-1-2-1s-1.6.3-2 1H8Z" /></svg>`;
  }
  if (kind === "neutral") {
    return `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8 9.5a1.2 1.2 0 1 1 2.4 0A1.2 1.2 0 0 1 8 9.5Zm5.6 0a1.2 1.2 0 1 1 2.4 0 1.2 1.2 0 0 1-2.4 0ZM8 15h8v2H8v-2Z" /></svg>`;
  }
  return `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8 9.5a1.2 1.2 0 1 1 2.4 0A1.2 1.2 0 0 1 8 9.5Zm5.6 0a1.2 1.2 0 1 1 2.4 0 1.2 1.2 0 0 1-2.4 0ZM7.5 13h2a2.7 2.7 0 0 0 5 0h2a4.7 4.7 0 0 1-9 0Z" /></svg>`;
}

function animateMentionSentiment(scanId = "") {
  const gauge = document.querySelector(".sentiment-gauge");
  const number = document.querySelector("[data-animated-number]");
  const target = Number(number?.dataset.animatedNumber || 0);
  if (!gauge || !number || !Number.isFinite(target)) return;
  state.sentimentAnimationScanId = scanId;

  const duration = 900;
  const startedAt = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(target * eased);
    gauge.style.setProperty("--score", current);
    gauge.style.setProperty("--score-deg", `${current * 1.8}deg`);
    number.textContent = String(current);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderContextRankList(contextTypes) {
  const rows = contextTypes
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  if (!rows.length) {
    return `<article class="context-rank-row empty"><p>No clear mention context detected yet.</p></article>`;
  }

  return rows
    .map(
      (row, index) => `
        <article class="context-rank-row ${index === 0 ? "primary" : ""}">
          <span>${index + 1}</span>
          <div>
            <strong>${escapeHtml(row.label)}</strong>
            <p>Mentioned ${row.value} Time${row.value === 1 ? "" : "s"}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderSelectedTopicSentiment(row, mentions = [], businessName = "", sentiment = "") {
  if (!mentions.length) {
    const label = sentiment ? `${titleCaseLabel(sentiment)} mention context` : "mention context";
    return `<article class="topic-sentiment-empty"><p>No ${escapeHtml(label)} was found for this scan yet.</p></article>`;
  }

  const contextCards = buildTopicContextEvidence(mentions, sentiment, businessName).slice(0, 4);

  return `
    <article class="selected-topic-card">
      <div class="topic-context-leaderboard">
        ${
          contextCards.length
            ? contextCards
                .map(
                  (item, index) => `
                    <article class="topic-context-row ${index === 0 ? "primary" : ""}">
                      <span>${index + 1}</span>
                      <div>
                        <strong>${escapeHtml(item.label)}</strong>
                        <button class="context-info-button" type="button" aria-label="${escapeAttr(firstSentence(item.summary, 180))}">More information</button>
                        <p class="context-info-popover">${escapeHtml(firstSentence(item.summary, 180))}</p>
                      </div>
                    </article>
                  `,
                )
                .join("")
            : `<article class="topic-context-row"><span>1</span><div><strong>No ${escapeHtml(titleCaseLabel(sentiment || "Clear"))} Context Yet</strong></div></article>`
        }
      </div>
    </article>
  `;
}

function buildTopicSignals(mentions) {
  const definitions = [
    { label: "Trusted Community Presence", pattern: /trusted|reviews|reputable|local|established|experienced|recognized|well-established|community/i },
    { label: "Service Availability", pattern: /hours|timings|open|schedule|booking|availability|available|contact|appointment/i },
    { label: "Specific Service Fit", pattern: /pooja|puja|aarthi|aarti|darshan|festival|ritual|ceremony|class|program|service|offers|provides|specializ/i },
    { label: "Community Access", pattern: /community access|community|access|donation|non-profit|nonprofit|serving|families|devotees/i },
    { label: "Budget / Value Framing", pattern: /budget|affordable|low cost|value|cost|donation|payment/i },
    { label: "Limited Verification", pattern: /unclear|cannot verify|limited information|not enough|hard to tell/i },
  ];
  return definitions
    .map((definition) => ({
      label: definition.label,
      count: mentions.filter((result) => definition.pattern.test(`${result.answer} ${result.context}`)).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

function buildTopicContextEvidence(mentions, sentiment = "", businessName = "") {
  const definitionsBySentiment = {
    positive: [
      { label: "Trusted Community Presence", pattern: /trusted|reviews|reputable|local|established|experienced|recognized|well-established/i },
      { label: "Community And Family Access", pattern: /community|family|families|children|parents|devotees|members|accessible|welcoming/i },
      { label: "Religious Events And Poojas", pattern: /pooja|puja|aarthi|aarti|abhishekam|festival|ritual|ceremony|darshan|bhajan|katha/i },
      { label: "Classes And Programs", pattern: /class|classes|program|programs|cultural|language|sloka|gurukul|yoga|education/i },
      { label: "Specific Service Fit", pattern: /specializ|expert|focused|known for|good for|offers|provides|available/i },
    ],
    neutral: [
      { label: "Location Mention", pattern: /location|located|near|area|local|serves|serving/i },
      { label: "General Service Fit", pattern: /program|service|offer|provides|available|temple|foundation|business/i },
      { label: "Needs More Verifiable Proof", pattern: /may|might|could|appears|limited details|not clear|unclear/i },
      { label: "Listed As An Option", pattern: /mentioned|listed|option|consider|search/i },
    ],
    negative: [
      { label: "Cannot Verify Details", pattern: /unclear|cannot verify|could not verify|limited information|not enough|hard to tell|limited dedicated/i },
      { label: "Local Options Look Limited", pattern: /limited|larger areas|not local|not in|outside|few options/i },
      { label: "Not A Strong Recommendation", pattern: /not recommended|less relevant|not ideal|better option|instead|however/i },
      { label: "Pricing Or Value Concern", pattern: /expensive|costly|price|pricing|budget|value/i },
      { label: "Availability Is Unclear", pattern: /closed|unavailable|hours|booking|schedule|availability/i },
    ],
  };
  const definitions = definitionsBySentiment[sentiment] || [
    ...definitionsBySentiment.positive,
    ...definitionsBySentiment.neutral,
    ...definitionsBySentiment.negative,
  ];

  return definitions
    .map((definition) => {
      const matches = mentions.filter((result) => definition.pattern.test(result.answer || ""));
      return {
        label: definition.label,
        count: matches.length,
        summary: groundedSummaryForPattern(matches[0]?.answer || matches[0]?.context || "", definition.pattern, businessName || matches[0]?.businessName || ""),
      };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

function groundedSummaryForPattern(text, pattern, businessName = "") {
  const clean = String(text || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\bHowever,\s*I should note that\s*/gi, "")
    .replace(/\bHowever,\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "The answer did not provide enough wording to summarize this signal.";
  const boilerplate = /^(here are|based on|for the most current|would you like|is there a specific|my suggestion|note:|please note|i appreciate|i need to be straightforward|contact the|checking google|yelp|if you.d like)/i;
  const businessTokens = normalized(businessName).split(/\s+/).filter((token) => token.length > 3);
  const genericBusinessTokens = new Set(["hindu", "temple", "center", "centre", "church", "school", "clinic", "dental", "dentist", "foundation", "business", "services", "service"]);
  const distinctiveBusinessTokens = businessTokens.filter((token) => !genericBusinessTokens.has(token));
  const preferredBusinessTokens = distinctiveBusinessTokens.length ? distinctiveBusinessTokens : businessTokens;
  const sentences = (clean.match(/[^.!?]+[.!?]?/g) || [clean])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 18 && !boilerplate.test(sentence));
  const ownSentence = businessTokens.length
    ? sentences.find((sentence) => preferredBusinessTokens.some((token) => normalized(sentence).includes(token)) && pattern.test(sentence))
    : null;
  const businessSentence = businessTokens.length
    ? sentences.find((sentence) => preferredBusinessTokens.some((token) => normalized(sentence).includes(token)))
    : null;
  const match = ownSentence || businessSentence || sentences.find((sentence) => pattern.test(sentence));
  return (match || sentences[0] || clean)
    .replace(/^[-•]\s*/, "")
    .trim();
}

function buildMentionContextTypes(mentions) {
  const definitions = [
    { label: "Premium Option", pattern: /premium|high-end|luxury|specialist|advanced|boutique|best for/i },
    { label: "Budget / Value Option", pattern: /budget|affordable|low cost|cheap|value|financing|insurance/i },
    { label: "Urgent Option", pattern: /urgent|emergency|same-day|open today|after-hours|immediate/i },
    { label: "Trusted Local Option", pattern: /trusted|reputable|reviews|local|community|established|experienced/i },
    { label: "Specialty Fit", pattern: /specializ|expert|focused|known for|good for|offers/i },
    { label: "Unclear Or Risky", pattern: /unclear|cannot verify|could not verify|limited information|negative|concern|mixed/i },
  ];

  return definitions.map((definition) => ({
    label: definition.label,
    value: mentions.filter((result) => definition.pattern.test(`${result.answer} ${result.context}`)).length,
  }));
}

function buildSentimentByCategory(mentions) {
  const map = new Map();
  for (const result of mentions) {
    const row = map.get(result.category) || { category: result.category, positive: 0, neutral: 0, negative: 0 };
    if (result.sentiment === "negative") row.negative += 1;
    else if (result.sentiment === "neutral") row.neutral += 1;
    else row.positive += 1;
    map.set(result.category, row);
  }
  return [...map.values()].slice(0, 8);
}

function firstSentence(value, maxLength = 140) {
  const sentence = String(value || "")
    .split(/(?<=[.!?])\s+/)[0]
    .trim();
  if (sentence.length <= maxLength) return sentence;
  return `${sentence.slice(0, maxLength - 1).trim()}...`;
}

function titleCaseLabel(value) {
  return String(value || "")
    .split(/(\s+|\/|-)/)
    .map((part) => {
      if (/^\s+$|^\/$|^-$/.test(part)) return part;
      const lower = part.toLowerCase();
      if (["ai", "llm", "geo", "crm"].includes(lower)) return lower.toUpperCase();
      return lower ? lower[0].toUpperCase() + lower.slice(1) : lower;
    })
    .join("");
}

function renderEvidence() {
  if (!els.evidenceRows) return;
  const results = state.currentScan?.results || [];
  els.evidenceRows.innerHTML = results.length
    ? results
        .map(
          (result) => `
            <tr>
              <td><button class="text-button" type="button" data-result="${result.id}">${escapeHtml(result.prompt)}</button></td>
              <td>${escapeHtml(result.platformLabel)}<br /><small>${escapeHtml(result.model || "")}</small></td>
              <td>${formatDate(result.requestedAt)}</td>
              <td>${escapeHtml(result.location)}</td>
              <td>${result.rank ? `#${result.rank}` : "-"}</td>
              <td><span class="tag ${result.sentiment === "negative" ? "negative" : result.sentiment === "not mentioned" ? "warning" : ""}">${escapeHtml(result.sentiment)}</span></td>
              <td>${result.error ? `<span class="error-text">${escapeHtml(result.error)}</span>` : `${result.sources?.length || 0} source${result.sources?.length === 1 ? "" : "s"}`}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="7">No evidence records yet.</td></tr>`;

  els.evidenceRows.querySelectorAll("button[data-result]").forEach((button) => {
    button.addEventListener("click", () => showAnswer(button.dataset.result));
  });
}

function renderTrend() {
  const current = state.currentScan;
  const allScoredScans = state.scans.filter((scan) => isComparableScan(scan, current) && Number.isFinite(scan.metrics?.visibilityScore));
  const scanTimes = allScoredScans.map((scan) => new Date(scan.createdAt).getTime());
  const firstTime = Math.min(...scanTimes, Date.now());
  const latestTime = Math.max(...scanTimes, Date.now());
  const rangeDays = Number(state.trendRangeDays) || 7;
  const rangeMs = rangeDays * 24 * 60 * 60 * 1000;
  const isEarlyRange = latestTime - firstTime < rangeMs;
  const rangeStart = isEarlyRange ? firstTime : latestTime - rangeMs;
  const rangeEnd = isEarlyRange ? firstTime + rangeMs : latestTime;
  const scoredScans = allScoredScans
    .filter((scan) => new Date(scan.createdAt).getTime() >= rangeStart && new Date(scan.createdAt).getTime() <= rangeEnd)
    .slice(-12);
  if (!scoredScans.length) {
    els.trendChart.innerHTML = `<text x="24" y="112">No trend yet. Run a scan to start tracking.</text>`;
    if (els.trendLabel) els.trendLabel.textContent = "";
    return;
  }

  const width = 760;
  const height = 280;
  const pad = { top: 38, right: 20, bottom: 40, left: 54 };
  const rangeWidth = Math.max(1, rangeEnd - rangeStart);
  const points = scoredScans.map((scan) => {
    const time = new Date(scan.createdAt).getTime();
    const x = pad.left + ((time - rangeStart) / rangeWidth) * (width - pad.left - pad.right);
    const y = height - pad.bottom - (scan.metrics.visibilityScore / 100) * (height - pad.top - pad.bottom);
    return { x, y, scan };
  });

  const line = smoothPath(points);
  if (els.trendLabel) els.trendLabel.textContent = "";
  const baseY = height - pad.bottom;
  const area = `${line} L ${points.at(-1).x} ${baseY} L ${points[0].x} ${baseY} Z`;
  const startDate = new Date(rangeStart);
  const midDate = new Date(rangeStart + rangeWidth / 2);
  const endDate = new Date(rangeEnd);
  const gridRows = [100, 75, 50, 25, 0].map((value) => {
    const y = pad.top + ((100 - value) / 100) * (height - pad.top - pad.bottom);
    return `
      <line class="grid" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"></line>
      <text class="y-label" x="22" y="${y + 4}">${value}</text>
    `;
  }).join("");
  els.trendChart.innerHTML = `
    <defs>
      <linearGradient id="trendAreaGradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#1d4ed8" stop-opacity="0.16"></stop>
        <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.02"></stop>
      </linearGradient>
    </defs>
    ${gridRows}
    <path class="area" d="${area}"></path>
    <path class="line" d="${line}"></path>
    ${points.map((point) => `<circle class="dot" cx="${point.x}" cy="${point.y}" r="5"></circle>`).join("")}
    <text class="x-label" x="${pad.left}" y="${height - 7}">${formatShortDate(startDate)}</text>
    <text class="x-label" x="${width / 2}" y="${height - 7}" text-anchor="middle">${formatShortDate(midDate)}</text>
    <text class="x-label" x="${width - pad.right}" y="${height - 7}" text-anchor="end">${formatShortDate(endDate)}</text>
  `;
}

function isComparableScan(scan, current) {
  if (!scan || !current) return false;
  const scanHost = hostnameFor(scan.website || scan.hostname || "");
  const currentHost = hostnameFor(current.website || current.hostname || "");
  if (scanHost && currentHost) return scanHost === currentHost;
  return normalized(scan.businessName) === normalized(current.businessName);
}

function hostnameFor(value) {
  try {
    const host = value.includes("://") ? new URL(value).hostname : value;
    return host.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function smoothPath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = points[index - 1];
      const control = Math.max(18, Math.min(72, (point.x - previous.x) * 0.42));
      return `C ${previous.x + control} ${previous.y}, ${point.x - control} ${point.y}, ${point.x} ${point.y}`;
    })
    .join(" ");
}

function renderBarList(container, rows = [], labelKey, valueKey) {
  if (!rows.length) {
    container.innerHTML = `<div class="stack-item"><p>No citations yet.</p></div>`;
    return;
  }

  const max = Math.max(...rows.map((row) => row[valueKey]), 1);
  container.innerHTML = rows
    .slice(0, 5)
    .map(
      (row) => `
        <div class="bar-item">
          <span title="${escapeAttr(row[labelKey])}">${escapeHtml(row[labelKey])}</span>
          <strong>${row[valueKey]}</strong>
          <div class="bar-track"><i style="--w:${Math.max(8, (row[valueKey] / max) * 100)}%"></i></div>
        </div>
      `,
    )
    .join("");
}

function renderEmptyLists() {
  els.platformPills.innerHTML = "";
  if (els.categoryList) els.categoryList.innerHTML = emptyStack("No intent data yet.");
  if (els.overviewCompetitorList) els.overviewCompetitorList.innerHTML = emptyStack("Competitor share appears after completed AI answers.");
  if (els.factorList) els.factorList.innerHTML = emptyStack("Run a scan to learn why AI systems mention or skip the business.");
  if (els.sourceList) els.sourceList.innerHTML = emptyStack("No sources yet.");
  if (els.pageList) els.pageList.innerHTML = emptyStack("No cited pages yet.");
  renderActions([]);
}

function showAnswer(resultId) {
  const result = state.currentScan?.results.find((item) => item.id === resultId);
  if (!result) return;

  els.dialogContent.innerHTML = `
    <p class="eyebrow">${escapeHtml(result.platformLabel)} result</p>
    <h2>${escapeHtml(result.prompt)}</h2>
    <p><strong>Date/time:</strong> ${formatDate(result.requestedAt)} | <strong>Location:</strong> ${escapeHtml(result.location)} | <strong>Rank:</strong> ${result.rank ? `#${result.rank}` : "Not mentioned"}</p>
    <p><strong>Sentiment:</strong> ${escapeHtml(result.sentiment)} | <strong>Context:</strong> ${escapeHtml(result.context)}</p>
    <h3>Full answer</h3>
    <div class="answer-block">${escapeHtml(result.answer || result.error || "No answer returned.")}</div>
    <h3>Sources</h3>
    ${
      result.citations?.length
        ? `<ul>${result.citations.map((source) => `<li><a href="${escapeAttr(source)}" target="_blank" rel="noreferrer">${escapeHtml(source)}</a></li>`).join("")}</ul>`
        : "<p>No citations returned by this provider.</p>"
    }
    <h3>Mentioned businesses</h3>
    <p>${result.businesses?.length ? result.businesses.map(escapeHtml).join(", ") : "No business list could be parsed from the answer."}</p>
  `;
  els.answerDialog.showModal();
}

function setScanning(isScanning, auto = false) {
  state.isScanning = isScanning;
  if (isScanning) {
    state.scanStartedAt = Date.now();
    state.trackingProgressStartedAt = Date.now();
    startTrackingLaunchProgress({ fromStart: true });
    if (els.statusStrip) {
      els.statusStrip.hidden = false;
      els.statusText.textContent = auto
        ? "We are doing your scan now. This can take a few minutes."
        : "Scanning the site, using your location and industry for prompts, and checking AI answers. This can take a few minutes.";
      els.statusStrip.classList.remove("ready", "error");
    }
    clearTimeout(state.longScanTimer);
    state.longScanTimer = setTimeout(() => {
      const configured = state.config ? Object.values(state.config.providers).filter((provider) => provider.configured).length : 0;
      const promptCount = state.config?.limits?.maxScanPrompts || 12;
      const estimate = Math.max(2, Math.ceil((promptCount * Math.max(configured, 1) * 8) / 60));
      setStatus(`Still scanning. This can take about ${estimate} minutes for a full site scan. You can keep working in the meantime.`, "working");
    }, 60000);
  } else {
    clearTimeout(state.longScanTimer);
    state.longScanTimer = null;
  }
  renderSetupVisibility();
  els.runButton.disabled = isScanning;
  els.runButton.innerHTML = isScanning
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v4a6 6 0 1 1-6 6H2a10 10 0 1 0 10-10Z" /></svg>Scanning`
    : `Start Scan`;
  els.propertyBar?.classList.toggle("is-scanning", isScanning);
}

function setStatus(text, type = "working") {
  els.statusStrip.hidden = false;
  els.statusText.textContent = text;
  els.statusStrip.classList.toggle("ready", type === "ready");
  els.statusStrip.classList.toggle("error", type === "error");
}

function bindPasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordToggle || "");
      if (!(input instanceof HTMLInputElement)) return;
      const shouldShow = input.type === "password";
      input.type = shouldShow ? "text" : "password";
      button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
      button.innerHTML = shouldShow
        ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 4.3 17.2 15.4-1.5 1.6-3.2-2.9a11.4 11.4 0 0 1-3.5.6C5.4 19 1.5 12.5 1.5 12a20 20 0 0 1 4.2-4.7L1.5 5.9 3 4.3Zm5.1 4.5A4 4 0 0 0 12 16a4 4 0 0 0 1.7-.4l-1.8-1.6c-.8.2-1.7-.1-2.2-.9L8.1 8.8Zm3.9-3.3c6.6 0 10.5 6.5 10.5 6.5a19 19 0 0 1-4.7 5l-1.6-1.4A16.6 16.6 0 0 0 19.9 12c-1-1.3-3.9-4.3-7.9-4.3-.9 0-1.8.1-2.7.4L7.6 6.5c1.4-.6 2.9-1 4.4-1Z" /></svg>`
        : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.5 12s3.9-6.5 10.5-6.5S22.5 12 22.5 12 18.6 18.5 12 18.5 1.5 12 1.5 12Zm10.5 4a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-2.2a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6Z" /></svg>`;
    });
  });
}

function providerLabel(key) {
  return state.config?.providers?.[key]?.label || key;
}

function emptyCard(title, body) {
  return `<article class="prompt-card"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></article>`;
}

function emptyStack(body) {
  return `<article class="stack-item"><p>${escapeHtml(body)}</p></article>`;
}

function factorIcon(kind) {
  return kind === "warning"
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z" /></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 15.2 7.4-7.4 1.4 1.4L10 18 5.2 13.2l1.4-1.4L10 15.2Z" /></svg>`;
}

function summarizeContexts(results) {
  const mentioned = results.filter((result) => result.ownMentioned);
  if (!mentioned.length) return "The business was not mentioned in completed answers.";
  const contexts = [...new Set(mentioned.map((result) => result.context))].slice(0, 2);
  return contexts.join(" ");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(apiUrl(url), {
    ...options,
    headers: authJsonHeaders(options.headers || {}),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function percent(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

function valueOrDash(value) {
  return value === null || value === undefined ? "-" : value;
}

function initialsFor(name) {
  return String(name || "")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalized(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameBusinessName(a, b) {
  const rawClean = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const clean = (value) =>
    rawClean(value)
      .replace(/\b(llc|inc|co|company|group|studio|practice|foundation|clinic|center|centre)\b/g, "")
      .trim();
  const acronym = (value) =>
    rawClean(value)
      .split(/\s+/)
      .filter((part) => part && !["llc", "inc", "co", "company", "group", "studio", "practice", "foundation", "clinic", "center", "centre"].includes(part))
      .map((part) => part[0])
      .join("");
  const left = clean(a);
  const right = clean(b);
  const leftAcronym = acronym(a);
  const rightAcronym = acronym(b);
  return Boolean(
    left &&
      right &&
      (left === right ||
        left.includes(right) ||
        right.includes(left) ||
        (left.length <= 5 && left === rightAcronym) ||
        (right.length <= 5 && right === leftAcronym)),
  );
}

function formatDelta(value, suffix = "") {
  if (!Number.isFinite(value)) return "no measured change";
  if (value === 0) return `+0${suffix}`;
  return `${value > 0 ? "+" : ""}${value}${suffix}`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
