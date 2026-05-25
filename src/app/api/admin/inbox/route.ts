import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("emails")
    .select("id, subject, from_email, received_at, category, body_preview, reply_draft, job_id, jobs(title, company)")
    .order("received_at", { ascending: false })
    .limit(50);

  if (error) {
    // Table may not exist yet — return empty gracefully
    return NextResponse.json({ emails: [] });
  }

  return NextResponse.json({ emails: data || [] });
}
