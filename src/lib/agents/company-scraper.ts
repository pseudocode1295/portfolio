import { supabase } from "@/lib/supabase";
import { isLocationAllowed } from "./location-filter";
import type { AgentResult } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CompanyCategory = "FAANG" | "Big Tech" | "Product" | "Indian Unicorn" | "MNC" | "AI/ML" | "Data & Infra";

export interface CompanyConfig {
  name: string;
  slug: string;
  category: CompanyCategory;
  scrapeType: "greenhouse" | "lever" | "ashby" | "google" | "amazon" | "apple" | "microsoft";
  boardId?: string;   // greenhouse board ID
  companyId?: string; // lever company slug
}

export interface CompanyResult {
  name: string;
  slug: string;
  category: string;
  status: "pending" | "running" | "done" | "failed" | "skipped";
  found: number;
  saved: number;
  error?: string;
}

export interface CompanyProgress {
  totalCompanies: number;
  completedCompanies: number;
  currentCompany: string;
  totalFound: number;
  totalSaved: number;
  cancelled: boolean;
  companies: CompanyResult[];
}

// ─── Company List ─────────────────────────────────────────────────────────────

export const COMPANIES: CompanyConfig[] = [
  // ── FAANG (5) ──────────────────────────────────────────────────────────────
  { name: "Google",    slug: "google",    category: "FAANG", scrapeType: "google" },
  { name: "Amazon",    slug: "amazon",    category: "FAANG", scrapeType: "amazon" },
  { name: "Apple",     slug: "apple",     category: "FAANG", scrapeType: "apple" },
  { name: "Microsoft", slug: "microsoft", category: "FAANG", scrapeType: "microsoft" },
  // Meta uses its own portal (not Greenhouse); Netflix uses Workday — both removed
  { name: "Uber",      slug: "uber",      category: "FAANG", scrapeType: "greenhouse", boardId: "uberfreight" }, // verified

  // ── Big Tech (10) ─────────────────────────────────────────────────────────
  { name: "Airbnb",      slug: "airbnb",      category: "Big Tech", scrapeType: "greenhouse", boardId: "airbnb" },
  { name: "LinkedIn",    slug: "linkedin",    category: "Big Tech", scrapeType: "greenhouse", boardId: "linkedin" },
  { name: "Pinterest",   slug: "pinterest",   category: "Big Tech", scrapeType: "greenhouse", boardId: "pinterest" },
  { name: "Lyft",        slug: "lyft",        category: "Big Tech", scrapeType: "greenhouse", boardId: "lyft" },
  { name: "DoorDash",    slug: "doordash",    category: "Big Tech", scrapeType: "greenhouse", boardId: "doordashusa" }, // verified
  { name: "Palantir",    slug: "palantir",    category: "Big Tech", scrapeType: "lever",      companyId: "palantir" },
  { name: "Instacart",   slug: "instacart",   category: "Big Tech", scrapeType: "greenhouse", boardId: "instacart" },
  { name: "Reddit",      slug: "reddit",      category: "Big Tech", scrapeType: "greenhouse", boardId: "reddit" },
  { name: "Discord",     slug: "discord",     category: "Big Tech", scrapeType: "greenhouse", boardId: "discord" },
  { name: "Duolingo",    slug: "duolingo",    category: "Big Tech", scrapeType: "greenhouse", boardId: "duolingo" },
  // Adobe/Atlassian/Salesforce/Snap/Shopify/Twitter/X/Zoom use Workday or custom ATS — removed

  // ── Product Companies (24) ────────────────────────────────────────────────
  { name: "Stripe",      slug: "stripe",      category: "Product", scrapeType: "greenhouse", boardId: "stripe" },
  { name: "Figma",       slug: "figma",       category: "Product", scrapeType: "greenhouse", boardId: "figma" },
  { name: "Notion",      slug: "notion",      category: "Product", scrapeType: "ashby",      boardId: "notion" }, // uses Ashby
  { name: "Dropbox",     slug: "dropbox",     category: "Product", scrapeType: "greenhouse", boardId: "dropbox" },
  { name: "Grammarly",   slug: "grammarly",   category: "Product", scrapeType: "greenhouse", boardId: "grammarly" },
  { name: "Twilio",      slug: "twilio",      category: "Product", scrapeType: "greenhouse", boardId: "twilio" },
  { name: "Postman",     slug: "postman",     category: "Product", scrapeType: "greenhouse", boardId: "postman" }, // verified (was postmanlabs)
  { name: "Gong",        slug: "gong",        category: "Product", scrapeType: "greenhouse", boardId: "gongio" }, // verified
  { name: "Twitch",      slug: "twitch",      category: "Product", scrapeType: "greenhouse", boardId: "twitch" },
  { name: "HubSpot",     slug: "hubspot",     category: "Product", scrapeType: "greenhouse", boardId: "hubspot" },
  { name: "Datadog",     slug: "datadog",     category: "Product", scrapeType: "greenhouse", boardId: "datadog" }, // verified (was datadoghq)
  { name: "Cloudflare",  slug: "cloudflare",  category: "Product", scrapeType: "greenhouse", boardId: "cloudflare" },
  { name: "Coinbase",    slug: "coinbase",    category: "Product", scrapeType: "greenhouse", boardId: "coinbase" },
  { name: "Airtable",    slug: "airtable",    category: "Product", scrapeType: "greenhouse", boardId: "airtable" },
  { name: "Asana",       slug: "asana",       category: "Product", scrapeType: "greenhouse", boardId: "asana" },
  { name: "Miro",        slug: "miro",        category: "Product", scrapeType: "greenhouse", boardId: "realtimeboardglobal" }, // verified
  { name: "Robinhood",   slug: "robinhood",   category: "Product", scrapeType: "greenhouse", boardId: "robinhood" },
  { name: "Plaid",       slug: "plaid",       category: "Product", scrapeType: "lever",      companyId: "plaid" }, // verified on Lever
  { name: "Brex",        slug: "brex",        category: "Product", scrapeType: "greenhouse", boardId: "brex" }, // verified
  { name: "Linear",      slug: "linear",      category: "Product", scrapeType: "ashby",      boardId: "linear" }, // Ashby
  { name: "Ramp",        slug: "ramp",        category: "Product", scrapeType: "ashby",      boardId: "ramp" }, // Ashby
  { name: "Deel",        slug: "deel",        category: "Product", scrapeType: "lever",      companyId: "deel" },
  { name: "Box",         slug: "box",         category: "Product", scrapeType: "greenhouse", boardId: "box" },
  { name: "Intercom",    slug: "intercom",    category: "Product", scrapeType: "greenhouse", boardId: "intercom" },
  // Canva/Zendesk/Rippling/BrowserStack/Intuit/Zoom/Loom use Workday or custom ATS — removed

  // ── Indian Unicorns & Startups (22) ───────────────────────────────────────
  { name: "Razorpay",      slug: "razorpay",      category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "razorpay" },
  { name: "Freshworks",    slug: "freshworks",    category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "freshworks" },
  { name: "CRED",          slug: "cred",          category: "Indian Unicorn", scrapeType: "lever",      companyId: "cred" },
  { name: "Meesho",        slug: "meesho",        category: "Indian Unicorn", scrapeType: "lever",      companyId: "meesho" },
  { name: "Urban Company", slug: "urbancompany",  category: "Indian Unicorn", scrapeType: "lever",      companyId: "urbancompany" },
  { name: "Groww",         slug: "groww",         category: "Indian Unicorn", scrapeType: "lever",      companyId: "groww" },
  { name: "Zepto",         slug: "zepto",         category: "Indian Unicorn", scrapeType: "lever",      companyId: "zepto" },
  { name: "PhonePe",       slug: "phonepe",       category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "phonepe" },
  { name: "Swiggy",        slug: "swiggy",        category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "swiggy" },
  { name: "Zomato",        slug: "zomato",        category: "Indian Unicorn", scrapeType: "lever",      companyId: "zomato" },
  { name: "Nykaa",         slug: "nykaa",         category: "Indian Unicorn", scrapeType: "lever",      companyId: "nykaa" },
  { name: "Chargebee",     slug: "chargebee",     category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "chargebee" },
  { name: "CleverTap",     slug: "clevertap",     category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "clevertap" },
  { name: "Dream11",       slug: "dream11",       category: "Indian Unicorn", scrapeType: "lever",      companyId: "dream11" },
  { name: "Dunzo",         slug: "dunzo",         category: "Indian Unicorn", scrapeType: "lever",      companyId: "dunzo" },
  { name: "Ola",           slug: "ola",           category: "Indian Unicorn", scrapeType: "lever",      companyId: "ola-cabs" },
  { name: "Delhivery",     slug: "delhivery",     category: "Indian Unicorn", scrapeType: "lever",      companyId: "delhivery" },
  { name: "MoEngage",      slug: "moengage",      category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "moengage" },
  { name: "Darwinbox",     slug: "darwinbox",     category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "darwinbox" },
  { name: "InMobi",        slug: "inmobi",        category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "inmobi" },
  { name: "Leadsquared",   slug: "leadsquared",   category: "Indian Unicorn", scrapeType: "greenhouse", boardId: "leadsquared" },
  { name: "Exotel",        slug: "exotel",        category: "Indian Unicorn", scrapeType: "lever",      companyId: "exotel" },

  // ── MNCs in India (12) ────────────────────────────────────────────────────
  { name: "PayPal",            slug: "paypal",    category: "MNC", scrapeType: "greenhouse", boardId: "paypal" },
  { name: "Walmart Global Tech", slug: "walmart", category: "MNC", scrapeType: "greenhouse", boardId: "walmartglobaltech" },
  { name: "Cisco",             slug: "cisco",     category: "MNC", scrapeType: "greenhouse", boardId: "cisco" },
  { name: "Workday",           slug: "workday",   category: "MNC", scrapeType: "greenhouse", boardId: "workday" },
  { name: "Wayfair",           slug: "wayfair",   category: "MNC", scrapeType: "greenhouse", boardId: "wayfair" },
  { name: "ThoughtWorks",      slug: "thoughtworks", category: "MNC", scrapeType: "greenhouse", boardId: "thoughtworks" },
  { name: "EPAM Systems",      slug: "epam",      category: "MNC", scrapeType: "greenhouse", boardId: "epamsystems" },
  { name: "GlobalLogic",       slug: "globallogic", category: "MNC", scrapeType: "greenhouse", boardId: "globallogic" },
  { name: "Publicis Sapient",  slug: "sapient",   category: "MNC", scrapeType: "lever",      companyId: "publicis-sapient" },
  { name: "Elastic",           slug: "elastic",   category: "MNC", scrapeType: "greenhouse", boardId: "elastic" },
  { name: "Splunk",            slug: "splunk",    category: "MNC", scrapeType: "greenhouse", boardId: "splunk" },
  { name: "Okta",              slug: "okta",      category: "MNC", scrapeType: "greenhouse", boardId: "okta" },

  // ── AI / ML Companies (10) ────────────────────────────────────────────────
  { name: "OpenAI",              slug: "openai",      category: "AI/ML", scrapeType: "greenhouse", boardId: "openai" },
  { name: "Anthropic",           slug: "anthropic",   category: "AI/ML", scrapeType: "lever",      companyId: "anthropic" },
  { name: "Cohere",              slug: "cohere",      category: "AI/ML", scrapeType: "greenhouse", boardId: "cohere" },
  { name: "Scale AI",            slug: "scaleai",     category: "AI/ML", scrapeType: "greenhouse", boardId: "scaleai" },
  { name: "Hugging Face",        slug: "huggingface", category: "AI/ML", scrapeType: "lever",      companyId: "huggingface" },
  { name: "Weights & Biases",    slug: "wandb",       category: "AI/ML", scrapeType: "greenhouse", boardId: "wandb" },
  { name: "Stability AI",        slug: "stabilityai", category: "AI/ML", scrapeType: "lever",      companyId: "stability-ai" },
  { name: "Mistral AI",          slug: "mistral",     category: "AI/ML", scrapeType: "lever",      companyId: "mistral" },
  { name: "Runway",              slug: "runway",      category: "AI/ML", scrapeType: "lever",      companyId: "runwayml" },
  { name: "Together AI",         slug: "togetherai",  category: "AI/ML", scrapeType: "greenhouse", boardId: "togetherai" },

  // ── Data & Infrastructure (10) ────────────────────────────────────────────
  { name: "MongoDB",     slug: "mongodb",     category: "Data & Infra", scrapeType: "greenhouse", boardId: "mongodb" },
  { name: "Snowflake",   slug: "snowflake",   category: "Data & Infra", scrapeType: "greenhouse", boardId: "snowflake" },
  { name: "Databricks",  slug: "databricks",  category: "Data & Infra", scrapeType: "greenhouse", boardId: "databricks" },
  { name: "Confluent",   slug: "confluent",   category: "Data & Infra", scrapeType: "greenhouse", boardId: "confluent" },
  { name: "HashiCorp",   slug: "hashicorp",   category: "Data & Infra", scrapeType: "greenhouse", boardId: "hashicorp" },
  { name: "GitLab",      slug: "gitlab",      category: "Data & Infra", scrapeType: "greenhouse", boardId: "gitlab" },
  { name: "PagerDuty",   slug: "pagerduty",   category: "Data & Infra", scrapeType: "greenhouse", boardId: "pagerduty" },
  { name: "Vercel",      slug: "vercel",      category: "Data & Infra", scrapeType: "lever",      companyId: "vercel" },
  { name: "Retool",      slug: "retool",      category: "Data & Infra", scrapeType: "greenhouse", boardId: "retool" },
  { name: "Airbyte",     slug: "airbyte",     category: "Data & Infra", scrapeType: "greenhouse", boardId: "airbyte" },
];

// ─── ML/AI Relevance ──────────────────────────────────────────────────────────

const ML_KEYWORDS = [
  "machine learning", "ml engineer", "ai engineer", "artificial intelligence",
  "deep learning", "data scientist", "nlp", "natural language processing",
  "computer vision", "llm", "large language", "generative ai", "gen ai",
  "mlops", "ml platform", "applied scientist", "research scientist",
  "applied ml", "recommendation", "reinforcement learning", "neural network",
  "data science", "ml research", "foundation model", "multimodal",
];

export function isMlRelevant(title: string): boolean {
  const t = title.toLowerCase();
  return ML_KEYWORDS.some(kw => t.includes(kw));
}

function computeRelevance(title: string): number {
  const t = title.toLowerCase();
  let score = 0.65;

  const titleMatches = ML_KEYWORDS.filter(kw => t.includes(kw)).length;
  score += Math.min(titleMatches * 0.1, 0.2);

  if (/senior|lead|principal|staff|\bii\b|\biii\b/.test(t)) score += 0.08;
  if (/junior|entry.?level|intern|fresher|graduate/.test(t)) score -= 0.25;

  return Math.min(0.97, Math.max(0.45, score));
}

// ─── Utilities ────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CareerBot/1.0)", ...(options.headers || {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function isCancelRequested(): Promise<boolean> {
  const { data } = await supabase.from("stats_cache").select("value").eq("key", "company_scraper_cancel").single();
  return data?.value === true;
}

async function saveJob(
  company: CompanyConfig,
  title: string,
  location: string,
  jobUrl: string,
  description: string,
): Promise<boolean> {
  if (!jobUrl || !title) return false;
  const relevance = computeRelevance(title);
  const { error } = await supabase.from("jobs").upsert(
    {
      title,
      company: company.name,
      location: location || "Remote",
      job_url: jobUrl,
      source: `company_${company.slug}`,
      description: description || `${company.name} career opportunity`,
      required_skills: [],
      status: "discovered",
      relevance_score: relevance,
    },
    { onConflict: "job_url", ignoreDuplicates: true },
  );
  return !error;
}

// ─── Greenhouse ───────────────────────────────────────────────────────────────

interface GHJob {
  title: string;
  location: { name: string };
  departments: { name: string }[];
  absolute_url: string;
}

async function scrapeGreenhouse(config: CompanyConfig): Promise<{ found: number; saved: number }> {
  const res = await fetchWithTimeout(`https://api.greenhouse.io/v1/boards/${config.boardId}/jobs`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  const jobs: GHJob[] = data.jobs || [];
  let found = 0, saved = 0;

  for (const job of jobs) {
    const title = job.title || "";
    const location = job.location?.name || "";
    if (!isMlRelevant(title)) continue;
    if (!isLocationAllowed(location)) continue;
    found++;
    const dept = job.departments?.[0]?.name || "Engineering";
    if (await saveJob(config, title, location, job.absolute_url, `${config.name} · ${dept}`)) saved++;
  }
  return { found, saved };
}

// ─── Lever ────────────────────────────────────────────────────────────────────

interface LeverJob {
  text: string;
  categories: { location?: string; team?: string; department?: string };
  hostedUrl: string;
}

async function scrapeLever(config: CompanyConfig): Promise<{ found: number; saved: number }> {
  const res = await fetchWithTimeout(`https://api.lever.co/v0/postings/${config.companyId}?mode=json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const jobs: LeverJob[] = await res.json();
  let found = 0, saved = 0;

  for (const job of jobs) {
    const title = job.text || "";
    const location = job.categories?.location || "";
    if (!isMlRelevant(title)) continue;
    if (!isLocationAllowed(location)) continue;
    found++;
    const team = job.categories?.team || job.categories?.department || "Engineering";
    if (await saveJob(config, title, location, job.hostedUrl, `${config.name} · ${team}`)) saved++;
  }
  return { found, saved };
}

// ─── Ashby ────────────────────────────────────────────────────────────────────

interface AshbyJob {
  title: string;
  locationName?: string;
  jobUrl: string;
  departmentName?: string;
}

async function scrapeAshby(config: CompanyConfig): Promise<{ found: number; saved: number }> {
  const res = await fetchWithTimeout(
    `https://api.ashbyhq.com/posting-api/job-board/${config.boardId}?includeCompensation=false`,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  const jobs: AshbyJob[] = data.jobPostings || data.jobs || [];
  let found = 0, saved = 0;

  for (const job of jobs) {
    const title = job.title || "";
    const location = job.locationName || "";
    if (!isMlRelevant(title)) continue;
    if (location && !isLocationAllowed(location)) continue;
    found++;
    const dept = job.departmentName || "Engineering";
    if (await saveJob(config, title, location || "Remote", job.jobUrl, `${config.name} · ${dept}`)) saved++;
  }
  return { found, saved };
}

// ─── Google Careers ───────────────────────────────────────────────────────────

async function scrapeGoogle(config: CompanyConfig): Promise<{ found: number; saved: number }> {
  let found = 0, saved = 0;
  const queries = ["machine learning engineer", "data scientist", "AI engineer", "applied scientist"];

  for (const q of queries) {
    try {
      const url = `https://careers.google.com/api/jobs/jobs.json?q=${encodeURIComponent(q)}&location=India&page_size=20&sort_by=date`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) continue;

      const data = await res.json();
      for (const job of (data.jobs || [])) {
        const title: string = job.title || "";
        const locs: string[] = job.locations || [];
        const location = locs[0] || "India";
        const applyUrl: string = job.apply_url || `https://careers.google.com/jobs/results/${job.id}`;

        if (!isMlRelevant(title)) continue;
        if (!isLocationAllowed(location)) continue;
        found++;
        if (await saveJob(config, title, location, applyUrl, "Google Careers")) saved++;
      }
    } catch { continue; }
  }
  return { found, saved };
}

// ─── Amazon Jobs ──────────────────────────────────────────────────────────────

async function scrapeAmazon(config: CompanyConfig): Promise<{ found: number; saved: number }> {
  let found = 0, saved = 0;
  const queries = ["machine learning", "data scientist", "applied scientist", "nlp engineer"];

  for (const q of queries) {
    try {
      const url = `https://www.amazon.jobs/en/search.json?query=${encodeURIComponent(q)}&normalized_location%5B%5D=India&result_limit=20&sort=recent`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) continue;

      const data = await res.json();
      for (const job of (data.jobs || [])) {
        const title: string = job.title || "";
        const location: string = job.location || "";
        const jobUrl: string = job.url_next_step
          ? `https://www.amazon.jobs${job.url_next_step}`
          : `https://www.amazon.jobs/en/jobs/${job.id_icims}`;

        if (!isMlRelevant(title)) continue;
        if (!isLocationAllowed(location)) continue;
        found++;
        if (await saveJob(config, title, location, jobUrl, `Amazon · ${job.category || "Engineering"}`)) saved++;
      }
    } catch { continue; }
  }
  return { found, saved };
}

// ─── Apple Jobs ───────────────────────────────────────────────────────────────

async function scrapeApple(config: CompanyConfig): Promise<{ found: number; saved: number }> {
  let found = 0, saved = 0;
  try {
    const url = `https://jobs.apple.com/api/role/search?query=machine+learning+engineer&filters.location=india&filters.homeOffice=0&page=0`;
    const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    for (const job of (data.searchResults || [])) {
      const title: string = job.postingTitle || job.title || "";
      const locs: string[] = job.locations || [];
      const location = locs.join(", ") || "India";
      const jobUrl = `https://jobs.apple.com/en-us/details/${job.id}`;

      if (!isMlRelevant(title)) continue;
      if (!isLocationAllowed(location)) continue;
      found++;
      if (await saveJob(config, title, location, jobUrl, `Apple · ${job.team?.teamName || "Engineering"}`)) saved++;
    }
  } catch { /* Apple API may vary */ }
  return { found, saved };
}

// ─── Microsoft Careers ────────────────────────────────────────────────────────

async function scrapeMicrosoft(config: CompanyConfig): Promise<{ found: number; saved: number }> {
  let found = 0, saved = 0;
  const queries = ["machine learning", "data scientist", "AI engineer"];

  for (const q of queries) {
    try {
      const url = `https://gcsservices.careers.microsoft.com/search/api/v1/search?q=${encodeURIComponent(q)}&l=india&exp=Experienced+professionals&pg=1&pgSz=20&lc=en_us`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) continue;

      const data = await res.json();
      const jobs = data.operationResult?.result?.jobs || [];

      for (const job of jobs) {
        const title: string = job.title || "";
        const location: string = job.location || "";
        const jobUrl: string = job.jobPostingLink || `https://careers.microsoft.com/professionals/us/en/job/${job.jobId}`;

        if (!isMlRelevant(title)) continue;
        if (!isLocationAllowed(location)) continue;
        found++;
        if (await saveJob(config, title, location, jobUrl, "Microsoft Careers")) saved++;
      }
    } catch { continue; }
  }
  return { found, saved };
}

// ─── Main Agent ───────────────────────────────────────────────────────────────

export async function runCompanyScraperAgent(): Promise<AgentResult> {
  const startTime = Date.now();

  // Deduplicate companies (browserstack appears twice in list above — fix at runtime)
  const companies = COMPANIES.filter(
    (c, i, arr) => arr.findIndex(x => x.slug === c.slug) === i,
  );

  const { data: logEntry } = await supabase
    .from("agent_logs")
    .insert({ agent_name: "company_scraper", status: "running", summary: "{}" })
    .select().single();

  const logId = logEntry?.id;
  await supabase.from("stats_cache").upsert({ key: "company_scraper_running_id", value: logId });
  await supabase.from("stats_cache").upsert({ key: "company_scraper_cancel", value: false });

  const progress: CompanyProgress = {
    totalCompanies: companies.length,
    completedCompanies: 0,
    currentCompany: "Starting...",
    totalFound: 0,
    totalSaved: 0,
    cancelled: false,
    companies: companies.map(c => ({
      name: c.name, slug: c.slug, category: c.category,
      status: "pending", found: 0, saved: 0,
    })),
  };

  const updateProgress = async () => {
    if (logId) {
      await supabase.from("agent_logs").update({
        summary: JSON.stringify(progress),
        jobs_found: progress.totalSaved,
      }).eq("id", logId);
    }
  };

  await updateProgress();

  try {
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const result = progress.companies[i];

      if (await isCancelRequested()) {
        progress.cancelled = true;
        progress.currentCompany = "Cancelled";
        await updateProgress();
        break;
      }

      result.status = "running";
      progress.currentCompany = company.name;
      await updateProgress();

      try {
        let r: { found: number; saved: number };

        switch (company.scrapeType) {
          case "greenhouse": r = await scrapeGreenhouse(company); break;
          case "lever":      r = await scrapeLever(company);      break;
          case "ashby":      r = await scrapeAshby(company);      break;
          case "google":     r = await scrapeGoogle(company);     break;
          case "amazon":     r = await scrapeAmazon(company);     break;
          case "apple":      r = await scrapeApple(company);      break;
          case "microsoft":  r = await scrapeMicrosoft(company);  break;
          default:           r = { found: 0, saved: 0 };
        }

        result.found = r.found;
        result.saved = r.saved;
        result.status = "done";
        progress.totalFound += r.found;
        progress.totalSaved += r.saved;
      } catch (err) {
        result.status = "failed";
        result.error = err instanceof Error ? err.message : String(err);
      }

      progress.completedCompanies++;
      await updateProgress();

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 400));
    }

    const summary = `Scraped ${progress.completedCompanies}/${progress.totalCompanies} companies · ${progress.totalFound} ML jobs found · ${progress.totalSaved} saved`;

    await supabase.from("agent_logs").update({
      status: "completed",
      summary: JSON.stringify({ ...progress, currentCompany: "Done" }),
      jobs_found: progress.totalSaved,
      actions_taken: progress.totalSaved,
      duration_ms: Date.now() - startTime,
    }).eq("id", logId);
    await supabase.from("stats_cache").upsert({ key: "company_scraper_running_id", value: null });

    return { success: true, summary, jobsFound: progress.totalSaved, actionsTaken: progress.totalSaved };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await supabase.from("agent_logs").update({
      status: "failed", error_message: msg,
      summary: JSON.stringify(progress), duration_ms: Date.now() - startTime,
    }).eq("id", logId);
    await supabase.from("stats_cache").upsert({ key: "company_scraper_running_id", value: null });
    return { success: false, summary: "Company scraper failed", error: msg };
  }
}
