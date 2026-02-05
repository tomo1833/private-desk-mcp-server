import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

/**
 * データベース接続を取得
 */
export function getDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = process.env.PRIVATE_DESK_DB_PATH || 
    path.resolve(__dirname, '../../private-desk/data/database.sqlite');

  try {
    db = new Database(dbPath, { readonly: false });
    // Foreign keys を有効化
    db.pragma('foreign_keys = ON');
    return db;
  } catch (error) {
    console.error(`Failed to connect to database at ${dbPath}:`, error);
    throw error;
  }
}

/**
 * 複数レコードを取得
 */
export function runSelect<T>(sql: string, params: (string | number | null | boolean)[] = []): T[] {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  return stmt.all(...params) as T[];
}

/**
 * 単一レコードを取得
 */
export function runGet<T>(sql: string, params: (string | number | null | boolean)[] = []): T | undefined {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  return stmt.get(...params) as T | undefined;
}

/**
 * 更新・挿入・削除を実行（ID を返す）
 */
export function runInsert(sql: string, params: (string | number | null | boolean)[] = []): number {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  const result = stmt.run(...params);
  return typeof result.lastInsertRowid === 'number' ? result.lastInsertRowid : -1;
}

/**
 * 更新・挿入・削除を実行（影響行数を返す）
 */
export function runExecute(sql: string, params: (string | number | null | boolean)[] = []): number {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  const result = stmt.run(...params);
  return result.changes;
}

/**
 * トランザクションを実行
 */
export function runTransaction<T>(fn: () => T): T {
  const database = getDatabase();
  return database.transaction(fn)();
}

/**
 * データベース接続を閉じる
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export default getDatabase;
