import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import type { DiscoveryProgress } from "@/lib/agents/job-discovery";

// GET — return current job discovery progress
export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: runningId } = await supabase
    .from("stats_cache")
    .select("value")
    .eq("key", "job_discovery_running_id")
    .single();

  if (!runningId?.value) return NextResponse.json({ running: false });

  const { data: log } = await supabase
    .from("agent_logs")
    .select("id, status, summary, run_at")
    .eq("id", runningId.value)
    .single();

  if (!log) return NextResponse.json({ running: false });

  let progress: DiscoveryProgress | null = null;
  try {
    progress = JSON.parse(log.summary) as DiscoveryProgress;
  } catch {
    progress = null;
  }

  return NextResponse.json({
    running: log.status === "running",
    status: log.status,
    logId: log.id,
    progress,
  });
}

// DELETE — request cancellation
export async function DELETE(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase.from("stats_cache").upsert({ key: "job_discovery_cancel", value: true });
  return NextResponse.json({ ok: true, message: "Cancel requested — will stop after current feed" });
}
