// Next.js instrumentation hook — runs once when the server process starts.
// On Vercel, cron is handled by Vercel Cron (vercel.json) — no in-process scheduler needed.
// Locally / self-hosted, node-cron runs in-process.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.VERCEL) {
    const { startCronJobs } = await import("./lib/cron");
    startCronJobs();
  }
}
