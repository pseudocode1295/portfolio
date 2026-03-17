-- ============================================================
-- JOB HUNT AGENT - SUPABASE SCHEMA
-- Run this in your Supabase SQL editor
-- ============================================================

-- Jobs discovered by the job discovery agent
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  salary_min BIGINT,  -- in LPA (Indian context) or USD
  salary_max BIGINT,
  salary_currency TEXT DEFAULT 'INR',
  job_url TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL, -- 'linkedin', 'indeed', 'naukri', 'company_website'
  description TEXT,
  required_skills TEXT[],
  job_id_external TEXT, -- the job board's own ID
  status TEXT NOT NULL DEFAULT 'discovered',
  -- Status flow: discovered → linkedin_pending → referral_pending → applied → responded → interview
  relevance_score FLOAT DEFAULT 0,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LinkedIn connection requests
CREATE TABLE IF NOT EXISTS linkedin_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  linkedin_profile_url TEXT NOT NULL,
  person_name TEXT,
  person_title TEXT,
  company TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft → pending_approval → sent → accepted → rejected
  connection_note TEXT, -- drafted message
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral messages to LinkedIn connections
CREATE TABLE IF NOT EXISTS referral_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES linkedin_connections(id) ON DELETE CASCADE,
  message_draft TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft → pending_approval → sent → replied → no_reply
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  reply_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job applications
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  resume_version TEXT, -- path or version label
  cover_letter TEXT,
  tailored_resume_data JSONB, -- customized resume sections
  status TEXT NOT NULL DEFAULT 'draft', -- draft → pending_approval → submitted → acknowledged
  applied_at TIMESTAMPTZ,
  applied_via TEXT, -- 'linkedin', 'indeed', 'company_website'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emails received from companies
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  gmail_message_id TEXT UNIQUE,
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT NOT NULL,
  body TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  category TEXT, -- 'interview_invite', 'rejection', 'info_request', 'offer', 'other'
  reply_draft TEXT,
  reply_status TEXT DEFAULT 'pending', -- pending → pending_approval → sent → not_needed
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview preparation material
CREATE TABLE IF NOT EXISTS interview_prep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  email_id UUID REFERENCES emails(id) ON DELETE SET NULL,
  company_research TEXT,
  role_breakdown TEXT,
  interview_questions JSONB, -- array of {question, answer, category}
  study_plan TEXT,
  key_technologies TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pending approvals queue (for dashboard)
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'connection_request', 'referral_message', 'application', 'email_reply'
  reference_id UUID NOT NULL, -- ID of the linkedin_connection / referral_message / application / email
  reference_table TEXT NOT NULL,
  title TEXT NOT NULL, -- human-readable description
  content TEXT NOT NULL, -- the draft content to approve/edit
  metadata JSONB, -- extra context (job title, company, etc.)
  status TEXT NOT NULL DEFAULT 'pending', -- pending → approved → rejected → edited
  decision_at TIMESTAMPTZ,
  edited_content TEXT, -- if user edited before approving
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent run logs
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL, -- 'orchestrator', 'job_discovery', 'linkedin', 'application', 'email_monitor', 'interview_prep'
  run_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL, -- 'running', 'completed', 'failed'
  summary TEXT,
  jobs_found INTEGER DEFAULT 0,
  actions_taken INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER
);

-- Dashboard stats cache (updated by agents)
CREATE TABLE IF NOT EXISTS stats_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_discovered_at ON jobs(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_type ON approvals(type);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(category);
CREATE INDEX IF NOT EXISTS idx_linkedin_connections_job ON linkedin_connections(job_id);

-- ============================================================
-- ROW LEVEL SECURITY (disable for server-side usage with service key)
-- ============================================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_prep ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by agents server-side)
CREATE POLICY "service_role_all" ON jobs FOR ALL USING (true);
CREATE POLICY "service_role_all" ON linkedin_connections FOR ALL USING (true);
CREATE POLICY "service_role_all" ON referral_messages FOR ALL USING (true);
CREATE POLICY "service_role_all" ON applications FOR ALL USING (true);
CREATE POLICY "service_role_all" ON emails FOR ALL USING (true);
CREATE POLICY "service_role_all" ON interview_prep FOR ALL USING (true);
CREATE POLICY "service_role_all" ON approvals FOR ALL USING (true);
CREATE POLICY "service_role_all" ON agent_logs FOR ALL USING (true);
CREATE POLICY "service_role_all" ON stats_cache FOR ALL USING (true);
