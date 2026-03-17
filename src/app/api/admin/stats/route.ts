import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    { data: allJobs },
    { data: allJobsForCounts },
    { data: recentLogs },
    { data: pendingApprovals },
    { data: interviewPreps },
  ] = await Promise.all([
    // Jobs shown in pipeline: 75%+ match only, sorted by relevance
    supabase.from("jobs")
      .select("id, title, company, location, status, relevance_score, discovered_at, job_url, salary_min, salary_max, salary_currency, required_skills, source")
      .gte("relevance_score", 0.75)
      .order("relevance_score", { ascending: false })
      .limit(100),
    // All jobs for accurate status counts
    supabase.from("jobs").select("status"),
    supabase.from("agent_logs").select("*").order("run_at", { ascending: false }).limit(10),
    supabase.from("approvals").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("interview_prep").select("*, jobs(title, company)").order("created_at", { ascending: false }).limit(5),
  ]);

  const jobs = allJobs || [];

  // Compute status counts from ALL jobs (not just high-match)
  const statusCounts: Record<string, number> = {};
  for (const job of (allJobsForCounts || [])) {
    statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
  }

  const overview = {
    totalJobs: allJobsForCounts?.length ?? 0,
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
