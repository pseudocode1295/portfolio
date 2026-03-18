import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = [
    "cron_started_at",
    "cron_last_job_discovery",
    "cron_last_email_scraper",
    "cron_last_company_scraper",
  ];

  const { data } = await supabase
    .from("stats_cache")
    .select("key, value")
    .in("key", keys);

  const map: Record<string, string | null> = Object.fromEntries(keys.map(k => [k, null]));
  for (const row of data || []) map[row.key] = row.value as string;

  return NextResponse.json({
    live: !!map["cron_started_at"],
    startedAt: map["cron_started_at"],
    lastRuns: {
      job_discovery:   map["cron_last_job_discovery"],
      email_scraper:   map["cron_last_email_scraper"],
      company_scraper: map["cron_last_company_scraper"],
    },
    schedules: {
      job_discovery:   "Every 2h",
      email_scraper:   "Every 2h (+40m offset)",
      company_scraper: "Every 6h",
    },
  });
}
