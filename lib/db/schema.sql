-- Veer Local Dev Schema (SQLite)
-- Mirrors architecture-spec.md: CandidateProfile / JobSpec / Scorecard
-- Designed for easy migration to Supabase (PostgreSQL) later

CREATE TABLE IF NOT EXISTS candidates (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  location      TEXT DEFAULT '',
  target_role   TEXT DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'candidate',
  consent       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recruiters (
  id               TEXT PRIMARY KEY,
  email            TEXT UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  company_name     TEXT NOT NULL,
  plan             TEXT DEFAULT NULL,          -- 'single', 'monthly', 'enterprise'
  billing_country  TEXT DEFAULT 'GB',          -- 'GB' or 'IE'
  billing_currency TEXT DEFAULT 'GBP',         -- 'GBP' or 'EUR'
  payment_status   TEXT DEFAULT 'unpaid',      -- 'unpaid', 'paid', 'stub_paid'
  payment_amount   REAL DEFAULT NULL,
  role             TEXT NOT NULL DEFAULT 'recruiter',
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS job_postings (
  id                TEXT PRIMARY KEY,
  recruiter_id      TEXT NOT NULL REFERENCES recruiters(id),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  company           TEXT NOT NULL,
  website           TEXT DEFAULT '',
  location          TEXT NOT NULL DEFAULT '',
  country           TEXT NOT NULL DEFAULT 'uk',  -- 'uk' or 'ie'
  employment_type   TEXT DEFAULT 'Full-time',    -- Full-time, Part-time, Contract, Internship
  work_arrangement  TEXT DEFAULT 'On-site',      -- Remote, Hybrid, On-site
  salary            REAL DEFAULT NULL,
  salary_period     TEXT DEFAULT 'year',         -- 'year' or 'month'
  currency          TEXT DEFAULT 'GBP',
  contact_name      TEXT DEFAULT '',
  contact_email     TEXT DEFAULT '',
  contact_phone     TEXT DEFAULT '',
  linkedin_url      TEXT DEFAULT '',
  required_skills   TEXT DEFAULT '[]',           -- JSON array
  keywords          TEXT DEFAULT '[]',           -- JSON array
  min_experience    INTEGER DEFAULT 0,
  seniority         TEXT DEFAULT '',
  education         TEXT DEFAULT '',
  status            TEXT DEFAULT 'draft',        -- 'draft', 'published', 'closed'
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id              TEXT PRIMARY KEY,
  candidate_id    TEXT NOT NULL REFERENCES candidates(id),
  job_posting_id  TEXT REFERENCES job_postings(id),
  cv_file_path    TEXT DEFAULT NULL,
  cv_parsed_text  TEXT DEFAULT '',
  ats_score       REAL DEFAULT NULL,
  ats_passed      INTEGER DEFAULT 0,         -- 0 or 1
  status          TEXT DEFAULT 'submitted',  -- 'submitted', 'ats_passed', 'ats_failed', 'quiz_pending', 'quiz_passed', 'quiz_failed', 'stage2_pending', 'stage2_done', 'stage3_done', 'complete'
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scorecards (
  id              TEXT PRIMARY KEY,
  candidate_id    TEXT NOT NULL REFERENCES candidates(id),
  job_posting_id  TEXT REFERENCES job_postings(id),
  ats_score       REAL DEFAULT NULL,
  quiz_score      REAL DEFAULT NULL,
  quiz_percentage REAL DEFAULT NULL,
  stage2_status   TEXT DEFAULT NULL,          -- 'pending', 'submitted', 'expired'
  stage3_status   TEXT DEFAULT NULL,          -- 'pending', 'submitted'
  total_score     REAL DEFAULT NULL,
  factors         TEXT DEFAULT '[]',          -- JSON array of {name, weight, score, evidence}
  bias_flags      TEXT DEFAULT '[]',          -- JSON array
  model_version   TEXT DEFAULT 'veer-score-1.0',
  job_version     TEXT DEFAULT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id                 TEXT PRIMARY KEY,
  external_id        TEXT UNIQUE NOT NULL,    -- e.g. 'AI001'
  section            TEXT DEFAULT '',
  category           TEXT NOT NULL,           -- 'AI', 'ML', 'Software development', 'Aptitude', 'Expert'
  type               TEXT NOT NULL,           -- 'single', 'multi', 'image', 'freetext'
  difficulty         TEXT DEFAULT 'Medium',
  question           TEXT NOT NULL,
  options            TEXT DEFAULT '[]',       -- JSON array of {id, text}
  correct_answer_ids TEXT DEFAULT '[]',       -- JSON array of answer IDs (server-side only, never sent to client)
  scoring            TEXT DEFAULT '1 / 0',
  rationale          TEXT DEFAULT '',         -- Server-side only
  image              TEXT DEFAULT NULL,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id               TEXT PRIMARY KEY,
  candidate_id     TEXT NOT NULL REFERENCES candidates(id),
  questions_served TEXT NOT NULL DEFAULT '[]',   -- JSON array of question IDs
  answers          TEXT NOT NULL DEFAULT '{}',   -- JSON object {questionId: answerId}
  score            REAL DEFAULT 0,
  total_questions  INTEGER DEFAULT 35,
  percentage       REAL DEFAULT 0,
  passed           INTEGER DEFAULT 0,            -- 0 or 1
  started_at       TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at     TEXT DEFAULT NULL
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_recruiters_email ON recruiters(email);
CREATE INDEX IF NOT EXISTS idx_job_postings_recruiter ON job_postings(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_country ON job_postings(country);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_category ON quiz_questions(category);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_candidate ON quiz_attempts(candidate_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_candidate ON scorecards(candidate_id);
