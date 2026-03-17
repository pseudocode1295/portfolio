import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    { data: overview },
    { data: recentLogs },
    { data: jobs },
    { data: pendingApprovals },
    { data: interviewPreps },
  ] = await Promise.all([
    supabase.from("stats_cache").select("value").eq("key", "overview").single(),
    supabase.from("agent_logs").select("*").order("run_at", { ascending: false }).limit(10),
    supabase.from("jobs").select("id, title, company, status, relevance_score, discovered_at, job_url").order("discovered_at", { ascending: false }).limit(50),
    supabase.from("approvals").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("interview_prep").select("*, jobs(title, company)").order("created_at", { ascending: false }).limit(5),
  ]);

  return NextResponse.json({
    overview: overview?.value || {},
    recentLogs: recentLogs || [],
    jobs: jobs || [],
    pendingApprovals: pendingApprovals || [],
    interviewPreps: interviewPreps || [],
  });
}
