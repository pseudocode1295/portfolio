import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    { data: allJobs },
    { data: recentLogs },
    { data: pendingApprovals },
    { data: interviewPreps },
  ] = await Promise.all([
    supabase.from("jobs")
      .select("id, title, company, location, status, relevance_score, discovered_at, job_url, salary_min, salary_max, salary_currency, required_skills, source")
      .order("discovered_at", { ascending: false })
      .limit(100),
    supabase.from("agent_logs").select("*").order("run_at", { ascending: false }).limit(10),
    supabase.from("approvals").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("interview_prep").select("*, jobs(title, company)").order("created_at", { ascending: false }).limit(5),
  ]);

  const jobs = allJobs || [];

  // Compute status counts live from DB
  const statusCounts: Record<string, number> = {};
  for (const job of jobs) {
    statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
  }

  const overview = {
    totalJobs: jobs.length,
    pendingApprovals: pendingApprovals?.length ?? 0,
    appliedJobs: statusCounts["applied"] || 0,
    interviewJobs: statusCounts["interview"] || 0,
    statusCounts,
  };

  return NextResponse.json({
    overview,
    recentLogs: recentLogs || [],
    jobs,
    pendingApprovals: pendingApprovals || [],
    interviewPreps: interviewPreps || [],
  });
}
