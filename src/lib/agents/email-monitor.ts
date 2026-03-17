import { google } from "googleapis";
import { supabase } from "@/lib/supabase";
import { callClaude } from "@/lib/claude";
import { notify } from "@/lib/whatsapp";
import { isLocationAllowed } from "./location-filter";
import type { AgentResult, ScrapedJob } from "./types";

export interface EmailItemProgress {
  subject: string;
  from: string;
  type: "linkedin" | "naukri" | "other";
  status: "pending" | "running" | "done" | "skipped";
  extracted: number;
  saved: number;
}

export interface EmailProgress {
  agent: "email_monitor" | "job_email_scraper";
  totalEmails: number;
  processedEmails: number;
  currentEmail: string;
  linkedinEmails: number;
  naukriEmails: number;
  totalJobsSaved: number;
  cancelled: boolean;
  emails: EmailItemProgress[];
}

async function isEmailCancelRequested(): Promise<boolean> {
  const { data } = await supabase.from("stats_cache").select("value").eq("key", "email_agent_cancel").single();
  return data?.value === true;
}

async function updateEmailProgress(logId: string, progress: EmailProgress): Promise<void> {
  await supabase.from("agent_logs").update({ summary: JSON.stringify(progress), jobs_found: progress.totalJobsSaved }).eq("id", logId);
}

// ─── Job alert email detection ────────────────────────────────────────────────

function isLinkedInJobAlert(from: string, subject: string): boolean {
  const f = from.toLowerCase();
  const s = subject.toLowerCase();
  return f.includes("linkedin") || s.includes("job alert") ||
    s.includes("jobs you may") || s.includes("new jobs for you") ||
    s.includes("recommended jobs") || s.includes("new jobs matching");
}

function isNaukriAlert(from: string, subject: string): boolean {
  const f = from.toLowerCase();
  const s = subject.toLowerCase();
  return f.includes("naukri") ||
    (s.includes("hiring") && f.includes("naukri")) ||
    s.includes("jobs for you from") ||
    (s.includes("is hiring") && f.includes("naukri"));
}

// ─── Strip HTML to plain text ─────────────────────────────────────────────────

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " · ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&#\d+;/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── LinkedIn email parser ────────────────────────────────────────────────────

function parseLinkedInJobAlertEmail(body: string, htmlBody: string): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const content = htmlBody || body;

  // Find all LinkedIn job URLs in href attributes (they won't appear in plain text)
  const hrefPattern = /href="(https?:\/\/(?:www\.)?linkedin\.com\/(?:comm\/)?jobs\/view\/(\d+)[^"]*)"/gi;

  const urlMap = new Map<string, string>();   // jobId -> cleanUrl
  const urlPositions = new Map<string, number>(); // jobId -> char position in HTML

  for (const m of [...content.matchAll(hrefPattern)]) {
    if (!urlMap.has(m[2])) {
      urlMap.set(m[2], m[1].split("?")[0]);
      urlPositions.set(m[2], m.index ?? 0);
    }
  }

  if (urlMap.size === 0) return jobs;

  const INDIA_CITIES = /bangalore|mumbai|delhi|hyderabad|pune|chennai|gurugram|noida|kolkata|india|remote/i;
  const SKIP = /^(view job|apply|see all|easy apply|promoted|actively|your job alert|jobs for you|new jobs|recommended|unsubscribe|linkedin|manage|privacy|terms|dear|hi |hello)/i;

  // Sort by position so we can slice between consecutive job cards
  const sortedIds = [...urlPositions.entries()].sort((a, b) => a[1] - b[1]);

  sortedIds.forEach(([jobId, pos], idx) => {
    const cleanUrl = urlMap.get(jobId)!;

    // Try to extract title from the anchor tag text
    // Slice context around this href position
    const contextWindow = content.slice(Math.max(0, pos - 50), pos + 800);

    // Extract anchor text: href="...job/view/ID..."  >TEXT</a>
    const anchorTextMatch = contextWindow.match(
      /href="[^"]*jobs\/view\/\d+[^"]*"[^>]*>([\s\S]{1,200}?)<\/a>/i
    );
    const anchorText = anchorTextMatch ? htmlToText(anchorTextMatch[1]).trim() : "";

    // Per-card context: from this URL's position to the next (max 1200 chars ahead)
    const nextPos = sortedIds[idx + 1]?.[1] ?? pos + 1200;
    const cardHtml = content.slice(Math.max(0, pos - 400), Math.min(nextPos, pos + 1200));
    const cardLines = htmlToText(cardHtml)
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

    let title = "";
    let company = "Unknown";
    let location = "India";

    // 1. Anchor text as title (most reliable when LinkedIn puts the title there)
    if (anchorText.length > 4 && anchorText.length < 100 && !SKIP.test(anchorText)) {
      title = anchorText;
    }

    // 2. Scan card lines for title / company · location
    for (const line of cardLines) {
      if (line.length < 4 || line.startsWith("http") || SKIP.test(line)) continue;

      // Title: capital start, reasonable length, not a city/location line
      if (!title && /[A-Z]/.test(line[0]) && line.length > 4 && line.length < 100 &&
          !INDIA_CITIES.test(line) && !line.includes(" · ")) {
        title = line;
      }

      // Company · Location  (e.g. "Google · Bengaluru, Karnataka")
      if (line.includes(" · ")) {
        const parts = line.split(" · ");
        const p0 = parts[0].trim();
        const p1 = parts[1]?.trim();
        if (company === "Unknown" && p0.length > 1 && p0.length < 60 && p0 !== title) {
          company = p0;
        }
        if (p1 && location === "India") location = p1.slice(0, 60);
        if (company !== "Unknown") break; // found what we need
      } else if (INDIA_CITIES.test(line) && location === "India" && line.length < 80) {
        location = line;
      }
    }

    if (!title) title = "ML/AI Engineer";

    jobs.push({
      title,
      company,
      location,
      jobUrl: cleanUrl,
      source: "linkedin_email",
      description: `LinkedIn job alert — ${company} · ${location}`,
      requiredSkills: [],
      jobIdExternal: jobId,
    });
  });

  return jobs;
}

// ─── Naukri email parser ──────────────────────────────────────────────────────

function parseNaukriEmail(body: string, htmlBody: string, subject: string): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const content = htmlBody || body;
  const plain = htmlToText(content);

  // Naukri job URLs
  const urlPattern = /https?:\/\/(?:www\.)?naukri\.com\/job-listings[^\s"<>]*/g;
  const trackPattern = /https?:\/\/[^\s"<>]*naukri\.com[^\s"<>]*(?:jobid|job_id|jobId)=([^\s"<>&]+)/gi;

  const urls = new Set<string>();
  for (const m of content.matchAll(urlPattern)) urls.add(m[0].split("?")[0]);
  for (const m of content.matchAll(trackPattern)) urls.add(m[0].split("&utm")[0]);

  // "X is hiring" pattern from subject
  const hiringMatch = subject.match(/^([^i]+?)\s+is hiring/i);
  const hiringCompany = hiringMatch?.[1]?.trim() || null;

  // "Jobs for you from A, B, C" — extract companies from subject
  const companiesMatch = subject.match(/jobs? for you from (.+)/i);
  const subjectCompanies = companiesMatch?.[1]
    ?.split(/[,·]/)
    .map(c => c.trim())
    .filter(c => c.length > 1 && c.length < 60) || [];

  // Parse plain text for job cards
  // Naukri email structure per card: Title\nCompany\nLocation\nSalary\nExperience
  const lines = plain.split("\n").map(l => l.trim()).filter(Boolean);
  const SALARY = /lpa|lakh|salary|ctc|\d+\s*-\s*\d+/i;
  const EXP = /yrs?|years?|exp/i;
  const LOCATION = /bangalore|mumbai|delhi|hyderabad|pune|chennai|gurugram|noida|india|remote/i;

  // Extract structured job blocks from plain text
  const blocks: Array<{ title: string; company: string; location: string }> = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    if (line.startsWith("http") || line.length < 4 || line.length > 100) continue;
    if (SALARY.test(line) || EXP.test(line)) continue;

    // Likely a job title if it has capital letters and reasonable length
    if (/^[A-Z]/.test(line) && line.length > 5 && line.length < 80 &&
        !/^(view|apply|click|jobs?|hiring|dear|hi |hello|unsubscribe|naukri)/i.test(line)) {
      const nextLines = lines.slice(i + 1, i + 5);
      const companyLine = nextLines.find(l => !LOCATION.test(l) && !SALARY.test(l) && !EXP.test(l) && l.length > 2 && l.length < 60);
      const locationLine = nextLines.find(l => LOCATION.test(l));
      blocks.push({
        title: line,
        company: companyLine || hiringCompany || (subjectCompanies[blocks.length] ?? "Unknown"),
        location: locationLine?.slice(0, 60) || "India",
      });
    }
  }

  // Match blocks to URLs
  const urlArr = [...urls];
  const count = Math.max(urlArr.length, blocks.length, hiringCompany ? 1 : 0);

  for (let i = 0; i < count; i++) {
    const block = blocks[i] || { title: "ML/AI Engineer", company: hiringCompany || subjectCompanies[i] || "Unknown", location: "India" };
    const jobUrl = urlArr[i] || `https://www.naukri.com/job-listings-${block.company.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}-${i}`;
    if (!urlArr[i]) continue; // skip if no real URL

    jobs.push({
      title: block.title,
      company: block.company,
      location: block.location,
      jobUrl,
      source: "naukri_email",
      description: `Naukri job alert — ${block.company}`,
      requiredSkills: [],
    });
  }

  return jobs;
}

// ─── Save email-sourced jobs ──────────────────────────────────────────────────

async function saveEmailJobs(jobs: ScrapedJob[], relevanceScore: number): Promise<number> {
  let saved = 0;
  for (const job of jobs) {
    if (!job.jobUrl || !job.title) continue;
    if (!isLocationAllowed(job.location || "")) continue;
    const { error } = await supabase.from("jobs").upsert(
      {
        title: job.title,
        company: job.company,
        location: job.location,
        salary_min: null,
        salary_max: null,
        salary_currency: "INR",
        job_url: job.jobUrl,
        source: job.source,
        description: job.description,
        required_skills: [],
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

// Keep old name as alias
async function saveLinkedInJobs(jobs: ScrapedJob[]): Promise<number> {
  return saveEmailJobs(jobs, 0.75);
}

// ─────────────────────────────────────────────────────────────────────────────

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
    .insert({ agent_name: "email_monitor", status: "running", summary: "{}" })
    .select()
    .single();

  const logId = logEntry?.id;

  // Register as running agent
  await supabase.from("stats_cache").upsert({ key: "email_agent_running_id", value: logId });
  await supabase.from("stats_cache").upsert({ key: "email_agent_cancel", value: false });

  const progress: EmailProgress = {
    agent: "email_monitor",
    totalEmails: 0,
    processedEmails: 0,
    currentEmail: "Fetching email list...",
    linkedinEmails: 0,
    naukriEmails: 0,
    totalJobsSaved: 0,
    cancelled: false,
    emails: [],
  };

  try {
    const gmail = getGmailClient();

    // Search for job-related emails + LinkedIn job alerts from the last 24 hours
    const since = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const { data: listData } = await gmail.users.messages.list({
      userId: "me",
      q: `after:${since} (interview OR application OR "job offer" OR "your application" OR "next steps" OR recruiter OR "jobs you may be interested" OR "new jobs for you" OR "job alert" OR from:jobs-noreply@linkedin.com)`,
      maxResults: 50,
    });

    const messages = listData.messages || [];
    progress.totalEmails = messages.length;
    progress.currentEmail = `Found ${messages.length} emails to check`;
    if (logId) await updateEmailProgress(logId, progress);

    for (const msg of messages) {
      if (await isEmailCancelRequested()) {
        progress.cancelled = true;
        progress.currentEmail = "Cancelled by user";
        if (logId) await updateEmailProgress(logId, progress);
        break;
      }

      // Check if already processed
      const { data: existing } = await supabase
        .from("emails")
        .select("id")
        .eq("gmail_message_id", msg.id)
        .single();

      if (existing) {
        progress.processedEmails++;
        progress.emails.push({ subject: "(already processed)", from: "", type: "other", status: "skipped", extracted: 0, saved: 0 });
        continue;
      }

      // Fetch full message
      const { data: fullMsg } = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });

      const headers = fullMsg.payload?.headers || [];
      const subject = headers.find((h) => h.name === "Subject")?.value || "(no subject)";
      const from = headers.find((h) => h.name === "From")?.value || "";
      const dateStr = headers.find((h) => h.name === "Date")?.value || new Date().toISOString();

      // Mark as running
      const emailItem: EmailItemProgress = { subject, from, type: "other", status: "running", extracted: 0, saved: 0 };
      progress.emails.push(emailItem);
      progress.currentEmail = subject.slice(0, 60);
      if (logId) await updateEmailProgress(logId, progress);

      // Decode body (both plain text and HTML)
      let body = "";
      let htmlBody = "";
      const parts = fullMsg.payload?.parts || [fullMsg.payload];
      for (const part of parts) {
        if (part?.mimeType === "text/plain" && part.body?.data && !body) {
          body = Buffer.from(part.body.data, "base64").toString("utf-8");
        }
        if (part?.mimeType === "text/html" && part.body?.data && !htmlBody) {
          htmlBody = Buffer.from(part.body.data, "base64").toString("utf-8");
        }
      }

      // ── LinkedIn job alert ───────────────────────────────────────────────
      if (isLinkedInJobAlert(from, subject)) {
        emailItem.type = "linkedin";
        const extracted = parseLinkedInJobAlertEmail(body, htmlBody);
        const savedCount = extracted.length > 0 ? await saveLinkedInJobs(extracted) : 0;
        emailItem.extracted = extracted.length;
        emailItem.saved = savedCount;
        emailItem.status = "done";
        progress.linkedinEmails++;
        progress.totalJobsSaved += savedCount;
        if (savedCount > 0) await notify.newJobs(savedCount, extracted.slice(0, 3).map(j => `${j.title} @ ${j.company}`));
        await supabase.from("emails").insert({
          job_id: null, gmail_message_id: msg.id, from_email: from, subject,
          body: `[LinkedIn job alert — ${extracted.length} jobs extracted, ${savedCount} saved]`,
          received_at: new Date(dateStr).toISOString(), category: "other",
          reply_draft: null, reply_status: "not_needed",
        });
        progress.processedEmails++;
        if (logId) await updateEmailProgress(logId, progress);
        continue;
      }

      // ── Naukri job alert ─────────────────────────────────────────────────
      if (isNaukriAlert(from, subject)) {
        emailItem.type = "naukri";
        const extracted = parseNaukriEmail(body, htmlBody, subject);
        const savedCount = extracted.length > 0 ? await saveEmailJobs(extracted, 0.65) : 0;
        emailItem.extracted = extracted.length;
        emailItem.saved = savedCount;
        emailItem.status = "done";
        progress.naukriEmails++;
        progress.totalJobsSaved += savedCount;
        if (savedCount > 0) await notify.newJobs(savedCount, extracted.slice(0, 3).map(j => `${j.title} @ ${j.company}`));
        await supabase.from("emails").insert({
          job_id: null, gmail_message_id: msg.id, from_email: from, subject,
          body: `[Naukri alert — ${extracted.length} jobs extracted, ${savedCount} saved]`,
          received_at: new Date(dateStr).toISOString(), category: "other",
          reply_draft: null, reply_status: "not_needed",
        });
        progress.processedEmails++;
        if (logId) await updateEmailProgress(logId, progress);
        continue;
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
        fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/agents/interview-prep`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-agent-key": process.env.AGENT_SECRET_KEY! },
          body: JSON.stringify({ jobId, emailId: savedEmail?.id }),
        }).catch(() => {});
      }

      emailItem.status = "done";
      progress.processedEmails++;
      if (logId) await updateEmailProgress(logId, progress);
    }

    if (actionsTaken > 0) {
      await notify.approvalNeeded("email reply", actionsTaken);
    }

    progress.currentEmail = "Done";
    const summary = `Processed ${progress.processedEmails}/${progress.totalEmails} emails · ${progress.linkedinEmails} LinkedIn · ${progress.naukriEmails} Naukri · ${progress.totalJobsSaved} jobs saved`;
    if (logId) await updateEmailProgress(logId, { ...progress, currentEmail: "Done" });
    await supabase.from("agent_logs").update({
      status: "completed",
      summary: JSON.stringify({ ...progress, currentEmail: "Done" }),
      actions_taken: actionsTaken,
      duration_ms: Date.now() - startTime,
    }).eq("id", logId);
    await supabase.from("stats_cache").upsert({ key: "email_agent_running_id", value: null });

    return { success: true, summary, actionsTaken };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await supabase.from("agent_logs").update({ status: "failed", error_message: msg, summary: JSON.stringify(progress), duration_ms: Date.now() - startTime }).eq("id", logId);
    await supabase.from("stats_cache").upsert({ key: "email_agent_running_id", value: null });
    return { success: false, summary: "Email monitor failed", error: msg };
  }
}

// ─── Dedicated job email scraper (scans historical inbox) ────────────────────
// Searches all LinkedIn + Naukri job alert emails regardless of age,
// skips already-processed ones, saves jobs to DB.

export async function runJobEmailScraperAgent(daysBack = 30): Promise<AgentResult> {
  const startTime = Date.now();

  const { data: logEntry } = await supabase
    .from("agent_logs")
    .insert({ agent_name: "job_email_scraper", status: "running", summary: "{}" })
    .select().single();

  const logId = logEntry?.id;

  await supabase.from("stats_cache").upsert({ key: "email_agent_running_id", value: logId });
  await supabase.from("stats_cache").upsert({ key: "email_agent_cancel", value: false });

  const progress: EmailProgress = {
    agent: "job_email_scraper",
    totalEmails: 0,
    processedEmails: 0,
    currentEmail: "Fetching email list...",
    linkedinEmails: 0,
    naukriEmails: 0,
    totalJobsSaved: 0,
    cancelled: false,
    emails: [],
  };

  try {
    const gmail = getGmailClient();
    const since = Math.floor((Date.now() - daysBack * 24 * 60 * 60 * 1000) / 1000);

    const { data: listData } = await gmail.users.messages.list({
      userId: "me",
      q: `after:${since} (from:jobs-noreply@linkedin.com OR from:noreply@linkedin.com OR from:jobalerts-noreply@linkedin.com OR from:donotreply@naukri.com OR from:no-reply@naukri.com OR (subject:"job alert" from:linkedin) OR (subject:"is hiring" from:naukri) OR subject:"jobs for you from")`,
      maxResults: 200,
    });

    const messages = listData.messages || [];
    progress.totalEmails = messages.length;
    progress.currentEmail = `Found ${messages.length} job alert emails (${daysBack}d)`;
    if (logId) await updateEmailProgress(logId, progress);

    for (const msg of messages) {
      if (await isEmailCancelRequested()) {
        progress.cancelled = true;
        progress.currentEmail = "Cancelled by user";
        if (logId) await updateEmailProgress(logId, progress);
        break;
      }

      // Skip already processed
      const { data: existing } = await supabase
        .from("emails").select("id").eq("gmail_message_id", msg.id).single();
      if (existing) {
        progress.processedEmails++;
        progress.emails.push({ subject: "(already processed)", from: "", type: "other", status: "skipped", extracted: 0, saved: 0 });
        continue;
      }

      const { data: fullMsg } = await gmail.users.messages.get({
        userId: "me", id: msg.id!, format: "full",
      });

      const headers = fullMsg.payload?.headers || [];
      const subject = headers.find(h => h.name === "Subject")?.value || "(no subject)";
      const from = headers.find(h => h.name === "From")?.value || "";
      const dateStr = headers.find(h => h.name === "Date")?.value || new Date().toISOString();

      const emailItem: EmailItemProgress = { subject, from, type: "other", status: "running", extracted: 0, saved: 0 };
      progress.emails.push(emailItem);
      progress.currentEmail = subject.slice(0, 60);
      if (logId) await updateEmailProgress(logId, progress);

      // Decode body parts (handle nested multipart)
      let body = "", htmlBody = "";
      type MsgPart = NonNullable<typeof fullMsg.payload>;
      const extractParts = (parts: MsgPart[]) => {
        for (const part of parts) {
          if (part?.mimeType === "text/plain" && part.body?.data && !body)
            body = Buffer.from(part.body.data, "base64").toString("utf-8");
          if (part?.mimeType === "text/html" && part.body?.data && !htmlBody)
            htmlBody = Buffer.from(part.body.data, "base64").toString("utf-8");
          if (part?.parts) extractParts(part.parts as MsgPart[]);
        }
      };
      const rootParts = (fullMsg.payload?.parts ?? (fullMsg.payload ? [fullMsg.payload] : [])) as MsgPart[];
      extractParts(rootParts);
      if (!body && !htmlBody && fullMsg.payload?.body?.data)
        htmlBody = Buffer.from(fullMsg.payload.body.data, "base64").toString("utf-8");

      let extracted: ScrapedJob[] = [];
      let savedCount = 0;
      let source = "email";

      if (isLinkedInJobAlert(from, subject)) {
        emailItem.type = "linkedin";
        extracted = parseLinkedInJobAlertEmail(body, htmlBody);
        savedCount = extracted.length > 0 ? await saveLinkedInJobs(extracted) : 0;
        source = "linkedin_email";
        progress.linkedinEmails++;
      } else if (isNaukriAlert(from, subject)) {
        emailItem.type = "naukri";
        extracted = parseNaukriEmail(body, htmlBody, subject);
        savedCount = extracted.length > 0 ? await saveEmailJobs(extracted, 0.65) : 0;
        source = "naukri_email";
        progress.naukriEmails++;
      } else {
        emailItem.status = "skipped";
        progress.processedEmails++;
        continue;
      }

      emailItem.extracted = extracted.length;
      emailItem.saved = savedCount;
      emailItem.status = "done";
      progress.totalJobsSaved += savedCount;
      progress.processedEmails++;

      await supabase.from("emails").insert({
        job_id: null, gmail_message_id: msg.id, from_email: from, subject,
        body: `[${source} — ${extracted.length} extracted, ${savedCount} saved]`,
        received_at: new Date(dateStr).toISOString(), category: "other",
        reply_draft: null, reply_status: "not_needed",
      });

      if (logId) await updateEmailProgress(logId, progress);
    }

    if (progress.totalJobsSaved > 0) await notify.newJobs(progress.totalJobsSaved, [`${progress.totalJobsSaved} jobs from email alerts`]);

    progress.currentEmail = "Done";
    const summary = `Scanned ${progress.processedEmails} job alert emails (${daysBack}d) · ${progress.linkedinEmails} LinkedIn · ${progress.naukriEmails} Naukri · ${progress.totalJobsSaved} jobs saved`;
    await supabase.from("agent_logs").update({
      status: "completed",
      summary: JSON.stringify({ ...progress, currentEmail: "Done" }),
      jobs_found: progress.totalJobsSaved,
      actions_taken: progress.totalJobsSaved,
      duration_ms: Date.now() - startTime,
    }).eq("id", logId);
    await supabase.from("stats_cache").upsert({ key: "email_agent_running_id", value: null });

    return { success: true, summary, jobsFound: progress.totalJobsSaved, actionsTaken: progress.totalJobsSaved };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await supabase.from("agent_logs").update({
      status: "failed", error_message: msg, summary: JSON.stringify(progress), duration_ms: Date.now() - startTime,
    }).eq("id", logId);
    await supabase.from("stats_cache").upsert({ key: "email_agent_running_id", value: null });
    return { success: false, summary: "Job email scraper failed", error: msg };
  }
}
