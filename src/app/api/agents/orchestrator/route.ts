import { NextRequest, NextResponse } from "next/server";
import { runOrchestrator, type OrchestratorMode } from "@/lib/agents/orchestrator";

function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get("x-agent-key") || req.nextUrl.searchParams.get("key");
  return key === process.env.AGENT_SECRET_KEY;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mode = "daily" } = await req.json().catch(() => ({}));
  const result = await runOrchestrator(mode as OrchestratorMode);
  return NextResponse.json(result);
}

// For Vercel Cron (GET request)
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mode = (req.nextUrl.searchParams.get("mode") || "daily") as OrchestratorMode;
  const result = await runOrchestrator(mode);
  return NextResponse.json(result);
}
