import cron from "node-cron";
import { supabase } from "@/lib/supabase";
import { runJobDiscoveryAgent } from "@/lib/agents/job-discovery";
import { runCompanyScraperAgent } from "@/lib/agents/company-scraper";
import { runJobEmailScraperAgent } from "@/lib/agents/email-monitor";

// ─── Schedule config ──────────────────────────────────────────────────────────
// All agents run on a 2-hour stagger so they don't overlap:
//   :00 — Job Discovery
//   :40 — Email Scraper
//   :20 (every 6h offset) — Company Scraper (heavier, Playwright)

const SCHEDULES = {
  job_discovery:   "0 */2 * * *",      // every 2h at :00
  email_scraper:   "40 */2 * * *",     // every 2h at :40
  company_scraper: "20 1,7,13,19 * * *", // every 6h at 01:20, 07:20, 13:20, 19:20
};

async function stamp(key: string) {
  await supabase.from("stats_cache").upsert({ key, value: new Date().toISOString() });
}

let started = false;

export function startCronJobs() {
  if (started) return;
  started = true;

  console.log("[cron] Scheduling agents:", SCHEDULES);

  cron.schedule(SCHEDULES.job_discovery, async () => {
    console.log("[cron] job_discovery starting");
    await stamp("cron_last_job_discovery");
    try { await runJobDiscoveryAgent(); } catch (e) { console.error("[cron] job_discovery error:", e); }
  });

  cron.schedule(SCHEDULES.email_scraper, async () => {
    console.log("[cron] email_scraper starting");
    await stamp("cron_last_email_scraper");
    try { await runJobEmailScraperAgent(7); } catch (e) { console.error("[cron] email_scraper error:", e); }
  });

  cron.schedule(SCHEDULES.company_scraper, async () => {
    console.log("[cron] company_scraper starting");
    await stamp("cron_last_company_scraper");
    try { await runCompanyScraperAgent(); } catch (e) { console.error("[cron] company_scraper error:", e); }
  });

  // Write startup timestamp so the admin UI can confirm cron is live
  stamp("cron_started_at").catch(() => {});
}
