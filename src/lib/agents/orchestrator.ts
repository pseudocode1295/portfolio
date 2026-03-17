import { supabase } from "@/lib/supabase";
import { notify } from "@/lib/whatsapp";
import { runJobDiscoveryAgent } from "./job-discovery";
import { runLinkedInAgent } from "./linkedin";
import { runApplicationAgent } from "./application";
import { runEmailMonitorAgent } from "./email-monitor";
import type { AgentResult } from "./types";

export type OrchestratorMode = "daily" | "email_check" | "full";

interface OrchestratorResult {
  mode: OrchestratorMode;
  agents: Record<string, AgentResult>;
  totalJobsFound: number;
  totalActionsTaken: number;
  durationMs: number;
}

// Update dashboard stats cache
async function updateStatsCache(): Promise<void> {
  const [
    { count: totalJobs },
    { count: pendingApprovals },
    { count: appliedJobs },
    { count: interviewJobs },
    { data: recentLogs },
  ] = await Promise.all([
    supabase.from("jobs").select("*", { count: "exact", head: true }),
    supabase.from("approvals").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "applied"),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "interview"),
    supabase.from("agent_logs").select("*").order("run_at", { ascending: false }).limit(5),
  ]);

  const statusCounts = await supabase
    .from("jobs")
    .select("status")
    .then(({ data }) => {
      const counts: Record<string, number> = {};
      data?.forEach((j) => { counts[j.status] = (counts[j.status] || 0) + 1; });
      return counts;
    });

  await supabase.from("stats_cache").upsert([
    { key: "overview", value: { totalJobs, pendingApprovals, appliedJobs, interviewJobs, statusCounts }, updated_at: new Date().toISOString() },
    { key: "recent_logs", value: recentLogs || [], updated_at: new Date().toISOString() },
  ]);
}

// Main orchestrator — coordinates all agents
export async function runOrchestrator(mode: OrchestratorMode = "daily"): Promise<OrchestratorResult> {
  const startTime = Date.now();
  const results: Record<string, AgentResult> = {};

  const { data: logEntry } = await supabase
    .from("agent_logs")
    .insert({ agent_name: "orchestrator", status: "running", summary: `Running in ${mode} mode` })
    .select()
    .single();

  try {
    if (mode === "daily" || mode === "full") {
      // Step 1: Discover new jobs
      results.jobDiscovery = await runJobDiscoveryAgent();

      // Step 2: Process LinkedIn connections/referrals
      results.linkedin = await runLinkedInAgent();

      // Step 3: Check for applications needed (24hr referral timeout)
      results.application = await runApplicationAgent();
    }

    if (mode === "email_check" || mode === "full") {
      // Step 4: Monitor emails
      results.emailMonitor = await runEmailMonitorAgent();
    }

    // Step 5: Update stats cache
    await updateStatsCache();

    const totalJobsFound = Object.values(results).reduce((sum, r) => sum + (r.jobsFound || 0), 0);
    const totalActionsTaken = Object.values(results).reduce((sum, r) => sum + (r.actionsTaken || 0), 0);
    const durationMs = Date.now() - startTime;

    await supabase.from("agent_logs").update({
      status: "completed",
      summary: `${mode} run: ${totalJobsFound} jobs found, ${totalActionsTaken} actions`,
      jobs_found: totalJobsFound,
      actions_taken: totalActionsTaken,
      duration_ms: durationMs,
    }).eq("id", logEntry?.id);

    return { mode, agents: results, totalJobsFound, totalActionsTaken, durationMs };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await supabase.from("agent_logs").update({ status: "failed", error_message: msg, duration_ms: Date.now() - startTime }).eq("id", logEntry?.id);
    await notify.agentError("orchestrator", msg);
    throw error;
  }
}
