import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import type { CompanyProgress } from "@/lib/agents/company-scraper";

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: runningId } = await supabase
    .from("stats_cache").select("value").eq("key", "company_scraper_running_id").single();

  if (!runningId?.value) return NextResponse.json({ running: false });

  const { data: log } = await supabase
    .from("agent_logs").select("id, status, summary, run_at")
    .eq("id", runningId.value).single();

  if (!log) return NextResponse.json({ running: false });

  let progress: CompanyProgress | null = null;
  try { progress = JSON.parse(log.summary) as CompanyProgress; } catch { }

  return NextResponse.json({ running: log.status === "running", status: log.status, logId: log.id, progress });
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await supabase.from("stats_cache").upsert({ key: "company_scraper_cancel", value: true });
  return NextResponse.json({ ok: true });
}
