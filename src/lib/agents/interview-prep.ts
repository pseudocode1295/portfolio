import { supabase } from "@/lib/supabase";
import { callClaude, AJAY_PROFILE } from "@/lib/claude";
import { notify } from "@/lib/whatsapp";
import type { AgentResult } from "./types";

interface InterviewQuestion {
  category: string;
  question: string;
  suggestedAnswer: string;
  tips: string;
}

async function generateInterviewQuestions(
  jobTitle: string,
  company: string,
  description: string,
  requiredSkills: string[]
): Promise<InterviewQuestion[]> {
  const prompt = `Generate 20 likely interview questions for this role.

Candidate: ${AJAY_PROFILE}
Role: ${jobTitle} at ${company}
Description: ${description?.slice(0, 800) || "N/A"}
Key Skills: ${requiredSkills?.join(", ") || "N/A"}

Generate questions across these categories:
1. Technical (ML/AI fundamentals, system design) — 8 questions
2. Behavioral (leadership, conflict, failure) — 5 questions
3. Company/Role specific — 4 questions
4. Coding/Problem solving approach — 3 questions

For each question provide:
- category: one of "technical", "behavioral", "company", "coding"
- question: the interview question
- suggestedAnswer: a strong 3-5 sentence answer tailored to Ajay's background
- tips: 1-2 sentence tip for answering this question

Return as JSON array. Return ONLY valid JSON.`;

  try {
    const result = await callClaude("You are an interview coach.", prompt, 8192);
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}

async function generateCompanyResearch(company: string, jobTitle: string): Promise<string> {
  const prompt = `Research ${company} for a job interview for the ${jobTitle} role.

Provide:
1. Company overview (what they do, size, culture)
2. Recent news or product launches (last 6 months)
3. Their AI/ML initiatives and tech stack
4. Key competitors
5. Why someone would want to work there
6. Potential concerns or questions to ask

Keep it concise but actionable (400-500 words).`;

  return callClaude("You are an expert company researcher.", prompt, 2048);
}

async function generateStudyPlan(jobTitle: string, requiredSkills: string[]): Promise<string> {
  const prompt = `Create a focused 1-week interview study plan for a ${jobTitle} role.

Required skills: ${requiredSkills?.join(", ") || "ML, Python, Deep Learning"}

Candidate already knows: Python, ML, GenAI, LLMs, Azure, RAG, Agents, Causal Inference

Day-by-day plan (Day 1-7) covering:
- Core technical topics to review
- Practical exercises
- Resources (specific books, papers, or leetcode topics)
- Time estimates per topic

Be specific and actionable. Format as a clean plan.`;

  return callClaude("You are an expert technical interview coach.", prompt, 2048);
}

// Main interview prep agent
export async function runInterviewPrepAgent(jobId: string, emailId?: string): Promise<AgentResult> {
  const startTime = Date.now();

  const { data: logEntry } = await supabase
    .from("agent_logs")
    .insert({ agent_name: "interview_prep", status: "running", summary: `Preparing interview materials for job ${jobId}` })
    .select()
    .single();

  try {
    const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).single();
    if (!job) throw new Error(`Job ${jobId} not found`);

    // Check if prep already exists
    const { data: existing } = await supabase.from("interview_prep").select("id").eq("job_id", jobId).single();
    if (existing) {
      return { success: true, summary: "Interview prep already exists for this job", actionsTaken: 0 };
    }

    // Generate all materials in parallel
    const [questions, companyResearch, studyPlan] = await Promise.all([
      generateInterviewQuestions(job.title, job.company, job.description, job.required_skills),
      generateCompanyResearch(job.company, job.title),
      generateStudyPlan(job.title, job.required_skills),
    ]);

    // Save to DB
    await supabase.from("interview_prep").insert({
      job_id: jobId,
      email_id: emailId || null,
      company_research: companyResearch,
      role_breakdown: `Comprehensive interview preparation for ${job.title} at ${job.company}`,
      interview_questions: questions,
      study_plan: studyPlan,
      key_technologies: job.required_skills || [],
    });

    // Update job status
    await supabase.from("jobs").update({ status: "interview" }).eq("id", jobId);

    // Notify
    await notify.interviewInvite(job.company, job.title);

    await supabase.from("agent_logs").update({
      status: "completed",
      summary: `Generated ${questions.length} questions, company research, and study plan`,
      actions_taken: 1,
      duration_ms: Date.now() - startTime,
    }).eq("id", logEntry?.id);

    return { success: true, summary: `Interview prep ready: ${questions.length} questions generated`, actionsTaken: 1 };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await supabase.from("agent_logs").update({ status: "failed", error_message: msg, duration_ms: Date.now() - startTime }).eq("id", logEntry?.id);
    return { success: false, summary: "Interview prep agent failed", error: msg };
  }
}
