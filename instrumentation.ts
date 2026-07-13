export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startOpportunityScheduler } = await import(
      "@/lib/opportunity-engine/scheduler"
    );
    startOpportunityScheduler();
  }
}
