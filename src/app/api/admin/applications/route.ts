import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("applications")
    .select("id, status, cover_letter, resume_version, applied_at, created_at, job_id, jobs(title, company, location, job_url)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    // Table may not exist yet — return empty gracefully
    return NextResponse.json({ applications: [] });
  }

  return NextResponse.json({ applications: data || [] });
}
