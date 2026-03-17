import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, title, company, location, status, relevance_score, discovered_at, job_url, salary_min, salary_max, salary_currency, required_skills, source")
    .like("source", "company_%")
    .order("relevance_score", { ascending: false })
    .limit(300);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: jobs || [] });
}
