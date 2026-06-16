import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

declare global {
  var saveDatabase: (() => void) | undefined;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database | null = null;

export async function initDb(): Promise<Database> {
  if (db) return db;

  const wasmPath = path.join(__dirname, '..', '..', 'public', 'sql-wasm.wasm');
  const SQL = await initSqlJs({
    locateFile: () => wasmPath
  });

  const dbPath = path.join(__dirname, '..', '..', 'data', 'music-platform.db');
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  global.saveDatabase = () => {
    if (db) {
      try {
        const data = db.export();
        const buffer = Buffer.from(data);
        const dataDir = path.join(__dirname, '..', '..', 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(dbPath, buffer);
      } catch (err) {
        console.error('Failed to save database:', err);
      }
    }
  };

  process.on('SIGTERM', () => {
    global.saveDatabase();
    if (db) db.close();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    global.saveDatabase();
    if (db) db.close();
    process.exit(0);
  });

  return db;
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function run(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.run(params);
  const result = {
    lastInsertRowid: db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number,
    changes: db.exec('SELECT changes() as c')[0].values[0][0] as number
  };
  stmt.free();
  
  if (typeof global.saveDatabase === 'function') {
    global.saveDatabase();
  }
  
  return result;
}

export function get<T = any>(sql: string, params: any[] = []): T | undefined {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  
  let result: T | undefined;
  if (stmt.step()) {
    const columns = stmt.getColumnNames();
    const values = stmt.get();
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = values[i];
    });
    result = obj as T;
  }
  
  stmt.free();
  return result;
}

export function all<T = any>(sql: string, params: any[] = []): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  
  const results: T[] = [];
  const columns = stmt.getColumnNames();
  
  while (stmt.step()) {
    const values = stmt.get();
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = values[i];
    });
    results.push(obj as T);
  }
  
  stmt.free();
  return results;
}

export function exec(sql: string): void {
  const db = getDb();
  db.exec(sql);
}

export default { initDb, getDb, run, get, all, exec };
