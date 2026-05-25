"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid } from "recharts";
import { COMPANIES } from "@/lib/agents/company-list";

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
  description: string | null;
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
  duration_ms: number | null;
  error_message: string | null;
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
  // Analytics & Consulting
  sigmoid: "Analytics & Consulting", datarobot: "Analytics & Consulting",
  h2oai: "Analytics & Consulting", alteryx: "Analytics & Consulting",
  quantiphi: "Analytics & Consulting", fractal: "Analytics & Consulting",
  nagarro: "Analytics & Consulting", tigeranalytics: "Analytics & Consulting",
  pwc: "Analytics & Consulting", deloitte: "Analytics & Consulting",
  accenture: "Analytics & Consulting", capgemini: "Analytics & Consulting",
  exl: "Analytics & Consulting", zs: "Analytics & Consulting",
  // Finance & Banking
  amex: "Finance & Banking", jpmorgan: "Finance & Banking", goldmansachs: "Finance & Banking",
  morganstanley: "Finance & Banking", citi: "Finance & Banking", bofa: "Finance & Banking",
  visa: "Finance & Banking", mastercard: "Finance & Banking", deutschebank: "Finance & Banking",
  hsbc: "Finance & Banking", blackrock: "Finance & Banking", target: "Finance & Banking",
};

function getCompanyCategory(source: string): string {
  const slug = source.replace("company_", "");
  return COMPANY_CATEGORY[slug] || "Other";
}

interface InboxEmail {
  id: string;
  subject: string;
  from_email: string;
  received_at: string;
  category: string | null;
  body_preview: string | null;
  reply_draft: string | null;
  job_id: string | null;
  jobs: { title: string; company: string } | null;
}

interface Application {
  id: string;
  status: string;
  cover_letter: string | null;
  resume_version: string | null;
  applied_at: string | null;
  created_at: string;
  job_id: string | null;
  jobs: { title: string; company: string; location: string | null; job_url: string } | null;
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

// ─── Job detail helpers ───────────────────────────────────────────────────────

interface ExpResult { label: string; inferred: boolean }

function extractExperience(title: string, desc: string | null): ExpResult | null {
  const text = `${title} ${desc || ""}`;
  const rangeMatch = text.match(/(\d+)\s*[-–to]+\s*(\d+)\s*\+?\s*years?/i);
  if (rangeMatch) return { label: `${rangeMatch[1]}–${rangeMatch[2]} yrs`, inferred: false };
  const plusMatch = text.match(/(\d+)\s*\+\s*years?/i);
  if (plusMatch) return { label: `${plusMatch[1]}+ yrs`, inferred: false };
  const minMatch = text.match(/(?:minimum|at\s+least|min\.?)\s+(\d+)\s*years?/i);
  if (minMatch) return { label: `${minMatch[1]}+ yrs`, inferred: false };
  const upToMatch = text.match(/up\s+to\s+(\d+)\s*years?/i);
  if (upToMatch) return { label: `≤${upToMatch[1]} yrs`, inferred: false };
  // Infer from seniority in title — mark as estimated
  const t = title.toLowerCase();
  if (t.includes("staff") || t.includes("principal")) return { label: "8+ yrs", inferred: true };
  if (t.includes("senior") || t.includes("lead") || t.includes("sr.")) return { label: "5+ yrs", inferred: true };
  if (t.includes("junior") || t.includes("associate") || t.includes("jr.")) return { label: "0–2 yrs", inferred: true };
  if (t.includes("intern")) return { label: "Intern", inferred: true };
  return null;
}

// Returns true when the job explicitly requires ≥8 years or is staff/principal-level.
function isOverExperienced(title: string, desc: string | null): boolean {
  const text = `${title} ${desc || ""}`;
  const rangeMatch = text.match(/(\d+)\s*[-–to]+\s*(\d+)\s*\+?\s*years?/i);
  if (rangeMatch && parseInt(rangeMatch[1]) >= 8) return true;
  const plusMatch = text.match(/(\d+)\s*\+\s*years?/i);
  if (plusMatch && parseInt(plusMatch[1]) >= 8) return true;
  const minMatch = text.match(/(?:minimum|at\s+least|min\.?)\s+(\d+)\s*years?/i);
  if (minMatch && parseInt(minMatch[1]) >= 8) return true;
  const t = title.toLowerCase();
  return t.includes("staff") || t.includes("principal");
}

function extractJobType(location: string, desc: string | null): "Remote" | "Hybrid" | "Onsite" | null {
  const text = `${location} ${desc || ""}`.toLowerCase();
  if (text.includes("remote")) return "Remote";
  if (text.includes("hybrid")) return "Hybrid";
  if (text.includes("onsite") || text.includes("on-site") || text.includes("in-office") || text.includes("in office")) return "Onsite";
  return null;
}

function cleanDesc(desc: string | null): string | null {
  if (!desc) return null;
  const trimmed = desc.replace(/\s+/g, " ").trim();
  if (trimmed.length <= 350) return trimmed;
  return trimmed.slice(0, 350).replace(/\s\S*$/, "");
}

// ─── Enriched job type (pre-computed display fields) ─────────────────────────

type EnrichedJob = Job & {
  _exp: ExpResult | null;
  _jobType: "Remote" | "Hybrid" | "Onsite" | null;
  _desc: string | null;
};

// ─── Shared JobCard component ─────────────────────────────────────────────────

function JobCard({
  job,
  isExpanded: _isExpanded,
  onToggle,
  onDelete,
  onStatusChange,
  selected,
  onSelect,
  displayTitle,
  displayCompany,
  badParse = false,
  showSource = true,
  actionLabel = "View →",
}: {
  job: EnrichedJob;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onStatusChange?: (id: string, status: JobStatus) => void;
  selected?: boolean;
  onSelect?: (id: string) => void;
  displayTitle?: string;
  displayCompany?: string;
  badParse?: boolean;
  showSource?: boolean;
  actionLabel?: "View →" | "Apply →";
}) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const title = displayTitle ?? job.title;
  const company = displayCompany ?? job.company;
  const { _exp: expObj, _jobType: jobType } = job;
  const titleFaded = badParse && displayTitle === undefined;

  return (
    <div className={`bg-gray-900 border rounded-xl px-4 py-3 transition-colors ${
      selected ? "border-blue-600/60 bg-blue-950/20" : badParse ? "border-yellow-900/40" : "border-gray-800"
    }`}>
      <div className="flex items-start justify-between gap-3">
        {/* Checkbox */}
        {onSelect && (
          <button onClick={() => onSelect(job.id)}
            className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border transition ${selected ? "bg-blue-600 border-blue-500" : "border-gray-600 hover:border-gray-400"}`}>
            {selected && <span className="text-[10px] text-white font-bold flex items-center justify-center w-full h-full">✓</span>}
          </button>
        )}
        <div className="flex-1 min-w-0">
          {/* Row 1: title + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold ${titleFaded ? "text-gray-400 italic" : "text-white"}`}>{title}</span>
            {/* Clickable status badge */}
            <div className="relative">
              <button
                onClick={() => onStatusChange ? setStatusMenuOpen(v => !v) : undefined}
                className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status]} ${onStatusChange ? "cursor-pointer hover:opacity-80" : "cursor-default"} transition`}>
                {STATUS_LABELS[job.status]} {onStatusChange && "▾"}
              </button>
              {statusMenuOpen && onStatusChange && (
                <div className="absolute top-6 left-0 z-20 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[160px]">
                  {(Object.keys(STATUS_LABELS) as JobStatus[]).map(s => (
                    <button key={s} onClick={() => { onStatusChange(job.id, s); setStatusMenuOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 flex items-center gap-2 ${s === job.status ? "text-white font-semibold" : "text-gray-300"}`}>
                      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s]}`} />
                      {STATUS_LABELS[s]}
                      {s === job.status && <span className="ml-auto text-blue-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500">{Math.round(job.relevance_score * 100)}% match</span>
            {badParse && <span className="text-xs text-yellow-700 border border-yellow-900/40 px-1.5 py-0.5 rounded">poor parse</span>}
            {expObj && (
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                expObj.inferred
                  ? "bg-gray-800/60 text-gray-500 border-gray-700"
                  : "bg-indigo-900/50 text-indigo-300 border-indigo-800/60"
              }`}>
                🎓 {expObj.inferred ? `~${expObj.label}` : expObj.label}
              </span>
            )}
            {jobType && (
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                jobType === "Remote" ? "bg-emerald-900/40 text-emerald-300 border-emerald-800/50" :
                jobType === "Hybrid" ? "bg-yellow-900/40 text-yellow-300 border-yellow-800/50" :
                "bg-gray-800 text-gray-400 border-gray-700"
              }`}>{jobType}</span>
            )}
          </div>
          {/* Row 2: company · location · source · date */}
          <div className="text-sm text-gray-400 mt-0.5">
            <span className={badParse && company === "—" ? "text-gray-600" : ""}>{company}</span>
            {job.location && <span> · {job.location}</span>}
            {showSource && <span className="ml-2 text-gray-600 text-xs">{job.source}</span>}
            <span className="ml-2 text-gray-600 text-xs">{new Date(job.discovered_at).toLocaleDateString()}</span>
          </div>
          {/* Row 3: salary */}
          {(job.salary_min || job.salary_max) && (
            <div className="text-xs text-green-400 mt-1">
              💰 {job.salary_min && job.salary_max
                ? `${job.salary_min}–${job.salary_max} LPA`
                : job.salary_min ? `From ${job.salary_min} LPA` : `Up to ${job.salary_max} LPA`}
            </div>
          )}
          {/* Row 4: skills */}
          {job.required_skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {job.required_skills.slice(0, 8).map(s => (
                <span key={s} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full border border-gray-700">{s}</span>
              ))}
              {job.required_skills.length > 8 && <span className="text-xs text-gray-600">+{job.required_skills.length - 8} more</span>}
            </div>
          )}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onToggle}
            className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-2 py-1 rounded-lg transition"
            title="View details">↗</button>
          <a href={job.job_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 px-2 py-1 rounded-lg transition">{actionLabel}</a>
          <button onClick={onDelete}
            className="text-xs text-red-500 hover:text-red-400 border border-red-900/50 px-2 py-1 rounded-lg transition" title="Remove">✕</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"job_discovery" | "email_alerts" | "companies" | "analytics" | "approvals" | "interview" | "logs" | "inbox" | "applications">("job_discovery");
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
  const [companySearch, setCompanySearch] = useState("");
  const [companySort, setCompanySort] = useState<"relevance" | "date" | "salary">("relevance");
  const [emailFilter, setEmailFilter] = useState<{ q: string; sort: "relevance" | "date" | "salary" }>({ q: "", sort: "relevance" });
  const [customScrapeForm, setCustomScrapeForm] = useState<{
    open: boolean;
    name: string;
    scrapeType: "greenhouse" | "lever" | "ashby" | "web" | "llm";
    boardId: string;
    url: string;
    detecting: boolean;
    detectNote: string;
  }>({ open: false, name: "", scrapeType: "greenhouse", boardId: "", url: "", detecting: false, detectNote: "" });
  const [cronStatus, setCronStatus] = useState<{
    live: boolean;
    startedAt: string | null;
    lastRuns: Record<string, string | null>;
    schedules: Record<string, string>;
  } | null>(null);
  const [expandedJobs] = useState<Set<string>>(new Set());

  // Job detail modal
  const [selectedJob, setSelectedJob] = useState<EnrichedJob | null>(null);

  // Compact / board view
  const [compact, setCompact] = useState(false);
  const [boardView, setBoardView] = useState(false);

  // Inbox + Applications data
  const [inboxData, setInboxData] = useState<InboxEmail[] | null>(null);
  const [applicationsData, setApplicationsData] = useState<Application[] | null>(null);

  // Pre-compute display fields once per data change — avoids re-running regexes on every render
  const enrichedJobs = useMemo<EnrichedJob[]>(
    () => (data?.jobs || []).map(j => ({
      ...j,
      _exp: extractExperience(j.title, j.description),
      _jobType: extractJobType(j.location || "", j.description),
      _desc: cleanDesc(j.description),
    })),
    [data]
  );
  const enrichedCompanyJobs = useMemo<EnrichedJob[]>(
    () => companyJobs.map(j => ({
      ...j,
      _exp: extractExperience(j.title, j.description),
      _jobType: extractJobType(j.location || "", j.description),
      _desc: cleanDesc(j.description),
    })),
    [companyJobs]
  );

  // ─── Filter / search state (Job Discovery + Email tabs) ─────────────────────
  const [jobFilter, setJobFilter] = useState<{
    q: string; source: string; salaryOnly: boolean; sort: "relevance" | "date" | "salary";
  }>({ q: "", source: "all", salaryOnly: false, sort: "relevance" });

  // ─── Bulk-selection state ─────────────────────────────────────────────────
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const toggleSelectJob = (id: string) => setSelectedJobs(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    if (res.status === 401) { router.push("/admin/login"); return; }
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [router]);

  const fetchCronStatus = useCallback(async () => {
    const res = await fetch("/api/admin/cron-status");
    if (res.ok) setCronStatus(await res.json());
  }, []);

  const fetchInbox = useCallback(async () => {
    const res = await fetch("/api/admin/inbox");
    if (res.ok) { const json = await res.json(); setInboxData(json.emails || []); }
  }, []);

  const fetchApplications = useCallback(async () => {
    const res = await fetch("/api/admin/applications");
    if (res.ok) { const json = await res.json(); setApplicationsData(json.applications || []); }
  }, []);

  useEffect(() => {
    fetchData();
    fetchCronStatus();
    fetchInbox();
    fetchApplications();
  }, [fetchData, fetchCronStatus, fetchInbox, fetchApplications]);

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

  const startEmailPolling = useCallback((_agentKey: string) => {
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

  async function triggerAgent(agent: string, payload?: Record<string, unknown>) {
    setTriggering(agent);
    if (agent === "job_discovery") {
      setJobProgress(null);
      startProgressPolling();
      fetch("/api/admin/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent, payload }),
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
        body: JSON.stringify({ agent, payload }),
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

  async function updateJobStatus(id: string, status: JobStatus) {
    await fetch(`/api/admin/jobs?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  }

  async function bulkDeleteJobs() {
    if (!selectedJobs.size) return;
    setBulkDeleting(true);
    await Promise.all([...selectedJobs].map(id => fetch(`/api/admin/jobs?id=${id}`, { method: "DELETE" })));
    setSelectedJobs(new Set());
    setBulkDeleting(false);
    fetchData();
  }

  async function bulkUpdateStatus(status: JobStatus) {
    if (!selectedJobs.size) return;
    await Promise.all([...selectedJobs].map(id =>
      fetch(`/api/admin/jobs?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
    ));
    setSelectedJobs(new Set());
    fetchData();
  }

  async function clearBadEmailJobs() {
    const bad = (data?.jobs || []).filter(j =>
      j.source?.endsWith("_email") && (
        /^your job alert/i.test(j.title) ||
        j.company === ".." || j.company === "Unknown" || j.company === ""
      )
    );
    await Promise.all(bad.map(j => fetch(`/api/admin/jobs?id=${j.id}`, { method: "DELETE" })));
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

  // ─── Job Detail Modal ─────────────────────────────────────────────────────
  const JobDetailModal = selectedJob ? (() => {
    const job = selectedJob;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setSelectedJob(null)}>
        <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
          {/* Modal header */}
          <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-5 py-4 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white leading-tight">{job.title}</h2>
              <p className="text-sm text-gray-400 mt-0.5">{job.company}{job.location && ` · ${job.location}`}</p>
            </div>
            <button onClick={() => setSelectedJob(null)} className="text-gray-500 hover:text-white transition flex-shrink-0 text-xl leading-none">✕</button>
          </div>
          <div className="px-5 py-4 space-y-4">
            {/* Badges row */}
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[job.status]}`}>{STATUS_LABELS[job.status]}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300">{Math.round(job.relevance_score * 100)}% match</span>
              {job._exp && <span className={`text-xs px-2 py-1 rounded-full border ${job._exp.inferred ? "bg-gray-800/60 text-gray-400 border-gray-700" : "bg-indigo-900/50 text-indigo-300 border-indigo-800"}`}>🎓 {job._exp.inferred ? `~${job._exp.label}` : job._exp.label}</span>}
              {job._jobType && <span className={`text-xs px-2 py-1 rounded-full border ${job._jobType === "Remote" ? "bg-emerald-900/40 text-emerald-300 border-emerald-800/50" : job._jobType === "Hybrid" ? "bg-yellow-900/40 text-yellow-300 border-yellow-800/50" : "bg-gray-800 text-gray-400 border-gray-700"}`}>{job._jobType}</span>}
              <span className="text-xs text-gray-500 px-2 py-1">{job.source} · {new Date(job.discovered_at).toLocaleDateString()}</span>
            </div>
            {/* Salary */}
            {(job.salary_min || job.salary_max) && (
              <div className="bg-green-950/30 border border-green-900/40 rounded-lg px-4 py-2.5 text-sm text-green-300">
                💰 {job.salary_min && job.salary_max ? `${job.salary_min}–${job.salary_max} LPA` : job.salary_min ? `From ${job.salary_min} LPA` : `Up to ${job.salary_max} LPA`}
              </div>
            )}
            {/* Status change */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Move to pipeline stage:</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_LABELS) as JobStatus[]).map(s => (
                  <button key={s} onClick={() => { updateJobStatus(job.id, s); setSelectedJob({ ...job, status: s }); }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${s === job.status ? `${STATUS_COLORS[s]} text-white border-transparent` : "border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"}`}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            {/* Skills */}
            {job.required_skills?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Required skills ({job.required_skills.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {job.required_skills.map(s => (
                    <span key={s} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full border border-gray-700">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {/* Full description */}
            {job.description && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Job Description</p>
                <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-3 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                  {job.description}
                </div>
              </div>
            )}
            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <a href={job.job_url} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-center bg-blue-700 hover:bg-blue-600 text-white text-sm py-2.5 rounded-xl transition font-medium">
                View Job →
              </a>
              <button onClick={() => { deleteJob(job.id); setSelectedJob(null); }}
                className="px-4 bg-red-900/60 hover:bg-red-900 text-red-300 text-sm py-2.5 rounded-xl transition border border-red-900/50">
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  })() : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {JobDetailModal}
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
      <div className="px-6 pb-3 flex gap-3 flex-wrap">
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

      {/* Cron Status Bar */}
      {cronStatus && (() => {
        const ago = (iso: string | null) => {
          if (!iso) return "never";
          const diff = Date.now() - new Date(iso).getTime();
          const m = Math.floor(diff / 60000);
          if (m < 1) return "just now";
          if (m < 60) return `${m}m ago`;
          const h = Math.floor(m / 60);
          return `${h}h ${m % 60}m ago`;
        };
        const items = [
          { label: "Job Discovery", key: "job_discovery",   schedule: "every 2h", color: "text-blue-400" },
          { label: "Email Scraper", key: "email_scraper",   schedule: "every 2h", color: "text-purple-400" },
          { label: "Company Scraper", key: "company_scraper", schedule: "every 6h", color: "text-emerald-400" },
        ];
        return (
          <div className="mx-6 mb-4 bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-2.5 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cronStatus.live ? "bg-green-400 animate-pulse" : "bg-red-500"}`} />
              <span className={`text-xs font-medium ${cronStatus.live ? "text-green-400" : "text-red-400"}`}>
                {cronStatus.live ? "Auto-scan ON" : "Auto-scan OFF — restart server"}
              </span>
            </div>
            <div className="w-px h-4 bg-gray-700 flex-shrink-0" />
            {items.map(item => (
              <div key={item.key} className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500">{item.label}:</span>
                <span className={`font-medium ${cronStatus.lastRuns[item.key] ? item.color : "text-gray-600"}`}>
                  {ago(cronStatus.lastRuns[item.key])}
                </span>
                <span className="text-gray-700">({item.schedule})</span>
              </div>
            ))}
          </div>
        );
      })()}

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
                {(companyProgress.progress?.companies || []).map((c, i) => (
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

              {companyProgress.progress?.cancelled && (
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
      <div className="px-6 border-b border-gray-800 flex gap-1 overflow-x-auto">
        {([
          { key: "job_discovery",  label: "🔍 Discovery",     count: enrichedJobs.filter(j => !j.source?.endsWith("_email")).length },
          { key: "email_alerts",   label: "📨 Email",         count: enrichedJobs.filter(j => j.source?.endsWith("_email")).length },
          { key: "companies",      label: "🏢 Companies",     count: enrichedCompanyJobs.length },
          { key: "analytics",      label: "📊 Analytics",     count: null },
          { key: "approvals",      label: "✅ Approvals",     count: data?.pendingApprovals?.length ?? 0 },
          { key: "inbox",          label: "📬 Inbox",         count: inboxData?.length ?? null },
          { key: "applications",   label: "📝 Applications",  count: applicationsData?.length ?? null },
          { key: "interview",      label: "🎤 Interview",     count: null },
          { key: "logs",           label: "📋 Logs",          count: null },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium transition border-b-2 whitespace-nowrap flex items-center gap-1.5 ${activeTab === tab.key ? "border-blue-500 text-white" : "border-transparent text-gray-400 hover:text-white"}`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab.key === "approvals" ? "bg-yellow-600 text-white" : "bg-gray-700 text-gray-300"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-6 py-4">
        {/* Pipeline funnel — shown on both job tabs */}
        {(activeTab === "job_discovery" || activeTab === "email_alerts") && (() => {
          const statuses = Object.keys(STATUS_LABELS) as JobStatus[];
          const total = overview.statusCounts?.["discovered"] || 1;
          return (
            <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-0 overflow-x-auto pb-1">
                {statuses.map((s, i) => {
                  const count = overview.statusCounts?.[s] || 0;
                  const pct = i === 0 ? 100 : Math.round((count / total) * 100);
                  return (
                    <div key={s} className="flex items-center flex-shrink-0">
                      <div className="text-center px-3">
                        <div className="text-2xl font-bold text-white">{count}</div>
                        <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[s]} mt-1`}>{STATUS_LABELS[s]}</div>
                        {i > 0 && <div className="text-[10px] text-gray-600 mt-0.5">{pct}%</div>}
                      </div>
                      {i < statuses.length - 1 && (
                        <span className="text-gray-700 text-lg px-1">→</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Job Discovery Tab */}
        {activeTab === "job_discovery" && (() => {
          // Source groups
          const SOURCE_GROUPS: Record<string, (s: string) => boolean> = {
            all:      () => true,
            indeed:   s => s === "indeed",
            linkedin: s => s.includes("linkedin"),
            remote:   s => ["remotive", "weworkremotely", "jobicy"].includes(s),
            timesjobs: s => s === "timesjobs",
            company:  s => s.startsWith("company_"),
          };

          let jobs = enrichedJobs.filter(j => !j.source?.endsWith("_email") && !isOverExperienced(j.title, j.description));

          // Apply filters
          const { q, source, salaryOnly, sort } = jobFilter;
          if (q) jobs = jobs.filter(j => `${j.title} ${j.company}`.toLowerCase().includes(q.toLowerCase()));
          if (source !== "all") jobs = jobs.filter(j => SOURCE_GROUPS[source]?.(j.source) ?? true);
          if (salaryOnly) jobs = jobs.filter(j => j.salary_min || j.salary_max);
          if (sort === "date") jobs = [...jobs].sort((a, b) => new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime());
          if (sort === "salary") jobs = [...jobs].sort((a, b) => (b.salary_max || b.salary_min || 0) - (a.salary_max || a.salary_min || 0));

          const allSelected = jobs.length > 0 && jobs.every(j => selectedJobs.has(j.id));
          const someSelected = selectedJobs.size > 0;

          return (
            <div>
              {/* Filter bar */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-3 mb-4 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Search */}
                  <input
                    type="text" placeholder="Search title or company…" value={jobFilter.q}
                    onChange={e => setJobFilter(f => ({ ...f, q: e.target.value }))}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-56"
                  />
                  {/* Sort */}
                  <select value={jobFilter.sort} onChange={e => setJobFilter(f => ({ ...f, sort: e.target.value as "relevance" | "date" | "salary" }))}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500">
                    <option value="relevance">Best match</option>
                    <option value="date">Newest first</option>
                    <option value="salary">Salary ↓</option>
                  </select>
                  {/* Salary toggle */}
                  <button onClick={() => setJobFilter(f => ({ ...f, salaryOnly: !f.salaryOnly }))}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition ${jobFilter.salaryOnly ? "bg-green-900/40 border-green-700 text-green-300" : "border-gray-700 text-gray-400 hover:text-white"}`}>
                    💰 With salary
                  </button>
                  {/* Clear */}
                  {(q || source !== "all" || salaryOnly || sort !== "relevance") && (
                    <button onClick={() => setJobFilter({ q: "", source: "all", salaryOnly: false, sort: "relevance" })}
                      className="text-xs text-gray-500 hover:text-white transition">✕ Clear filters</button>
                  )}
                  <span className="ml-auto text-xs text-gray-500">{jobs.length} jobs</span>
                  {/* View toggles */}
                  <div className="flex gap-1 border border-gray-700 rounded-lg p-0.5">
                    <button onClick={() => { setCompact(false); setBoardView(false); }}
                      className={`text-xs px-2 py-1 rounded transition ${!compact && !boardView ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"}`} title="List view">☰</button>
                    <button onClick={() => { setCompact(true); setBoardView(false); }}
                      className={`text-xs px-2 py-1 rounded transition ${compact && !boardView ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"}`} title="Compact view">≡</button>
                    <button onClick={() => { setBoardView(true); setCompact(false); }}
                      className={`text-xs px-2 py-1 rounded transition ${boardView ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"}`} title="Board view">⊞</button>
                  </div>
                </div>
                {/* Source chips */}
                <div className="flex gap-1.5 flex-wrap">
                  {Object.keys(SOURCE_GROUPS).map(s => (
                    <button key={s} onClick={() => setJobFilter(f => ({ ...f, source: s }))}
                      className={`text-xs px-2.5 py-1 rounded-full border transition capitalize ${jobFilter.source === s ? "bg-blue-700 border-blue-600 text-white" : "border-gray-700 text-gray-400 hover:text-white"}`}>
                      {s === "all" ? "All sources" : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk action bar */}
              {someSelected && (
                <div className="flex items-center gap-3 bg-blue-950/40 border border-blue-800/50 rounded-xl px-4 py-2.5 mb-3">
                  <span className="text-sm text-blue-300 font-medium">{selectedJobs.size} selected</span>
                  <button onClick={() => bulkUpdateStatus("applied")}
                    className="text-xs bg-purple-700 hover:bg-purple-600 text-white px-3 py-1 rounded-lg transition">✓ Mark Applied</button>
                  <button onClick={() => bulkUpdateStatus("interview")}
                    className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded-lg transition">🎤 Mark Interview</button>
                  <button onClick={bulkDeleteJobs} disabled={bulkDeleting}
                    className="text-xs bg-red-900/60 hover:bg-red-800 text-red-300 px-3 py-1 rounded-lg transition border border-red-800/50">
                    {bulkDeleting ? "Deleting…" : "🗑 Delete all"}
                  </button>
                  <button onClick={() => setSelectedJobs(new Set())} className="ml-auto text-xs text-gray-500 hover:text-white">✕ Clear</button>
                </div>
              )}

              {/* Board view */}
              {boardView ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(["discovered", "applied", "interview"] as JobStatus[]).map(colStatus => {
                    const colJobs = jobs.filter(j => j.status === colStatus);
                    const colColors: Record<string, string> = { discovered: "border-gray-700", applied: "border-purple-800/50", interview: "border-green-800/50" };
                    const colHeaders: Record<string, string> = { discovered: "🔍 Discovered", applied: "📝 Applied", interview: "🎤 Interview" };
                    return (
                      <div key={colStatus} className={`bg-gray-900/50 border ${colColors[colStatus]} rounded-xl p-3`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold">{colHeaders[colStatus]}</span>
                          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{colJobs.length}</span>
                        </div>
                        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                          {colJobs.map(job => (
                            <div key={job.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3 cursor-pointer hover:border-gray-600 transition"
                              onClick={() => setSelectedJob(job)}>
                              <p className="text-sm font-medium text-white leading-tight truncate">{job.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{job.company}</p>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span className="text-xs text-gray-500">{Math.round(job.relevance_score * 100)}%</span>
                                {job._exp && <span className="text-xs text-indigo-400">{job._exp.label}</span>}
                                {job._jobType && <span className="text-xs text-emerald-400">{job._jobType}</span>}
                              </div>
                              <div className="flex gap-2 mt-2">
                                {colStatus !== "applied" && (
                                  <button onClick={e => { e.stopPropagation(); updateJobStatus(job.id, "applied"); }}
                                    className="text-[10px] text-purple-400 border border-purple-900/50 px-2 py-0.5 rounded hover:bg-purple-900/30 transition">→ Applied</button>
                                )}
                                {colStatus !== "interview" && (
                                  <button onClick={e => { e.stopPropagation(); updateJobStatus(job.id, "interview"); }}
                                    className="text-[10px] text-green-400 border border-green-900/50 px-2 py-0.5 rounded hover:bg-green-900/30 transition">→ Interview</button>
                                )}
                              </div>
                            </div>
                          ))}
                          {!colJobs.length && <p className="text-xs text-gray-600 text-center py-4">Empty</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : compact ? (
                /* Compact list */
                <div className="divide-y divide-gray-800/60 border border-gray-800 rounded-xl overflow-hidden">
                  {jobs.map(job => (
                    <div key={job.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-900/80 transition ${selectedJobs.has(job.id) ? "bg-blue-950/20" : ""}`}>
                      <button onClick={() => toggleSelectJob(job.id)}
                        className={`flex-shrink-0 w-3.5 h-3.5 rounded border transition ${selectedJobs.has(job.id) ? "bg-blue-600 border-blue-500" : "border-gray-700 hover:border-gray-500"}`}>
                        {selectedJobs.has(job.id) && <span className="text-[9px] text-white font-bold flex items-center justify-center w-full h-full">✓</span>}
                      </button>
                      <span className="text-sm font-medium text-white truncate flex-1 min-w-0">{job.title}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0 hidden sm:block">{job.company}</span>
                      <span className="text-xs text-gray-600 flex-shrink-0 hidden md:block">{job.location || "—"}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">{Math.round(job.relevance_score * 100)}%</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[job.status]}`}>{STATUS_LABELS[job.status]}</span>
                      <button onClick={() => setSelectedJob(job)} className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">↗</button>
                      <button onClick={() => deleteJob(job.id)} className="text-xs text-red-500 hover:text-red-400 flex-shrink-0">✕</button>
                    </div>
                  ))}
                  {!jobs.length && <p className="text-gray-500 text-center py-8">No jobs match your filters.</p>}
                </div>
              ) : (
                /* Normal list */
                <>
                  {/* Select-all row */}
                  {jobs.length > 0 && (
                    <div className="flex items-center gap-2 px-1 mb-1">
                      <button onClick={() => {
                        if (allSelected) setSelectedJobs(new Set());
                        else setSelectedJobs(new Set(jobs.map(j => j.id)));
                      }} className={`w-4 h-4 rounded border transition ${allSelected ? "bg-blue-600 border-blue-500" : "border-gray-600 hover:border-gray-400"}`}>
                        {allSelected && <span className="text-[10px] text-white font-bold flex items-center justify-center w-full h-full">✓</span>}
                      </button>
                      <span className="text-xs text-gray-600">Select all</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {jobs.map(job => (
                      <JobCard key={job.id} job={job}
                        isExpanded={expandedJobs.has(job.id)}
                        onToggle={() => setSelectedJob(job)}
                        onDelete={() => deleteJob(job.id)}
                        onStatusChange={updateJobStatus}
                        selected={selectedJobs.has(job.id)}
                        onSelect={toggleSelectJob} />
                    ))}
                    {!jobs.length && <p className="text-gray-500 text-center py-8">No jobs match your filters. <button onClick={() => setJobFilter({ q: "", source: "all", salaryOnly: false, sort: "relevance" })} className="text-blue-400 hover:underline">Clear filters</button></p>}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Email Alerts Tab */}
        {activeTab === "email_alerts" && (() => {
          let jobs = enrichedJobs.filter(j =>
            j.source?.endsWith("_email") && !isOverExperienced(j.title, j.description)
          );
          const badJobs = jobs.filter(j =>
            /^your job alert/i.test(j.title) || j.company === ".." || j.company === "Unknown" || j.company === ""
          );
          // Apply email filters
          const { q: eq, sort: esort } = emailFilter;
          if (eq) jobs = jobs.filter(j => `${j.title} ${j.company}`.toLowerCase().includes(eq.toLowerCase()));
          if (esort === "date") jobs = [...jobs].sort((a, b) => new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime());
          if (esort === "salary") jobs = [...jobs].sort((a, b) => (b.salary_max || b.salary_min || 0) - (a.salary_max || a.salary_min || 0));

          return (
            <div>
              {/* Filter bar */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-3 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="text" placeholder="Search title or company…" value={emailFilter.q}
                    onChange={e => setEmailFilter(f => ({ ...f, q: e.target.value }))}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 w-56"
                  />
                  <select value={emailFilter.sort} onChange={e => setEmailFilter(f => ({ ...f, sort: e.target.value as "relevance" | "date" | "salary" }))}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-purple-500">
                    <option value="relevance">Best match</option>
                    <option value="date">Newest first</option>
                    <option value="salary">Salary ↓</option>
                  </select>
                  {(eq || esort !== "relevance") && (
                    <button onClick={() => setEmailFilter({ q: "", sort: "relevance" })}
                      className="text-xs text-gray-500 hover:text-white transition">✕ Clear</button>
                  )}
                  <span className="ml-auto text-xs text-gray-500">{jobs.length} jobs</span>
                </div>
              </div>
              <div className="space-y-2">
                {badJobs.length > 0 && !eq && (
                  <div className="flex items-center justify-between bg-yellow-950/30 border border-yellow-900/40 rounded-xl px-4 py-3 mb-2">
                    <span className="text-sm text-yellow-400">⚠️ {badJobs.length} jobs with poor parsing (email subject used as title). Re-run the scraper to get fresh results.</span>
                    <button onClick={clearBadEmailJobs}
                      className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 px-3 py-1.5 rounded-lg transition ml-4 whitespace-nowrap">
                      Clear {badJobs.length} bad jobs
                    </button>
                  </div>
                )}
                {jobs.map(job => {
                  const badTitle = /^your job alert/i.test(job.title);
                  const badCompany = !job.company || job.company === ".." || job.company === "Unknown";
                  const liJobId = job.job_url?.match(/jobs\/view\/(\d+)/)?.[1];
                  const displayTitle = badTitle ? (liJobId ? `LinkedIn Job #${liJobId}` : "Job Alert") : undefined;
                  const displayCompany = badCompany ? "—" : undefined;
                  return (
                    <JobCard key={job.id} job={job}
                      isExpanded={false}
                      onToggle={() => setSelectedJob(job)}
                      onDelete={() => deleteJob(job.id)}
                      onStatusChange={updateJobStatus}
                      displayTitle={displayTitle}
                      displayCompany={displayCompany}
                      badParse={badTitle || badCompany} />
                  );
                })}
                {!jobs.length && <p className="text-gray-500 text-center py-8">{eq ? "No jobs match your search." : <>No email jobs yet. Run <span className="text-purple-400">📨 Scrape Job Alert Emails</span> above.</>}</p>}
              </div>
            </div>
          );
        })()}

        {/* Companies Tab */}
        {activeTab === "companies" && (() => {
          const categories = ["All", "FAANG", "Big Tech", "Product", "Indian Unicorn", "MNC", "AI/ML", "Data & Infra", "Analytics & Consulting", "Finance & Banking"];
          const filtered = (companyCategoryFilter === "All"
            ? enrichedCompanyJobs
            : enrichedCompanyJobs.filter(j => getCompanyCategory(j.source) === companyCategoryFilter)
          ).filter(j => !isOverExperienced(j.title, j.description))
           .filter(j => !companySearch || j.company.toLowerCase().includes(companySearch.toLowerCase()) || j.title.toLowerCase().includes(companySearch.toLowerCase()));

          // Apply sort
          const sortedFiltered = companySort === "date"
            ? [...filtered].sort((a, b) => new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime())
            : companySort === "salary"
            ? [...filtered].sort((a, b) => (b.salary_max || b.salary_min || 0) - (a.salary_max || a.salary_min || 0))
            : filtered;

          // Group by company name within the filtered list
          const byCompany: Record<string, EnrichedJob[]> = {};
          for (const job of sortedFiltered) {
            if (!byCompany[job.company]) byCompany[job.company] = [];
            byCompany[job.company].push(job);
          }

          return (
            <div>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h2 className="text-lg font-semibold">🏢 Company Career Pages</h2>
                <input
                  type="text" placeholder="Search company or title…" value={companySearch}
                  onChange={e => setCompanySearch(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-52"
                />
                <select value={companySort} onChange={e => setCompanySort(e.target.value as "relevance" | "date" | "salary")}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-emerald-500">
                  <option value="relevance">Best match</option>
                  <option value="date">Newest first</option>
                  <option value="salary">Salary ↓</option>
                </select>
                {(companySearch || companySort !== "relevance") && (
                  <button onClick={() => { setCompanySearch(""); setCompanySort("relevance"); }} className="text-xs text-gray-500 hover:text-white transition">✕ Clear</button>
                )}
                <span className="ml-auto text-xs text-gray-500">{sortedFiltered.length} jobs · {Object.keys(byCompany).length} companies</span>
              </div>

              {/* On-demand single-company scraper */}
              {(() => {
                const allSlugs = COMPANIES.map(c => ({ slug: c.slug, name: c.name }));
                const matches = companySearch.length >= 2
                  ? allSlugs.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase())).slice(0, 6)
                  : [];
                return matches.length > 0 ? (
                  <div className="bg-blue-950/20 border border-blue-800/40 rounded-xl px-4 py-3 mb-4">
                    <p className="text-xs text-blue-400 mb-2">Quick scrape — click to run for a specific company:</p>
                    <div className="flex flex-wrap gap-2">
                      {matches.map(c => (
                        <button key={c.slug}
                          onClick={() => { triggerAgent("company_scraper", { slugs: [c.slug] }); setCompanySearch(""); }}
                          disabled={triggering === "company_scraper"}
                          className="text-xs bg-gray-800 hover:bg-blue-900/40 border border-gray-700 hover:border-blue-700 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                          {triggering === "company_scraper" ? "Running…" : `↻ Scrape ${c.name}`}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Custom company scraper */}
              <div className="mb-4">
                {!customScrapeForm.open ? (
                  <button
                    onClick={() => setCustomScrapeForm(f => ({ ...f, open: true }))}
                    className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-900/50 hover:border-emerald-700 px-3 py-1.5 rounded-lg transition">
                    + Scrape a new company
                  </button>
                ) : (
                  <div className="bg-gray-900 border border-emerald-900/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-emerald-400">Scrape a Custom Company</h3>
                      <button onClick={() => setCustomScrapeForm(f => ({ ...f, open: false }))} className="text-gray-500 hover:text-white text-xs">✕ Close</button>
                    </div>

                    {/* Step 1: name + auto-detect */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Company Name *</label>
                      <div className="flex gap-2">
                        <input
                          type="text" placeholder="e.g. Zerodha" value={customScrapeForm.name}
                          onChange={e => setCustomScrapeForm(f => ({ ...f, name: e.target.value, detectNote: "" }))}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          disabled={!customScrapeForm.name.trim() || customScrapeForm.detecting}
                          onClick={async () => {
                            const name = customScrapeForm.name;
                            setCustomScrapeForm(f => ({ ...f, detecting: true, detectNote: "" }));
                            const res = await fetch(`/api/admin/detect-ats?name=${encodeURIComponent(name)}`);
                            const json = await res.json();
                            if (json.ats !== "none") {
                              // ATS found — start scraping immediately
                              const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
                              const config = json.ats === "lever"
                                ? { name, slug, category: "Other" as const, scrapeType: "lever" as const, companyId: json.boardId }
                                : { name, slug, category: "Other" as const, scrapeType: json.ats, boardId: json.boardId };
                              triggerAgent("company_scraper", { customCompanies: [config] });
                              setCustomScrapeForm(f => ({ ...f, detecting: false, open: false, name: "", boardId: "", url: "", detectNote: "" }));
                            } else {
                              // Not on a known ATS — pre-fill web URL and let user confirm
                              setCustomScrapeForm(f => ({
                                ...f, detecting: false,
                                scrapeType: "web",
                                url: json.careersUrl || "",
                                detectNote: `✗ Not on Greenhouse / Lever / Ashby — enter the careers URL and click Scrape.`,
                              }));
                            }
                          }}
                          className="text-xs bg-blue-800 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-40 whitespace-nowrap">
                          {customScrapeForm.detecting ? "Detecting & starting…" : "🔍 Detect & Scrape"}
                        </button>
                      </div>
                      {customScrapeForm.detectNote && (
                        <p className={`text-xs mt-1.5 ${customScrapeForm.detectNote.startsWith("✓") ? "text-emerald-400" : "text-yellow-400"}`}>
                          {customScrapeForm.detectNote}
                        </p>
                      )}
                    </div>

                    {/* Step 2: ATS details (shown after detect or manual) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">ATS Type</label>
                        <select
                          value={customScrapeForm.scrapeType}
                          onChange={e => setCustomScrapeForm(f => ({ ...f, scrapeType: e.target.value as typeof f.scrapeType }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-emerald-500">
                          <option value="greenhouse">Greenhouse</option>
                          <option value="lever">Lever</option>
                          <option value="ashby">Ashby</option>
                          <option value="web">Web / Careers URL (fast)</option>
                          <option value="llm">🤖 LLM (any page — AI extracts jobs)</option>
                        </select>
                      </div>
                      <div>
                        {customScrapeForm.scrapeType !== "web" && customScrapeForm.scrapeType !== "llm" ? (
                          <>
                            <label className="text-xs text-gray-500 mb-1 block">
                              {customScrapeForm.scrapeType === "greenhouse" ? "Greenhouse Board ID" :
                               customScrapeForm.scrapeType === "lever" ? "Lever Company Slug" : "Ashby Board ID"}
                            </label>
                            <input
                              type="text"
                              placeholder={customScrapeForm.name.toLowerCase().replace(/\s+/g, "") || "auto-filled by detect"}
                              value={customScrapeForm.boardId}
                              onChange={e => setCustomScrapeForm(f => ({ ...f, boardId: e.target.value }))}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                            />
                          </>
                        ) : (
                          <>
                            <label className="text-xs text-gray-500 mb-1 block">
                              {customScrapeForm.scrapeType === "llm" ? "Careers Page URL (LLM will extract jobs)" : "Careers Page URL"}
                            </label>
                            <input
                              type="text" placeholder="https://careers.company.com/jobs?q=machine+learning"
                              value={customScrapeForm.url}
                              onChange={e => setCustomScrapeForm(f => ({ ...f, url: e.target.value }))}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 items-center pt-1">
                      <button
                        disabled={
                          !customScrapeForm.name.trim() ||
                          (customScrapeForm.scrapeType !== "web" && customScrapeForm.scrapeType !== "llm"
                            ? !customScrapeForm.boardId.trim()
                            : !customScrapeForm.url.trim()) ||
                          triggering === "company_scraper"
                        }
                        onClick={() => {
                          const slug = customScrapeForm.name.toLowerCase().replace(/\s+/g, "");
                          const config = customScrapeForm.scrapeType === "web" || customScrapeForm.scrapeType === "llm"
                            ? { name: customScrapeForm.name, slug, category: "Other" as const, scrapeType: customScrapeForm.scrapeType, careersUrl: customScrapeForm.url }
                            : customScrapeForm.scrapeType === "lever"
                            ? { name: customScrapeForm.name, slug, category: "Other" as const, scrapeType: "lever" as const, companyId: customScrapeForm.boardId }
                            : { name: customScrapeForm.name, slug, category: "Other" as const, scrapeType: customScrapeForm.scrapeType, boardId: customScrapeForm.boardId };
                          triggerAgent("company_scraper", { customCompanies: [config] });
                          setCustomScrapeForm(f => ({ ...f, open: false, name: "", boardId: "", url: "", detectNote: "" }));
                        }}
                        className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg transition disabled:opacity-40 font-medium">
                        {triggering === "company_scraper" ? "Running…" : "↻ Scrape Now"}
                      </button>
                      <p className="text-xs text-gray-600">Only needed if ATS was not detected automatically (Web URL fallback).</p>
                    </div>
                  </div>
                )}
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
                  <p className="text-gray-700 text-xs mt-2">Covers {Object.keys(COMPANY_CATEGORY).length}+ companies: FAANG, Big Tech, Product companies, Indian Unicorns, MNCs, Finance & Banking</p>
                </div>
              ) : sortedFiltered.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No jobs in this category yet.</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(byCompany).map(([companyName, jobs]) => (
                    <div key={companyName}>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-white">{companyName}</h3>
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{jobs.length}</span>
                        <span className="text-xs text-gray-600">{getCompanyCategory(jobs[0].source)}</span>
                        <button
                          onClick={() => triggerAgent("company_scraper", { slugs: [jobs[0].source.replace("company_", "")] })}
                          disabled={triggering === "company_scraper"}
                          className="ml-auto text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-900/50 hover:border-emerald-700 px-2 py-0.5 rounded-lg transition disabled:opacity-40"
                          title={`Re-scrape ${companyName}`}>
                          {triggering === "company_scraper" ? "…" : "↻"}
                        </button>
                      </div>
                      <div className="space-y-1.5 ml-2">
                        {jobs.map(job => (
                          <JobCard key={job.id} job={job}
                            isExpanded={false}
                            onToggle={() => setSelectedJob(job)}
                            onDelete={() => deleteJob(job.id)}
                            showSource={false}
                            actionLabel="Apply →" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (() => {
          const allJobs = [...enrichedJobs, ...enrichedCompanyJobs];
          const counts = Object.keys(STATUS_LABELS) as JobStatus[];

          // Pipeline data
          const pipelineData = counts.map(s => ({
            name: STATUS_LABELS[s],
            count: (data?.overview?.statusCounts?.[s] || 0),
          }));

          // Source breakdown
          const sourceCounts: Record<string, number> = {};
          for (const j of allJobs) {
            const group = j.source.endsWith("_email") ? "Email" :
              j.source.startsWith("company_") ? "Company Pages" :
              j.source === "indeed" ? "Indeed" :
              j.source.includes("linkedin") ? "LinkedIn" :
              ["remotive", "weworkremotely", "jobicy"].includes(j.source) ? "Remote Boards" :
              j.source === "timesjobs" ? "TimesJobs" : "Other";
            sourceCounts[group] = (sourceCounts[group] || 0) + 1;
          }
          const sourceData = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
          const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

          // Top skills
          const skillCounts: Record<string, number> = {};
          for (const j of allJobs) {
            for (const skill of j.required_skills || []) {
              skillCounts[skill] = (skillCounts[skill] || 0) + 1;
            }
          }
          const topSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, count]) => ({ name, count }));

          // Skills gap — Ajay's skills
          const MY_SKILLS = new Set(["Python", "PyTorch", "TensorFlow", "LangChain", "Azure", "AWS", "GCP", "RAG", "LLM", "GenAI", "SQL", "Spark", "MLflow", "Docker", "Kubernetes", "FastAPI", "HuggingFace", "OpenAI", "Transformers", "Databricks"]);
          const gapSkills = topSkills.map(s => ({ ...s, have: MY_SKILLS.has(s.name) }));

          // Salary data
          const salaryJobs = allJobs.filter(j => j.salary_min && j.salary_min > 0);
          const salaryBuckets: Record<string, number> = { "< 20L": 0, "20–30L": 0, "30–50L": 0, "50–80L": 0, "80L+": 0 };
          for (const j of salaryJobs) {
            const s = j.salary_min!;
            if (s < 20) salaryBuckets["< 20L"]++;
            else if (s < 30) salaryBuckets["20–30L"]++;
            else if (s < 50) salaryBuckets["30–50L"]++;
            else if (s < 80) salaryBuckets["50–80L"]++;
            else salaryBuckets["80L+"]++;
          }
          const salaryData = Object.entries(salaryBuckets).map(([range, count]) => ({ range, count }));

          return (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">📊 Job Market Analytics</h2>
                <span className="text-xs text-gray-500">{allJobs.length} total jobs analysed</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pipeline funnel */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4">Pipeline Status</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={pipelineData} margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#fff" }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Source breakdown */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4">Jobs by Source</h3>
                  {sourceData.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width={160} height={160}>
                        <PieChart>
                          <Pie data={sourceData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                            {sourceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#fff" }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-1.5">
                        {sourceData.map((s, i) => (
                          <div key={s.name} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-xs text-gray-300 flex-1">{s.name}</span>
                            <span className="text-xs text-gray-500 font-medium">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <p className="text-sm text-gray-500 py-8 text-center">No data yet</p>}
                </div>

                {/* Salary distribution */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-1">Salary Distribution</h3>
                  <p className="text-xs text-gray-600 mb-4">{salaryJobs.length} of {allJobs.length} jobs have salary data</p>
                  {salaryJobs.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={salaryData} margin={{ left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="range" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#fff" }} />
                        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">Most job boards don{"'"}t publish salary. Run more company scrapes to improve coverage.</p>
                  )}
                </div>

                {/* Skills demand */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4">Top Skills in Demand</h3>
                  {topSkills.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={topSkills} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} width={80} />
                        <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#fff" }} />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-gray-500 py-8 text-center">No skill data yet</p>}
                </div>
              </div>

              {/* Skills gap analysis */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-1">Skills Gap Analysis</h3>
                <p className="text-xs text-gray-600 mb-4">Top skills across all job descriptions vs your profile</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {gapSkills.map(s => (
                    <div key={s.name} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                      s.have ? "bg-emerald-950/40 border-emerald-800/50" : "bg-red-950/20 border-red-900/30"
                    }`}>
                      <span className={`text-sm ${s.have ? "text-emerald-400" : "text-red-500"}`}>{s.have ? "✓" : "✗"}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white truncate">{s.name}</div>
                        <div className="text-[10px] text-gray-500">{s.count} jobs</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-3 text-xs text-gray-500">
                  <span className="text-emerald-400">✓ {gapSkills.filter(s => s.have).length} skills you have</span>
                  <span className="text-red-400">✗ {gapSkills.filter(s => !s.have).length} skills to consider learning</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Inbox Tab */}
        {activeTab === "inbox" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">📬 Email Inbox</h2>
              <button onClick={fetchInbox} className="text-sm text-gray-400 hover:text-white px-3 py-1 border border-gray-700 rounded-lg">↻ Refresh</button>
            </div>
            {inboxData === null ? (
              <p className="text-gray-500 text-center py-8 animate-pulse">Loading...</p>
            ) : inboxData.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400 mb-2">No emails found.</p>
                <p className="text-gray-600 text-sm">Run the email monitor agent to populate this inbox.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inboxData.map(email => {
                  const catColors: Record<string, string> = {
                    interview_invite: "bg-green-900/50 text-green-300 border-green-800/50",
                    rejection: "bg-red-900/50 text-red-300 border-red-800/50",
                    offer: "bg-yellow-900/50 text-yellow-300 border-yellow-800/50",
                    info_request: "bg-blue-900/50 text-blue-300 border-blue-800/50",
                  };
                  const catLabel: Record<string, string> = {
                    interview_invite: "🎤 Interview Invite",
                    rejection: "✕ Rejection",
                    offer: "💼 Offer",
                    info_request: "ℹ Info Request",
                  };
                  const cat = email.category || "other";
                  return (
                    <div key={email.id} className={`bg-gray-900 border rounded-xl p-4 ${cat === "interview_invite" ? "border-green-900/40" : cat === "rejection" ? "border-red-900/30" : "border-gray-800"}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            {email.category && (
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${catColors[email.category] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
                                {catLabel[email.category] || email.category}
                              </span>
                            )}
                            <span className="text-sm font-medium text-white">{email.subject}</span>
                          </div>
                          <p className="text-xs text-gray-500">{email.from_email} · {new Date(email.received_at).toLocaleString()}</p>
                          {email.jobs && <p className="text-xs text-blue-400 mt-0.5">re: {email.jobs.title} @ {email.jobs.company}</p>}
                        </div>
                      </div>
                      {email.body_preview && (
                        <p className="text-sm text-gray-400 bg-gray-800/50 rounded-lg px-3 py-2 leading-relaxed">{email.body_preview}</p>
                      )}
                      {email.reply_draft && (
                        <details className="mt-3">
                          <summary className="text-xs text-blue-400 cursor-pointer hover:text-blue-300">📝 View reply draft</summary>
                          <div className="mt-2 text-sm text-gray-300 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 whitespace-pre-wrap">{email.reply_draft}</div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Applications Tracker Tab */}
        {activeTab === "applications" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">📝 Applications Tracker</h2>
              <button onClick={fetchApplications} className="text-sm text-gray-400 hover:text-white px-3 py-1 border border-gray-700 rounded-lg">↻ Refresh</button>
            </div>
            {applicationsData === null ? (
              <p className="text-gray-500 text-center py-8 animate-pulse">Loading...</p>
            ) : applicationsData.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400 mb-2">No applications yet.</p>
                <p className="text-gray-600 text-sm">Applications are tracked automatically when you apply to jobs.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {applicationsData.map(app => {
                  const statusColors: Record<string, string> = {
                    draft: "bg-gray-700 text-gray-300",
                    sent: "bg-blue-700 text-white",
                    acknowledged: "bg-purple-700 text-white",
                    rejected: "bg-red-700 text-white",
                    offer: "bg-green-700 text-white",
                  };
                  return (
                    <div key={app.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[app.status] || "bg-gray-700 text-gray-300"}`}>{app.status}</span>
                            {app.jobs ? (
                              <span className="text-sm font-medium text-white">{app.jobs.title} @ {app.jobs.company}</span>
                            ) : (
                              <span className="text-sm text-gray-500">Job #{app.job_id}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 flex gap-3 flex-wrap">
                            {app.applied_at && <span>Applied: {new Date(app.applied_at).toLocaleDateString()}</span>}
                            {app.resume_version && <span>Resume: {app.resume_version}</span>}
                            {app.jobs?.location && <span>{app.jobs.location}</span>}
                          </div>
                        </div>
                        {app.jobs?.job_url && (
                          <a href={app.jobs.job_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-400 border border-blue-900 px-2 py-1 rounded-lg hover:text-blue-300 flex-shrink-0">View →</a>
                        )}
                      </div>
                      {app.cover_letter && (
                        <details className="mt-3">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">📄 View cover letter</summary>
                          <div className="mt-2 text-sm text-gray-300 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 whitespace-pre-wrap max-h-40 overflow-y-auto">{app.cover_letter}</div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Agent Run History</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Last {data?.recentLogs?.length ?? 0} runs · click any row to expand</span>
                <button onClick={fetchData} className="text-sm text-gray-400 hover:text-white px-3 py-1 border border-gray-700 rounded-lg">↻ Refresh</button>
              </div>
            </div>

            <div className="relative pl-6 space-y-1">
              {/* Vertical timeline line */}
              <div className="absolute left-[7px] top-0 bottom-0 w-px bg-gray-800" />

              {(data?.recentLogs || []).map((log) => {
                let parsed: DiscoveryProgress | EmailProgress | CompanyProgress | null = null;
                try { parsed = JSON.parse(log.summary); } catch { /* plain text */ }

                const isJobDiscovery   = log.agent_name === "job_discovery"   && (parsed as DiscoveryProgress)?.feeds;
                const isEmailAgent     = (log.agent_name === "email_monitor" || log.agent_name === "job_email_scraper") && (parsed as EmailProgress)?.emails;
                const isCompanyScraper = log.agent_name === "company_scraper" && (parsed as CompanyProgress)?.companies;

                const dotColor = log.status === "completed" ? "bg-green-400" : log.status === "failed" ? "bg-red-500" : log.status === "running" ? "bg-blue-400 animate-pulse" : "bg-yellow-500";
                const agentIcons: Record<string, string> = { job_discovery: "🔍", email_monitor: "📧", job_email_scraper: "📨", company_scraper: "🏢" };
                const icon = agentIcons[log.agent_name] || "🤖";
                const timeAgo = (() => {
                  const diff = Date.now() - new Date(log.run_at).getTime();
                  const m = Math.floor(diff / 60000);
                  if (m < 1) return "just now";
                  if (m < 60) return `${m}m ago`;
                  const h = Math.floor(m / 60);
                  if (h < 24) return `${h}h ago`;
                  return `${Math.floor(h / 24)}d ago`;
                })();
                const duration = log.duration_ms
                  ? (log.duration_ms > 60000 ? `${Math.round(log.duration_ms / 60000)}m` : `${Math.round(log.duration_ms / 1000)}s`)
                  : null;

                const statusBadge = (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    log.status === "completed" ? "bg-green-900/50 text-green-400" :
                    log.status === "failed"    ? "bg-red-900/50 text-red-400" :
                    log.status === "running"   ? "bg-blue-900/50 text-blue-400 animate-pulse" :
                                                 "bg-yellow-900/50 text-yellow-400"
                  }`}>{log.status}</span>
                );

                return (
                  <details key={log.id} className="group">
                    <summary className="list-none cursor-pointer">
                      <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-900/60 transition">
                        {/* Timeline dot */}
                        <div className={`absolute left-0 w-3.5 h-3.5 rounded-full border-2 border-gray-950 flex-shrink-0 ${dotColor}`} />
                        {/* Icon + name */}
                        <span className="text-base flex-shrink-0">{icon}</span>
                        <span className="text-sm font-semibold text-white capitalize flex-shrink-0">{log.agent_name.replace(/_/g, " ")}</span>
                        {statusBadge}
                        {/* Stats pills */}
                        <div className="flex gap-2 flex-wrap">
                          {log.jobs_found > 0 && <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">{log.jobs_found} jobs saved</span>}
                          {isJobDiscovery && (() => {
                            const p = parsed as DiscoveryProgress;
                            const failed = p.feeds?.filter(f => f.status === "skipped").length ?? 0;
                            return <>
                              <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{p.completedFeeds}/{p.totalFeeds} feeds</span>
                              {p.totalFound > 0 && <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{p.totalFound} scanned</span>}
                              {failed > 0 && <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded-full">{failed} skipped</span>}
                            </>;
                          })()}
                          {isCompanyScraper && (() => {
                            const p = parsed as CompanyProgress;
                            const failed = p.companies?.filter(c => c.status === "failed").length ?? 0;
                            const done   = p.companies?.filter(c => c.status === "done" && c.saved > 0).length ?? 0;
                            return <>
                              <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{p.completedCompanies}/{p.totalCompanies} companies</span>
                              {done > 0 && <span className="text-xs text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded-full">{done} with results</span>}
                              {failed > 0 && <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full">{failed} failed</span>}
                            </>;
                          })()}
                          {isEmailAgent && (() => {
                            const p = parsed as EmailProgress;
                            return <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{p.processedEmails}/{p.totalEmails} emails</span>;
                          })()}
                        </div>
                        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                          {duration && <span className="text-xs text-gray-600">{duration}</span>}
                          <span className="text-xs text-gray-600">{timeAgo}</span>
                          <span className="text-gray-600 text-xs group-open:rotate-90 transition-transform">▶</span>
                        </div>
                      </div>
                    </summary>

                    {/* ── Expanded detail ── */}
                    <div className="ml-3 mb-3 mt-1 bg-gray-900 border border-gray-800 rounded-xl p-4">
                      {log.error_message && (
                        <div className="mb-3 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2 text-sm text-red-400">
                          ✗ {log.error_message}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mb-3">{new Date(log.run_at).toLocaleString()}{duration && ` · took ${duration}`}</p>

                      {/* Job Discovery breakdown */}
                      {isJobDiscovery && (() => {
                        const p = parsed as DiscoveryProgress;
                        const sourceOrder = ["indeed", "linkedin", "timesjobs", "weworkremotely", "remotive", "jobicy"];
                        const grouped: Record<string, FeedProgress[]> = {};
                        p.feeds.forEach(f => { if (!grouped[f.source]) grouped[f.source] = []; grouped[f.source].push(f); });
                        const sourceLabels: Record<string, string> = {
                          indeed: "Indeed India", linkedin: "LinkedIn", timesjobs: "TimesJobs",
                          weworkremotely: "We Work Remotely", remotive: "Remotive", jobicy: "Jobicy",
                        };
                        return (
                          <div className="space-y-1.5">
                            {sourceOrder.filter(s => grouped[s]).map(src => {
                              const feeds = grouped[src];
                              const srcSaved = feeds.reduce((a, f) => a + f.saved, 0);
                              const srcFound = feeds.reduce((a, f) => a + f.found, 0);
                              return (
                                <details key={src} open={srcSaved > 0}>
                                  <summary className="flex items-center gap-2 cursor-pointer select-none list-none py-1.5 px-3 rounded-lg bg-gray-800">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${srcSaved > 0 ? "bg-green-400" : "bg-gray-600"}`} />
                                    <span className={`text-sm font-medium flex-1 ${srcSaved > 0 ? "text-white" : "text-gray-400"}`}>{sourceLabels[src] || src}</span>
                                    <span className="text-xs text-gray-500">{feeds.length} feed{feeds.length > 1 ? "s" : ""}</span>
                                    {srcFound > 0 && <span className="text-xs text-gray-500">{srcFound} scanned</span>}
                                    {srcSaved > 0
                                      ? <span className="text-xs font-semibold text-green-400 bg-green-900/40 px-2 py-0.5 rounded-full">{srcSaved} saved</span>
                                      : <span className="text-xs text-gray-600">0 new</span>}
                                  </summary>
                                  <div className="space-y-0.5 mt-1 ml-3">
                                    {feeds.map((feed, i) => (
                                      <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded">
                                        <span className={`flex-shrink-0 ${feed.status === "done" && feed.saved > 0 ? "text-green-400" : feed.status === "done" ? "text-gray-600" : feed.status === "skipped" ? "text-gray-700" : "text-blue-400"}`}>
                                          {feed.status === "done" ? "✓" : feed.status === "skipped" ? "–" : "▶"}
                                        </span>
                                        <span className={`flex-1 truncate ${feed.saved > 0 ? "text-gray-200" : feed.status === "skipped" ? "text-gray-600 line-through" : "text-gray-400"}`}>{feed.label}</span>
                                        {feed.saved > 0 && <span className="text-green-400 font-semibold">{feed.saved} saved</span>}
                                        {feed.status === "done" && feed.saved === 0 && feed.found > 0 && <span className="text-gray-600">{feed.found} found · 0 new</span>}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Company Scraper breakdown */}
                      {isCompanyScraper && (() => {
                        const p = parsed as CompanyProgress;
                        const withJobs  = p.companies.filter(c => c.saved > 0);
                        const failed    = p.companies.filter(c => c.status === "failed");
                        const empty     = p.companies.filter(c => c.status === "done" && c.saved === 0);
                        return (
                          <div className="space-y-3">
                            {/* Companies with results */}
                            {withJobs.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-green-400 mb-1.5">✓ {withJobs.length} companies with new jobs</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                                  {withJobs.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between bg-green-950/30 border border-green-900/30 rounded-lg px-2.5 py-1.5">
                                      <span className="text-xs text-white truncate">{c.name}</span>
                                      <span className="text-xs text-green-400 font-semibold ml-2 flex-shrink-0">{c.saved}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Failed companies */}
                            {failed.length > 0 && (
                              <details>
                                <summary className="text-xs text-red-400 cursor-pointer select-none list-none">✗ {failed.length} failed — click to see errors</summary>
                                <div className="mt-1.5 space-y-1">
                                  {failed.map((c, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 bg-red-950/20 rounded">
                                      <span className="text-red-400 font-medium">{c.name}</span>
                                      {c.error && <span className="text-red-500/70 truncate">{c.error}</span>}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                            {/* Empty (0 results) */}
                            {empty.length > 0 && (
                              <details>
                                <summary className="text-xs text-gray-500 cursor-pointer select-none list-none">{empty.length} companies scraped · 0 new ML jobs</summary>
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {empty.map((c, i) => (
                                    <span key={i} className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">{c.name}</span>
                                  ))}
                                </div>
                              </details>
                            )}
                            {p.cancelled && <p className="text-xs text-yellow-400">⚠ Cancelled by user</p>}
                          </div>
                        );
                      })()}

                      {/* Email agent breakdown */}
                      {isEmailAgent && (() => {
                        const p = parsed as EmailProgress;
                        const realEmails = p.emails.filter(e => e.subject !== "(already processed)");
                        return (
                          <div>
                            <div className="flex gap-4 text-xs text-gray-400 mb-3">
                              <span>Emails: <span className="text-white font-semibold">{p.processedEmails}/{p.totalEmails}</span></span>
                              <span>LinkedIn: <span className="text-blue-400 font-semibold">{p.linkedinEmails}</span></span>
                              <span>Naukri: <span className="text-orange-400 font-semibold">{p.naukriEmails}</span></span>
                              {p.totalJobsSaved > 0 && <span>Saved: <span className="text-green-400 font-semibold">{p.totalJobsSaved}</span></span>}
                            </div>
                            {realEmails.length > 0 && (
                              <div className="space-y-0.5">
                                {realEmails.map((email, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded">
                                    <span className={`flex-shrink-0 w-3 font-bold ${email.saved > 0 ? "text-green-400" : email.status === "done" ? "text-gray-600" : "text-gray-700"}`}>
                                      {email.status === "done" ? "✓" : "–"}
                                    </span>
                                    <span className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${email.type === "linkedin" ? "bg-blue-900/40 text-blue-400" : email.type === "naukri" ? "bg-orange-900/40 text-orange-400" : "bg-gray-800 text-gray-500"}`}>
                                      {email.type === "linkedin" ? "LI" : email.type === "naukri" ? "NK" : "—"}
                                    </span>
                                    <span className={`flex-1 truncate ${email.saved > 0 ? "text-gray-200" : "text-gray-500"}`}>{email.subject.slice(0, 70)}</span>
                                    {email.saved > 0 && <span className="text-green-400 font-semibold flex-shrink-0">{email.saved} saved</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Fallback */}
                      {!isJobDiscovery && !isEmailAgent && !isCompanyScraper && (
                        <p className="text-sm text-gray-400">{
                          typeof log.summary === "string" && !log.summary.startsWith("{")
                            ? log.summary
                            : `Jobs: ${log.jobs_found ?? 0} · Actions: ${log.actions_taken ?? 0}`
                        }</p>
                      )}
                    </div>
                  </details>
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
