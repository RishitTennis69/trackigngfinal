import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const SCANS_FILE = path.join(DATA_DIR, "scans.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const SERVICE_REQUESTS_FILE = path.join(DATA_DIR, "service-requests.json");
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

loadDotEnv();

const PORT = Number(process.env.PORT || 4173);
const IS_PRODUCTION = String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";
const HOST = cleanText(process.env.HOST || "") || (IS_PRODUCTION ? "0.0.0.0" : "127.0.0.1");
const APP_BASE_URL = cleanText(process.env.APP_BASE_URL || "");
const OPENROUTER_HTTP_REFERER = cleanText(process.env.OPENROUTER_HTTP_REFERER || APP_BASE_URL || "");
const ALLOWED_ORIGINS = new Set(
  [
    APP_BASE_URL,
    "https://trackigngfinal.vercel.app",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
  ]
    .map((value) => cleanText(value || "").replace(/\/$/, ""))
    .filter(Boolean),
);
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_PROJECT_MODE = String(process.env.SUPABASE_PROJECT_MODE || "legacy").trim().toLowerCase();
const USE_SHARED_SUPABASE = USE_SUPABASE && SUPABASE_PROJECT_MODE === "shared";
const ENTITLEMENT_ALLOWED_STATUSES = String(process.env.ENTITLEMENT_ALLOWED_STATUSES || "active,trialing")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const PREMIUM_ENTITLEMENT_PLANS = String(process.env.PREMIUM_ENTITLEMENT_PLANS || "gleo-premium,gleo-reoptimization,tracking-premium")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const MAX_CRAWL_PAGES = clamp(Number(process.env.MAX_CRAWL_PAGES || 8), 1, 16);
const MAX_SCAN_PROMPTS = clamp(Number(process.env.MAX_SCAN_PROMPTS || 18), 1, 18);
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || "";
const TWILIO_TO_NUMBER = process.env.TWILIO_TO_NUMBER || "";
const ADMIN_DASHBOARD_PATH = normalizeAdminDashboardPath(process.env.ADMIN_DASHBOARD_PATH || "");
const ADMIN_EMAIL = cleanText(process.env.ADMIN_EMAIL || process.env.RESEND_DEVELOPER_EMAIL || "").toLowerCase();
const ADMIN_PASSWORD_HASH = resolveAdminPasswordHash();
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_DASHBOARD_KEY || "";
const ADMIN_DASHBOARD_ENABLED = Boolean(ADMIN_DASHBOARD_PATH && ADMIN_EMAIL && ADMIN_PASSWORD_HASH && ADMIN_SESSION_SECRET);
const ADMIN_SESSION_COOKIE = "gleo_admin_session";
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const PROVIDERS = {
  openai: {
    label: "ChatGPT",
    keyName: "OPENAI_API_KEY",
    model: process.env.OPENAI_MODEL || "gpt-5-nano",
  },
  gemini: {
    label: "Gemini",
    keyName: "GEMINI_API_KEY",
    model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
  },
  openrouter: {
    label: "Claude",
    keyName: "OPENROUTER_API_KEY",
    model: process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5",
  },
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const server = http.createServer(async (request, response) => {
  const corsHeaders = buildCorsHeaders(request);
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders);
      response.end();
      return;
    }

    if (url.pathname === "/api/auth/signup" && request.method === "POST") {
      const payload = await readJsonBody(request);
      const validationError = validateUserPayload(payload);
      if (validationError) return sendJson(response, { error: validationError }, 400, corsHeaders);
      const user = await createUser(payload);
      const token = await createSession(user.id);
      return sendJson(response, { user: publicUser(user), token }, 200, corsHeaders);
    }

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      const payload = await readJsonBody(request);
      const name = cleanText(payload?.name || "");
      const email = cleanText(payload?.email || "").toLowerCase();
      const password = String(payload?.password || "");
      if (!name) return sendJson(response, { error: "Enter your full name." }, 400, corsHeaders);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return sendJson(response, { error: "Enter a valid email address." }, 400, corsHeaders);
      }
      if (!password) return sendJson(response, { error: "Enter your password." }, 400, corsHeaders);
      await ensureUserHasAccess({ email });
      const user = USE_SHARED_SUPABASE ? await readSharedUserByEmail(email) : (await readUsers()).find((entry) => entry.email.toLowerCase() === email);
      if (!user) return sendJson(response, { error: "No account found for that email. Sign up first." }, 404, corsHeaders);
      if (normalized(user.name) !== normalized(name)) {
        return sendJson(response, { error: "The name does not match this account." }, 401, corsHeaders);
      }
      if (!verifyPassword(password, user.passwordHash || "")) {
        return sendJson(response, { error: "Incorrect password." }, 401, corsHeaders);
      }
      const token = await createSession(user.id);
      return sendJson(response, { user: publicUser(user), token }, 200, corsHeaders);
    }

    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      const user = await getAuthenticatedUser(request);
      if (!user) return sendJson(response, { error: "Not authenticated." }, 401, corsHeaders);
      await ensureUserHasAccess(user);
      return sendJson(response, { user: publicUser(user) }, 200, corsHeaders);
    }

    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      const token = extractAuthToken(request);
      if (token) await deleteSession(token);
      return sendJson(response, { ok: true }, 200, corsHeaders);
    }

    if (url.pathname === "/api/config" && request.method === "GET") {
      return sendJson(response, await getConfig(), 200, corsHeaders);
    }

    if (url.pathname === "/api/scans" && request.method === "GET") {
      const user = await getAuthenticatedUser(request);
      if (!user) return sendJson(response, { scans: [] }, 200, corsHeaders);
      await ensureUserHasAccess(user);
      return sendJson(response, { scans: await readScans(user.id) }, 200, corsHeaders);
    }

    if (url.pathname === "/api/scans/latest" && request.method === "GET") {
      const user = await getAuthenticatedUser(request);
      if (!user) return sendJson(response, { scan: null }, 200, corsHeaders);
      await ensureUserHasAccess(user);
      const scans = await readScans(user.id);
      return sendJson(response, { scan: scans.at(-1) || null }, 200, corsHeaders);
    }

    if (url.pathname === "/api/scan" && request.method === "POST") {
      const user = await getAuthenticatedUser(request);
      if (!user) return sendJson(response, { error: "Sign in before running a scan." }, 401, corsHeaders);
      await ensureUserHasAccess(user);
      const payload = await readJsonBody(request);
      const scans = await readScans(user.id);
      const scan = await runScan(payload, scans);
      await appendScanForUser(user.id, scan);
      return sendJson(response, { scan }, 200, corsHeaders);
    }

    if (url.pathname === "/api/premium-request" && request.method === "POST") {
      const user = await getAuthenticatedUser(request);
      if (!user) return sendJson(response, { error: "Sign in before requesting premium help." }, 401, corsHeaders);
      const payload = await readJsonBody(request);
      const requestRecord = await createPremiumServiceRequest(user, payload);
      return sendJson(response, {
        ok: true,
        requestId: requestRecord.id,
        delivery: requestRecord.delivery,
      }, 200, corsHeaders);
    }

    if (url.pathname === "/api/admin/overview" && request.method === "GET") {
      if (!ADMIN_DASHBOARD_ENABLED) {
        return sendText(response, "Not found", 404);
      }
      if (!getAuthenticatedAdmin(request)) {
        return sendText(response, "Not found", 404);
      }
      return sendJson(response, await getAdminOverview());
    }

    if (url.pathname === "/api/admin/login" && request.method === "POST") {
      if (!ADMIN_DASHBOARD_ENABLED) {
        return sendText(response, "Not found", 404);
      }
      const payload = await readJsonBody(request);
      const email = cleanText(payload?.email || "").toLowerCase();
      const password = String(payload?.password || "");
      if (!email || !password) {
        return sendJson(response, { error: "Enter your admin email and password." }, 400);
      }
      if (email !== ADMIN_EMAIL || !verifyPassword(password, ADMIN_PASSWORD_HASH)) {
        return sendJson(response, { error: "Incorrect admin login." }, 401);
      }
      return sendJson(
        response,
        { ok: true, admin: { email: ADMIN_EMAIL } },
        200,
        { "Set-Cookie": createAdminSessionCookie(ADMIN_EMAIL) },
      );
    }

    if (url.pathname === "/api/admin/me" && request.method === "GET") {
      if (!ADMIN_DASHBOARD_ENABLED) {
        return sendText(response, "Not found", 404);
      }
      const admin = getAuthenticatedAdmin(request);
      if (!admin) return sendJson(response, { authenticated: false }, 401);
      return sendJson(response, { authenticated: true, admin });
    }

    if (url.pathname === "/api/admin/logout" && request.method === "POST") {
      if (!ADMIN_DASHBOARD_ENABLED) {
        return sendText(response, "Not found", 404);
      }
      return sendJson(response, { ok: true }, 200, { "Set-Cookie": clearAdminSessionCookie() });
    }

    if (isBlockedPublicAdminPath(url.pathname)) {
      return sendText(response, "Not found", 404);
    }

    return serveStatic(url.pathname, response);
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      console.warn(error.message);
    } else {
      console.error(error);
    }
      return sendJson(
        response,
        {
          error: error.message || "Something went wrong while running the scan.",
        },
      error.statusCode || 500,
      corsHeaders,
      );
  }
});

server.listen(PORT, HOST, () => {
  const displayUrl = APP_BASE_URL || `http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/`;
  console.log(`Gleo GEO Insights running at ${displayUrl}`);
});

async function runScan(payload, previousScans = []) {
  const website = normalizeUrl(payload.website);
  const selectedPlatforms = normalizePlatforms(payload.platforms);
  const businessName = cleanText(payload.businessName || "") || inferNameFromUrl(website);
  const submittedLocation = cleanText(payload.location || "");
  const configuredPlatforms = selectedPlatforms.filter((platform) => isProviderConfigured(platform));
  const startedAt = new Date().toISOString();
  const crawledSite = await crawlSite(website);
  const site = await enrichSiteWithAIProfile({ site: crawledSite, businessName, location: submittedLocation || "United States" });
  const location = submittedLocation || firstMeaningfulArea(site.searchAreas) || site.detectedLocations?.[0] || "United States";
  site.searchAreas = buildSearchAreas(location, [...(site.searchAreas || []), ...(site.detectedLocations || [])]);
  const prompts = buildPromptSet({ site, businessName, location }).slice(0, MAX_SCAN_PROMPTS);
  const promptStrategy = buildPromptStrategy({ site, prompts, businessName, location });

  const results = [];

  for (const prompt of prompts) {
    for (const platform of configuredPlatforms) {
      const started = new Date().toISOString();
      try {
      const providerResult = await askProvider(platform, {
        prompt: prompt.text,
        businessName,
        location,
        site,
      });
      if (!cleanText(providerResult.answer || "")) {
        const incompleteReason = providerResult.rawMeta?.incomplete?.reason;
        throw new Error(
          incompleteReason
            ? `${PROVIDERS[platform].label} returned no answer text (${incompleteReason}).`
            : `${PROVIDERS[platform].label} returned no answer text.`,
        );
      }
      results.push(
        analyzeAnswer({
            ...providerResult,
            id: makeId(),
            promptId: prompt.id,
            prompt: prompt.text,
            category: prompt.category,
            platform,
            platformLabel: PROVIDERS[platform].label,
            model: PROVIDERS[platform].model,
            requestedAt: started,
            location,
            businessName,
            website,
          }),
        );
      } catch (error) {
        results.push({
          id: makeId(),
          promptId: prompt.id,
          prompt: prompt.text,
          category: prompt.category,
          platform,
          platformLabel: PROVIDERS[platform].label,
          model: PROVIDERS[platform].model,
          requestedAt: started,
          location,
          answer: "",
          citations: [],
          sources: [],
          businesses: [],
          ownMentioned: false,
          rank: null,
          sentiment: "unknown",
          context: "The provider call failed.",
          error: error.message || "Provider call failed.",
        });
      }
    }
  }

  const metrics = buildMetrics({ results, prompts, site, businessName, website, previousScans });

  return {
    id: makeId(),
    createdAt: startedAt,
    website,
    hostname: new URL(website).hostname,
    businessName,
    location,
    requestedPlatforms: selectedPlatforms,
    configuredPlatforms,
    missingPlatforms: selectedPlatforms.filter((platform) => !isProviderConfigured(platform)),
    site,
    promptStrategy,
    prompts,
    results,
    metrics,
  };
}

async function crawlSite(startUrl) {
  const origin = new URL(startUrl).origin;
  const visited = new Set();
  const pages = [];
  const queue = [startUrl];

  while (queue.length && pages.length < MAX_CRAWL_PAGES) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;
    visited.add(url);

    try {
      const html = await fetchText(url, 14000);
      const page = extractPage(url, html);
      if (page.text.length < 120 && pages.length > 0) continue;
      pages.push(page);

      const links = extractLinks(url, html)
        .filter((link) => link.startsWith(origin))
        .filter((link) => !visited.has(link))
        .filter(isLikelyContentPage)
        .sort((a, b) => linkScore(b) - linkScore(a));

      for (const link of links) {
        if (!queue.includes(link) && queue.length < MAX_CRAWL_PAGES * 3) queue.push(link);
      }
    } catch (error) {
      if (pages.length === 0) {
        throw new Error(`Could not fetch ${url}: ${error.message}`);
      }
    }
  }

  const text = pages.map((page) => `${page.title} ${page.description} ${page.headings.join(" ")} ${page.text}`).join(" ");
  const keywords = extractKeywords(text);
  const vertical = inferVertical(text, startUrl);
  const services = inferServices(text, vertical);
  const detectedLocations = inferLocations(text);

  return {
    startUrl,
    pages,
    pageCount: pages.length,
    keywords,
    vertical,
    services,
    detectedLocations,
    crawledAt: new Date().toISOString(),
  };
}

function extractPage(url, html) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  const title = decodeEntities(matchFirst(withoutScripts, /<title[^>]*>([\s\S]*?)<\/title>/i));
  const description = decodeEntities(
    matchFirst(withoutScripts, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
      matchFirst(withoutScripts, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i),
  );
  const headings = [...withoutScripts.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => cleanText(stripTags(match[1])))
    .filter(Boolean)
    .slice(0, 14);

  const text = cleanText(decodeEntities(stripTags(withoutScripts))).slice(0, 8500);

  return {
    url,
    title: cleanText(title),
    description: cleanText(description),
    headings,
    text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
}

function extractLinks(baseUrl, html) {
  return [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => {
      try {
        const url = new URL(match[1], baseUrl);
        url.hash = "";
        url.search = "";
        return url.toString().replace(/\/$/, "");
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function isLikelyContentPage(url) {
  const lower = url.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|mov|css|js)$/i.test(lower)) return false;
  if (/(facebook|instagram|linkedin|twitter|x\.com|youtube|mailto:|tel:)/i.test(lower)) return false;
  return true;
}

function linkScore(url) {
  const lower = url.toLowerCase();
  let score = 0;
  for (const token of ["service", "about", "faq", "contact", "location", "pricing", "emergency", "reviews", "new-patient"]) {
    if (lower.includes(token)) score += 5;
  }
  return score - lower.length / 100;
}

async function enrichSiteWithAIProfile({ site, businessName, location }) {
  const searchAreas = buildSearchAreas(location, site.detectedLocations);
  const fallback = {
    ...site,
    searchAreas,
    aiProfile: null,
    aiPromptGroups: null,
  };

  if (!isProviderConfigured("openai")) return fallback;

  const pageDigest = site.pages
    .slice(0, 6)
    .map((page) => {
      const title = page.title || new URL(page.url).pathname || "Page";
      const headings = page.headings.slice(0, 6).join("; ");
      const text = page.text.slice(0, 1200);
      return `URL: ${page.url}\nTitle: ${title}\nDescription: ${page.description}\nHeadings: ${headings}\nText: ${text}`;
    })
    .join("\n\n---\n\n");

  const systemPrompt = [
    "Analyze the crawled website for GEO/AI visibility tracking.",
    "Return JSON only. Do not wrap it in markdown.",
    "Infer the actual business category from the page content. Do not rely on a fixed vertical list.",
    "Create realistic customer prompts for AI visibility checks. Prompts must match the business, not a prior example.",
    "Use a mix of the exact city, nearby cities/service areas, and broader regional wording when it makes sense.",
    "Each prompt group should contain three prompts that test the same user intent with local/regional wording variation.",
  ].join(" ");

  const userPrompt = {
    businessName,
    submittedLocation: location,
    suggestedSearchAreas: searchAreas,
    heuristicProfile: {
      vertical: site.vertical,
      services: site.services,
      keywords: site.keywords.slice(0, 12),
      detectedLocations: site.detectedLocations,
    },
    expectedJsonShape: {
      vertical: {
        label: "short industry/category, e.g. Hindu temple, pediatric dentist, acupuncture clinic",
        specialty: "primary service phrase",
        customer: "real customer/devotee/patient/user group",
        urgent: false,
        priceLanguage: "natural cost/value/donation prompt phrase using a local area",
      },
      services: ["3 to 6 concrete services from the site"],
      customerTypes: ["2 to 5 audience/customer groups"],
      searchAreas: ["exact city", "nearby city or neighborhood", "broader region"],
      promptGroups: [
        {
          category: "Business-specific category name",
          prompts: ["same intent prompt 1", "same intent prompt 2", "same intent prompt 3"],
          intent: "what this measures",
          reason: "why this matters",
        },
      ],
    },
    pageDigest,
  };

  try {
    const data = await postJson(
      "https://api.openai.com/v1/responses",
      {
        model: PROVIDERS.openai.model,
        input: `${systemPrompt}\n\n${JSON.stringify(userPrompt, null, 2)}`,
        max_output_tokens: 1800,
        reasoning: { effort: "minimal" },
      },
      { Authorization: `Bearer ${process.env[PROVIDERS.openai.keyName]}` },
    );
    const profile = parseJsonObject(extractOpenAIText(data));
    const vertical = normalizeAIVertical(profile?.vertical, site.vertical);
    const services = normalizeAIList(profile?.services, site.services).slice(0, 6);
    const aiSearchAreas = normalizeAIList(profile?.searchAreas, searchAreas);
    const mergedSearchAreas = buildSearchAreas(location, [...aiSearchAreas, ...site.detectedLocations]);
    const aiPromptGroups = normalizeAIPromptGroups(profile?.promptGroups, mergedSearchAreas, location);

    return {
      ...site,
      vertical,
      services: services.length ? services : site.services,
      searchAreas: mergedSearchAreas,
      aiProfile: {
        customerTypes: normalizeAIList(profile?.customerTypes, [vertical.customer]).slice(0, 5),
        generatedAt: new Date().toISOString(),
      },
      aiPromptGroups: aiPromptGroups.length ? aiPromptGroups : null,
    };
  } catch (error) {
    console.warn(`AI site analysis failed; using heuristic profile: ${error.message}`);
    return fallback;
  }
}

function buildPromptSet({ site, businessName, location }) {
  if (Array.isArray(site.aiPromptGroups) && site.aiPromptGroups.length) {
    return site.aiPromptGroups.flatMap((group) => {
      const prompts = Array.isArray(group.prompts) && group.prompts.length ? group.prompts : [group.prompt].filter(Boolean);
      const repeatedPrompt = cleanText(prompts[0] || group.prompt || "");
      return repeatPrompt(repeatedPrompt, 3).map((text, index) => ({
        id: makeId(),
        category: cleanText(group.category || "AI visibility"),
        text,
        runIndex: index + 1,
        intent: cleanText(group.intent || "Measure AI visibility for a realistic customer query."),
        locationVariant: inferPromptLocation(text, site.searchAreas, location),
        reason: cleanText(group.reason || "Generated from the site crawl and business profile."),
        businessName,
        generatedFrom: "AI site analysis",
      }));
    });
  }

  const vertical = site.vertical.label;
  const service = site.services[0] || site.vertical.specialty || vertical;
  const searchAreas = site.searchAreas?.length ? site.searchAreas : buildSearchAreas(location, site.detectedLocations);
  const nearby = searchAreas[0] || location;
  const secondaryLocation = searchAreas.find((item) => item !== nearby) || searchAreas[1] || "near me";
  const secondaryNearPhrase = secondaryLocation === "near me" ? "near me" : `near ${secondaryLocation}`;
  const regionalLocation = searchAreas.find((item) => /area|county|valley|bay/i.test(item)) || secondaryLocation;
  const customer = site.vertical.customer || "customers";
  const specialty = site.services[1] || service;
  const thirdService = site.services[2] || specialty;
  const availabilityPhrase = site.vertical.urgent
    ? `urgent ${service} near me open today in ${location}`
    : `${service} available for ${customer} in ${location}`;
  const availabilityCategory = site.vertical.urgent ? "Urgent availability" : "Availability / scheduling";
  const pricePhrase = (site.vertical.priceLanguage || `cost of ${service} near ${location}`).replace(/\bnear me\b/i, `near ${location}`);
  const topicGroups = [
    {
      category: `Top ${vertical} recommendations`,
      prompts: [
        `best ${vertical} in ${location}`,
        `best ${vertical} near ${secondaryLocation}`,
        `best ${vertical} in the ${regionalLocation}`,
      ],
      intent: "Find the most recommended provider",
      reason: `Tests whether AI systems include the business when customers ask for the best ${vertical} nearby.`,
    },
    {
      category: "Cost / value",
      prompts: [
        pricePhrase,
        pricePhrase,
        pricePhrase,
      ],
      intent: "Compare price and payment confidence",
      reason: "Checks whether price, eligibility, payment, or value signals are clear enough to be recommended.",
    },
    {
      category: availabilityCategory,
      prompts: [
        availabilityPhrase,
        availabilityPhrase,
        availabilityPhrase,
      ],
      intent: site.vertical.urgent ? "Find immediate availability" : "Find availability or next steps",
      reason: site.vertical.urgent
        ? "Looks for verified same-day, emergency, after-hours, or open-today availability."
        : "Looks for clear scheduling, enrollment, booking, eligibility, or contact information.",
    },
    {
      category: "Trust / proof",
      prompts: [
        `trusted ${vertical} for ${customer} near ${location}`,
        `trusted ${vertical} for ${customer} near ${secondaryLocation}`,
        `trusted ${vertical} for ${customer} in the ${regionalLocation}`,
      ],
      intent: "Evaluate trust for a careful buyer",
      reason: "Tests reviews, credentials, proof points, and customer-fit claims.",
    },
    {
      category: `${capitalizeWords(service)} visibility`,
      prompts: [
        `best ${service} near ${location}`,
        `best ${service} near ${secondaryLocation}`,
        `best ${service} in the ${regionalLocation}`,
      ],
      intent: `Find a specific ${service} option`,
      reason: `Checks whether the business is associated with its most important ${service} searches.`,
    },
    {
      category: "Local discovery",
      prompts: [
        `${vertical} near ${nearby} that ${customer} recommend`,
        `${vertical} near ${secondaryNearPhrase.replace(/^near /, "")} that ${customer} recommend`,
        `${vertical} in the ${regionalLocation} that ${customer} recommend`,
      ],
      intent: "Test local-area and neighborhood coverage",
      reason: `Tests whether the business appears when customers search for ${vertical} options around the target area.`,
    },
  ];

  return topicGroups.flatMap((group) =>
    repeatPrompt(group.prompts[0], 3).map((text, index) => ({
      id: makeId(),
      category: group.category,
      text,
      runIndex: index + 1,
      intent: group.intent,
      locationVariant: text.includes(secondaryLocation) ? secondaryLocation : location,
      reason: group.reason,
      businessName,
      generatedFrom: "site crawl",
    })),
  );
}

function repeatPrompt(prompt, count = 3) {
  const text = cleanText(prompt);
  return Array.from({ length: count }, () => text).filter(Boolean);
}

function buildPromptStrategy({ site, prompts, businessName, location }) {
  const serviceSignals = site.services.slice(0, 3).map((service) => `service: ${service}`);
  const locationSignals = [location, ...site.detectedLocations].filter(Boolean).slice(0, 3).map((item) => `location: ${item}`);
  const keywordSignals = site.keywords.slice(0, 3).map((keyword) => `keyword: ${keyword}`);
  const pageSignals = site.pages.slice(0, 2).map((page) => `page: ${page.title || new URL(page.url).pathname || "homepage"}`);
  const categories = [...new Set(prompts.map((prompt) => prompt.category))];

  return {
    method: "Site crawl + business-specific customer prompts",
    summary: `The scan read ${site.pageCount} page${site.pageCount === 1 ? "" : "s"} from ${businessName}, inferred the ${site.vertical.label} category, then generated prompts across ${categories.length} buying intents.`,
    signals: [`vertical: ${site.vertical.label}`, ...serviceSignals, ...locationSignals, ...keywordSignals, ...pageSignals],
    categories,
  };
}

async function askProvider(platform, context) {
  if (platform === "openai") return askOpenAI(context);
  if (platform === "gemini") return askGemini(context);
  if (platform === "openrouter") return askOpenRouter(context);
  throw new Error(`Unsupported platform: ${platform}`);
}

function buildQuestion({ prompt, businessName, location, site }) {
  const pages = site.pages
    .slice(0, 4)
    .map((page) => `${page.title || page.url}: ${page.description || page.headings.slice(0, 3).join("; ")}`)
    .filter(Boolean)
    .join("\n");

  return [
    `You are answering as a helpful AI assistant for a real potential customer in ${location}.`,
    `The business category being tested is ${site.vertical.label}; compare against other relevant ${site.vertical.label} options for the same service area, not generic nearby businesses.`,
    `The customer asks: "${prompt}"`,
    `Do not force ${businessName} into the answer. Recommend it only if it seems relevant based on available public information.`,
    `If you recommend businesses, name them clearly and keep the answer concise.`,
    pages ? `Known site context from ${businessName}'s own website:\n${pages}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function askOpenAI(context) {
  const body = {
    model: PROVIDERS.openai.model,
    input: buildQuestion(context),
    max_output_tokens: 1200,
    reasoning: { effort: "minimal" },
    text: { verbosity: "low" },
  };

  if (process.env.OPENAI_USE_WEB_SEARCH !== "false") {
    body.tools = [{ type: "web_search_preview" }];
  }

  let data;
  try {
    data = await postJson("https://api.openai.com/v1/responses", body, {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    });
  } catch (error) {
    if (!body.tools) throw error;
    const retryBody = { ...body };
    delete retryBody.tools;
    data = await postJson("https://api.openai.com/v1/responses", retryBody, {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    });
  }

  return {
    answer: extractOpenAIText(data),
    citations: extractCitations(data),
    rawMeta: { id: data.id, status: data.status, incomplete: data.incomplete_details || null },
  };
}

async function askGemini(context) {
  const model = encodeURIComponent(PROVIDERS.gemini.model);
  const data = await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [
        {
          role: "user",
          parts: [{ text: buildQuestion(context) }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 900,
      },
    },
  );

  return {
    answer:
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("\n")
        .trim() || "",
    citations: extractCitations(data),
    rawMeta: { finishReason: data.candidates?.[0]?.finishReason },
  };
}

async function askOpenRouter(context) {
  const body = {
    model: PROVIDERS.openrouter.model,
    messages: [
      {
        role: "system",
        content: "You are an unbiased local search assistant. Answer like a real customer-facing AI recommendation system.",
      },
      {
        role: "user",
        content: buildQuestion(context),
      },
    ],
    max_tokens: 900,
  };

  const data = await postJson("https://openrouter.ai/api/v1/chat/completions", body, {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    ...(OPENROUTER_HTTP_REFERER ? { "HTTP-Referer": OPENROUTER_HTTP_REFERER } : {}),
    "X-Title": "Gleo GEO Insights",
  });

  const citations = [
    ...(Array.isArray(data.citations) ? data.citations : []),
    ...(Array.isArray(data.search_results) ? data.search_results.map((item) => item.url).filter(Boolean) : []),
  ];

  return {
    answer: data.choices?.[0]?.message?.content?.trim() || "",
    citations,
    rawMeta: { id: data.id },
  };
}

function analyzeAnswer(record) {
  const answer = cleanText(record.answer || "");
  const citations = [...new Set((record.citations || []).map(normalizeCitation).filter(Boolean))];
  const sources = citations.map((citation) => sourceFromCitation(citation)).filter(Boolean);
  const businesses = extractBusinesses(answer, record.businessName);
  const ownMentioned = includesBusiness(answer, record.businessName, record.website);
  const rank = ownMentioned ? estimateRank(answer, record.businessName, businesses) : null;
  const sentiment = ownMentioned ? estimateSentiment(answer, record.businessName) : "not mentioned";
  const context = ownMentioned ? estimateContext(answer, record.businessName) : "Not mentioned in the answer.";

  return {
    ...record,
    answer,
    citations,
    sources,
    businesses,
    ownMentioned,
    rank,
    sentiment,
    context,
  };
}

function buildMetrics({ results, prompts, site, businessName, website, previousScans = [] }) {
  const completed = results.filter((result) => result.answer && !result.error);
  const mentions = completed.filter((result) => result.ownMentioned);
  const mentionRate = percent(mentions.length, completed.length);
  const firstChoiceRate = percent(mentions.filter((result) => result.rank === 1).length, completed.length);
  const ranked = mentions.filter((result) => Number.isFinite(result.rank));
  const avgRank = ranked.length ? round(ranked.reduce((sum, result) => sum + result.rank, 0) / ranked.length, 1) : null;
  const sentimentCounts = {
    positive: mentions.filter((result) => result.sentiment === "positive").length,
    neutral: mentions.filter((result) => result.sentiment === "neutral").length,
    negative: mentions.filter((result) => result.sentiment === "negative").length,
  };
  const positiveRate = percent(sentimentCounts.positive, mentions.length);
  const ownHost = new URL(website).hostname.replace(/^www\./, "");
  const allSources = completed.flatMap((result) => result.sources || []);
  const ownSources = allSources.filter((source) => source.host?.replace(/^www\./, "") === ownHost);
  const sourceQuality = percent(ownSources.length, allSources.length || completed.length);
  const coverage = percent(new Set(mentions.map((result) => result.category)).size, prompts.length);
  const rankScore = avgRank ? Math.max(0, Math.min(100, 105 - avgRank * 20)) : 0;
  const sentimentScore = mentions.length ? Math.max(0, positiveRate - sentimentCounts.negative * 8) : 0;
  const visibilityScore = completed.length
    ? Math.round(mentionRate * 0.4 + rankScore * 0.22 + sourceQuality * 0.18 + sentimentScore * 0.1 + coverage * 0.1)
    : null;

  const platformScores = groupScores(completed, "platformLabel");
  const categoryScores = groupScores(completed, "category");
  const competitors = buildCompetitors(completed, businessName, completed.length);
  const topSources = buildTopSources(allSources);
  const citedPages = buildCitedPages(site.pages, completed);
  const riskFlags = buildRiskFlags(completed, businessName);
  const actions = buildActions({
    mentionRate,
    avgRank,
    sourceQuality,
    categoryScores,
    competitors,
    topSources,
    citedPages,
    site,
    businessName,
    completed,
  });
  const trend = buildTrend({
    current: { visibilityScore, mentionRate, avgRank, categoryScores, sourceQuality, positiveRate },
    previousScans,
    website,
    businessName,
  });

  return {
    completedAnswers: completed.length,
    ownMentionCount: mentions.length,
    totalAttempts: results.length,
    promptCount: prompts.length,
    mentionRate,
    firstChoiceRate,
    avgRank,
    visibilityScore,
    positiveRate,
    sentimentCounts,
    sourceQuality,
    coverage,
    trend,
    riskFlags,
    platformScores,
    categoryScores,
    competitors,
    sources: {
      topSources,
      citedPages,
      ownCitationCount: ownSources.length,
      totalCitationCount: allSources.length,
    },
    actions,
  };
}

function groupScores(results, key) {
  const groups = new Map();
  for (const result of results) {
    const label = result[key] || "Unknown";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(result);
  }

  return [...groups.entries()].map(([label, items]) => {
    const mentions = items.filter((item) => item.ownMentioned);
    const ranks = mentions.map((item) => item.rank).filter(Number.isFinite);
    return {
      label,
      attempts: items.length,
      mentionRate: percent(mentions.length, items.length),
      avgRank: ranks.length ? round(ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length, 1) : null,
      positiveRate: percent(mentions.filter((item) => item.sentiment === "positive").length, mentions.length),
      visibilityScore: Math.round(
        percent(mentions.length, items.length) * 0.72 +
          (ranks.length ? Math.max(0, Math.min(100, 105 - round(ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length, 1) * 20)) : 0) * 0.2 +
          percent(mentions.filter((item) => item.sentiment === "positive").length, mentions.length) * 0.08,
      ),
    };
  });
}

function buildTrend({ current, previousScans, website, businessName }) {
  const host = new URL(website).hostname.replace(/^www\./, "");
  const previous = previousScans
    .filter((scan) => {
      const scanHost = scan.hostname || (scan.website ? new URL(scan.website).hostname : "");
      return scanHost.replace(/^www\./, "") === host && Number.isFinite(scan.metrics?.visibilityScore);
    })
    .at(-1);

  if (!previous) {
    return {
      previousScanId: null,
      summary: `This is the first comparable scan for ${businessName}. Future scans can measure actual movement.`,
      visibilityScoreDelta: null,
      mentionRateDelta: null,
      avgRankDelta: null,
      sourceQualityDelta: null,
      categoryDeltas: [],
    };
  }

  if (!Number.isFinite(current.visibilityScore)) {
    return {
      previousScanId: previous.id,
      previousCreatedAt: previous.createdAt,
      summary: "The current scan did not complete enough AI answers to measure movement.",
      visibilityScoreDelta: null,
      mentionRateDelta: null,
      avgRankDelta: null,
      sourceQualityDelta: null,
      positiveRateDelta: null,
      categoryDeltas: [],
    };
  }

  const previousCategories = new Map((previous.metrics.categoryScores || []).map((item) => [item.label, item]));
  const categoryDeltas = current.categoryScores.map((category) => {
    const previousCategory = previousCategories.get(category.label);
    return {
      label: category.label,
      mentionRateDelta: previousCategory ? category.mentionRate - previousCategory.mentionRate : null,
      previousMentionRate: previousCategory?.mentionRate ?? null,
      currentMentionRate: category.mentionRate,
    };
  });

  return {
    previousScanId: previous.id,
    previousCreatedAt: previous.createdAt,
    summary: `Compared with the scan from ${previous.createdAt}.`,
    visibilityScoreDelta: current.visibilityScore - previous.metrics.visibilityScore,
    mentionRateDelta: current.mentionRate - previous.metrics.mentionRate,
    avgRankDelta:
      Number.isFinite(current.avgRank) && Number.isFinite(previous.metrics.avgRank)
        ? round(previous.metrics.avgRank - current.avgRank, 1)
        : null,
    sourceQualityDelta: current.sourceQuality - previous.metrics.sourceQuality,
    positiveRateDelta: current.positiveRate - previous.metrics.positiveRate,
    categoryDeltas,
  };
}

function buildRiskFlags(results, businessName) {
  const flags = [];
  const ownResults = results.filter((result) => result.ownMentioned);
  const unverifiable = ownResults.filter((result) => /cannot verify|could not verify|unclear|limited information|not enough information/i.test(result.answer));
  const negative = ownResults.filter((result) => result.sentiment === "negative");
  const conflictingHours = ownResults.filter((result) => /closed|open today|hours|after-hours/i.test(result.answer) && /unclear|cannot|could not|not list/i.test(result.answer));

  if (unverifiable.length) {
    flags.push({
      type: "verification",
      text: `${businessName} was mentioned with verification uncertainty in ${unverifiable.length} answer${unverifiable.length === 1 ? "" : "s"}.`,
    });
  }

  if (conflictingHours.length) {
    flags.push({
      type: "hours",
      text: `AI answers showed uncertainty around hours or urgent availability in ${conflictingHours.length} result${conflictingHours.length === 1 ? "" : "s"}.`,
    });
  }

  if (negative.length) {
    flags.push({
      type: "sentiment",
      text: `${negative.length} mention${negative.length === 1 ? "" : "s"} had negative context and should be reviewed in the evidence log.`,
    });
  }

  return flags;
}

function buildCompetitors(results, businessName, totalAnswers) {
  const map = new Map();
  for (const result of results) {
    for (const name of result.businesses) {
      if (sameBusiness(name, businessName)) continue;
      if (!map.has(name)) {
        map.set(name, {
          name,
          mentions: 0,
          ranks: [],
          sources: new Map(),
          categories: new Set(),
        });
      }
      const item = map.get(name);
      item.mentions += 1;
      item.categories.add(result.category);
      const rank = estimateRank(result.answer, name, result.businesses);
      if (rank) item.ranks.push(rank);
      for (const source of result.sources || []) {
        item.sources.set(source.host, (item.sources.get(source.host) || 0) + 1);
      }
    }
  }

  return [...map.values()]
    .map((item) => {
      const topSource = [...item.sources.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "answer text";
      return {
        name: item.name,
        mentions: item.mentions,
        mentionRate: percent(item.mentions, totalAnswers),
        avgRank: item.ranks.length ? round(item.ranks.reduce((sum, rank) => sum + rank, 0) / item.ranks.length, 1) : null,
        topSource,
        why: explainCompetitor(topSource, item.categories),
      };
    })
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 6);
}

function buildTopSources(sources) {
  const map = new Map();
  for (const source of sources) {
    if (!source.host) continue;
    const current = map.get(source.host) || { host: source.host, count: 0, examples: [] };
    current.count += 1;
    if (source.url && current.examples.length < 3) current.examples.push(source.url);
    map.set(source.host, current);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

function buildCitedPages(pages, results) {
  return pages
    .map((page) => {
      const count = results.filter((result) =>
        result.citations?.some((citation) => citation.toLowerCase().startsWith(page.url.toLowerCase())),
      ).length;
      return {
        url: page.url,
        title: page.title || page.headings[0] || new URL(page.url).pathname || "Homepage",
        count,
      };
    })
    .filter((page) => page.count > 0)
    .sort((a, b) => b.count - a.count);
}

function buildActions({ mentionRate, avgRank, sourceQuality, categoryScores, competitors, topSources, citedPages, site, completed }) {
  if (!completed.length) return [];

  const actions = [];
  const ownCitations = citedPages.reduce((sum, page) => sum + page.count, 0);
  const topCategory = categoryScores.find((item) => /^top\b/i.test(item.label)) || categoryScores[0];
  const costCategory = categoryScores.find((item) => /cost|price|value|afford/i.test(item.label));
  const availabilityCategory = categoryScores.find((item) => /availability|urgent|scheduling|booking/i.test(item.label));
  const localCategory = categoryScores.find((item) => /local|near|location/i.test(item.label));
  const ownMentions = completed.filter((result) => result.ownMentioned);
  const negative = ownMentions.find((result) => result.sentiment === "negative");
  const uncertain = ownMentions.find((result) => /unclear|cannot verify|could not verify|limited information|not enough/i.test(`${result.answer} ${result.context}`));
  const weakestCategory = categoryScores
    .filter((item) => item.attempts > 0)
    .sort((a, b) => a.mentionRate - b.mentionRate)[0];

  if (negative) {
    actions.push({
      title: "Review negative answer context",
      impact: "High impact",
      reason: `AI described the business negatively for "${negative.prompt}".`,
      evidence: firstRelevantSentence(negative.answer || negative.context, /expensive|unclear|cannot verify|could not verify|limited|closed|not recommended|negative|concern|mixed/i),
      developerTasks: ["Add clarifying page copy that directly addresses the negative or confusing claim if it is inaccurate."],
    });
  }

  if (uncertain) {
    actions.push({
      title: "Make verification details clearer",
      impact: "High impact",
      reason: `AI showed uncertainty for "${uncertain.prompt}".`,
      evidence: firstRelevantSentence(uncertain.answer || uncertain.context, /unclear|cannot verify|could not verify|limited information|not enough/i),
      developerTasks: ["Add crawlable proof, hours, eligibility, contact, and FAQ details for this customer question."],
    });
  }

  if (weakestCategory && weakestCategory.mentionRate < 35) {
    actions.push({
      title: `Strengthen ${weakestCategory.label.toLowerCase()} pages`,
      impact: "High impact",
      reason: `AI answers are not reliably mentioning the business for ${weakestCategory.label.toLowerCase()} searches. Add direct, crawlable copy that answers those customer questions.`,
      evidence: `${weakestCategory.label} mention rate is ${weakestCategory.mentionRate}% across ${weakestCategory.attempts} answer${weakestCategory.attempts === 1 ? "" : "s"}.`,
      developerTasks: [
        "Create a concise section or page for this topic using customer question wording.",
        "Add proof points, locations served, next steps, and FAQs in crawlable HTML.",
      ],
    });
  }

  if (costCategory && costCategory.mentionRate < 45) {
    actions.push({
      title: "Clarify cost and value signals",
      impact: "Medium impact",
      reason: "Cost/value prompts need verifiable payment details, eligibility, plans, pricing ranges, or value proof where appropriate.",
      evidence: `Cost/value mention rate is ${costCategory.mentionRate}% across ${costCategory.attempts} answer${costCategory.attempts === 1 ? "" : "s"}.`,
      developerTasks: [
        "Add a pricing, payment, eligibility, or value FAQ if accurate for the business.",
        "Use concise answer-style copy for common cost questions.",
      ],
    });
  }

  if (availabilityCategory && availabilityCategory.mentionRate < 45) {
    actions.push({
      title: "Make availability and next steps clear",
      impact: "Medium impact",
      reason: "AI answers need clear booking, enrollment, consultation, hours, or contact details before recommending the business for action-oriented prompts.",
      evidence: `${availabilityCategory.label} mention rate is ${availabilityCategory.mentionRate}% across ${availabilityCategory.attempts} answer${availabilityCategory.attempts === 1 ? "" : "s"}.`,
      developerTasks: [
        "Make scheduling, hours, contact, enrollment, or availability details easy to crawl.",
        "Add FAQ/schema copy that directly answers how to get started.",
      ],
    });
  }

  if (ownCitations === 0 && topSources.length > 0) {
    actions.push({
      title: "Make your own pages easier to cite",
      impact: "High impact",
      reason: "AI answers are leaning on third-party sources more than your website. Add concise FAQs and source-like pages for important services.",
      evidence: `Own-site citation share is ${sourceQuality}%; top cited source is ${topSources[0].host}.`,
      developerTasks: [
        "Add focused service pages with short definitions, eligibility, locations served, and proof points.",
        "Make NAP details, testimonials, and FAQs crawlable without client-only rendering.",
      ],
    });
  }

  if (competitors[0]?.mentionRate > mentionRate) {
    actions.push({
      title: `Close the gap with ${competitors[0].name}`,
      impact: "Medium impact",
      reason: `${competitors[0].name} is mentioned more often, likely due to ${competitors[0].why.toLowerCase()}.`,
      evidence: `${competitors[0].name} has a ${competitors[0].mentionRate}% mention rate vs. ${mentionRate}% for this business.`,
      developerTasks: [
        "Review the competitor's public proof points and add equivalent verifiable evidence where accurate.",
        "Strengthen pages tied to the intent categories where the competitor appears most often.",
      ],
    });
  }

  if (!topCategory || topCategory.mentionRate < 40 || (avgRank && avgRank > 2.5)) {
    actions.push({
      title: "Strengthen top-recommendation proof",
      impact: "Medium impact",
      reason: "Best/top prompts need strong proof signals: reviews, awards, years in business, specialties, service area, and clear differentiators.",
      evidence: topCategory ? `${topCategory.label} mention rate is ${topCategory.mentionRate}%${avgRank ? ` and average rank is #${avgRank}` : ""}.` : "No top recommendation answers mentioned the business.",
      developerTasks: [
        "Add concise proof blocks for ratings, review count, awards, credentials, and primary differentiators.",
        "Create comparison-friendly copy that explains who the business is best for.",
      ],
    });
  }

  if (localCategory && localCategory.mentionRate < 40) {
    actions.push({
      title: "Improve local-area coverage",
      impact: "High impact",
      reason: "Local discovery prompts are especially important and should verify neighborhoods, nearby cities, and service radius.",
      evidence: `${localCategory.label} mention rate is ${localCategory.mentionRate}% across ${localCategory.attempts} answer${localCategory.attempts === 1 ? "" : "s"}.`,
      developerTasks: [
        "Add location/service-area sections with nearby neighborhoods and cities served.",
        "Make address, map links, and local landmarks crawlable.",
      ],
    });
  }

  if (site.pageCount < 3) {
    actions.push({
      title: "Expand crawlable site depth",
      impact: "Medium impact",
      reason: "The scan found only a few useful pages. AI systems need specific service, FAQ, location, and proof pages to verify claims.",
      evidence: `The crawl found ${site.pageCount} useful page${site.pageCount === 1 ? "" : "s"}.`,
      developerTasks: [
        "Add separate pages for core services, FAQ, locations, and contact/hours details.",
        "Ensure important content is present in initial HTML and linked from navigation.",
      ],
    });
  }

  return actions.slice(0, 5);
}

function firstRelevantSentence(text, pattern) {
  const clean = cleanText(text || "");
  if (!clean) return "The AI answer did not include enough detail to summarize the issue.";
  const sentences = clean.match(/[^.!?]+[.!?]?/g) || [clean];
  return (sentences.find((sentence) => pattern.test(sentence)) || sentences[0]).trim();
}

function parseJsonObject(text) {
  const clean = String(text || "").trim();
  if (!clean) return null;
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeAIVertical(value, fallback) {
  const label = cleanText(value?.label || fallback?.label || "local business").slice(0, 80);
  return {
    label,
    specialty: cleanText(value?.specialty || fallback?.specialty || label).slice(0, 100),
    customer: cleanText(value?.customer || fallback?.customer || "customers").slice(0, 100),
    urgent: Boolean(value?.urgent ?? fallback?.urgent),
    priceLanguage: cleanText(value?.priceLanguage || fallback?.priceLanguage || `cost of ${label} near me`).slice(0, 160),
  };
}

function normalizeAIList(value, fallback = []) {
  const items = Array.isArray(value) ? value : [];
  return [...new Set(items.map((item) => cleanText(item)).filter(Boolean))].length
    ? [...new Set(items.map((item) => cleanText(item)).filter(Boolean))]
    : fallback;
}

function normalizeAIPromptGroups(groups, searchAreas, location) {
  if (!Array.isArray(groups)) return [];
  return groups
    .map((group) => {
      const prompts = normalizeAIList(group?.prompts, [group?.prompt])
        .map((prompt) => broadenPromptLocation(prompt, searchAreas, location))
        .filter(Boolean)
        .slice(0, 3);
      return {
        category: cleanText(group?.category).slice(0, 80),
        prompts,
        intent: cleanText(group?.intent).slice(0, 180),
        reason: cleanText(group?.reason).slice(0, 220),
      };
    })
    .filter((group) => group.category && group.prompts.length);
}

function broadenPromptLocation(prompt, searchAreas, location) {
  const text = cleanText(prompt);
  if (!text) return "";
  if (searchAreas.some((area) => normalized(text).includes(normalized(area)))) return text;
  return text.replace(/\bnear me\b/i, `near ${location}`);
}

function inferPromptLocation(prompt, searchAreas = [], fallback = "") {
  const text = normalized(prompt);
  return searchAreas.find((area) => text.includes(normalized(area))) || fallback;
}

function buildSearchAreas(location, detectedLocations = []) {
  const seed = [location, ...detectedLocations].map(cleanText).filter(Boolean);
  const city = cleanText(location.split(",")[0] || location);
  const state = cleanText(location.split(",")[1] || "");
  const lowerCity = city.toLowerCase();
  const areas = [...seed];

  const bayAreaCities = new Set([
    "sunnyvale",
    "menlo park",
    "palo alto",
    "mountain view",
    "cupertino",
    "santa clara",
    "san jose",
    "los gatos",
    "redwood city",
    "campbell",
    "saratoga",
  ]);

  if (state.toLowerCase().includes("ca") && bayAreaCities.has(lowerCity)) {
    const nearbyMap = {
      sunnyvale: ["Santa Clara, CA", "Mountain View, CA", "Cupertino, CA", "San Jose, CA", "South Bay", "Bay Area"],
      "menlo park": ["Palo Alto, CA", "Redwood City, CA", "Atherton, CA", "Mountain View, CA", "Peninsula", "Bay Area"],
      "palo alto": ["Menlo Park, CA", "Mountain View, CA", "Redwood City, CA", "Peninsula", "Bay Area"],
      "mountain view": ["Sunnyvale, CA", "Palo Alto, CA", "Los Altos, CA", "South Bay", "Bay Area"],
      cupertino: ["Sunnyvale, CA", "Santa Clara, CA", "San Jose, CA", "South Bay", "Bay Area"],
      "santa clara": ["Sunnyvale, CA", "San Jose, CA", "Cupertino, CA", "South Bay", "Bay Area"],
      "san jose": ["Santa Clara, CA", "Sunnyvale, CA", "Cupertino, CA", "South Bay", "Bay Area"],
      "los gatos": ["Campbell, CA", "Saratoga, CA", "San Jose, CA", "South Bay", "Bay Area"],
      "redwood city": ["Menlo Park, CA", "Palo Alto, CA", "San Mateo, CA", "Peninsula", "Bay Area"],
      campbell: ["Los Gatos, CA", "San Jose, CA", "Saratoga, CA", "South Bay", "Bay Area"],
      saratoga: ["Los Gatos, CA", "Cupertino, CA", "Campbell, CA", "South Bay", "Bay Area"],
    };
    areas.push(...(nearbyMap[lowerCity] || ["South Bay", "Bay Area"]));
  }

  if (!areas.some((area) => /area|county|region|valley|peninsula/i.test(area))) {
    areas.push(state ? `${state} Area` : "Nearby Area");
  }

  return [...new Set(areas.map(cleanText).filter(Boolean))].slice(0, 8);
}

function firstMeaningfulArea(areas = []) {
  return (areas || []).map(cleanText).find((area) => area && !/^(united states|usa|nearby area)$/i.test(area));
}

function extractBusinesses(answer, ownBusiness) {
  const candidates = new Set();
  if (includesBusiness(answer, ownBusiness)) candidates.add(cleanBusinessName(ownBusiness));

  const lines = answer.split(/(?:\n|\u2022|- |\d+\.\s+)/).map(cleanText).filter(Boolean);
  const suffixes =
    "(Dental|Dentist|Dentistry|Orthodontics|Plumbing|Plumber|HVAC|Heating|Cooling|Clinic|Studio|Group|Care|Center|Foundation|Practice|Company|Co\\.|Law|Salon|Spa|Med Spa|Restaurant|Cafe|Agency|CRM|Software|Solutions|Services|LLC|Inc\\.)";
  const suffixRegex = new RegExp(`\\b([A-Z][A-Za-z&' ]{2,55}\\s${suffixes})\\b`, "g");

  for (const line of lines) {
    for (const match of line.matchAll(suffixRegex)) {
      candidates.add(cleanBusinessName(match[1]));
    }

    const boldNames = [...line.matchAll(/\*\*([^*]{3,70})\*\*/g)].map((match) => cleanBusinessName(match[1]));
    for (const name of boldNames) {
      if (looksLikeBusiness(name)) candidates.add(name);
    }
  }

  return [...candidates].slice(0, 12);
}

function estimateRank(answer, businessName, businesses) {
  if (!answer) return null;
  const names = businesses.length ? businesses : [businessName];
  const positions = names
    .map((name) => ({ name, index: normalized(answer).indexOf(normalized(name)) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index);
  const match = positions.find((item) => sameBusiness(item.name, businessName));
  if (!match) return includesBusiness(answer, businessName) ? positions.length + 1 : null;
  return positions.findIndex((item) => item.name === match.name) + 1;
}

function estimateSentiment(answer, businessName) {
  const windowText = mentionWindow(answer, businessName);
  const negative = /(avoid|bad|poor|complaint|expensive|unclear|cannot verify|could not verify|limited|closed|not recommended|negative)/i;
  const positive = /(best|top|recommended|strong|trusted|highly rated|positive|great|excellent|popular|good|premium|convenient|clear)/i;
  if (negative.test(windowText)) return "negative";
  if (positive.test(windowText)) return "positive";
  return "neutral";
}

function estimateContext(answer, businessName) {
  const text = mentionWindow(answer, businessName);
  if (/premium|high-end|cosmetic|luxury/i.test(text)) return "Mentioned as a premium or specialty option.";
  if (/affordable|budget|payment|insurance|financing/i.test(text)) return "Mentioned in an affordability or payment context.";
  if (/emergency|urgent|same-day|after-hours/i.test(text)) return "Mentioned for urgent or emergency intent.";
  if (/family|kids|children|pediatric|parents/i.test(text)) return "Mentioned for family or child-friendly intent.";
  return "Mentioned as a general recommendation.";
}

function mentionWindow(answer, businessName) {
  const lower = answer.toLowerCase();
  const aliases = businessAliases(businessName);
  const index = aliases.map((alias) => lower.indexOf(alias.toLowerCase())).find((value) => value >= 0) ?? -1;
  if (index < 0) return answer.slice(0, 500);
  return answer.slice(Math.max(0, index - 220), Math.min(answer.length, index + 420));
}

function includesBusiness(answer, businessName, website = "") {
  const text = normalized(answer);
  return businessAliases(businessName, website).some((alias) => text.includes(normalized(alias)));
}

function businessAliases(name, website = "") {
  const aliases = new Set();
  if (name) {
    aliases.add(name);
    aliases.add(name.replace(/\b(LLC|Inc\.?|Co\.?|Company|Group|Studio|Practice|Foundation|Clinic|Center|Centre)\b/gi, "").trim());
  }
  if (website) {
    const host = new URL(website).hostname.replace(/^www\./, "");
    aliases.add(host);
    aliases.add(host.split(".")[0].replace(/[-_]/g, " "));
  }
  return [...aliases].filter((alias) => alias && alias.length > 2);
}

function sameBusiness(a, b) {
  const left = normalized(a).replace(/\b(llc|inc|co|company|group|studio|practice|foundation|clinic|center|centre)\b/g, "").trim();
  const right = normalized(b).replace(/\b(llc|inc|co|company|group|studio|practice|foundation|clinic|center|centre)\b/g, "").trim();
  return left === right || left.includes(right) || right.includes(left);
}

function looksLikeBusiness(text) {
  if (!text || text.length < 3 || text.length > 70) return false;
  if (/^(the|and|or|best|top|why|summary|note)$/i.test(text)) return false;
  return /[A-Z]/.test(text[0]);
}

function cleanBusinessName(text) {
  return cleanText(text)
    .replace(/^[#:*\s]+/, "")
    .replace(/[.。:,;]+$/, "")
    .trim();
}

function inferVertical(text, url) {
  const lower = `${text} ${url}`.toLowerCase();
  const verticals = [
    { label: "dentist", specialty: "cosmetic dentistry", customer: "patients", urgent: true, terms: ["dentist", "dental", "orthodont", "invisalign", "teeth"] },
    { label: "acupuncture clinic", specialty: "acupuncture treatment", customer: "patients", urgent: false, terms: ["acupuncture", "acupuncturist", "traditional chinese medicine", "tcm", "cupping"] },
    { label: "plumber", specialty: "emergency plumbing", customer: "homeowners", urgent: true, terms: ["plumber", "plumbing", "water heater", "drain"] },
    { label: "HVAC company", specialty: "AC repair", customer: "homeowners", urgent: true, terms: ["hvac", "air conditioning", "furnace", "heating"] },
    { label: "law firm", specialty: "legal consultation", customer: "clients", urgent: false, terms: ["law firm", "attorney", "lawyer", "legal"] },
    { label: "med spa", specialty: "botox", customer: "clients", urgent: false, terms: ["med spa", "botox", "filler", "aesthetic"] },
    { label: "restaurant", specialty: "private dining", customer: "diners", urgent: false, terms: ["restaurant", "menu", "reservation", "dining"] },
    { label: "Hindu temple", specialty: "pooja services", customer: "devotees and families", urgent: false, priceLanguage: "donation and service information for Hindu temple near me", terms: ["hindu temple", "temple", "pooja", "puja", "aarthi", "darshan", "panchangam", "devotees", "religious", "spiritual"] },
    { label: "sports foundation", specialty: "youth sports programs", customer: "families and athletes", urgent: false, terms: ["sports foundation", "sports", "athletes", "youth program", "training", "camp"] },
    { label: "fitness studio", specialty: "personal training", customer: "members", urgent: false, terms: ["fitness", "personal training", "gym", "workout", "pilates", "yoga"] },
    { label: "CRM platform", specialty: "sales lead tracking", customer: "small businesses", urgent: false, terms: ["crm", "sales leads", "pipeline", "software"] },
  ];

  const match = verticals
    .map((vertical) => ({
      ...vertical,
      score: vertical.terms.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (!match?.score) return { label: inferGenericVertical(lower), specialty: "service", customer: "customers", urgent: false, terms: [] };
  if (match.label === "sports foundation" && match.score < 2 && /\btemple|pooja|puja|aarthi|darshan|devotee|hindu\b/.test(lower)) {
    return verticals.find((vertical) => vertical.label === "Hindu temple");
  }
  return match;
}

function inferServices(text, vertical) {
  const lower = text.toLowerCase();
  const serviceMap = {
    dentist: ["Invisalign", "cosmetic dentistry", "dental implants", "emergency dental care", "teeth whitening", "pediatric dentistry"],
    "acupuncture clinic": ["acupuncture treatment", "cupping therapy", "herbal medicine", "pain relief", "fertility acupuncture"],
    plumber: ["emergency plumbing", "drain cleaning", "water heater repair", "leak repair", "sewer line repair"],
    "HVAC company": ["AC repair", "furnace repair", "heat pump installation", "maintenance plans"],
    "law firm": ["personal injury lawyer", "family law", "estate planning", "business law"],
    "med spa": ["Botox", "dermal fillers", "laser treatments", "facials"],
    restaurant: ["private dining", "brunch", "catering", "reservations"],
    "Hindu temple": ["pooja services", "religious events", "cultural classes", "community programs", "priest services"],
    "sports foundation": ["youth sports programs", "sports training", "camps", "athlete development", "community programs"],
    "fitness studio": ["personal training", "group classes", "pilates", "yoga", "strength training"],
    "CRM platform": ["sales lead tracking", "pipeline management", "CRM automation", "reporting"],
  };

  return (serviceMap[vertical.label] || [])
    .filter((service) => lower.includes(service.toLowerCase().split(" ")[0]))
    .concat(vertical.specialty || [])
    .filter(Boolean)
    .filter((service, index, list) => list.indexOf(service) === index)
    .slice(0, 4);
}

function inferGenericVertical(lowerText) {
  const titlePatterns = [
    /\b([a-z]+(?:\s+[a-z]+){0,2})\s+(clinic|studio|foundation|center|centre|practice|agency|company|platform|school)\b/,
    /\b([a-z]+(?:\s+[a-z]+){0,2})\s+(services|programs|training|therapy|care)\b/,
  ];
  for (const pattern of titlePatterns) {
    const match = lowerText.match(pattern);
    if (match) return cleanText(match[0]).slice(0, 48);
  }
  return "business";
}

function capitalizeWords(value) {
  return cleanText(value)
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function inferLocations(text) {
  const matches = [...text.matchAll(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2}),\s([A-Z]{2})\b/g)]
    .map((match) => `${match[1]}, ${match[2]}`)
    .filter((value) => !/Copyright|Privacy|Terms/.test(value));
  return [...new Set(matches)].slice(0, 5);
}

function extractKeywords(text) {
  const stop = new Set("about after also are business can care contact from have more near page services that their this with your".split(" "));
  const counts = new Map();
  for (const word of text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []) {
    if (stop.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([word]) => word);
}

function explainCompetitor(source, categories) {
  const joined = [...categories].join(", ").toLowerCase();
  if (/google|reviews|yelp|healthgrades/i.test(source)) return "More or stronger review proof";
  if (/emergency|urgent/.test(joined)) return "Clearer urgent-service evidence";
  if (/price|affordability/.test(joined)) return "Clearer pricing or financing information";
  if (/answer text/.test(source)) return "Repeated model recognition in answer text";
  return `Stronger citations from ${source}`;
}

function sourceFromCitation(citation) {
  if (!citation) return null;
  try {
    const url = new URL(citation);
    return {
      url: url.toString(),
      host: url.hostname.replace(/^www\./, ""),
    };
  } catch {
    const host = citation.replace(/^https?:\/\//, "").split(/[/?#]/)[0];
    return host ? { url: citation, host } : null;
  }
}

function normalizeCitation(citation) {
  if (typeof citation === "string") return citation;
  if (citation?.url) return citation.url;
  if (citation?.uri) return citation.uri;
  if (citation?.title) return citation.title;
  return "";
}

function extractCitations(data) {
  const citations = [];

  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value.url) citations.push(value.url);
    if (value.uri) citations.push(value.uri);
    for (const child of Object.values(value)) walk(child);
  }

  walk(data);
  return [...new Set(citations)].slice(0, 20);
}

function extractOpenAIText(data) {
  if (data.output_text) return cleanText(data.output_text);
  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.text) chunks.push(content.text);
    }
  }
  return cleanText(chunks.join("\n"));
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = data.error?.message || data.message || text || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return data;
}

async function fetchText(url, timeoutMs) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Gleo GEO Insights/1.0",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error("URL did not return HTML");
  }
  return response.text();
}

async function getConfig() {
  const scans = await readScans();
  return {
    providers: Object.fromEntries(
      Object.entries(PROVIDERS).map(([key, provider]) => [
        key,
        {
          label: provider.label,
          model: provider.model,
          configured: isProviderConfigured(key),
          keyName: provider.keyName,
        },
      ]),
    ),
    limits: {
      maxCrawlPages: MAX_CRAWL_PAGES,
      maxScanPrompts: MAX_SCAN_PROMPTS,
    },
    latestScanId: scans.at(-1)?.id || null,
  };
}

function normalizePlatforms(platforms) {
  const selected = Array.isArray(platforms) && platforms.length ? platforms : Object.keys(PROVIDERS);
  return selected.filter((platform) => Object.hasOwn(PROVIDERS, platform));
}

function isProviderConfigured(platform) {
  return Boolean(process.env[PROVIDERS[platform]?.keyName]);
}

function normalizeUrl(value) {
  if (!value || typeof value !== "string") throw new Error("Website URL is required.");
  const withProtocol = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  const url = new URL(withProtocol);
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function inferNameFromUrl(url) {
  const host = new URL(url).hostname.replace(/^www\./, "").split(".")[0];
  return host
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function readJsonBody(request) {
  const raw = await new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
    request.on("aborted", () => reject(new Error("Request body was aborted.")));
  });
  if (!raw) return {};
  return JSON.parse(raw);
}

async function readCollection(collection) {
  const url = `${SUPABASE_URL}/rest/v1/gleo_records?collection=eq.${encodeURIComponent(collection)}&select=data`;
  const response = await fetch(url, { headers: supabaseHeaders() });
  if (!response.ok) throw new Error(`Supabase read failed for ${collection}.`);
  const rows = await response.json();
  return Array.isArray(rows?.[0]?.data) ? rows[0].data : [];
}

async function writeCollection(collection, data) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/gleo_records`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ collection, data, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Supabase write failed for ${collection}.`);
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };
}

async function supabaseRequest(pathname, { method = "GET", headers = {}, body = "" } = {}) {
  const url = `${SUPABASE_URL}${pathname}`;
  const requestBody = typeof body === "string" ? body : body ? JSON.stringify(body) : "";
  const requestHeaders = {
    ...headers,
  };

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody || undefined,
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    if (error?.name === "TimeoutError") {
      throw new Error("Supabase request timed out.");
    }
    throw error;
  }

  return {
    ok: response.ok,
    status: response.status || 500,
    text: await response.text(),
  };
}

async function supabaseSelect(table, { filters = {}, limit, order, select = "*" } = {}) {
  const params = new URLSearchParams({ select });
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, `eq.${value}`);
  }
  if (order) params.set("order", order);
  if (limit) params.set("limit", String(limit));
  const response = await supabaseRequest(`/rest/v1/${table}?${params.toString()}`, {
    headers: supabaseHeaders(),
  });
  if (!response.ok) throw new Error(`Supabase read failed for ${table}.`);
  return response.text ? JSON.parse(response.text) : [];
}

async function supabaseSelectSafe(table, options = {}, fallback = []) {
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await supabaseSelect(table, options);
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error(`Supabase safe read failed for ${table}.`, error);
        return fallback;
      }
    }
  }
  return fallback;
}

async function supabaseInsert(table, rows) {
  const payload = Array.isArray(rows) ? rows : [rows];
  const response = await supabaseRequest(`/rest/v1/${table}`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Supabase insert failed for ${table}.`);
  return response.text ? JSON.parse(response.text) : [];
}

async function supabaseUpsert(table, rows, onConflict) {
  const payload = Array.isArray(rows) ? rows : [rows];
  const query = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : "";
  const response = await supabaseRequest(`/rest/v1/${table}${query}`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Supabase upsert failed for ${table}.`);
  return response.text ? JSON.parse(response.text) : [];
}

async function supabaseDelete(table, filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, `eq.${value}`);
  }
  const response = await supabaseRequest(`/rest/v1/${table}?${params.toString()}`, {
    method: "DELETE",
    headers: {
      ...supabaseHeaders(),
      Prefer: "return=minimal",
    },
  });
  if (!response.ok) throw new Error(`Supabase delete failed for ${table}.`);
}

function normalizeEntitlementStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function parseTrialEndsAt(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function entitlementTrialIsActive(entitlement) {
  if (normalizeEntitlementStatus(entitlement?.status) !== "trialing") return false;
  const trialEndsAt = parseTrialEndsAt(entitlement?.trial_ends_at);
  return Boolean(trialEndsAt && trialEndsAt.getTime() > Date.now());
}

function entitlementStatusAllowed(status, entitlement = null) {
  const normalizedStatus = normalizeEntitlementStatus(status);
  if (normalizedStatus === "trialing") {
    return entitlementTrialIsActive(entitlement);
  }
  return ENTITLEMENT_ALLOWED_STATUSES.includes(normalizedStatus);
}

function entitlementHasPremiumInsights(entitlement) {
  if (!entitlement) return false;
  if (entitlement.premium_insights === true) return true;
  const plan = String(entitlement.plan || "").trim().toLowerCase();
  return Boolean(plan && PREMIUM_ENTITLEMENT_PLANS.includes(plan));
}

function entitlementAccessTier(entitlement) {
  if (!entitlement) return "none";
  if (entitlementHasPremiumInsights(entitlement)) return "premium";
  if (entitlementTrialIsActive(entitlement)) return "included_month";
  if (entitlementStatusAllowed(entitlement.status, entitlement)) return "standard";
  if (normalizeEntitlementStatus(entitlement.status) === "trialing") return "expired_trial";
  return "blocked";
}

async function readEntitlementByEmail(email) {
  if (!USE_SHARED_SUPABASE) return null;
  const rows = await supabaseSelect("entitlements", {
    filters: { email: cleanText(email || "").toLowerCase() },
    limit: 1,
  });
  return rows[0] || null;
}

async function ensureUserHasAccess(userLike) {
  if (!USE_SHARED_SUPABASE) return true;
  const email = cleanText(userLike?.email || "").toLowerCase();
  if (!email) {
    const error = new Error("This dashboard requires a paid Gleo access record before sign-in.");
    error.statusCode = 403;
    throw error;
  }
  const entitlement = await readEntitlementByEmail(email);
  if (!entitlement) {
    const error = new Error("No paid Gleo access was found for this email yet. Complete payment on the Gleo landing page first.");
    error.statusCode = 403;
    throw error;
  }
  const status = normalizeEntitlementStatus(entitlement.status);
  if (status === "trialing" && !entitlementTrialIsActive(entitlement)) {
    const error = new Error("Your included month of tracking has ended. Choose a monthly plan to keep monitoring your AI visibility.");
    error.statusCode = 403;
    throw error;
  }
  if (!entitlementStatusAllowed(entitlement.status, entitlement)) {
    const error = new Error("This dashboard access is not active right now. Choose a plan on the Gleo landing page to continue.");
    error.statusCode = 403;
    throw error;
  }
  return entitlement;
}

function mergeSharedUser(profile, workspace, credential, entitlement) {
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.full_name || "",
    email: profile.email || "",
    passwordHash: credential?.password_hash || "",
    businessName: workspace?.business_name || "",
    website: workspace?.website || "",
    trialEndsAt: entitlement?.trial_ends_at || null,
    entitlementStatus: entitlement?.status || "",
    entitlementPlan: entitlement?.plan || "",
    accessTier: entitlementAccessTier(entitlement),
    premiumInsights: entitlementHasPremiumInsights(entitlement),
    createdAt: profile.created_at || workspace?.created_at || credential?.created_at || new Date().toISOString(),
    updatedAt: workspace?.updated_at || credential?.updated_at || profile.updated_at || profile.created_at || new Date().toISOString(),
  };
}

async function readSharedUserByProfile(profile) {
  if (!profile) return null;
  const [workspaces, credentials, entitlement] = await Promise.all([
    supabaseSelect("workspaces", { filters: { user_id: profile.id }, limit: 1 }),
    supabaseSelect("dashboard_credentials", { filters: { user_id: profile.id }, limit: 1 }),
    readEntitlementByEmail(profile.email || ""),
  ]);
  return mergeSharedUser(profile, workspaces[0], credentials[0], entitlement);
}

async function readSharedProfileByEmail(email) {
  const rows = await supabaseSelect("profiles", {
    filters: { email: cleanText(email || "").toLowerCase() },
    limit: 1,
  });
  return rows[0] || null;
}

async function readSharedUserByEmail(email) {
  return readSharedUserByProfile(await readSharedProfileByEmail(email));
}

async function readSharedUserById(userId) {
  const rows = await supabaseSelect("profiles", {
    filters: { id: cleanText(userId || "") },
    limit: 1,
  });
  return readSharedUserByProfile(rows[0] || null);
}

async function readScans(userId = "") {
  if (USE_SHARED_SUPABASE) {
    if (!userId) return [];
    const rows = await supabaseSelect("dashboard_scans", {
      filters: { user_id: userId },
      order: "created_at.asc",
    });
    return rows.map((row) => row.data).filter(Boolean);
  }
  if (USE_SUPABASE) return readCollection("scans");
  if (!existsSync(SCANS_FILE)) return [];
  try {
    return JSON.parse(await readFile(SCANS_FILE, "utf8"));
  } catch {
    return [];
  }
}

async function appendScanForUser(userId, scan) {
  if (USE_SHARED_SUPABASE) {
    await supabaseInsert("dashboard_scans", {
      id: scan.id || makeId(),
      user_id: userId,
      created_at: scan.createdAt || new Date().toISOString(),
      data: scan,
    });
    return;
  }
  const scans = await readScans();
  scans.push(scan);
  await writeScans(scans.slice(-50));
}

async function writeScans(scans) {
  if (USE_SUPABASE) return writeCollection("scans", scans);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SCANS_FILE, `${JSON.stringify(scans, null, 2)}\n`, "utf8");
}

async function readServiceRequests(userId = "") {
  if (USE_SHARED_SUPABASE) {
    if (!userId) return [];
    const rows = await supabaseSelect("service_requests", {
      filters: { user_id: userId },
      order: "created_at.desc",
    });
    return rows.map((row) => row.data).filter(Boolean);
  }
  if (USE_SUPABASE) {
    const requests = await readCollection("service_requests");
    return userId ? requests.filter((item) => item.userId === userId) : requests;
  }
  if (!existsSync(SERVICE_REQUESTS_FILE)) return [];
  try {
    const requests = JSON.parse(await readFile(SERVICE_REQUESTS_FILE, "utf8"));
    return userId ? requests.filter((item) => item.userId === userId) : requests;
  } catch {
    return [];
  }
}

async function writeServiceRequests(requests) {
  if (USE_SHARED_SUPABASE) return requests;
  if (USE_SUPABASE) return writeCollection("service_requests", requests);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SERVICE_REQUESTS_FILE, `${JSON.stringify(requests, null, 2)}\n`, "utf8");
}

async function readUsers() {
  if (USE_SHARED_SUPABASE) return [];
  if (USE_SUPABASE) return readCollection("users");
  if (!existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(await readFile(USERS_FILE, "utf8"));
  } catch {
    return [];
  }
}

async function writeUsers(users) {
  if (USE_SHARED_SUPABASE) return users;
  if (USE_SUPABASE) return writeCollection("users", users);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(USERS_FILE, `${JSON.stringify(users, null, 2)}\n`, "utf8");
}

async function readSessions() {
  if (USE_SHARED_SUPABASE) return [];
  if (USE_SUPABASE) return readCollection("sessions");
  if (!existsSync(SESSIONS_FILE)) return [];
  try {
    return JSON.parse(await readFile(SESSIONS_FILE, "utf8"));
  } catch {
    return [];
  }
}

async function writeSessions(sessions) {
  if (USE_SHARED_SUPABASE) return sessions;
  if (USE_SUPABASE) return writeCollection("sessions", sessions);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SESSIONS_FILE, `${JSON.stringify(sessions, null, 2)}\n`, "utf8");
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    businessName: user.businessName,
    website: user.website,
    trialEndsAt: user.trialEndsAt || null,
    entitlementStatus: user.entitlementStatus || "",
    entitlementPlan: user.entitlementPlan || "",
    accessTier: user.accessTier || "",
    premiumInsights: Boolean(user.premiumInsights),
    createdAt: user.createdAt,
  };
}

function validateUserPayload(payload) {
  const name = cleanText(payload?.name || "");
  const email = cleanText(payload?.email || "");
  const password = String(payload?.password || "");
  const businessName = cleanText(payload?.businessName || "");
  if (!name) return "Enter your full name.";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  if (!password || password.length < 8) return "Enter a password with at least 8 characters.";
  if (!businessName) return "Enter your business name.";
  try {
    normalizeUrl(payload?.website || "");
  } catch {
    return "Enter your business website.";
  }
  return "";
}

async function createUser(payload) {
  const email = cleanText(payload.email).toLowerCase();
  const now = new Date().toISOString();
  let website;
  try {
    website = normalizeUrl(payload.website);
  } catch {
    throw new Error("Enter your business website.");
  }
  await ensureUserHasAccess({ email });
  if (USE_SHARED_SUPABASE) {
    const existingProfile = await readSharedProfileByEmail(email);
    const existingUser = await readSharedUserByProfile(existingProfile);
    if (existingUser?.passwordHash) {
      const error = new Error("An account with this email already exists.");
      error.statusCode = 409;
      throw error;
    }
    const userId = existingProfile?.id || existingUser?.id || makeId();
    await supabaseUpsert("profiles", {
      id: userId,
      email,
      full_name: titleCaseWords(payload.name),
      created_at: existingProfile?.created_at || existingUser?.createdAt || now,
      updated_at: now,
    }, "email");
    await supabaseUpsert("workspaces", {
      user_id: userId,
      business_name: titleCaseWords(payload.businessName),
      website,
      created_at: existingProfile?.created_at || existingUser?.createdAt || now,
      updated_at: now,
    }, "user_id");
    await supabaseUpsert("dashboard_credentials", {
      user_id: userId,
      password_hash: hashPassword(String(payload.password || "")),
      created_at: existingProfile?.created_at || existingUser?.createdAt || now,
      updated_at: now,
    }, "user_id");
    return readSharedUserById(userId);
  }
  const users = await readUsers();
  const existingUser = users.find((user) => user.email.toLowerCase() === email);
  if (existingUser) {
    const error = new Error("An account with this email already exists.");
    error.statusCode = 409;
    throw error;
  }
  const record = {
    id: makeId(),
    name: titleCaseWords(payload.name),
    email,
    passwordHash: hashPassword(String(payload.password || "")),
    businessName: titleCaseWords(payload.businessName),
    website,
    createdAt: now,
    updatedAt: now,
  };
  users.push(record);
  await writeUsers(users);
  return record;
}

function extractAuthToken(request) {
  const header = request.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

async function getAuthenticatedUser(request) {
  const token = extractAuthToken(request);
  if (!token) return null;
  if (USE_SHARED_SUPABASE) {
    const rows = await supabaseSelect("dashboard_sessions", {
      filters: { token },
      limit: 1,
    });
    const now = Date.now();
    const session = rows.find((entry) => Number(entry.expires_at) > now);
    if (!session) return null;
    return readSharedUserById(session.user_id);
  }
  const sessions = await readSessions();
  const now = Date.now();
  const session = sessions.find((entry) => entry.token === token && entry.expiresAt > now);
  if (!session) return null;
  const users = await readUsers();
  return users.find((user) => user.id === session.userId) || null;
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  if (USE_SHARED_SUPABASE) {
    await supabaseInsert("dashboard_sessions", {
      token,
      user_id: userId,
      created_at: now,
      expires_at: now + SESSION_TTL_MS,
    });
    return token;
  }
  const sessions = (await readSessions()).filter((entry) => entry.expiresAt > now);
  sessions.push({ token, userId, createdAt: now, expiresAt: now + SESSION_TTL_MS });
  await writeSessions(sessions);
  return token;
}

async function createPremiumServiceRequest(user, payload) {
  await ensurePremiumAccess(user);
  const scanId = cleanText(payload?.scanId || "");
  const summary = cleanText(payload?.summary || "");
  const actions = Array.isArray(payload?.actions) ? payload.actions.slice(0, 8) : [];
  const requestRecord = {
    id: makeId(),
    userId: user.id,
    createdAt: new Date().toISOString(),
    status: "requested",
    businessName: cleanText(payload?.businessName || user.businessName || ""),
    website: cleanText(payload?.website || user.website || ""),
    entitlementPlan: cleanText(user.entitlementPlan || ""),
    scanId,
    summary,
    actions: actions.map((action) => ({
      title: cleanText(action?.title || ""),
      impact: cleanText(action?.impact || ""),
      reason: cleanText(action?.reason || ""),
      evidence: cleanText(action?.evidence || ""),
      tasks: Array.isArray(action?.tasks) ? action.tasks.map((task) => cleanText(task)).filter(Boolean).slice(0, 4) : [],
    })),
    requestedBy: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
  requestRecord.delivery = await sendPremiumRequestAlert(requestRecord);

  if (USE_SHARED_SUPABASE) {
    await supabaseInsert("service_requests", {
      id: requestRecord.id,
      user_id: user.id,
      created_at: requestRecord.createdAt,
      status: requestRecord.status,
      data: requestRecord,
    });
  } else {
    const requests = await readServiceRequests();
    requests.push(requestRecord);
    await writeServiceRequests(requests.slice(-300));
  }

  return requestRecord;
}

async function ensurePremiumAccess(userLike) {
  if (!USE_SHARED_SUPABASE) return true;
  const entitlement = await ensureUserHasAccess(userLike);
  if (!entitlementHasPremiumInsights(entitlement)) {
    const error = new Error("Premium actionable insights are only available on the premium Gleo tier.");
    error.statusCode = 403;
    throw error;
  }
  return entitlement;
}

async function deleteSession(token) {
  if (USE_SHARED_SUPABASE) {
    await supabaseDelete("dashboard_sessions", { token });
    return;
  }
  const sessions = await readSessions();
  await writeSessions(sessions.filter((entry) => entry.token !== token));
}

async function sendPremiumRequestAlert(requestRecord) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER || !TWILIO_TO_NUMBER) {
    return { status: "saved_only", provider: "supabase_queue" };
  }

  const actionCount = requestRecord.actions.length;
  const body = [
    "New Gleo premium request",
    requestRecord.businessName || "Unknown business",
    requestRecord.website || "",
    `${actionCount} insight${actionCount === 1 ? "" : "s"} ready`,
    requestRecord.requestedBy?.email || "",
  ]
    .filter(Boolean)
    .join(" | ");

  const params = new URLSearchParams({
    To: TWILIO_TO_NUMBER,
    From: TWILIO_FROM_NUMBER,
    Body: body,
  });
  const token = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      status: "failed",
      provider: "twilio",
      error: data?.message || `${response.status} ${response.statusText}`,
    };
  }
  return {
    status: "sent",
    provider: "twilio",
    sid: data?.sid || "",
  };
}

async function getAdminOverview() {
  if (!ADMIN_DASHBOARD_ENABLED) {
    return {
      mode: SUPABASE_PROJECT_MODE,
      sharedMode: USE_SHARED_SUPABASE,
      message: "Admin dashboard is disabled.",
      stats: {},
      users: [],
      serviceRequests: [],
    };
  }
  if (!USE_SHARED_SUPABASE) {
    return {
      mode: SUPABASE_PROJECT_MODE || "legacy",
      sharedMode: false,
      message: "Admin view is designed for the shared Supabase setup.",
      stats: {},
      users: [],
      serviceRequests: [],
    };
  }

  const [profiles, entitlements, workspaces, scans, serviceRequests] = await Promise.all([
    supabaseSelectSafe("profiles", { order: "created_at.desc", limit: 200 }),
    supabaseSelectSafe("entitlements", { order: "updated_at.desc", limit: 200 }),
    supabaseSelectSafe("workspaces", { order: "updated_at.desc", limit: 200 }),
    supabaseSelectSafe("dashboard_scans", { order: "created_at.desc", limit: 400 }),
    supabaseSelectSafe("service_requests", { order: "created_at.desc", limit: 200 }),
  ]);

  const entitlementsByEmail = new Map(entitlements.map((item) => [String(item.email || "").toLowerCase(), item]));
  const workspacesByUserId = new Map(workspaces.map((item) => [item.user_id, item]));
  const scansByUserId = new Map();
  const latestScanByUserId = new Map();

  for (const row of scans) {
    const count = scansByUserId.get(row.user_id) || 0;
    scansByUserId.set(row.user_id, count + 1);
    if (!latestScanByUserId.has(row.user_id)) latestScanByUserId.set(row.user_id, row);
  }

  const users = profiles.map((profile) => {
    const entitlement = entitlementsByEmail.get(String(profile.email || "").toLowerCase()) || null;
    const workspace = workspacesByUserId.get(profile.id) || null;
    const latestScan = latestScanByUserId.get(profile.id) || null;
    const latestScanData = latestScan?.data || null;
    return {
      id: profile.id,
      name: profile.full_name || "",
      email: profile.email || "",
      status: entitlement?.status || "missing",
      plan: entitlement?.plan || "",
      trialEndsAt: entitlement?.trial_ends_at || null,
      accessTier: entitlementAccessTier(entitlement),
      premiumInsights: entitlementHasPremiumInsights(entitlement),
      businessName: workspace?.business_name || "",
      website: workspace?.website || "",
      createdAt: profile.created_at || "",
      updatedAt: workspace?.updated_at || profile.updated_at || "",
      scanCount: scansByUserId.get(profile.id) || 0,
      latestVisibilityScore: latestScanData?.metrics?.visibilityScore ?? null,
      latestMentionRate: latestScanData?.metrics?.mentionRate ?? null,
      latestScanAt: latestScan?.created_at || "",
    };
  });

  const requestRows = serviceRequests.map((row) => {
    const data = row.data || {};
    return {
      id: row.id,
      userId: row.user_id,
      createdAt: row.created_at || data.createdAt || "",
      status: row.status || data.status || "requested",
      businessName: data.businessName || "",
      website: data.website || "",
      requestedBy: data.requestedBy || null,
      actionCount: Array.isArray(data.actions) ? data.actions.length : 0,
      deliveryStatus: data.delivery?.status || "saved_only",
      deliveryProvider: data.delivery?.provider || "supabase_queue",
      summary: data.summary || "",
    };
  });

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter((user) => ["standard", "premium", "included_month"].includes(user.accessTier)).length,
    premiumUsers: users.filter((user) => user.premiumInsights).length,
    totalScans: scans.length,
    pendingServiceRequests: requestRows.filter((row) => row.status === "requested").length,
    totalServiceRequests: requestRows.length,
  };

  return {
    mode: SUPABASE_PROJECT_MODE,
    sharedMode: true,
    stats,
    users,
    serviceRequests: requestRows,
  };
}

function getAuthenticatedAdmin(request) {
  if (!ADMIN_DASHBOARD_ENABLED) return null;
  const cookies = parseCookies(request);
  const token = cookies[ADMIN_SESSION_COOKIE] || "";
  const session = verifyAdminSessionToken(token);
  if (!session) return null;
  return { email: session.email };
}

function normalizeAdminDashboardPath(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  return cleaned ? `/${cleaned}` : "";
}

function isBlockedPublicAdminPath(pathname) {
  return [
    "/admin",
    "/admin/",
    "/admin.html",
    "/admin/index.html",
    "/admin-shell.private.html",
  ].includes(String(pathname || "").toLowerCase());
}

function parseCookies(request) {
  const raw = String(request.headers.cookie || "");
  return raw.split(";").reduce((map, part) => {
    const [name, ...rest] = part.split("=");
    const key = String(name || "").trim();
    if (!key) return map;
    map[key] = decodeURIComponent(rest.join("=").trim());
    return map;
  }, {});
}

function createAdminSessionCookie(email) {
  const token = signAdminSessionToken({
    email,
    exp: Date.now() + ADMIN_SESSION_TTL_MS,
  });
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(
    ADMIN_SESSION_TTL_MS / 1000,
  )}`;
}

function clearAdminSessionCookie() {
  return `${ADMIN_SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function signAdminSessionToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", ADMIN_SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyAdminSessionToken(token) {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = crypto.createHmac("sha256", ADMIN_SESSION_SECRET).update(body).digest("base64url");
  if (!safeEqualString(signature, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload?.email || payload.email !== ADMIN_EMAIL) return null;
    if (!payload?.exp || Number(payload.exp) < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function safeEqualString(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function serveStatic(pathname, response) {
  const normalizedPath = ADMIN_DASHBOARD_ENABLED && (pathname === ADMIN_DASHBOARD_PATH || pathname === `${ADMIN_DASHBOARD_PATH}/`)
    ? "/admin-shell.private.html"
    : pathname;
  if (isBlockedPublicAdminPath(normalizedPath) && normalizedPath !== "/admin-shell.private.html") {
    return sendText(response, "Not found", 404);
  }
  const safePath = normalizedPath === "/" ? "/index.html" : normalizedPath;
  const filePath = path.normalize(path.join(__dirname, safePath));
  if (!filePath.startsWith(__dirname)) return sendText(response, "Not found", 404);

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch {
    sendText(response, "Not found", 404);
  }
}

function sendJson(response, body, status = 200, extraHeaders = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

function sendText(response, body, status = 200, extraHeaders = {}) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", ...extraHeaders });
  response.end(body);
}

function buildCorsHeaders(request) {
  const origin = cleanText(request.headers.origin || "").replace(/\/$/, "");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!existsSync(envPath)) return;
  const raw = existsSync(envPath) ? readFileSyncSafe(envPath) : "";
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function readFileSyncSafe(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
}

function matchFirst(text, regex) {
  return text.match(regex)?.[1] || "";
}

function stripTags(text) {
  return text.replace(/<[^>]+>/g, " ");
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function resolveAdminPasswordHash() {
  const hashed = cleanText(process.env.ADMIN_PASSWORD_HASH || "");
  if (hashed && hashed.includes(":")) return hashed;
  if (process.env.ADMIN_PASSWORD) return hashPassword(process.env.ADMIN_PASSWORD);
  if (process.env.ADMIN_DASHBOARD_KEY) return hashPassword(process.env.ADMIN_DASHBOARD_KEY);
  return "";
}

function verifyPassword(password, passwordHash) {
  if (!passwordHash || !passwordHash.includes(":")) return false;
  const [salt, expectedHash] = passwordHash.split(":");
  if (!salt || !expectedHash) return false;
  try {
    const actualHash = crypto.scryptSync(password, salt, 64).toString("hex");
    const actualBuffer = Buffer.from(actualHash, "hex");
    const expectedBuffer = Buffer.from(expectedHash, "hex");
    if (!actualBuffer.length || actualBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

function titleCaseWords(text) {
  return cleanText(text)
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part))
        .join("-"),
    )
    .join(" ");
}

function normalized(text) {
  return cleanText(text).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ");
}

function percent(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function makeId() {
  return crypto.randomBytes(8).toString("hex");
}
