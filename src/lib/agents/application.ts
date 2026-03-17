import { supabase } from "@/lib/supabase";
import { callClaude, AJAY_PROFILE } from "@/lib/claude";
import { notify } from "@/lib/whatsapp";
import type { AgentResult } from "./types";

// Tailor resume sections for a specific job
async function tailorResume(jobTitle: string, company: string, description: string, requiredSkills: string[]): Promise<{
  summary: string;
  highlights: string[];
  skillsToEmphasize: string[];
}> {
  const prompt = `Tailor resume content for this specific job application.

Candidate:
${AJAY_PROFILE}

Target Job: ${jobTitle} at ${company}
Job Description: ${description?.slice(0, 1000) || "Not available"}
Required Skills: ${requiredSkills?.join(", ") || "Not specified"}

Generate tailored content:
1. Professional summary (3-4 sentences, keyword-optimized for ATS)
2. Top 5 achievement bullet points most relevant to this role
3. Top 8 skills to emphasize

Return as JSON: { summary: string, highlights: string[], skillsToEmphasize: string[] }
Return ONLY valid JSON.`;

  try {
    const result = await callClaude("You are an expert resume writer.", prompt, 2048);
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      summary: "Experienced ML Engineer with 6+ years building AI/ML systems at scale.",
      highlights: [],
      skillsToEmphasize: requiredSkills?.slice(0, 8) || [],
    };
  }
}

// Write a cover letter
async function writeCoverLetter(jobTitle: string, company: string, description: string): Promise<string> {
  const prompt = `Write a concise, compelling cover letter.

Candidate:
${AJAY_PROFILE}

Job: ${jobTitle} at ${company}
Description: ${description?.slice(0, 800) || "Not available"}

Write a 3-paragraph cover letter:
1. Opening: Why this role and company excite you
2. Body: 2-3 specific achievements that directly match what they need
3. Closing: Call to action

Keep it under 300 words. Professional yet personable. No generic phrases.
Return ONLY the letter text.`;

  return callClaude("You are an expert cover letter writer.", prompt, 1024);
}

// Main application agent — triggered after 24hr referral silence
export async function runApplicationAgent(): Promise<AgentResult> {
  const startTime = Date.now();
  let actionsTaken = 0;

  const { data: logEntry } = await supabase
    .from("agent_logs")
    .insert({ agent_name: "application", status: "running", summary: "Checking for jobs to apply" })
    .select()
    .single();

  try {
    // Find jobs where referral messages were sent 24+ hrs ago with no reply
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: staleReferrals } = await supabase
      .from("referral_messages")
      .select("*, jobs(*)")
      .eq("status", "sent")
      .lt("sent_at", cutoffTime);

    if (!staleReferrals?.length) {
      await supabase.from("agent_logs").update({ status: "completed", summary: "No jobs ready for direct application" }).eq("id", logEntry?.id);
      return { success: true, summary: "No jobs need direct application yet", actionsTaken: 0 };
    }

    // Group by job (only apply once per job)
    const processedJobs = new Set<string>();

    for (const referral of staleReferrals) {
      const job = referral.jobs as Record<string, unknown>;
      if (!job || processedJobs.has(job.id as string)) continue;
      processedJobs.add(job.id as string);

      // Mark referral as no_reply
      await supabase.from("referral_messages").update({ status: "no_reply" }).eq("id", referral.id);

      // Generate tailored resume and cover letter
      const [tailored, coverLetter] = await Promise.all([
        tailorResume(job.title as string, job.company as string, job.description as string, job.required_skills as string[]),
        writeCoverLetter(job.title as string, job.company as string, job.description as string),
      ]);

      // Save application draft
      const { data: app } = await supabase
        .from("applications")
        .insert({
          job_id: job.id,
          resume_version: "master_v1",
          cover_letter: coverLetter,
          tailored_resume_data: tailored,
          status: "draft",
        })
        .select()
        .single();

      if (app) {
        // Add to approvals queue
        await supabase.from("approvals").insert({
          type: "application",
          reference_id: app.id,
          reference_table: "applications",
          title: `Apply to ${job.title} @ ${job.company}`,
          content: coverLetter,
          metadata: {
            jobTitle: job.title,
            company: job.company,
            jobUrl: job.job_url,
            tailoredSummary: tailored.summary,
            highlights: tailored.highlights,
            skillsToEmphasize: tailored.skillsToEmphasize,
          },
          status: "pending",
        });

        // Update job status
        await supabase.from("jobs").update({ status: "applied" }).eq("id", job.id as string);
        actionsTaken++;
      }
    }

    if (actionsTaken > 0) {
      await notify.approvalNeeded("job application", actionsTaken);
    }

    await supabase.from("agent_logs").update({
      status: "completed",
      summary: `Prepared ${actionsTaken} application drafts for approval`,
      actions_taken: actionsTaken,
      duration_ms: Date.now() - startTime,
    }).eq("id", logEntry?.id);

    return { success: true, summary: `Prepared ${actionsTaken} applications`, actionsTaken };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await supabase.from("agent_logs").update({ status: "failed", error_message: msg, duration_ms: Date.now() - startTime }).eq("id", logEntry?.id);
    return { success: false, summary: "Application agent failed", error: msg };
  }
}
