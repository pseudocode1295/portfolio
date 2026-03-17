import { supabase } from "@/lib/supabase";
import { notify } from "@/lib/whatsapp";
import { isLocationAllowed } from "./location-filter";
import type { AgentResult, ScrapedJob } from "./types";

// ─── Feed Definitions ────────────────────────────────────────────────────────

interface Feed {
  label: string;
  source: string;
  type: "rss" | "json";
  url: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parser?: (data: any, source: string) => ScrapedJob[];
}

const FEEDS: Feed[] = [
  // Indeed India
  { label: "Indeed — Senior ML Engineer (India)", source: "indeed", type: "rss", url: "https://in.indeed.com/rss?q=Senior+ML+Engineer+GenAI&l=India&sort=date" },
  { label: "Indeed — LLM Engineer AI Platform (India)", source: "indeed", type: "rss", url: "https://in.indeed.com/rss?q=LLM+Engineer+AI+Platform&l=India&sort=date" },
  { label: "Indeed — Machine Learning Engineer (India)", source: "indeed", type: "rss", url: "https://in.indeed.com/rss?q=Machine+Learning+Engineer&l=India&sort=date" },
  { label: "Indeed — GenAI Engineer Python (India)", source: "indeed", type: "rss", url: "https://in.indeed.com/rss?q=GenAI+Engineer+Python&l=India&sort=date" },
  { label: "Indeed — Applied Scientist AI (India)", source: "indeed", type: "rss", url: "https://in.indeed.com/rss?q=Applied+Scientist+AI&l=India&sort=date" },
  // LinkedIn
  { label: "LinkedIn — Senior ML Engineer (India, 24h)", source: "linkedin", type: "rss", url: "https://www.linkedin.com/jobs/search/?keywords=Senior+ML+Engineer&location=India&f_TPR=r86400&rssFeed=1&rssId=1" },
  { label: "LinkedIn — GenAI Engineer (India, 24h)", source: "linkedin", type: "rss", url: "https://www.linkedin.com/jobs/search/?keywords=GenAI+Engineer&location=India&f_TPR=r86400&rssFeed=1&rssId=2" },
  { label: "LinkedIn — LLM Engineer (India, 24h)", source: "linkedin", type: "rss", url: "https://www.linkedin.com/jobs/search/?keywords=LLM+Engineer&location=India&f_TPR=r86400&rssFeed=1&rssId=3" },
  { label: "LinkedIn — AI Platform Engineer (India, 24h)", source: "linkedin", type: "rss", url: "https://www.linkedin.com/jobs/search/?keywords=AI+Platform+Engineer&location=India&f_TPR=r86400&rssFeed=1&rssId=4" },
  { label: "LinkedIn — ML Engineer Senior (India, 24h)", source: "linkedin", type: "rss", url: "https://www.linkedin.com/jobs/search/?keywords=Machine+Learning+Engineer&location=India&f_E=4%2C5&f_TPR=r86400&rssFeed=1&rssId=5" },
  // TimesJobs
  { label: "TimesJobs — ML Engineer (India)", source: "timesjobs", type: "rss", url: "https://www.timesjobs.com/candidate/job-search.html?searchType=personalizedSearch&from=submit&txtKeywords=ML+Engineer&txtLocation=India&rssFeed=true" },
  { label: "TimesJobs — Machine Learning (India)", source: "timesjobs", type: "rss", url: "https://www.timesjobs.com/candidate/job-search.html?searchType=personalizedSearch&from=submit&txtKeywords=Machine+Learning&txtLocation=India&rssFeed=true" },
  // We Work Remotely
  { label: "We Work Remotely — Programming Jobs", source: "weworkremotely", type: "rss", url: "https://weworkremotely.com/categories/remote-programming-jobs.rss" },
  { label: "We Work Remotely — Data Science Jobs", source: "weworkremotely", type: "rss", url: "https://weworkremotely.com/categories/remote-data-science-jobs.rss" },
  // Remotive
  { label: "Remotive — Software Dev (Remote)", source: "remotive", type: "json", url: "https://remotive.com/api/remote-jobs?category=software-dev&limit=50", parser: parseRemotive },
  { label: "Remotive — Data Jobs (Remote)", source: "remotive", type: "json", url: "https://remotive.com/api/remote-jobs?category=data&limit=50", parser: parseRemotive },
  // Jobicy
  { label: "Jobicy — Machine Learning (Remote)", source: "jobicy", type: "json", url: "https://jobicy.com/api/v2/remote-jobs?tag=machine-learning&count=30", parser: parseJobicy },
  { label: "Jobicy — Artificial Intelligence (Remote)", source: "jobicy", type: "json", url: "https://jobicy.com/api/v2/remote-jobs?tag=artificial-intelligence&count=30", parser: parseJobicy },
];

// ─── Progress tracking ────────────────────────────────────────────────────────

export interface FeedProgress {
  label: string;
  source: string;
  status: "pending" | "running" | "done" | "skipped";
  found: number;
  saved: number;
}

export interface DiscoveryProgress {
  totalFeeds: number;
  completedFeeds: number;
  currentFeed: string;
  totalFound: number;
  totalSaved: number;
  cancelled: boolean;
  feeds: FeedProgress[];
}

async function updateProgress(logId: string, progress: DiscoveryProgress) {
  await supabase.from("agent_logs").update({
    summary: JSON.stringify(progress),
    jobs_found: progress.totalFound,
    actions_taken: progress.totalSaved,
  }).eq("id", logId);
}

async function isCancelRequested(): Promise<boolean> {
  const { data } = await supabase
    .from("stats_cache")
    .select("value")
    .eq("key", "job_discovery_cancel")
    .single();
  return data?.value === true;
}

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
    if (!title || !link) continue;
    const description = cleanHtml(get("description"));
    jobs.push({
      title,
      company: get("source").trim() || "Unknown",
      location: get("location").trim() || "India",
      jobUrl: link,
      source,
      description,
      requiredSkills: extractSkills(description),
      jobIdExternal: link.match(/jk=([a-z0-9]+)/i)?.[1] ?? undefined,
    });
  }
  return jobs;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseRemotive(data: any, source: string): ScrapedJob[] {
  return (data?.jobs ?? []).map((j: Record<string, unknown>): ScrapedJob => ({
    title: String(j.title || ""),
    company: String(j.company_name || "Unknown"),
    location: String(j.candidate_required_location || "Remote"),
    salaryCurrency: "USD",
    jobUrl: String(j.url || ""),
    source,
    description: cleanHtml(String(j.description || "")).slice(0, 400),
    requiredSkills: extractSkills((j.tags as string[] || []).join(" ") + " " + String(j.description || "")),
    jobIdExternal: String(j.id || "") || undefined,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJobicy(data: any, source: string): ScrapedJob[] {
  return (data?.jobs ?? []).map((j: Record<string, unknown>): ScrapedJob => ({
    title: String(j.jobTitle || ""),
    company: String(j.companyName || "Unknown"),
    location: String(j.jobGeo || "Remote"),
    salaryMin: j.annualSalaryMin ? Math.round(Number(j.annualSalaryMin) / 83000) : undefined,
    salaryMax: j.annualSalaryMax ? Math.round(Number(j.annualSalaryMax) / 83000) : undefined,
    salaryCurrency: String(j.salaryCurrency || "USD"),
    jobUrl: String(j.url || ""),
    source,
    description: cleanHtml(String(j.jobDescription || "")).slice(0, 400),
    requiredSkills: extractSkills(String(j.jobIndustry || "") + " " + String(j.jobDescription || "")),
    jobIdExternal: String(j.id || "") || undefined,
  }));
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchFeed(feed: Feed): Promise<ScrapedJob[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JobBot/1.0)", "Accept": "application/rss+xml, application/json, */*" },
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
    });
    if (!res.ok) return [];
    if (feed.type === "rss") {
      const text = await res.text();
      if (text.includes("<!DOCTYPE html") || text.includes("<html")) return [];
      return parseRSS(text, feed.source);
    } else {
      return feed.parser!(await res.json(), feed.source);
    }
  } catch {
    return [];
  }
}

// ─── Relevance Scoring ────────────────────────────────────────────────────────

function scoreJobRelevance(job: ScrapedJob): number {
  let score = 0.35;
  const t = (job.title || "").toLowerCase();
  const d = (job.description || "").toLowerCase();
  const roleHits = ["ml", "machine learning", "genai", "llm", "ai platform", "applied scientist", "ai engineer", "deep learning", "nlp"];
  if (roleHits.some(k => t.includes(k))) score += 0.3;
  if (t.includes("senior") || t.includes("lead") || t.includes("principal") || t.includes("staff")) score += 0.1;
  if (t.includes("intern") || t.includes("junior") || t.includes("fresher")) score -= 0.25;
  const skillHits = ["python", "llm", "langchain", "azure", "mlflow", "rag", "transformer", "pytorch", "tensorflow", "generative", "openai", "huggingface"];
  score += Math.min(skillHits.filter(s => d.includes(s)).length * 0.05, 0.2);
  if (job.salaryMin && job.salaryMin < 25) score -= 0.3;
  return Math.min(1, Math.max(0, score));
}

// ─── Save (immediate, per-feed) ───────────────────────────────────────────────

async function saveFeedJobs(jobs: ScrapedJob[], seen: Set<string>): Promise<number> {
  let saved = 0;
  for (const job of jobs) {
    if (!job.jobUrl || !job.title || seen.has(job.jobUrl)) continue;
    seen.add(job.jobUrl);
    if (!isLocationAllowed(job.location || "")) continue;
    if (scoreJobRelevance(job) < 0.4) continue;
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
        relevance_score: scoreJobRelevance(job),
      },
      { onConflict: "job_url", ignoreDuplicates: true }
    );
    if (!error) saved++;
  }
  return saved;
}

// ─── Main Agent ───────────────────────────────────────────────────────────────

export async function runJobDiscoveryAgent(): Promise<AgentResult> {
  const startTime = Date.now();

  // Clear any stale cancel flag
  await supabase.from("stats_cache").upsert({ key: "job_discovery_cancel", value: false });

  const { data: logEntry } = await supabase
    .from("agent_logs")
    .insert({ agent_name: "job_discovery", status: "running", summary: JSON.stringify({ totalFeeds: FEEDS.length, completedFeeds: 0, currentFeed: "Starting...", totalFound: 0, totalSaved: 0, cancelled: false, feeds: FEEDS.map(f => ({ label: f.label, source: f.source, status: "pending", found: 0, saved: 0 })) }) })
    .select()
    .single();

  const logId = logEntry?.id;

  // Store running log ID so progress endpoint can find it
  await supabase.from("stats_cache").upsert({ key: "job_discovery_running_id", value: logId });

  const progress: DiscoveryProgress = {
    totalFeeds: FEEDS.length,
    completedFeeds: 0,
    currentFeed: "Starting...",
    totalFound: 0,
    totalSaved: 0,
    cancelled: false,
    feeds: FEEDS.map(f => ({ label: f.label, source: f.source, status: "pending", found: 0, saved: 0 })),
  };

  const seen = new Set<string>();
  const newCompanies: string[] = [];

  try {
    for (let i = 0; i < FEEDS.length; i++) {
      const feed = FEEDS[i];

      // Check for cancellation before each feed
      if (await isCancelRequested()) {
        progress.cancelled = true;
        progress.feeds[i].status = "skipped";
        for (let j = i + 1; j < FEEDS.length; j++) progress.feeds[j].status = "skipped";
        break;
      }

      // Mark as running
      progress.currentFeed = feed.label;
      progress.feeds[i].status = "running";
      if (logId) await updateProgress(logId, progress);

      // Fetch
      const jobs = await fetchFeed(feed);
      const saved = await saveFeedJobs(jobs, seen);

      // Mark as done
      progress.feeds[i].status = "done";
      progress.feeds[i].found = jobs.length;
      progress.feeds[i].saved = saved;
      progress.completedFeeds++;
      progress.totalFound += jobs.length;
      progress.totalSaved += saved;

      // Collect company names for notification
      jobs.slice(0, 2).forEach(j => {
        if (j.company && j.company !== "Unknown" && !newCompanies.includes(j.company)) {
          newCompanies.push(`${j.title} @ ${j.company}`);
        }
      });

      if (logId) await updateProgress(logId, progress);
    }

    // Send WhatsApp notification
    if (progress.totalSaved > 0) {
      await notify.newJobs(progress.totalSaved, newCompanies.slice(0, 5));
    }

    const finalStatus = progress.cancelled ? "completed" : "completed";
    const finalSummary = progress.cancelled
      ? `Cancelled after ${progress.completedFeeds}/${progress.totalFeeds} feeds — saved ${progress.totalSaved} jobs`
      : `Scanned ${progress.totalFeeds} feeds — saved ${progress.totalSaved} relevant jobs`;

    if (logId) {
      await supabase.from("agent_logs").update({
        status: finalStatus,
        summary: JSON.stringify({ ...progress, currentFeed: finalSummary }),
        jobs_found: progress.totalSaved,
        actions_taken: progress.totalSaved,
        duration_ms: Date.now() - startTime,
      }).eq("id", logId);
    }

    // Clear running ID
    await supabase.from("stats_cache").upsert({ key: "job_discovery_running_id", value: null });

    return {
      success: true,
      summary: finalSummary,
      jobsFound: progress.totalSaved,
      actionsTaken: progress.totalSaved,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (logId) {
      await supabase.from("agent_logs").update({
        status: "failed",
        summary: JSON.stringify({ ...progress, currentFeed: `Error: ${msg}` }),
        error_message: msg,
        duration_ms: Date.now() - startTime,
      }).eq("id", logId);
    }
    await supabase.from("stats_cache").upsert({ key: "job_discovery_running_id", value: null });
    await notify.agentError("job_discovery", msg);
    return { success: false, summary: "Job discovery failed", error: msg };
  }
}
