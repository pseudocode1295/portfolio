"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

type JobStatus = "discovered" | "linkedin_pending" | "referral_pending" | "applied" | "responded" | "interview";

interface Job {
  id: string;
  title: string;
  company: string;
  status: JobStatus;
  relevance_score: number;
  discovered_at: string;
  job_url: string;
}

interface Approval {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AgentLog {
  id: string;
  agent_name: string;
  run_at: string;
  status: string;
  summary: string;
  jobs_found: number;
  actions_taken: number;
}

interface InterviewPrep {
  id: string;
  study_plan: string;
  company_research: string;
  interview_questions: Array<{ category: string; question: string; suggestedAnswer: string }>;
  jobs: { title: string; company: string };
}

interface FeedProgress {
  label: string;
  source: string;
  status: "pending" | "running" | "done" | "skipped";
  found: number;
  saved: number;
}

interface DiscoveryProgress {
  totalFeeds: number;
  completedFeeds: number;
  currentFeed: string;
  totalFound: number;
  totalSaved: number;
  cancelled: boolean;
  feeds: FeedProgress[];
}

interface JobProgressData {
  running: boolean;
  status?: string;
  logId?: string;
  progress?: DiscoveryProgress;
}

interface DashboardData {
  overview: { totalJobs: number; pendingApprovals: number; appliedJobs: number; interviewJobs: number; statusCounts: Record<string, number> };
  jobs: Job[];
  pendingApprovals: Approval[];
  recentLogs: AgentLog[];
  interviewPreps: InterviewPrep[];
}

const STATUS_COLORS: Record<JobStatus, string> = {
  discovered: "bg-gray-600",
  linkedin_pending: "bg-blue-600",
  referral_pending: "bg-yellow-600",
  applied: "bg-purple-600",
  responded: "bg-orange-600",
  interview: "bg-green-600",
};

const STATUS_LABELS: Record<JobStatus, string> = {
  discovered: "Discovered",
  linkedin_pending: "LinkedIn Pending",
  referral_pending: "Referral Pending",
  applied: "Applied",
  responded: "Responded",
  interview: "Interview",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pipeline" | "approvals" | "interview" | "logs">("pipeline");
  const [approvalEdit, setApprovalEdit] = useState<Record<string, string>>({});
  const [triggering, setTriggering] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<JobProgressData | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    if (res.status === 401) { router.push("/admin/login"); return; }
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const startProgressPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      const res = await fetch("/api/admin/job-progress");
      const data: JobProgressData = await res.json();
      setJobProgress(data);
      if (!data.running) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setTriggering(null);
        setCancelling(false);
        fetchData();
      }
    }, 2000);
  }, [fetchData]);

  async function cancelJobDiscovery() {
    setCancelling(true);
    await fetch("/api/admin/job-progress", { method: "DELETE" });
  }

  // On mount, check if discovery is already running
  useEffect(() => {
    fetch("/api/admin/job-progress")
      .then(r => r.json())
      .then((data: JobProgressData) => {
        if (data.running) {
          setJobProgress(data);
          setTriggering("job_discovery");
          startProgressPolling();
        }
      });
  }, [startProgressPolling]);

  async function handleApproval(id: string, decision: "approved" | "rejected" | "edited") {
    await fetch("/api/admin/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalId: id, decision, editedContent: approvalEdit[id] }),
    });
    fetchData();
  }

  async function triggerAgent(agent: string) {
    setTriggering(agent);
    if (agent === "job_discovery") {
      setJobProgress(null);
      startProgressPolling();
      // Fire and forget — progress is tracked via polling
      fetch("/api/admin/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent }),
      }).then(() => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        setTriggering(null);
        setCancelling(false);
        fetchData();
      });
    } else {
      await fetch("/api/admin/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent }),
      });
      setTriggering(null);
      fetchData();
    }
  }

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-white text-xl animate-pulse">Loading dashboard...</div>
    </div>
  );

  const overview = data?.overview ?? { totalJobs: 0, pendingApprovals: 0, appliedJobs: 0, interviewJobs: 0, statusCounts: {} as Record<string, number> };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h1 className="text-lg font-bold">Job Hunt Agent</h1>
            <p className="text-xs text-gray-400">Autonomous Job Search Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="text-sm text-gray-400 hover:text-white px-3 py-1 border border-gray-700 rounded-lg">↻ Refresh</button>
          <button onClick={logout} className="text-sm text-red-400 hover:text-red-300 px-3 py-1 border border-red-900 rounded-lg">Logout</button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Jobs", value: overview.totalJobs || 0, color: "text-blue-400" },
          { label: "Pending Approvals", value: overview.pendingApprovals || 0, color: "text-yellow-400" },
          { label: "Applied", value: overview.appliedJobs || 0, color: "text-purple-400" },
          { label: "Interviews", value: overview.interviewJobs || 0, color: "text-green-400" },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Agent Triggers */}
      <div className="px-6 pb-4 flex gap-3 flex-wrap">
        {[
          { key: "job_discovery", label: "🔍 Run Job Discovery" },
          { key: "email_monitor", label: "📧 Check Emails" },
        ].map((a) => (
          <button
            key={a.key}
            onClick={() => triggerAgent(a.key)}
            disabled={triggering === a.key}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {triggering === a.key ? "Running..." : a.label}
          </button>
        ))}
      </div>

      {/* Job Discovery Progress Panel */}
      {triggering === "job_discovery" && (
        <div className="mx-6 mb-4 bg-gray-900 border border-blue-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="font-semibold text-blue-300">Job Discovery Running</span>
              {jobProgress?.progress && (
                <span className="text-sm text-gray-400">
                  {jobProgress.progress.completedFeeds}/{jobProgress.progress.totalFeeds} feeds
                  · {jobProgress.progress.totalFound} found
                  · {jobProgress.progress.totalSaved} saved
                </span>
              )}
            </div>
            <button
              onClick={cancelJobDiscovery}
              disabled={cancelling}
              className="text-sm text-red-400 hover:text-red-300 border border-red-800 px-3 py-1 rounded-lg disabled:opacity-50 transition"
            >
              {cancelling ? "Cancelling..." : "✕ Cancel"}
            </button>
          </div>

          {/* Overall progress bar */}
          {jobProgress?.progress && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{jobProgress.progress.currentFeed}</span>
                <span>{Math.round((jobProgress.progress.completedFeeds / jobProgress.progress.totalFeeds) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((jobProgress.progress.completedFeeds / jobProgress.progress.totalFeeds) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Per-feed breakdown */}
          {jobProgress?.progress?.feeds && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-64 overflow-y-auto">
              {jobProgress.progress.feeds.map((feed, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg bg-gray-800">
                  <span className="flex-shrink-0 w-4 text-center">
                    {feed.status === "done" ? "✓" :
                     feed.status === "running" ? <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> :
                     feed.status === "skipped" ? "–" : "·"}
                  </span>
                  <span className={`flex-1 truncate ${
                    feed.status === "done" ? "text-gray-300" :
                    feed.status === "running" ? "text-blue-300 font-medium" :
                    feed.status === "skipped" ? "text-gray-600 line-through" :
                    "text-gray-500"
                  }`}>{feed.label}</span>
                  {feed.status === "done" && (
                    <span className="flex-shrink-0 text-gray-500">
                      {feed.found > 0 ? <span className="text-green-400">{feed.saved} saved</span> : "0"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {!jobProgress?.progress && (
            <p className="text-sm text-gray-500 animate-pulse">Initialising...</p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 border-b border-gray-800 flex gap-1">
        {(["pipeline", "approvals", "interview", "logs"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium capitalize transition border-b-2 ${activeTab === tab ? "border-blue-500 text-white" : "border-transparent text-gray-400 hover:text-white"}`}
          >
            {tab}
            {tab === "approvals" && (data?.pendingApprovals?.length ?? 0) > 0 && (
              <span className="ml-2 bg-yellow-600 text-white text-xs px-1.5 py-0.5 rounded-full">{data?.pendingApprovals?.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-6 py-4">
        {/* Pipeline Tab */}
        {activeTab === "pipeline" && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Job Pipeline</h2>
            {/* Status flow */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {(Object.keys(STATUS_LABELS) as JobStatus[]).map((s) => (
                <div key={s} className="flex-shrink-0 bg-gray-900 border border-gray-800 rounded-xl p-3 min-w-[130px]">
                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[s]} inline-block mb-2`}>{STATUS_LABELS[s]}</div>
                  <div className="text-2xl font-bold">{overview.statusCounts?.[s] || 0}</div>
                </div>
              ))}
            </div>
            {/* Job list */}
            <div className="space-y-2">
              {(data?.jobs || []).map((job) => (
                <div key={job.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{job.title}</div>
                    <div className="text-sm text-gray-400">{job.company} · {new Date(job.discovered_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{Math.round(job.relevance_score * 100)}% match</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[job.status]}`}>{STATUS_LABELS[job.status]}</span>
                    <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">View →</a>
                  </div>
                </div>
              ))}
              {!data?.jobs?.length && <p className="text-gray-500 text-center py-8">No jobs discovered yet. Run the Job Discovery agent above.</p>}
            </div>
          </div>
        )}

        {/* Approvals Tab */}
        {activeTab === "approvals" && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Pending Approvals</h2>
            <div className="space-y-4">
              {(data?.pendingApprovals || []).map((approval) => (
                <div key={approval.id} className="bg-gray-900 border border-yellow-900/50 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-xs bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded-full mr-2">{approval.type.replace("_", " ")}</span>
                      <span className="font-medium">{approval.title}</span>
                    </div>
                    <span className="text-xs text-gray-500">{new Date(approval.created_at).toLocaleDateString()}</span>
                  </div>
                  <textarea
                    defaultValue={approval.content}
                    onChange={(e) => setApprovalEdit((prev) => ({ ...prev, [approval.id]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 resize-none focus:outline-none focus:border-blue-500"
                    rows={4}
                  />
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleApproval(approval.id, "approved")} className="flex-1 bg-green-700 hover:bg-green-600 text-white text-sm py-2 rounded-lg transition">✓ Approve</button>
                    <button onClick={() => handleApproval(approval.id, "edited")} className="flex-1 bg-blue-700 hover:bg-blue-600 text-white text-sm py-2 rounded-lg transition">✎ Approve Edited</button>
                    <button onClick={() => handleApproval(approval.id, "rejected")} className="flex-1 bg-red-900 hover:bg-red-800 text-white text-sm py-2 rounded-lg transition">✕ Reject</button>
                  </div>
                </div>
              ))}
              {!data?.pendingApprovals?.length && <p className="text-gray-500 text-center py-8">No pending approvals. 🎉</p>}
            </div>
          </div>
        )}

        {/* Interview Prep Tab */}
        {activeTab === "interview" && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Interview Preparation</h2>
            <div className="space-y-6">
              {(data?.interviewPreps || []).map((prep) => (
                <div key={prep.id} className="bg-gray-900 border border-green-900/50 rounded-xl p-4">
                  <h3 className="font-bold text-green-400 text-lg mb-4">
                    {prep.jobs?.title} @ {prep.jobs?.company}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">📊 Company Research</h4>
                      <p className="text-sm text-gray-400 whitespace-pre-wrap">{prep.company_research?.slice(0, 500)}...</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">📅 Study Plan</h4>
                      <p className="text-sm text-gray-400 whitespace-pre-wrap">{prep.study_plan?.slice(0, 500)}...</p>
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">❓ Interview Questions ({prep.interview_questions?.length || 0})</h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {(prep.interview_questions || []).slice(0, 5).map((q, i) => (
                      <details key={i} className="bg-gray-800 rounded-lg p-3 cursor-pointer">
                        <summary className="text-sm font-medium text-white list-none flex justify-between">
                          <span>{q.question}</span>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{q.category}</span>
                        </summary>
                        <p className="text-sm text-gray-400 mt-2 border-t border-gray-700 pt-2">{q.suggestedAnswer}</p>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
              {!data?.interviewPreps?.length && <p className="text-gray-500 text-center py-8">No interview prep generated yet. It auto-triggers when you get an interview invite.</p>}
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Agent Logs</h2>
            <div className="space-y-2">
              {(data?.recentLogs || []).map((log) => (
                <div key={log.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full mr-2 ${log.status === "completed" ? "bg-green-900/50 text-green-400" : log.status === "failed" ? "bg-red-900/50 text-red-400" : "bg-yellow-900/50 text-yellow-400"}`}>{log.status}</span>
                    <span className="text-sm font-medium">{log.agent_name.replace("_", " ")}</span>
                    <span className="text-xs text-gray-500 ml-3">{log.summary}</span>
                  </div>
                  <div className="text-xs text-gray-500">{new Date(log.run_at).toLocaleString()}</div>
                </div>
              ))}
              {!data?.recentLogs?.length && <p className="text-gray-500 text-center py-8">No agent runs yet.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
