import { NextRequest, NextResponse } from "next/server";
import { runInterviewPrepAgent } from "@/lib/agents/interview-prep";

function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get("x-agent-key") || req.nextUrl.searchParams.get("key");
  return key === process.env.AGENT_SECRET_KEY;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, emailId } = await req.json().catch(() => ({}));
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const result = await runInterviewPrepAgent(jobId, emailId);
  return NextResponse.json(result);
}
