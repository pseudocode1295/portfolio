import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

// Server-side client with full access (service role key)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    headers: { Authorization: `Bearer ${supabaseServiceKey}` },
  },
});

// ─── Type helpers ────────────────────────────────────────────────────────────

export type JobStatus =
  | "discovered"
  | "linkedin_pending"
  | "referral_pending"
  | "applied"
  | "responded"
  | "interview";

export type ApprovalType =
  | "connection_request"
  | "referral_message"
  | "application"
  | "email_reply";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  job_url: string;
  source: string;
  description: string | null;
  required_skills: string[];
  job_id_external: string | null;
  status: JobStatus;
  relevance_score: number;
  discovered_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  type: ApprovalType;
  reference_id: string;
  reference_table: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "edited";
  decision_at: string | null;
  edited_content: string | null;
  created_at: string;
}

export interface AgentLog {
  id: string;
  agent_name: string;
  run_at: string;
  status: "running" | "completed" | "failed";
  summary: string | null;
  jobs_found: number;
  actions_taken: number;
  error_message: string | null;
  duration_ms: number | null;
}
