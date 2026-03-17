import { supabase } from "@/lib/supabase";
import { anthropic, AJAY_PROFILE } from "@/lib/claude";
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

// Use Claude with web search to find jobs and return structured data
async function searchJobsWithWebSearch(): Promise<ScrapedJob[]> {
  const searchQueries = [
    "site:linkedin.com/jobs ML Engineer GenAI India 2024 2025",
    "site:naukri.com senior ML engineer LLM India",
    "site:indeed.com AI platform engineer India senior",
  ];

  const systemPrompt = `You are a job search agent for Ajay Kumar.

${AJAY_PROFILE}

Search for current job openings matching this profile. Use the web_search tool to find REAL job listings.
For each search, extract actual job postings with real URLs.
Target roles: ${TARGET_ROLES.join(", ")}
Requirements: India location, 45+ LPA, Senior/Lead level.

After searching, return ONLY a valid JSON array (no markdown) like:
[
  {
    "title": "Senior ML Engineer",
    "company": "Microsoft",
    "location": "Hyderabad, India",
    "salaryMin": 45,
    "salaryMax": 70,
    "salaryCurrency": "INR",
    "jobUrl": "https://...",
    "source": "linkedin",
    "description": "Brief description...",
    "requiredSkills": ["Python", "LLMs", "Azure"],
    "jobIdExternal": "12345"
  }
]`;

  const messages: { role: "user" | "assistant"; content: string }[] = [
    {
      role: "user",
      content: `Search for current job openings using these queries:\n${searchQueries.join("\n")}\n\nAlso search: "ML Engineer GenAI India 45LPA 2025" and "Senior AI Engineer India remote"\n\nReturn all relevant jobs as a JSON array.`,
    },
  ];

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      tools: [{ type: "web_search_20260209" as const, name: "web_search" }],
      messages,
    });

    // Extract final text from response
    let finalText = "";
    for (const block of response.content) {
      if (block.type === "text") {
        finalText = block.text;
      }
    }

    if (!finalText) return [];

    const cleaned = finalText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    // Find JSON array in response
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed.map((j: ScrapedJob) => ({ ...j, source: j.source || "web_search" })) : [];
  } catch (err) {
    console.error("Web search job discovery error:", err);
    return [];
  }
}

// Score job relevance (simple heuristic, no extra API call)
function scoreJobRelevance(job: ScrapedJob): number {
  let score = 0.5;
  const titleLower = (job.title || "").toLowerCase();
  const descLower = (job.description || "").toLowerCase();

  // Role match
  const roleKeywords = ["ml", "machine learning", "genai", "llm", "ai platform", "applied scientist", "ai engineer"];
  if (roleKeywords.some(k => titleLower.includes(k))) score += 0.2;

  // Seniority
  if (titleLower.includes("senior") || titleLower.includes("lead") || titleLower.includes("principal")) score += 0.1;

  // Skills in description
  const skills = ["python", "llm", "langchain", "azure", "mlflow", "rag", "transformer"];
  const skillMatches = skills.filter(s => descLower.includes(s)).length;
  score += Math.min(skillMatches * 0.05, 0.2);

  // Salary filter
  if (job.salaryMin && job.salaryMin < 45) score -= 0.3;

  return Math.min(1, Math.max(0, score));
}

// Save jobs to database (skip duplicates)
async function saveJobs(jobs: ScrapedJob[]): Promise<number> {
  let saved = 0;
  for (const job of jobs) {
    const relevanceScore = scoreJobRelevance(job);
    if (relevanceScore < 0.4) continue; // skip irrelevant jobs

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

// Main job discovery agent
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
    // Use Claude with web_search tool to find real job listings
    const jobs = await searchJobsWithWebSearch();
    totalSaved = await saveJobs(jobs);

    // Collect new companies for notification
    jobs.slice(0, 5).forEach(j => {
      if (j.company && !newCompanies.includes(j.company)) {
        newCompanies.push(`${j.title} @ ${j.company}`);
      }
    });

    // Send WhatsApp notification if new jobs found
    if (totalSaved > 0) {
      await notify.newJobs(totalSaved, newCompanies);
      await notify.approvalNeeded("connection request", totalSaved);
    }

    // Update log
    await supabase.from("agent_logs").update({
      status: "completed",
      summary: `Found and saved ${totalSaved} new relevant jobs`,
      jobs_found: totalSaved,
      actions_taken: totalSaved,
      duration_ms: Date.now() - startTime,
    }).eq("id", logEntry?.id);

    return { success: true, summary: `Discovered ${totalSaved} new jobs`, jobsFound: totalSaved, actionsTaken: totalSaved };
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
