/**
 * Veer — Quiz question bank seeder (sql.js version)
 * Loads questions from _archive/veer_assessment_question_bank.json into quiz_questions table.
 * Idempotent: skips if questions already exist.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { getDb, saveToDisk } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dir = path.dirname(__filename);
const QUESTION_BANK_PATH = path.join(__dir, '..', '..', '_archive', 'veer_assessment_question_bank.json');

export async function seedJobPostings() {
  const db = await getDb();

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM job_postings');
  countStmt.step();
  const count = countStmt.get()[0];
  countStmt.free();

  if (count > 0) {
    return count;
  }

  const sampleJobs = [
    { id: 'uk-ai-eng-01', recruiter_id: 'rec-01', title: 'Senior AI Engineer', company: 'Northbridge Analytics', location: 'London, UK', country: 'uk', employment_type: 'Full-time', work_arrangement: 'Hybrid', salary: 85000, salary_period: 'year', currency: 'GBP', required_skills: ['RAG','LangChain','Python','Vector databases'], description: 'Own the retrieval layer for our candidate-matching engine — design, ship and monitor production RAG pipelines end to end.' },
    { id: 'uk-mle-01', recruiter_id: 'rec-01', title: 'Machine Learning Engineer', company: 'Fenwick Software', location: 'Manchester, UK', country: 'uk', employment_type: 'Full-time', work_arrangement: 'Remote', salary: 70000, salary_period: 'year', currency: 'GBP', required_skills: ['PyTorch','MLOps','AWS'], description: 'Build and maintain the training and evaluation pipelines behind our explainable scoring model.' },
    { id: 'ie-ai-eng-01', recruiter_id: 'rec-02', title: 'Senior AI Engineer', company: 'Northbridge Analytics', location: 'Dublin, Ireland', country: 'ie', employment_type: 'Full-time', work_arrangement: 'Hybrid', salary: 90000, salary_period: 'year', currency: 'EUR', required_skills: ['RAG','LangChain','Python','Vector databases'], description: 'Own the retrieval layer for our candidate-matching engine — design, ship and monitor production RAG pipelines end to end.' },
    { id: 'ie-mle-01', recruiter_id: 'rec-02', title: 'Machine Learning Engineer', company: 'Fenwick Software', location: 'Cork, Ireland', country: 'ie', employment_type: 'Full-time', work_arrangement: 'Remote', salary: 75000, salary_period: 'year', currency: 'EUR', required_skills: ['PyTorch','MLOps','AWS'], description: 'Build and maintain the training and evaluation pipelines behind our explainable scoring model.' }
  ];

  for (const j of sampleJobs) {
    db.run(`
      INSERT INTO job_postings (id, recruiter_id, title, company, location, country, employment_type, work_arrangement, salary, salary_period, currency, required_skills, keywords, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', datetime('now'))
    `, [
      j.id, j.recruiter_id, j.title, j.company, j.location, j.country, j.employment_type, j.work_arrangement, j.salary, j.salary_period, j.currency,
      JSON.stringify(j.required_skills), JSON.stringify(j.required_skills), j.description
    ]);
  }

  saveToDisk();
  console.log(`[SEED] Seeded ${sampleJobs.length} sample job postings.`);
  return sampleJobs.length;
}

export async function seedQuizQuestions() {
  const db = await getDb();

  // Check if already seeded
  const stmt = db.prepare('SELECT COUNT(*) as count FROM quiz_questions');
  stmt.step();
  const count = stmt.get()[0];
  stmt.free();

  if (count > 0) {
    console.log(`[SEED] Quiz questions already seeded (${count} rows). Skipping.`);
    return count;
  }

  // Load question bank
  let bankData;
  try {
    const raw = fs.readFileSync(QUESTION_BANK_PATH, 'utf-8');
    bankData = JSON.parse(raw);
  } catch (err) {
    console.error(`[SEED] Failed to read question bank: ${err.message}`);
    console.error(`[SEED] Expected at: ${QUESTION_BANK_PATH}`);
    return 0;
  }

  const questions = bankData.question_bank || [];
  if (questions.length === 0) {
    console.warn('[SEED] No questions found in question bank JSON.');
    return 0;
  }

  // Insert all questions
  const insertSql = `
    INSERT INTO quiz_questions (id, external_id, section, category, type, difficulty, question, options, correct_answer_ids, scoring, rationale, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  for (const q of questions) {
    db.run(insertSql, [
      uuidv4(),
      q.id || uuidv4(),
      q.section || '',
      q.category || 'AI',
      q.type || 'single',
      q.difficulty || 'Medium',
      q.question || '',
      JSON.stringify(q.options || []),
      JSON.stringify(q.correct_answer_ids || q.correct_answers || []),
      q.scoring || '1 / 0',
      q.rationale || '',
      q.image || null,
    ]);
  }

  saveToDisk();
  console.log(`[SEED] Seeded ${questions.length} quiz questions from question bank.`);
  return questions.length;
}

// Allow standalone execution
const isMain = process.argv[1] && fileURLToPath(import.meta.url).replace(/\\/g, '/').includes(process.argv[1].replace(/\\/g, '/'));
if (isMain) {
  // Load .env.local manually for standalone execution
  try {
    const envPath = path.join(__dir, '..', '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...rest] = trimmed.split('=');
        process.env[key.trim()] = rest.join('=').trim();
      }
    }
  } catch { /* .env.local may not exist */ }

  seedQuizQuestions().then((n) => {
    console.log(`[SEED] Done. Total questions in DB: ${n}`);
    process.exit(0);
  });
}
