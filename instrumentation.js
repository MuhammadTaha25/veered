/**
 * Next.js Instrumentation — runs once on server startup.
 * Used to initialize the database and seed quiz questions.
 *
 * This file is automatically detected by Next.js 15+.
 */
export async function register() {
  // Dynamic imports ensure these server-only modules
  // are never analyzed by the client-side webpack bundle
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getDb } = await import('./lib/db/index.js');
    const { seedQuizQuestions, seedJobPostings } = await import('./lib/db/seed.js');

    // Initialize database (creates tables)
    await getDb();
    console.log('[STARTUP] Database initialized');

    // Seed quiz questions & job postings (idempotent)
    const count = await seedQuizQuestions();
    await seedJobPostings();
    console.log(`[STARTUP] Quiz questions ready: ${count}`);
  }
}
