import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: any | null = null;
let Database: any = null;

/**
 * better-sqlite3 を動的にロード
 */
async function loadDatabase() {
  if (Database) return Database;
  try {
    const module = await import('better-sqlite3');
    Database = module.default;
    return Database;
  } catch (error) {
    console.warn('⚠️  better-sqlite3 is not installed. Database features are disabled.');
    console.warn('   To enable database features: npm install better-sqlite3');
    return null;
  }
}

/**
 * データベース接続を取得
 */
export async function getDatabase(): Promise<any> {
  if (db) {
    return db;
  }

  const DatabaseClass = await loadDatabase();
  if (!DatabaseClass) {
    throw new Error('Database module (better-sqlite3) is not available');
  }

  const dbPath = process.env.PRIVATE_DESK_DB_PATH || 
    path.resolve(__dirname, '../../private-desk/data/database.sqlite');

  try {
    db = new DatabaseClass(dbPath, { readonly: false });
    // Foreign keys を有効化
    db.pragma('foreign_keys = ON');
    console.error(`✓ Connected to database: ${dbPath}`);
    return db;
  } catch (error) {
    console.error(`Failed to connect to database at ${dbPath}:`, error);
    throw error;
  }
}

/**
 * 複数レコードを取得
 */
export async function runSelect<T>(sql: string, params: (string | number | null | boolean)[] = []): Promise<T[]> {
  const database = await getDatabase();
  const stmt = database.prepare(sql);
  return stmt.all(...params) as T[];
}

/**
 * 単一レコードを取得
 */
export async function runGet<T>(sql: string, params: (string | number | null | boolean)[] = []): Promise<T | undefined> {
  const database = await getDatabase();
  const stmt = database.prepare(sql);
  return stmt.get(...params) as T | undefined;
}

/**
 * 更新・挿入・削除を実行（ID を返す）
 */
export async function runInsert(sql: string, params: (string | number | null | boolean)[] = []): Promise<number> {
  const database = await getDatabase();
  const stmt = database.prepare(sql);
  const result = stmt.run(...params);
  return typeof result.lastInsertRowid === 'number' ? result.lastInsertRowid : -1;
}

/**
 * 更新・挿入・削除を実行（影響行数を返す）
 */
export async function runExecute(sql: string, params: (string | number | null | boolean)[] = []): Promise<number> {
  const database = await getDatabase();
  const stmt = database.prepare(sql);
  const result = stmt.run(...params);
  return result.changes;
}

/**
 * トランザクションを実行
 */
export async function runTransaction<T>(fn: () => T): Promise<T> {
  const database = await getDatabase();
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