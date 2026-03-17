import { supabase } from "@/lib/supabase";

import { notify } from "@/lib/whatsapp";
import type { AgentResult, ScrapedJob } from "./types";

const TARGET_ROLES = [
  "ML Engineer",
  "Senior ML Engineer",
  "GenAI Engineer",
  "AI Platform Engineer",
  "Machine Learning Engineer",
  "Applied Scientist",
  "AI/ML Lead",
  "LLM Engineer",
];

// Free RSS/API job sources — no API key, no cost
const FREE_JOB_FEEDS = [
  {
    source: "indeed",
    url: "https://in.indeed.com/rss?q=Senior+ML+Engineer+GenAI&l=India&sort=date",
  },
  {
    source: "indeed",
    url: "https://in.indeed.com/rss?q=LLM+Engineer+AI+Platform&l=India&sort=date",
  },
  {
    source: "indeed",
    url: "https://in.indeed.com/rss?q=Machine+Learning+Engineer+45LPA&l=India&sort=date",
  },
];

// Parse Indeed RSS XML into ScrapedJob objects
function parseIndeedRSS(xml: string, source: string): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];

  // Extract <item> blocks
  const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const item of items) {
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      || item.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const link = item.match(/<link>(.*?)<\/link>/)?.[1]
      || item.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] || "";
    const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
      || item.match(/<description>(.*?)<\/description>/)?.[1] || "";
    const company = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1]
      || description.match(/company[:\s]+([^<\n,]+)/i)?.[1] || "Unknown";
    const location = item.match(/<location>(.*?)<\/location>/)?.[1]
      || description.match(/location[:\s]+([^<\n,]+)/i)?.[1] || "India";

    if (!title || !link) continue;

    // Strip HTML tags from description
    const cleanDesc = description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);

    // Extract skills from description
    const skillKeywords = ["Python", "TensorFlow", "PyTorch", "LangChain", "Azure", "AWS",
      "MLflow", "Spark", "Docker", "Kubernetes", "RAG", "LLM", "GenAI", "SQL", "Scala"];
    const requiredSkills = skillKeywords.filter(s =>
      cleanDesc.toLowerCase().includes(s.toLowerCase())
    );

    jobs.push({
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: "INR",
      jobUrl: link.trim(),
      source,
      description: cleanDesc,
      requiredSkills,
      jobIdExternal: link.match(/jk=([a-z0-9]+)/i)?.[1] || null,
    });
  }

  return jobs;
}

// Score job relevance — pure heuristic, zero API cost
function scoreJobRelevance(job: ScrapedJob): number {
  let score = 0.4;
  const titleLower = (job.title || "").toLowerCase();
  const descLower = (job.description || "").toLowerCase();

  // Role match in title
  const roleKeywords = ["ml", "machine learning", "genai", "llm", "ai platform",
    "applied scientist", "ai engineer", "deep learning", "nlp", "data science"];
  if (roleKeywords.some(k => titleLower.includes(k))) score += 0.25;

  // Seniority
  if (titleLower.includes("senior") || titleLower.includes("lead") ||
      titleLower.includes("principal") || titleLower.includes("staff")) score += 0.1;

  // Irrelevant roles
  if (titleLower.includes("intern") || titleLower.includes("junior") ||
      titleLower.includes("fresher") || titleLower.includes("analyst")) score -= 0.2;

  // Skills in description
  const skills = ["python", "llm", "langchain", "azure", "mlflow", "rag",
    "transformer", "pytorch", "tensorflow", "generative ai", "openai"];
  const skillMatches = skills.filter(s => descLower.includes(s)).length;
  score += Math.min(skillMatches * 0.05, 0.2);

  // Salary filter — reject if explicitly too low
  if (job.salaryMin && job.salaryMin < 30) score -= 0.3;

  return Math.min(1, Math.max(0, score));
}

// Fetch jobs from a free RSS feed
async function fetchFeedJobs(feedUrl: string, source: string): Promise<ScrapedJob[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JobBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseIndeedRSS(xml, source);
  } catch {
    return [];
  }
}

// Save jobs to database (skip duplicates)
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

// Main job discovery agent — uses free RSS feeds, zero AI API cost
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
    // Fetch from all free RSS feeds in parallel
    const feedResults = await Promise.all(
      FREE_JOB_FEEDS.map(f => fetchFeedJobs(f.url, f.source))
    );
    const allJobs = feedResults.flat();

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueJobs = allJobs.filter(j => {
      if (!j.jobUrl || seen.has(j.jobUrl)) return false;
      seen.add(j.jobUrl);
      return true;
    });

    totalSaved = await saveJobs(uniqueJobs);

    // Collect top companies for notification
    uniqueJobs
      .filter(j => scoreJobRelevance(j) >= 0.4)
      .slice(0, 5)
      .forEach(j => {
        if (j.company && !newCompanies.includes(j.company)) {
          newCompanies.push(`${j.title} @ ${j.company}`);
        }
      });

    // WhatsApp notification if new jobs found
    if (totalSaved > 0) {
      await notify.newJobs(totalSaved, newCompanies);
    }

    await supabase.from("agent_logs").update({
      status: "completed",
      summary: `Scanned ${uniqueJobs.length} jobs, saved ${totalSaved} relevant`,
      jobs_found: totalSaved,
      actions_taken: totalSaved,
      duration_ms: Date.now() - startTime,
    }).eq("id", logEntry?.id);

    return {
      success: true,
      summary: `Discovered ${totalSaved} new jobs (scanned ${uniqueJobs.length})`,
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
