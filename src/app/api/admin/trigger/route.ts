import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { runJobDiscoveryAgent } from "@/lib/agents/job-discovery";
import { runEmailMonitorAgent, runJobEmailScraperAgent } from "@/lib/agents/email-monitor";
import { runInterviewPrepAgent } from "@/lib/agents/interview-prep";

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agent, payload } = await req.json().catch(() => ({}));

  switch (agent) {
    case "job_discovery": return NextResponse.json(await runJobDiscoveryAgent());
    case "email_monitor": return NextResponse.json(await runEmailMonitorAgent());
    case "job_email_scraper": return NextResponse.json(await runJobEmailScraperAgent(payload?.daysBack ?? 30));
    case "interview_prep": {
      if (!payload?.jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });
      return NextResponse.json(await runInterviewPrepAgent(payload.jobId, payload.emailId));
    }
    default:
      return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
  }
}
