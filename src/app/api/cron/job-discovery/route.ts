import { NextRequest, NextResponse } from "next/server";
import { runJobDiscoveryAgent } from "@/lib/agents/job-discovery";
import { supabase } from "@/lib/supabase";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[cron] job_discovery starting via Vercel Cron");
  await supabase.from("stats_cache").upsert({ key: "cron_last_job_discovery", value: new Date().toISOString() });

  try {
    const result = await runJobDiscoveryAgent();
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("[cron] job_discovery error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
