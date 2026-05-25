import { supabase } from "@/lib/supabase";
import { isLocationAllowed } from "./location-filter";
import { callGemini } from "@/lib/claude";
import type { AgentResult } from "./types";
export type { CompanyCategory, CompanyConfig } from "./company-list";
export { COMPANIES } from "./company-list";
import { COMPANIES } from "./company-list";
import type { CompanyConfig } from "./company-list";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Web Scraper (Playwright) ─────────────────────────────────────────────────
// Used for companies with Workday/Oracle/custom portals that have no public API.
// Navigates the ML-filtered careers page and extracts job listings.

async function scrapeWebPage(config: CompanyConfig): Promise<{ found: number; saved: number }> {
  if (!config.careersUrl) throw new Error("careersUrl required for web scraper");

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    });

    await page.goto(config.careersUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    // Give JS-rendered pages time to populate
    await page.waitForTimeout(4000);

    // Extract all job-like links from the page
    const rawJobs = await page.evaluate(() => {
      const results: Array<{ title: string; location: string; url: string }> = [];
      const seen = new Set<string>();

      // Job URL patterns that indicate a job listing link
      const JOB_URL = /\/(job|jobs|career|careers|position|positions|opening|role|vacancy|requisition|apply|jobdetail)\//i;
      // Text to skip (nav items, buttons, etc.)
      const SKIP = /^(home|about|contact|login|sign|menu|close|back|next|prev|load more|view all|see all|apply now|learn more|read more|submit|cookie|privacy|terms|\d+)$/i;

      const links = Array.from(document.querySelectorAll("a[href]")) as HTMLAnchorElement[];

      for (const link of links) {
        const href = link.href;
        const title = link.textContent?.trim().replace(/\s+/g, " ") ?? "";

        if (!href || href === window.location.href || href.startsWith("javascript")) continue;
        if (title.length < 5 || title.length > 150) continue;
        if (SKIP.test(title)) continue;
        if (seen.has(href)) continue;

        // Must be in a job-related container OR have a job URL pattern
        const inJobContainer = !!link.closest(
          '[class*="job"], [class*="career"], [class*="position"], [class*="opening"], [class*="vacancy"], [class*="role"], [data-job], article, [class*="result"], [class*="listing"]'
        );
        if (!inJobContainer && !JOB_URL.test(href)) continue;

        seen.add(href);

        // Find location text in the parent card
        const card = link.closest(
          "li, tr, article, [class*='job'], [class*='card'], [class*='item'], [class*='row'], [class*='result'], [class*='listing']"
        ) ?? link.parentElement;
        const locEl = card?.querySelector(
          '[class*="location"], [class*="city"], [class*="place"], [class*="office"], [class*="country"]'
        );
        const location = locEl?.textContent?.trim().replace(/\s+/g, " ") ?? "";

        results.push({ title, location, url: href });
      }

      return results;
    });

    if (rawJobs.length === 0) {
      console.warn(`[company-scraper] ⚠ ${config.name}: Playwright extracted 0 links — page may have changed structure or requires auth`);
    }

    let found = 0, saved = 0;
    for (const job of rawJobs) {
      if (!isMlRelevant(job.title)) continue;
      const loc = job.location || "India";
      if (job.location && !isLocationAllowed(job.location)) continue;
      found++;
      if (await saveJob(config, job.title, loc, job.url, `${config.name} careers`)) saved++;
    }

    return { found, saved };
  } finally {
    await browser.close();
  }
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

// ─── Workday ──────────────────────────────────────────────────────────────────
// boardId format: "tenant/board" → POST https://{tenant}.wd5.myworkdayjobs.com/wday/cxs/{tenant}/{board}/jobs

interface WorkdayJob {
  title?: string;
  locationsText?: string;
  externalPath?: string;
  jobFamilyGroup?: string;
}

interface WorkdayResponse {
  jobPostings?: WorkdayJob[];
  total?: number;
}

async function scrapeWorkday(config: CompanyConfig): Promise<{ found: number; saved: number }> {
  if (!config.boardId) throw new Error("boardId (tenant/board) required for workday");

  const parts = config.boardId.split("/");
  if (parts.length < 2) throw new Error("boardId must be 'tenant/board' format");
  const [tenant, ...boardParts] = parts;
  const board = boardParts.join("/");

  const baseUrl = `https://${tenant}.wd5.myworkdayjobs.com`;
  const apiUrl = `${baseUrl}/wday/cxs/${tenant}/${board}/jobs`;
  const queries = ["machine learning", "data scientist", "artificial intelligence", "nlp engineer", "mlops"];

  const seen = new Set<string>();
  let found = 0, saved = 0;
  let firstAttempt = true;

  for (const q of queries) {
    try {
      const res = await fetchWithTimeout(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          Origin: baseUrl,
          Referer: `${baseUrl}/en-US/${board}`,
        },
        body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: q }),
      });

      if (!res.ok) {
        // On first query, throw with status so it shows as "failed" in logs — not silently 0
        if (firstAttempt) throw new Error(`HTTP ${res.status} — check boardId "${config.boardId}"`);
        continue;
      }
      firstAttempt = false;

      const data: WorkdayResponse = await res.json();
      for (const job of (data.jobPostings || [])) {
        const title = job.title || "";
        const location = job.locationsText || "";
        const path = job.externalPath || "";

        if (!title || !path || seen.has(path)) continue;
        seen.add(path);
        if (!isMlRelevant(title)) continue;
        if (location && !isLocationAllowed(location)) continue;

        const jobUrl = `${baseUrl}${path}`;
        found++;
        const dept = job.jobFamilyGroup || "Engineering";
        if (await saveJob(config, title, location || "India", jobUrl, `${config.name} · ${dept}`)) saved++;
      }
    } catch (err) {
      throw err; // always surface errors so they appear in the Logs tab
    }
  }

  return { found, saved };
}

// ─── LLM-powered scraper (Playwright + Gemini) ────────────────────────────────
// For ATS platforms with no public API (Eightfold, Oracle HCM, etc.)
// Renders the page with Playwright, sends content to Gemini, extracts jobs as JSON.

async function scrapeLLM(config: CompanyConfig): Promise<{ found: number; saved: number }> {
  if (!config.careersUrl) throw new Error("careersUrl required for llm scraper");

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  let pageText = "";
  let rawLinks: Array<{ text: string; href: string; context: string }> = [];

  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    });

    // Use networkidle so JS-heavy SPAs (AmEx, JPMorgan) finish loading before extraction
    await page.goto(config.careersUrl, { waitUntil: "networkidle", timeout: 45000 });
    // Extra wait for lazy-loaded job lists that render after initial network idle
    await page.waitForTimeout(4000);

    // Extract all links with their surrounding text context
    rawLinks = await page.evaluate(() => {
      const results: Array<{ text: string; href: string; context: string }> = [];
      const seen = new Set<string>();
      const links = Array.from(document.querySelectorAll("a[href]")) as HTMLAnchorElement[];
      for (const link of links) {
        const text = link.textContent?.trim().replace(/\s+/g, " ") ?? "";
        if (text.length < 4 || text.length > 200) continue;
        if (seen.has(link.href)) continue;
        seen.add(link.href);
        const card = link.closest("li, article, [class*='job'], [class*='card'], [class*='position'], [class*='result'], [class*='opening']") ?? link.parentElement;
        const context = card?.textContent?.trim().replace(/\s+/g, " ").slice(0, 150) ?? "";
        results.push({ text, href: link.href, context });
      }
      return results;
    });

    // Get visible page text (main content area, capped at 12k chars)
    pageText = await page.evaluate(() => {
      const main = document.querySelector("main, [role='main'], #content, .content, [class*='job-list'], [class*='results']") ?? document.body;
      return (main as HTMLElement).innerText?.replace(/\s+/g, " ").slice(0, 12000) ?? "";
    });
  } finally {
    await browser.close();
  }

  if (!pageText && rawLinks.length === 0) throw new Error("Page rendered empty — may need auth or longer wait");

  // Build prompt for Gemini
  const linkSummary = rawLinks
    .slice(0, 120)
    .map(l => `"${l.text}" → ${l.href}${l.context ? ` | ctx: ${l.context.slice(0, 100)}` : ""}`)
    .join("\n");

  const prompt = `You are parsing a job listings page for ${config.name}.
Extract every individual job posting you can find. For each job return:
- title: the exact job title
- location: city/country where the role is based (empty string if not found)
- url: the direct URL to that specific job posting

Page URL: ${config.careersUrl}

Page text (first 12k chars):
${pageText}

Links on page:
${linkSummary}

Return ONLY a valid JSON array, no markdown, no explanation:
[{"title":"...","location":"...","url":"..."}]

Only include actual job postings. Skip navigation links, category pages, and non-job links.`;

  const response = await callGemini(
    "You extract job listings from career pages. Return only valid JSON arrays.",
    prompt,
    4096,
  );

  // Parse LLM response — strip markdown fences if present
  let jobs: Array<{ title: string; location: string; url: string }> = [];
  try {
    const cleaned = response.replace(/```json\n?|```\n?/g, "").trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) jobs = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`LLM returned unparseable response: ${response.slice(0, 200)}`);
  }

  let found = 0, saved = 0;
  const seen = new Set<string>();

  for (const job of jobs) {
    const title = (job.title || "").trim();
    const location = (job.location || "").trim();
    const url = (job.url || "").trim();
    if (!title || !url || seen.has(url)) continue;
    seen.add(url);
    if (!isMlRelevant(title)) continue;
    if (location && !isLocationAllowed(location)) continue;
    found++;
    if (await saveJob(config, title, location || "India", url, `${config.name} careers`)) saved++;
  }

  return { found, saved };
}

// ─── Main Agent ───────────────────────────────────────────────────────────────

export async function runCompanyScraperAgent(slugs?: string[], customCompanies?: CompanyConfig[]): Promise<AgentResult> {
  const startTime = Date.now();

  let companies: CompanyConfig[];
  if (customCompanies?.length) {
    // Scrape user-provided companies not in the predefined list
    companies = customCompanies;
  } else {
    // Deduplicate companies (browserstack appears twice in list above — fix at runtime)
    const allCompanies = COMPANIES.filter(
      (c, i, arr) => arr.findIndex(x => x.slug === c.slug) === i,
    );
    // If specific slugs requested, filter to just those; otherwise run all
    companies = slugs?.length
      ? allCompanies.filter(c => slugs.includes(c.slug))
      : allCompanies;
  }

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
          case "web":        r = await scrapeWebPage(company);    break;
          case "google":     r = await scrapeGoogle(company);     break;
          case "amazon":     r = await scrapeAmazon(company);     break;
          case "apple":      r = await scrapeApple(company);      break;
          case "microsoft":  r = await scrapeMicrosoft(company);  break;
          case "workday":    r = await scrapeWorkday(company);    break;
          case "llm":
            if (process.env.VERCEL) {
              console.log(`[company-scraper] Skipping LLM/Playwright scraper on Vercel (no Chromium): ${company.name}`);
              r = { found: 0, saved: 0 };
            } else {
              r = await scrapeLLM(company);
            }
            break;
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
