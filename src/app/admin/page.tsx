"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

type JobStatus = "discovered" | "linkedin_pending" | "referral_pending" | "applied" | "responded" | "interview";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  status: JobStatus;
  relevance_score: number;
  discovered_at: string;
  job_url: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  required_skills: string[];
  source: string;
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

interface EmailItemProgress {
  subject: string;
  from: string;
  type: "linkedin" | "naukri" | "other";
  status: "pending" | "running" | "done" | "skipped";
  extracted: number;
  saved: number;
}

interface EmailProgress {
  agent: "email_monitor" | "job_email_scraper";
  totalEmails: number;
  processedEmails: number;
  currentEmail: string;
  linkedinEmails: number;
  naukriEmails: number;
  totalJobsSaved: number;
  cancelled: boolean;
  emails: EmailItemProgress[];
}

interface EmailProgressData {
  running: boolean;
  status?: string;
  logId?: string;
  agentName?: string;
  progress?: EmailProgress;
}

interface CompanyResult {
  name: string;
  slug: string;
  category: string;
  status: "pending" | "running" | "done" | "failed" | "skipped";
  found: number;
  saved: number;
  error?: string;
}

interface CompanyProgress {
  totalCompanies: number;
  completedCompanies: number;
  currentCompany: string;
  totalFound: number;
  totalSaved: number;
  cancelled: boolean;
  companies: CompanyResult[];
}

interface CompanyProgressData {
  running: boolean;
  status?: string;
  logId?: string;
  progress?: CompanyProgress;
}

// Source → category lookup for the Companies tab
const COMPANY_CATEGORY: Record<string, string> = {
  // FAANG
  google: "FAANG", amazon: "FAANG", apple: "FAANG", microsoft: "FAANG", meta: "FAANG", netflix: "FAANG",
  // Big Tech
  uber: "Big Tech", airbnb: "Big Tech", adobe: "Big Tech", atlassian: "Big Tech", salesforce: "Big Tech",
  linkedin: "Big Tech", snap: "Big Tech", pinterest: "Big Tech", lyft: "Big Tech", doordash: "Big Tech",
  shopify: "Big Tech", twitter: "Big Tech", palantir: "Big Tech", instacart: "Big Tech",
  // Product
  stripe: "Product", figma: "Product", notion: "Product", canva: "Product", dropbox: "Product",
  grammarly: "Product", twilio: "Product", zendesk: "Product", rippling: "Product",
  postman: "Product", browserstack: "Product", intuit: "Product", gong: "Product", twitch: "Product",
  zoom: "Product", hubspot: "Product", datadog: "Product", cloudflare: "Product", coinbase: "Product",
  airtable: "Product", asana: "Product", miro: "Product", loom: "Product", robinhood: "Product",
  plaid: "Product", brex: "Product",
  // Indian Unicorn
  razorpay: "Indian Unicorn", freshworks: "Indian Unicorn", cred: "Indian Unicorn",
  meesho: "Indian Unicorn", urbancompany: "Indian Unicorn", groww: "Indian Unicorn",
  zepto: "Indian Unicorn", phonepe: "Indian Unicorn", swiggy: "Indian Unicorn", zomato: "Indian Unicorn",
  nykaa: "Indian Unicorn", chargebee: "Indian Unicorn", clevertap: "Indian Unicorn", dream11: "Indian Unicorn",
  dunzo: "Indian Unicorn", ola: "Indian Unicorn", delhivery: "Indian Unicorn", moengage: "Indian Unicorn",
  darwinbox: "Indian Unicorn", inmobi: "Indian Unicorn", leadsquared: "Indian Unicorn", exotel: "Indian Unicorn",
  // MNC
  paypal: "MNC", walmart: "MNC", cisco: "MNC", workday: "MNC", wayfair: "MNC",
  thoughtworks: "MNC", epam: "MNC", globallogic: "MNC", sapient: "MNC", elastic: "MNC", splunk: "MNC", okta: "MNC",
  // AI/ML
  openai: "AI/ML", anthropic: "AI/ML", cohere: "AI/ML", scaleai: "AI/ML", huggingface: "AI/ML",
  wandb: "AI/ML", stabilityai: "AI/ML", mistral: "AI/ML", runway: "AI/ML", togetherai: "AI/ML",
  // Data & Infra
  mongodb: "Data & Infra", snowflake: "Data & Infra", databricks: "Data & Infra", confluent: "Data & Infra",
  hashicorp: "Data & Infra", gitlab: "Data & Infra", pagerduty: "Data & Infra", vercel: "Data & Infra",
  retool: "Data & Infra", airbyte: "Data & Infra",
};

function getCompanyCategory(source: string): string {
  const slug = source.replace("company_", "");
  return COMPANY_CATEGORY[slug] || "Other";
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
  const [activeTab, setActiveTab] = useState<"job_discovery" | "email_alerts" | "companies" | "approvals" | "interview" | "logs">("job_discovery");
  const [approvalEdit, setApprovalEdit] = useState<Record<string, string>>({});
  const [triggering, setTriggering] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<JobProgressData | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [emailProgress, setEmailProgress] = useState<EmailProgressData | null>(null);
  const [emailCancelling, setEmailCancelling] = useState(false);
  const emailPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [companyProgress, setCompanyProgress] = useState<CompanyProgressData | null>(null);
  const [companyCancelling, setCompanyCancelling] = useState(false);
  const companyPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [companyJobs, setCompanyJobs] = useState<Job[]>([]);
  const [companyCategoryFilter, setCompanyCategoryFilter] = useState("All");

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

  const startEmailPolling = useCallback((agentKey: string) => {
    if (emailPollRef.current) return;
    emailPollRef.current = setInterval(async () => {
      const res = await fetch("/api/admin/email-progress");
      const data: EmailProgressData = await res.json();
      setEmailProgress(data);
      if (!data.running) {
        clearInterval(emailPollRef.current!);
        emailPollRef.current = null;
        setTriggering(null);
        setEmailCancelling(false);
        fetchData();
      }
    }, 2000);
  }, [fetchData]);

  async function cancelEmailAgent() {
    setEmailCancelling(true);
    await fetch("/api/admin/email-progress", { method: "DELETE" });
  }

  const fetchCompanyJobs = useCallback(async () => {
    const res = await fetch("/api/admin/company-jobs");
    const data = await res.json();
    setCompanyJobs(data.jobs || []);
  }, []);

  const startCompanyPolling = useCallback(() => {
    if (companyPollRef.current) return;
    companyPollRef.current = setInterval(async () => {
      const res = await fetch("/api/admin/company-scraper");
      const data: CompanyProgressData = await res.json();
      setCompanyProgress(data);
      if (!data.running) {
        clearInterval(companyPollRef.current!);
        companyPollRef.current = null;
        setTriggering(null);
        setCompanyCancelling(false);
        fetchCompanyJobs();
      }
    }, 2000);
  }, [fetchCompanyJobs]);

  async function cancelCompanyScraper() {
    setCompanyCancelling(true);
    await fetch("/api/admin/company-scraper", { method: "DELETE" });
  }

  // On mount, check if any agent is already running + load company jobs
  useEffect(() => {
    fetch("/api/admin/job-progress")
      .then(r => r.json())
      .then((data: JobProgressData) => {
        if (data.running) { setJobProgress(data); setTriggering("job_discovery"); startProgressPolling(); }
      });
    fetch("/api/admin/email-progress")
      .then(r => r.json())
      .then((data: EmailProgressData) => {
        if (data.running) { setEmailProgress(data); setTriggering(data.agentName || "email_monitor"); startEmailPolling(data.agentName || "email_monitor"); }
      });
    fetch("/api/admin/company-scraper")
      .then(r => r.json())
      .then((data: CompanyProgressData) => {
        if (data.running) { setCompanyProgress(data); setTriggering("company_scraper"); startCompanyPolling(); }
      });
    fetchCompanyJobs();
  }, [startProgressPolling, startEmailPolling, startCompanyPolling, fetchCompanyJobs]);

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
    } else if (agent === "company_scraper") {
      setCompanyProgress(null);
      setActiveTab("companies");
      startCompanyPolling();
      fetch("/api/admin/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent }),
      }).then(() => {
        if (companyPollRef.current) { clearInterval(companyPollRef.current); companyPollRef.current = null; }
        setTriggering(null);
        setCompanyCancelling(false);
        fetchCompanyJobs();
      });
    } else if (agent === "email_monitor" || agent === "job_email_scraper") {
      setEmailProgress(null);
      startEmailPolling(agent);
      fetch("/api/admin/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent }),
      }).then(() => {
        if (emailPollRef.current) { clearInterval(emailPollRef.current); emailPollRef.current = null; }
        setTriggering(null);
        setEmailCancelling(false);
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

  async function deleteJob(id: string) {
    await fetch(`/api/admin/jobs?id=${id}`, { method: "DELETE" });
    fetchData();
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
          { key: "job_email_scraper", label: "📨 Scrape Job Alert Emails (30d)" },
          { key: "company_scraper", label: "🏢 Scrape Company Career Pages" },
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

      {/* Email Agent Progress Panel */}
      {(triggering === "email_monitor" || triggering === "job_email_scraper") && (
        <div className="mx-6 mb-4 bg-gray-900 border border-purple-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="font-semibold text-purple-300">
                {triggering === "email_monitor" ? "Checking Emails" : "Scraping Job Alert Emails"}
              </span>
              {emailProgress?.progress && (
                <span className="text-sm text-gray-400">
                  {emailProgress.progress.processedEmails}/{emailProgress.progress.totalEmails} emails
                  {emailProgress.progress.totalJobsSaved > 0 && ` · ${emailProgress.progress.totalJobsSaved} jobs saved`}
                </span>
              )}
            </div>
            <button
              onClick={cancelEmailAgent}
              disabled={emailCancelling}
              className="text-sm text-red-400 hover:text-red-300 border border-red-800 px-3 py-1 rounded-lg disabled:opacity-50 transition"
            >
              {emailCancelling ? "Cancelling..." : "✕ Cancel"}
            </button>
          </div>

          {emailProgress?.progress && (
            <>
              {/* Overall progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="truncate max-w-xs">{emailProgress.progress.currentEmail}</span>
                  <span>
                    {emailProgress.progress.totalEmails > 0
                      ? Math.round((emailProgress.progress.processedEmails / emailProgress.progress.totalEmails) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: emailProgress.progress.totalEmails > 0
                        ? `${Math.round((emailProgress.progress.processedEmails / emailProgress.progress.totalEmails) * 100)}%`
                        : "0%"
                    }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-xs text-gray-400 mb-3">
                <span>LinkedIn: <span className="text-blue-400 font-semibold">{emailProgress.progress.linkedinEmails}</span></span>
                <span>Naukri: <span className="text-orange-400 font-semibold">{emailProgress.progress.naukriEmails}</span></span>
                <span>Jobs saved: <span className="text-green-400 font-semibold">{emailProgress.progress.totalJobsSaved}</span></span>
                {emailProgress.progress.cancelled && <span className="text-yellow-400 font-medium">⚠ Cancelled</span>}
              </div>

              {/* Per-email list */}
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {emailProgress.progress.emails.filter(e => e.status !== "skipped" || e.subject !== "(already processed)").map((email, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg bg-gray-800">
                    <span className="flex-shrink-0 w-4 text-center">
                      {email.status === "done" ? "✓" :
                       email.status === "running" ? <span className="inline-block w-2 h-2 rounded-full bg-purple-400 animate-pulse" /> :
                       email.status === "skipped" ? "–" : "·"}
                    </span>
                    <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded ${
                      email.type === "linkedin" ? "bg-blue-900/50 text-blue-300" :
                      email.type === "naukri" ? "bg-orange-900/50 text-orange-300" :
                      "bg-gray-700 text-gray-400"
                    }`}>
                      {email.type === "linkedin" ? "LI" : email.type === "naukri" ? "NK" : "—"}
                    </span>
                    <span className={`flex-1 truncate ${
                      email.status === "running" ? "text-purple-300 font-medium" :
                      email.status === "done" ? "text-gray-300" : "text-gray-600"
                    }`}>{email.subject}</span>
                    {email.status === "done" && email.saved > 0 && (
                      <span className="flex-shrink-0 text-green-400 font-semibold">{email.saved} saved</span>
                    )}
                    {email.status === "done" && email.saved === 0 && email.extracted > 0 && (
                      <span className="flex-shrink-0 text-gray-600">{email.extracted} found</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {!emailProgress?.progress && (
            <p className="text-sm text-gray-500 animate-pulse">Initialising...</p>
          )}
        </div>
      )}

      {/* Company Scraper Progress Panel */}
      {triggering === "company_scraper" && (
        <div className="mx-6 mb-4 bg-gray-900 border border-emerald-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-emerald-300">Scraping Company Career Pages</span>
              {companyProgress?.progress && (
                <span className="text-sm text-gray-400">
                  {companyProgress.progress.completedCompanies}/{companyProgress.progress.totalCompanies} companies
                  · {companyProgress.progress.totalFound} found
                  · {companyProgress.progress.totalSaved} saved
                </span>
              )}
            </div>
            <button
              onClick={cancelCompanyScraper}
              disabled={companyCancelling}
              className="text-sm text-red-400 hover:text-red-300 border border-red-800 px-3 py-1 rounded-lg disabled:opacity-50 transition"
            >
              {companyCancelling ? "Cancelling..." : "✕ Cancel"}
            </button>
          </div>

          {companyProgress?.progress && (
            <>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="truncate max-w-xs">{companyProgress.progress.currentCompany}</span>
                  <span>{companyProgress.progress.totalCompanies > 0
                    ? Math.round((companyProgress.progress.completedCompanies / companyProgress.progress.totalCompanies) * 100)
                    : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${companyProgress.progress.totalCompanies > 0
                      ? Math.round((companyProgress.progress.completedCompanies / companyProgress.progress.totalCompanies) * 100)
                      : 0}%` }}
                  />
                </div>
              </div>

              {/* Per-company grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 max-h-56 overflow-y-auto">
                {companyProgress.progress.companies.map((c, i) => (
                  <div key={i} className={`flex items-center gap-1.5 text-xs py-1 px-2 rounded-lg ${
                    c.status === "running" ? "bg-emerald-900/40 border border-emerald-700/50" : "bg-gray-800"
                  }`}>
                    <span className={`flex-shrink-0 ${
                      c.status === "done" && c.saved > 0 ? "text-green-400" :
                      c.status === "done"    ? "text-gray-600" :
                      c.status === "running" ? "text-emerald-400" :
                      c.status === "failed"  ? "text-red-400" : "text-gray-700"
                    }`}>
                      {c.status === "done" ? "✓" : c.status === "running" ? "▶" : c.status === "failed" ? "✗" : "·"}
                    </span>
                    <span className={`flex-1 truncate ${
                      c.status === "running" ? "text-emerald-300 font-medium" :
                      c.status === "done" && c.saved > 0 ? "text-gray-200" :
                      c.status === "failed" ? "text-red-400" : "text-gray-500"
                    }`}>{c.name}</span>
                    {c.status === "done" && c.saved > 0 && (
                      <span className="flex-shrink-0 text-green-400 font-semibold">{c.saved}</span>
                    )}
                    {c.status === "failed" && (
                      <span className="flex-shrink-0 text-red-500" title={c.error}>!</span>
                    )}
                  </div>
                ))}
              </div>

              {companyProgress.progress.cancelled && (
                <p className="text-xs text-yellow-400 mt-2">⚠ Cancelled by user</p>
              )}
            </>
          )}

          {!companyProgress?.progress && (
            <p className="text-sm text-gray-500 animate-pulse">Initialising...</p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 border-b border-gray-800 flex gap-1">
        {([
          { key: "job_discovery", label: "🔍 Job Discovery" },
          { key: "email_alerts",  label: "📨 Email Alerts" },
          { key: "companies",     label: "🏢 Companies" },
          { key: "approvals",     label: "Approvals" },
          { key: "interview",     label: "Interview" },
          { key: "logs",          label: "Logs" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium transition border-b-2 whitespace-nowrap ${activeTab === tab.key ? "border-blue-500 text-white" : "border-transparent text-gray-400 hover:text-white"}`}
          >
            {tab.label}
            {tab.key === "approvals" && (data?.pendingApprovals?.length ?? 0) > 0 && (
              <span className="ml-2 bg-yellow-600 text-white text-xs px-1.5 py-0.5 rounded-full">{data?.pendingApprovals?.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-6 py-4">
        {/* Pipeline Tab */}
        {/* Shared status counts bar — shown on both job tabs */}
        {(activeTab === "job_discovery" || activeTab === "email_alerts") && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {(Object.keys(STATUS_LABELS) as JobStatus[]).map((s) => (
              <div key={s} className="flex-shrink-0 bg-gray-900 border border-gray-800 rounded-xl p-3 min-w-[130px]">
                <div className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[s]} inline-block mb-2`}>{STATUS_LABELS[s]}</div>
                <div className="text-2xl font-bold">{overview.statusCounts?.[s] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* Job Discovery Tab */}
        {activeTab === "job_discovery" && (() => {
          const jobs = (data?.jobs || []).filter(j => !j.source?.endsWith("_email"));
          const JobCard = ({ job }: { job: Job }) => (
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{job.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status]}`}>{STATUS_LABELS[job.status]}</span>
                    <span className="text-xs text-gray-500">{Math.round(job.relevance_score * 100)}% match</span>
                  </div>
                  <div className="text-sm text-gray-400 mt-0.5">
                    {job.company}{job.location && <span> · {job.location}</span>}
                    <span className="ml-2 text-gray-600 text-xs">{job.source}</span>
                    <span className="ml-2 text-gray-600 text-xs">{new Date(job.discovered_at).toLocaleDateString()}</span>
                  </div>
                  {(job.salary_min || job.salary_max) && (
                    <div className="text-xs text-green-400 mt-1">💰 {job.salary_min}{job.salary_max && `–${job.salary_max}`} LPA</div>
                  )}
                  {job.required_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {job.required_skills.slice(0, 8).map(s => (
                        <span key={s} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full border border-gray-700">{s}</span>
                      ))}
                      {job.required_skills.length > 8 && <span className="text-xs text-gray-600">+{job.required_skills.length - 8} more</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={job.job_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 px-2 py-1 rounded-lg transition">View →</a>
                  <button onClick={() => deleteJob(job.id)}
                    className="text-xs text-red-500 hover:text-red-400 border border-red-900/50 px-2 py-1 rounded-lg transition" title="Remove">✕</button>
                </div>
              </div>
            </div>
          );
          return (
            <div className="space-y-2">
              {jobs.map(job => <JobCard key={job.id} job={job} />)}
              {!jobs.length && <p className="text-gray-500 text-center py-8">No jobs discovered yet. Run <span className="text-blue-400">🔍 Run Job Discovery</span> above.</p>}
            </div>
          );
        })()}

        {/* Email Alerts Tab */}
        {activeTab === "email_alerts" && (() => {
          const jobs = (data?.jobs || []).filter(j => j.source?.endsWith("_email"));
          const JobCard = ({ job }: { job: Job }) => (
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{job.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status]}`}>{STATUS_LABELS[job.status]}</span>
                    <span className="text-xs text-gray-500">{Math.round(job.relevance_score * 100)}% match</span>
                  </div>
                  <div className="text-sm text-gray-400 mt-0.5">
                    {job.company}{job.location && <span> · {job.location}</span>}
                    <span className="ml-2 text-gray-600 text-xs">{job.source}</span>
                    <span className="ml-2 text-gray-600 text-xs">{new Date(job.discovered_at).toLocaleDateString()}</span>
                  </div>
                  {(job.salary_min || job.salary_max) && (
                    <div className="text-xs text-green-400 mt-1">💰 {job.salary_min}{job.salary_max && `–${job.salary_max}`} LPA</div>
                  )}
                  {job.required_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {job.required_skills.slice(0, 8).map(s => (
                        <span key={s} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full border border-gray-700">{s}</span>
                      ))}
                      {job.required_skills.length > 8 && <span className="text-xs text-gray-600">+{job.required_skills.length - 8} more</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={job.job_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 px-2 py-1 rounded-lg transition">View →</a>
                  <button onClick={() => deleteJob(job.id)}
                    className="text-xs text-red-500 hover:text-red-400 border border-red-900/50 px-2 py-1 rounded-lg transition" title="Remove">✕</button>
                </div>
              </div>
            </div>
          );
          return (
            <div className="space-y-2">
              {jobs.map(job => <JobCard key={job.id} job={job} />)}
              {!jobs.length && <p className="text-gray-500 text-center py-8">No email jobs yet. Run <span className="text-purple-400">📨 Scrape Job Alert Emails</span> above.</p>}
            </div>
          );
        })()}

        {/* Companies Tab */}
        {activeTab === "companies" && (() => {
          const categories = ["All", "FAANG", "Big Tech", "Product", "Indian Unicorn", "MNC", "AI/ML", "Data & Infra"];
          const filtered = companyCategoryFilter === "All"
            ? companyJobs
            : companyJobs.filter(j => getCompanyCategory(j.source) === companyCategoryFilter);

          // Group by company name within the filtered list
          const byCompany: Record<string, Job[]> = {};
          for (const job of filtered) {
            if (!byCompany[job.company]) byCompany[job.company] = [];
            byCompany[job.company].push(job);
          }

          return (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">🏢 Company Career Pages</h2>
                <span className="text-xs text-gray-500">{companyJobs.length} jobs scraped · {Object.keys(byCompany).length} companies</span>
              </div>

              {/* Category filter tabs */}
              <div className="flex gap-1 flex-wrap mb-5">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCompanyCategoryFilter(cat)}
                    className={`px-3 py-1 text-xs rounded-full border transition ${
                      companyCategoryFilter === cat
                        ? "bg-emerald-700 border-emerald-600 text-white"
                        : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
                    }`}
                  >
                    {cat}
                    {cat !== "All" && (
                      <span className="ml-1 opacity-60">
                        {companyJobs.filter(j => getCompanyCategory(j.source) === cat).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {companyJobs.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-400 mb-2">No company jobs scraped yet.</p>
                  <p className="text-gray-600 text-sm">Click <span className="text-emerald-400">🏢 Scrape Company Career Pages</span> above to start.</p>
                  <p className="text-gray-700 text-xs mt-2">Covers {Object.keys(COMPANY_CATEGORY).length}+ companies: FAANG, Big Tech, Product companies, Indian Unicorns, MNCs</p>
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No jobs in this category yet.</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(byCompany).map(([companyName, jobs]) => (
                    <div key={companyName}>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-white">{companyName}</h3>
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{jobs.length}</span>
                        <span className="text-xs text-gray-600">{getCompanyCategory(jobs[0].source)}</span>
                      </div>
                      <div className="space-y-1.5 ml-2">
                        {jobs.map(job => (
                          <div key={job.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-white text-sm">{job.title}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status]}`}>{STATUS_LABELS[job.status]}</span>
                                  <span className="text-xs text-gray-500">{Math.round(job.relevance_score * 100)}% match</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {job.location && <span>{job.location}</span>}
                                  <span className="ml-2 text-gray-600">{new Date(job.discovered_at).toLocaleDateString()}</span>
                                </div>
                                {(job.salary_min || job.salary_max) && (
                                  <div className="text-xs text-green-400 mt-1">
                                    💰 {job.salary_min}{job.salary_max && `–${job.salary_max}`} LPA
                                  </div>
                                )}
                                {job.required_skills?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {job.required_skills.slice(0, 6).map(s => (
                                      <span key={s} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full border border-gray-700">{s}</span>
                                    ))}
                                    {job.required_skills.length > 6 && <span className="text-xs text-gray-600">+{job.required_skills.length - 6}</span>}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <a href={job.job_url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 px-2 py-1 rounded-lg transition">
                                  Apply →
                                </a>
                                <button onClick={() => deleteJob(job.id)}
                                  className="text-xs text-red-500 hover:text-red-400 border border-red-900/50 px-2 py-1 rounded-lg transition">
                                  ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

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
            <div className="space-y-3">
              {(data?.recentLogs || []).map((log) => {
                // Try to parse JSON summary (job_discovery stores progress JSON)
                let parsedSummary: DiscoveryProgress | null = null;
                try { parsedSummary = JSON.parse(log.summary); } catch { /* plain text */ }
                const isJobDiscovery = log.agent_name === "job_discovery" && parsedSummary?.feeds;

                return (
                  <div key={log.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          log.status === "completed" ? "bg-green-900/50 text-green-400" :
                          log.status === "failed"    ? "bg-red-900/50 text-red-400" :
                          log.status === "running"   ? "bg-blue-900/50 text-blue-400" :
                                                       "bg-yellow-900/50 text-yellow-400"
                        }`}>{log.status}</span>
                        <span className="text-sm font-semibold capitalize">{log.agent_name.replace(/_/g, " ")}</span>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(log.run_at).toLocaleString()}</span>
                    </div>

                    {/* Job discovery: structured breakdown */}
                    {isJobDiscovery && parsedSummary ? (
                      <div>
                        {/* Summary stats row */}
                        <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-sm">
                          <span className="text-gray-400">Feeds <span className="text-white font-semibold">{parsedSummary.completedFeeds}/{parsedSummary.totalFeeds}</span></span>
                          <span className="text-gray-400">Scanned <span className="text-white font-semibold">{parsedSummary.totalFound}</span></span>
                          <span className="text-gray-400">Saved <span className="text-green-400 font-semibold">{parsedSummary.totalSaved}</span></span>
                          {parsedSummary.totalFound > 0 && (
                            <span className="text-gray-400">Hit rate <span className="text-white font-semibold">{Math.round((parsedSummary.totalSaved / parsedSummary.totalFound) * 100)}%</span></span>
                          )}
                          {parsedSummary.cancelled && <span className="text-yellow-400 text-xs font-medium px-2 py-0.5 bg-yellow-900/30 rounded-full">⚠ Cancelled</span>}
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-gray-800 rounded-full h-1.5 mb-4">
                          <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.round((parsedSummary.completedFeeds / parsedSummary.totalFeeds) * 100)}%` }} />
                        </div>

                        {/* Grouped by source */}
                        {(() => {
                          const sourceOrder = ["indeed", "linkedin", "timesjobs", "weworkremotely", "remotive", "jobicy"];
                          const grouped: Record<string, FeedProgress[]> = {};
                          parsedSummary.feeds.forEach(f => {
                            if (!grouped[f.source]) grouped[f.source] = [];
                            grouped[f.source].push(f);
                          });
                          const sourceLabels: Record<string, string> = {
                            indeed: "Indeed India", linkedin: "LinkedIn", timesjobs: "TimesJobs",
                            weworkremotely: "We Work Remotely", remotive: "Remotive", jobicy: "Jobicy",
                          };
                          return (
                            <div className="space-y-2">
                              {sourceOrder.filter(s => grouped[s]).map(src => {
                                const feeds = grouped[src];
                                const srcSaved = feeds.reduce((a, f) => a + f.saved, 0);
                                const srcFound = feeds.reduce((a, f) => a + f.found, 0);
                                const hasResults = srcSaved > 0;
                                return (
                                  <details key={src} open={hasResults}>
                                    <summary className="flex items-center gap-2 cursor-pointer select-none list-none py-1.5 px-3 rounded-lg bg-gray-800 hover:bg-gray-750">
                                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hasResults ? "bg-green-400" : "bg-gray-600"}`} />
                                      <span className={`text-sm font-medium flex-1 ${hasResults ? "text-white" : "text-gray-400"}`}>{sourceLabels[src] || src}</span>
                                      <span className="text-xs text-gray-500">{feeds.length} feed{feeds.length > 1 ? "s" : ""}</span>
                                      {hasResults
                                        ? <span className="text-xs font-semibold text-green-400 bg-green-900/40 px-2 py-0.5 rounded-full">{srcSaved} saved</span>
                                        : <span className="text-xs text-gray-600 bg-gray-900 px-2 py-0.5 rounded-full">{srcFound} found · 0 saved</span>
                                      }
                                      <span className="text-gray-600 text-xs ml-1">▾</span>
                                    </summary>
                                    <div className="mt-1 ml-3 space-y-0.5">
                                      {feeds.map((feed, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs py-1 px-3 rounded">
                                          <span className={`flex-shrink-0 font-bold ${
                                            feed.status === "done" && feed.saved > 0 ? "text-green-400" :
                                            feed.status === "done"    ? "text-gray-600" :
                                            feed.status === "running" ? "text-blue-400" :
                                            feed.status === "skipped" ? "text-gray-700" : "text-gray-700"
                                          }`}>
                                            {feed.status === "done" ? "✓" : feed.status === "running" ? "▶" : feed.status === "skipped" ? "–" : "·"}
                                          </span>
                                          {/* Strip source prefix from label for cleaner display */}
                                          <span className={`flex-1 truncate ${
                                            feed.saved > 0       ? "text-gray-200" :
                                            feed.status === "done"    ? "text-gray-500" :
                                            feed.status === "skipped" ? "text-gray-700" : "text-gray-500"
                                          }`}>{feed.label.replace(/^[^—]+—\s*/, "")}</span>
                                          {feed.status === "done" && (
                                            feed.saved > 0
                                              ? <span className="text-green-400 font-semibold">{feed.saved} saved</span>
                                              : <span className="text-gray-700">{feed.found} found</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      /* Other agents: plain summary */
                      <p className="text-sm text-gray-400">{log.summary || "—"}</p>
                    )}

                    {/* Stats row for non-job-discovery */}
                    {!isJobDiscovery && (log.jobs_found > 0 || log.actions_taken > 0) && (
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        {log.jobs_found > 0 && <span>Jobs found: <span className="text-white">{log.jobs_found}</span></span>}
                        {log.actions_taken > 0 && <span>Actions: <span className="text-white">{log.actions_taken}</span></span>}
                      </div>
                    )}
                  </div>
                );
              })}
              {!data?.recentLogs?.length && <p className="text-gray-500 text-center py-8">No agent runs yet.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
