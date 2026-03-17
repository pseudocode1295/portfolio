import { google } from "googleapis";
import { supabase } from "@/lib/supabase";
import { callClaude } from "@/lib/claude";
import { notify } from "@/lib/whatsapp";
import type { AgentResult } from "./types";

function getGmailClient() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: "v1", auth });
}

// Categorize an email using Claude
async function categorizeEmail(subject: string, body: string, from: string): Promise<{
  category: "interview_invite" | "rejection" | "info_request" | "offer" | "other";
  companyName: string | null;
  jobTitle: string | null;
}> {
  const prompt = `Categorize this email from a job application process.

From: ${from}
Subject: ${subject}
Body: ${body.slice(0, 1000)}

Categories:
- interview_invite: They want to schedule an interview
- rejection: Application was not successful
- info_request: They need more information from the candidate
- offer: Job offer or compensation discussion
- other: Acknowledgment, follow-up, or unrelated

Return JSON: { category: string, companyName: string|null, jobTitle: string|null }
Return ONLY valid JSON.`;

  try {
    const result = await callClaude("You are an email classifier.", prompt, 256);
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { category: "other", companyName: null, jobTitle: null };
  }
}

// Draft a reply to an email
async function draftEmailReply(subject: string, body: string, category: string, from: string): Promise<string> {
  const prompts: Record<string, string> = {
    interview_invite: `Draft a professional reply to confirm interview interest and ask for scheduling details.`,
    info_request: `Draft a professional reply addressing their information request. Ask Ajay to fill in specific details with [PLACEHOLDER].`,
    offer: `Draft a professional reply expressing interest and asking for the complete offer details.`,
    other: `Draft a brief professional acknowledgment.`,
  };

  const prompt = `${prompts[category] || prompts.other}

Original email:
From: ${from}
Subject: ${subject}
Body: ${body.slice(0, 800)}

Candidate: Ajay Kumar, Senior ML Engineer at Microsoft
Keep reply under 150 words. Professional tone.
Return ONLY the email body text.`;

  return callClaude("You are a professional email writer.", prompt, 512);
}

// Main email monitor agent
export async function runEmailMonitorAgent(): Promise<AgentResult> {
  const startTime = Date.now();
  let actionsTaken = 0;

  const { data: logEntry } = await supabase
    .from("agent_logs")
    .insert({ agent_name: "email_monitor", status: "running", summary: "Checking emails" })
    .select()
    .single();

  try {
    const gmail = getGmailClient();

    // Search for job-related emails from the last 24 hours
    const since = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const { data: listData } = await gmail.users.messages.list({
      userId: "me",
      q: `after:${since} (interview OR application OR "job offer" OR "your application" OR "next steps" OR recruiter)`,
      maxResults: 20,
    });

    const messages = listData.messages || [];

    for (const msg of messages) {
      // Check if already processed
      const { data: existing } = await supabase
        .from("emails")
        .select("id")
        .eq("gmail_message_id", msg.id)
        .single();

      if (existing) continue;

      // Fetch full message
      const { data: fullMsg } = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });

      const headers = fullMsg.payload?.headers || [];
      const subject = headers.find((h) => h.name === "Subject")?.value || "";
      const from = headers.find((h) => h.name === "From")?.value || "";
      const dateStr = headers.find((h) => h.name === "Date")?.value || new Date().toISOString();

      // Decode body
      let body = "";
      const parts = fullMsg.payload?.parts || [fullMsg.payload];
      for (const part of parts) {
        if (part?.mimeType === "text/plain" && part.body?.data) {
          body = Buffer.from(part.body.data, "base64").toString("utf-8");
          break;
        }
      }

      // Categorize
      const { category, companyName } = await categorizeEmail(subject, body, from);

      // Find matching job in DB
      let jobId: string | null = null;
      if (companyName) {
        const { data: job } = await supabase
          .from("jobs")
          .select("id")
          .ilike("company", `%${companyName}%`)
          .order("discovered_at", { ascending: false })
          .limit(1)
          .single();
        jobId = job?.id || null;
      }

      // Draft reply for actionable emails
      let replyDraft: string | null = null;
      if (["interview_invite", "info_request", "offer"].includes(category)) {
        replyDraft = await draftEmailReply(subject, body, category, from);
      }

      // Save email
      const { data: savedEmail } = await supabase
        .from("emails")
        .insert({
          job_id: jobId,
          gmail_message_id: msg.id,
          from_email: from,
          subject,
          body: body.slice(0, 5000),
          received_at: new Date(dateStr).toISOString(),
          category,
          reply_draft: replyDraft,
          reply_status: replyDraft ? "pending" : "not_needed",
        })
        .select()
        .single();

      // Add reply to approvals if needed
      if (savedEmail && replyDraft) {
        await supabase.from("approvals").insert({
          type: "email_reply",
          reference_id: savedEmail.id,
          reference_table: "emails",
          title: `Reply to: ${subject}`,
          content: replyDraft,
          metadata: { from, subject, category, jobId },
          status: "pending",
        });
        actionsTaken++;
      }

      // Trigger interview prep agent for interview invites
      if (category === "interview_invite" && jobId) {
        await supabase.from("jobs").update({ status: "responded" }).eq("id", jobId);
        if (companyName) {
          await notify.interviewInvite(companyName, subject);
        }
        // Trigger interview prep via API
        fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/agents/interview-prep`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-agent-key": process.env.AGENT_SECRET_KEY! },
          body: JSON.stringify({ jobId, emailId: savedEmail?.id }),
        }).catch(() => {});
      }
    }

    if (actionsTaken > 0) {
      await notify.approvalNeeded("email reply", actionsTaken);
    }

    await supabase.from("agent_logs").update({
      status: "completed",
      summary: `Processed ${messages.length} emails, ${actionsTaken} need replies`,
      actions_taken: actionsTaken,
      duration_ms: Date.now() - startTime,
    }).eq("id", logEntry?.id);

    return { success: true, summary: `Processed ${messages.length} emails`, actionsTaken };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await supabase.from("agent_logs").update({ status: "failed", error_message: msg, duration_ms: Date.now() - startTime }).eq("id", logEntry?.id);
    return { success: false, summary: "Email monitor failed", error: msg };
  }
}
