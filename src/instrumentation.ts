// Next.js instrumentation hook — runs once when the server process starts.
// Used to initialise the background cron scheduler.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCronJobs } = await import("./lib/cron");
    startCronJobs();
  }
}
