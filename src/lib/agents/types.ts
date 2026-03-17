export interface AgentResult {
  success: boolean;
  summary: string;
  jobsFound?: number;
  actionsTaken?: number;
  error?: string;
}

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  jobUrl: string;
  source: string;
  description?: string;
  requiredSkills?: string[];
  jobIdExternal?: string;
}
