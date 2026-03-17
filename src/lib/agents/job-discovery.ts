import { supabase } from "@/lib/supabase";
import { notify } from "@/lib/whatsapp";
import type { AgentResult, ScrapedJob } from "./types";

// ─── Feed Definitions ────────────────────────────────────────────────────────

const RSS_FEEDS = [
  // Indeed India
  { source: "indeed", type: "rss", url: "https://in.indeed.com/rss?q=Senior+ML+Engineer+GenAI&l=India&sort=date" },
  { source: "indeed", type: "rss", url: "https://in.indeed.com/rss?q=LLM+Engineer+AI+Platform&l=India&sort=date" },
  { source: "indeed", type: "rss", url: "https://in.indeed.com/rss?q=Machine+Learning+Engineer&l=India&sort=date" },
  { source: "indeed", type: "rss", url: "https://in.indeed.com/rss?q=GenAI+Engineer+Python&l=India&sort=date" },
  { source: "indeed", type: "rss", url: "https://in.indeed.com/rss?q=Applied+Scientist+AI&l=India&sort=date" },

  // TimesJobs India (RSS)
  { source: "timesjobs", type: "rss", url: "https://www.timesjobs.com/candidate/job-search.html?searchType=personalizedSearch&from=submit&txtKeywords=ML+Engineer&txtLocation=India&rssFeed=true" },
  { source: "timesjobs", type: "rss", url: "https://www.timesjobs.com/candidate/job-search.html?searchType=personalizedSearch&from=submit&txtKeywords=Machine+Learning&txtLocation=India&rssFeed=true" },

  // We Work Remotely (RSS - remote ML/AI roles)
  { source: "weworkremotely", type: "rss", url: "https://weworkremotely.com/categories/remote-programming-jobs.rss" },
  { source: "weworkremotely", type: "rss", url: "https://weworkremotely.com/categories/remote-data-science-jobs.rss" },
];

const JSON_APIS = [
  // Remotive — free JSON API, remote tech jobs
  {
    source: "remotive",
    url: "https://remotive.com/api/remote-jobs?category=software-dev&limit=50",
    parser: parseRemotive,
  },
  {
    source: "remotive",
    url: "https://remotive.com/api/remote-jobs?category=data&limit=50",
    parser: parseRemotive,
  },
  // Jobicy — free JSON API, remote jobs
  {
    source: "jobicy",
    url: "https://jobicy.com/api/v2/remote-jobs?tag=machine-learning&count=30",
    parser: parseJobicy,
  },
  {
    source: "jobicy",
    url: "https://jobicy.com/api/v2/remote-jobs?tag=artificial-intelligence&count=30",
    parser: parseJobicy,
  },
];

// ─── Parsers ─────────────────────────────────────────────────────────────────

const SKILL_KEYWORDS = [
  "Python", "TensorFlow", "PyTorch", "LangChain", "Azure", "AWS", "GCP",
  "MLflow", "Spark", "Docker", "Kubernetes", "RAG", "LLM", "GenAI", "SQL",
  "Scala", "Databricks", "FastAPI", "HuggingFace", "OpenAI", "Transformers",
];

function extractSkills(text: string): string[] {
  return SKILL_KEYWORDS.filter(s => text.toLowerCase().includes(s.toLowerCase()));
}

function cleanHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
}

function parseRSS(xml: string, source: string): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const item of items) {
    const get = (tag: string) =>
      item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`))?.[1] ||
      item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1] || "";

    const title = get("title").trim();
    const link = (get("link") || get("guid")).trim();
    const description = cleanHtml(get("description"));
    const company = get("source").trim() || "Unknown";
    const location = get("location").trim() || "India";

    if (!title || !link) continue;

    jobs.push({
      title,
      company,
      location,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: "INR",
      jobUrl: link,
      source,
      description,
      requiredSkills: extractSkills(description),
      jobIdExternal: link.match(/jk=([a-z0-9]+)/i)?.[1] || null,
    });
  }
  return jobs;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseRemotive(data: any, source: string): ScrapedJob[] {
  const jobs = data?.jobs ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jobs.map((j: any): ScrapedJob => ({
    title: j.title || "",
    company: j.company_name || "Unknown",
    location: j.candidate_required_location || "Remote",
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: "USD",
    jobUrl: j.url || "",
    source,
    description: cleanHtml(j.description || "").slice(0, 400),
    requiredSkills: extractSkills((j.tags || []).join(" ") + " " + (j.description || "")),
    jobIdExternal: String(j.id || ""),
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJobicy(data: any, source: string): ScrapedJob[] {
  const jobs = data?.jobs ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jobs.map((j: any): ScrapedJob => ({
    title: j.jobTitle || "",
    company: j.companyName || "Unknown",
    location: j.jobGeo || "Remote",
    salaryMin: j.annualSalaryMin ? Math.round(j.annualSalaryMin / 83000) : null, // USD → LPA approx
    salaryMax: j.annualSalaryMax ? Math.round(j.annualSalaryMax / 83000) : null,
    salaryCurrency: j.salaryCurrency || "USD",
    jobUrl: j.url || "",
    source,
    description: cleanHtml(j.jobDescription || "").slice(0, 400),
    requiredSkills: extractSkills((j.jobIndustry || "") + " " + (j.jobDescription || "")),
    jobIdExternal: String(j.id || ""),
  }));
}

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function fetchRSS(url: string, source: string): Promise<ScrapedJob[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JobBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    return parseRSS(await res.text(), source);
  } catch {
    return [];
  }
}

async function fetchJSON(
  url: string,
  source: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parser: (data: any, source: string) => ScrapedJob[]
): Promise<ScrapedJob[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JobBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    return parser(await res.json(), source);
  } catch {
    return [];
  }
}

// ─── Relevance Scoring ───────────────────────────────────────────────────────

function scoreJobRelevance(job: ScrapedJob): number {
  let score = 0.35;
  const t = (job.title || "").toLowerCase();
  const d = (job.description || "").toLowerCase();

  const roleHits = ["ml", "machine learning", "genai", "llm", "ai platform",
    "applied scientist", "ai engineer", "deep learning", "nlp"];
  if (roleHits.some(k => t.includes(k))) score += 0.3;

  if (t.includes("senior") || t.includes("lead") || t.includes("principal") || t.includes("staff")) score += 0.1;
  if (t.includes("intern") || t.includes("junior") || t.includes("fresher")) score -= 0.25;

  const skillHits = ["python", "llm", "langchain", "azure", "mlflow", "rag",
    "transformer", "pytorch", "tensorflow", "generative", "openai", "huggingface"];
  score += Math.min(skillHits.filter(s => d.includes(s)).length * 0.05, 0.2);

  if (job.salaryMin && job.salaryMin < 25) score -= 0.3;

  return Math.min(1, Math.max(0, score));
}

// ─── Save to DB ──────────────────────────────────────────────────────────────

async function saveJobs(jobs: ScrapedJob[]): Promise<number> {
  let saved = 0;
  for (const job of jobs) {
    if (!job.jobUrl || !job.title) continue;
    const relevanceScore = scoreJobRelevance(job);
    if (relevanceScore < 0.4) continue;

    const { error } = await supabase.from("jobs").upsert(
      {
        title: job.title,
        company: job.company,
        location: job.location,
        salary_min: job.salaryMin ?? null,
        salary_max: job.salaryMax ?? null,
        salary_currency: job.salaryCurrency ?? "INR",
        job_url: job.jobUrl,
        source: job.source,
        description: job.description ?? null,
        required_skills: job.requiredSkills ?? [],
        job_id_external: job.jobIdExternal ?? null,
        status: "discovered",
        relevance_score: relevanceScore,
      },
      { onConflict: "job_url", ignoreDuplicates: true }
    );
    if (!error) saved++;
  }
  return saved;
}

// ─── Main Agent ──────────────────────────────────────────────────────────────

export async function runJobDiscoveryAgent(): Promise<AgentResult> {
  const startTime = Date.now();
  let totalSaved = 0;
  const newCompanies: string[] = [];

  const { data: logEntry } = await supabase
    .from("agent_logs")
    .insert({ agent_name: "job_discovery", status: "running", summary: "Starting job discovery" })
    .select()
    .single();

  try {
    // Fetch all sources in parallel
    const [rssResults, jsonResults] = await Promise.all([
      Promise.all(RSS_FEEDS.map(f => fetchRSS(f.url, f.source))),
      Promise.all(JSON_APIS.map(f => fetchJSON(f.url, f.source, f.parser))),
    ]);

    const allJobs = [...rssResults.flat(), ...jsonResults.flat()];

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueJobs = allJobs.filter(j => {
      if (!j.jobUrl || seen.has(j.jobUrl)) return false;
      seen.add(j.jobUrl);
      return true;
    });

    totalSaved = await saveJobs(uniqueJobs);

    uniqueJobs
      .filter(j => scoreJobRelevance(j) >= 0.4)
      .slice(0, 5)
      .forEach(j => {
        if (j.company && !newCompanies.includes(j.company)) {
          newCompanies.push(`${j.title} @ ${j.company}`);
        }
      });

    if (totalSaved > 0) {
      await notify.newJobs(totalSaved, newCompanies);
    }

    await supabase.from("agent_logs").update({
      status: "completed",
      summary: `Scanned ${uniqueJobs.length} jobs across ${RSS_FEEDS.length + JSON_APIS.length} sources, saved ${totalSaved} relevant`,
      jobs_found: totalSaved,
      actions_taken: totalSaved,
      duration_ms: Date.now() - startTime,
    }).eq("id", logEntry?.id);

    return {
      success: true,
      summary: `Discovered ${totalSaved} new jobs (scanned ${uniqueJobs.length} from ${RSS_FEEDS.length + JSON_APIS.length} sources)`,
      jobsFound: totalSaved,
      actionsTaken: totalSaved,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await supabase.from("agent_logs").update({
      status: "failed",
      error_message: msg,
      duration_ms: Date.now() - startTime,
    }).eq("id", logEntry?.id);
    await notify.agentError("job_discovery", msg);
    return { success: false, summary: "Job discovery failed", error: msg };
  }
}
