/**
 * Veer — SQLite database connection & initialization (sql.js / WASM)
 *
 * Uses sql.js (WebAssembly-based SQLite) — no native compilation needed.
 * DB is loaded into memory from disk on startup, and flushed to disk on writes.
 */
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dir = path.dirname(__filename);
const DB_PATH = process.env.DB_PATH || path.join(__dir, 'data', 'veer.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let _db = null;
let _initPromise = null;

/**
 * Save database to disk. Call after any write operation.
 */
function saveToDisk() {
  if (_db) {
    const data = _db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

/**
 * Get the singleton database instance (async).
 * Initializes schema on first call.
 * @returns {Promise<import('sql.js').Database>}
 */
export async function getDb() {
  if (_db) return _db;

  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const SQL = await initSqlJs();

    // Load existing DB from disk if available
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      _db = new SQL.Database(fileBuffer);
      console.log(`[DB] Loaded existing database from ${DB_PATH}`);
    } else {
      _db = new SQL.Database();
      console.log(`[DB] Created new database`);
    }

    // Run schema (idempotent CREATE IF NOT EXISTS)
    const schema = fs.readFileSync(path.join(__dir, 'schema.sql'), 'utf-8');
    _db.run(schema);
    saveToDisk();

    console.log(`[DB] SQLite (sql.js/WASM) ready: ${DB_PATH}`);
    return _db;
  })();

  return _initPromise;
}

/**
 * Helper: run a SQL statement that modifies data (INSERT, UPDATE, DELETE).
 * Auto-saves to disk after execution.
 */
export async function dbRun(sql, params = []) {
  const db = await getDb();
  db.run(sql, params);
  saveToDisk();
}

/**
 * Helper: get a single row from a SELECT query.
 */
export async function dbGet(sql, params = []) {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    stmt.free();
    const row = {};
    cols.forEach((col, i) => { row[col] = vals[i]; });
    return row;
  }
  stmt.free();
  return null;
}

/**
 * Helper: get all rows from a SELECT query.
 */
export async function dbAll(sql, params = []) {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  const cols = stmt.getColumnNames();
  while (stmt.step()) {
    const vals = stmt.get();
    const row = {};
    cols.forEach((col, i) => { row[col] = vals[i]; });
    rows.push(row);
  }
  stmt.free();
  return rows;
}

/**
 * Close the database connection (for graceful shutdown).
 */
export async function closeDb() {
  if (_db) {
    saveToDisk();
    _db.close();
    _db = null;
    _initPromise = null;
    console.log('[DB] Connection closed');
  }
}

export { saveToDisk };
export default getDb;
