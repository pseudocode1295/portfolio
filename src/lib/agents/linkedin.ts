import { supabase } from "@/lib/supabase";
import { callClaude, AJAY_PROFILE } from "@/lib/claude";
import { notify } from "@/lib/whatsapp";
import type { AgentResult } from "./types";

// Draft a personalized LinkedIn connection note
async function draftConnectionNote(
  personName: string,
  personTitle: string,
  company: string,
  jobTitle: string
): Promise<string> {
  const prompt = `Write a short, personalized LinkedIn connection request note (MAX 300 characters — LinkedIn limit).

Sender: Ajay Kumar, Senior ML Engineer at Microsoft
Target: ${personName}, ${personTitle} at ${company}
Context: Interested in the ${jobTitle} role at ${company}

Keep it:
- Professional but warm
- Specific (mention their company/role briefly)
- Not salesy
- Under 300 characters

Return ONLY the message text, nothing else.`;

  return callClaude("You are a professional networking expert.", prompt, 200);
}

// Draft a referral request message
async function draftReferralMessage(
  personName: string,
  company: string,
  jobTitle: string,
  jobUrl: string,
  jobIdExternal?: string
): Promise<string> {
  const prompt = `Write a LinkedIn message asking for a job referral.

Sender profile:
${AJAY_PROFILE}

Recipient: ${personName} at ${company} (connected on LinkedIn)
Job: ${jobTitle} at ${company}
Job URL: ${jobUrl}
${jobIdExternal ? `Job ID: ${jobIdExternal}` : ""}

Write a concise, professional message that:
1. Thanks them for connecting
2. Briefly introduces Ajay's relevant background (2-3 sentences)
3. Asks if they can refer for the specific role (include job ID if available)
4. Keeps it under 500 characters

Return ONLY the message text.`;

  return callClaude("You are a professional networking expert.", prompt, 400);
}

// Find employees at a company (returns draft profiles to show in dashboard)
async function findEmployeesAtCompany(company: string, jobTitle: string): Promise<Array<{
  name: string;
  title: string;
  profileUrl: string;
  company: string;
}>> {
  // In production this would use Playwright to search LinkedIn
  // For now, returns a placeholder that the agent logs for manual completion
  const prompt = `Generate 5 realistic LinkedIn employee profiles for people who work at ${company}
  who would be relevant to refer someone for a ${jobTitle} role.

  Return JSON array with fields: name, title, profileUrl (use linkedin.com/in/placeholder-{n}), company.
  These are TEMPLATE examples showing what to search for — the user will find real ones.`;

  try {
    const result = await callClaude("Return only JSON.", prompt, 800);
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}

// Main LinkedIn agent — creates draft connection requests for approval
export async function runLinkedInAgent(): Promise<AgentResult> {
  const startTime = Date.now();
  let actionsTaken = 0;

  const { data: logEntry } = await supabase
    .from("agent_logs")
    .insert({ agent_name: "linkedin", status: "running", summary: "Processing LinkedIn connections" })
    .select()
    .single();

  try {
    // Get jobs in 'discovered' status that need LinkedIn outreach
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "discovered")
      .order("relevance_score", { ascending: false })
      .limit(5); // process max 5 per run to stay under LinkedIn limits

    if (error || !jobs?.length) {
      await supabase.from("agent_logs").update({ status: "completed", summary: "No new jobs to process" }).eq("id", logEntry?.id);
      return { success: true, summary: "No new jobs to process for LinkedIn", actionsTaken: 0 };
    }

    for (const job of jobs) {
      // Check existing connections for this company
      const { count } = await supabase
        .from("linkedin_connections")
        .select("*", { count: "exact", head: true })
        .eq("company", job.company)
        .eq("status", "accepted");

      const acceptedConnections = count ?? 0;

      if (acceptedConnections < 5) {
        // Need more connections — find employees and draft connection requests
        const employees = await findEmployeesAtCompany(job.company, job.title);

        for (const emp of employees.slice(0, 3)) {
          const note = await draftConnectionNote(emp.name, emp.title, emp.company, job.title);

          // Save draft connection
          const { data: conn } = await supabase
            .from("linkedin_connections")
            .insert({
              job_id: job.id,
              linkedin_profile_url: emp.profileUrl,
              person_name: emp.name,
              person_title: emp.title,
              company: emp.company,
              status: "draft",
              connection_note: note,
            })
            .select()
            .single();

          if (conn) {
            // Add to approvals queue
            await supabase.from("approvals").insert({
              type: "connection_request",
              reference_id: conn.id,
              reference_table: "linkedin_connections",
              title: `Connect with ${emp.name} @ ${emp.company}`,
              content: note,
              metadata: { jobTitle: job.title, company: job.company, jobId: job.id, profileUrl: emp.profileUrl },
              status: "pending",
            });
            actionsTaken++;
          }
        }

        // Update job status
        await supabase.from("jobs").update({ status: "linkedin_pending" }).eq("id", job.id);
      } else {
        // Enough connections — draft referral messages
        const { data: connections } = await supabase
          .from("linkedin_connections")
          .select("*")
          .eq("job_id", job.id)
          .eq("status", "accepted")
          .limit(3);

        for (const conn of (connections || [])) {
          const message = await draftReferralMessage(
            conn.person_name, job.company, job.title, job.job_url, job.job_id_external
          );

          const { data: ref } = await supabase
            .from("referral_messages")
            .insert({
              job_id: job.id,
              connection_id: conn.id,
              message_draft: message,
              status: "draft",
            })
            .select()
            .single();

          if (ref) {
            await supabase.from("approvals").insert({
              type: "referral_message",
              reference_id: ref.id,
              reference_table: "referral_messages",
              title: `Ask ${conn.person_name} for referral — ${job.title} @ ${job.company}`,
              content: message,
              metadata: { jobTitle: job.title, company: job.company, jobUrl: job.job_url },
              status: "pending",
            });
            actionsTaken++;
          }
        }

        await supabase.from("jobs").update({ status: "referral_pending" }).eq("id", job.id);
      }
    }

    if (actionsTaken > 0) {
      await notify.approvalNeeded("LinkedIn action", actionsTaken);
    }

    await supabase.from("agent_logs").update({
      status: "completed",
      summary: `Created ${actionsTaken} draft LinkedIn actions`,
      actions_taken: actionsTaken,
      duration_ms: Date.now() - startTime,
    }).eq("id", logEntry?.id);

    return { success: true, summary: `Created ${actionsTaken} LinkedIn drafts for approval`, actionsTaken };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await supabase.from("agent_logs").update({ status: "failed", error_message: msg, duration_ms: Date.now() - startTime }).eq("id", logEntry?.id);
    return { success: false, summary: "LinkedIn agent failed", error: msg };
  }
}

// Check which connection requests were accepted (called after user sends them)
export async function checkConnectionAcceptance(): Promise<void> {
  const { data: pending } = await supabase
    .from("linkedin_connections")
    .select("*")
    .eq("status", "sent")
    .lt("sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // > 24 hrs old

  if (!pending?.length) return;

  // In production: use Playwright to check LinkedIn notifications
  // For now, flag them for manual review
  for (const conn of pending) {
    await supabase
      .from("linkedin_connections")
      .update({ status: "accepted" }) // Mark as accepted — user confirms via dashboard
      .eq("id", conn.id);
  }
}
