import { runSelect, runGet, runInsert, runExecute } from './connection.js';
import type { Diary, Wiki, Blog, SearchResult } from '../types.js';

const MAX_SNIPPET_LENGTH = 320;
const DEFAULT_LIMIT = 5;

const clipText = (text: string): string => {
  if (text.length <= MAX_SNIPPET_LENGTH) return text;
  return `${text.slice(0, MAX_SNIPPET_LENGTH)}...`;
};

/**
 * 統合検索を実行
 */
export async function searchPrivateDesk(query: string, limit: number = DEFAULT_LIMIT): Promise<SearchResult> {
  const like = `%${query}%`;

  const diaries = await runSelect<Diary>(
    'SELECT * FROM diary WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC LIMIT ?',
    [like, like, limit]
  );

  const wikis = await runSelect<Wiki>(
    'SELECT * FROM wiki WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC LIMIT ?',
    [like, like, limit]
  );

  const blogs = await runSelect<Blog>(
    'SELECT * FROM blog WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC LIMIT ?',
    [like, like, limit]
  );

  return { diaries, wikis, blogs };
}

/**
 * 検索結果をローカルで要約
 */
export function buildLocalSummary(result: SearchResult): string {
  const buildLine = (label: string, items: string[]): string => {
    if (items.length === 0) return `- ${label}: 該当なし`;
    const names = items.slice(0, 3).join(', ');
    const suffix = items.length > 3 ? ` ほか${items.length - 3}件` : '';
    return `- ${label}: ${items.length}件 (${names}${suffix})`;
  };

  return [
    buildLine('日報', result.diaries.map((item) => item.title)),
    buildLine('Wiki', result.wikis.map((item) => item.title)),
    buildLine('ブログ', result.blogs.map((item) => item.title)),
  ].join('\n');
}

/**
 * 検索結果をコンテキスト文字列に変換
 */
export function buildSearchContext(result: SearchResult): string {
  const formatList = (label: string, items: string[]): string => {
    if (items.length === 0) return `${label}: 該当なし`;
    return `${label}:\n${items.map((item) => `- ${item}`).join('\n')}`;
  };

  const diaryLines = result.diaries.map((item) => `${item.title} - ${clipText(item.content)}`);
  const wikiLines = result.wikis.map((item) => `${item.title} - ${clipText(item.content)}`);
  const blogLines = result.blogs.map((item) => `${item.title} - ${clipText(item.content)}`);

  return [
    formatList('日報', diaryLines),
    formatList('Wiki', wikiLines),
    formatList('ブログ', blogLines),
  ].join('\n\n');
}

/**
 * 日報を取得
 */
export async function getDiary(id: number): Promise<Diary | undefined> {
  return await runGet<Diary>(
    'SELECT * FROM diary WHERE id = ?',
    [id]
  );
}

/**
 * 新規日報を作成
 */
export async function createDiary(title: string, content: string): Promise<number> {
  return await runInsert(
    'INSERT INTO diary (title, content, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [title, content]
  );
}

/**
 * 日報を更新
 */
export async function updateDiary(id: number, title: string, content: string): Promise<number> {
  return await runExecute(
    'UPDATE diary SET title = ?, content = ? WHERE id = ?',
    [title, content, id]
  );
}

/**
 * 日報を削除
 */
export async function deleteDiary(id: number): Promise<number> {
  return await runExecute(
    'DELETE FROM diary WHERE id = ?',
    [id]
  );
}

/**
 * Wiki ページを取得
 */
export async function getWiki(id: number): Promise<Wiki | undefined> {
  return await runGet<Wiki>(
    'SELECT * FROM wiki WHERE id = ?',
    [id]
  );
}

/**
 * 新規 Wiki ページを作成
 */
export async function createWiki(title: string, content: string): Promise<number> {
  return await runInsert(
    'INSERT INTO wiki (title, content, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [title, content]
  );
}

/**
 * Wiki ページを更新
 */
export async function updateWiki(id: number, title: string, content: string): Promise<number> {
  return await runExecute(
    'UPDATE wiki SET title = ?, content = ? WHERE id = ?',
    [title, content, id]
  );
}

/**
 * Wiki ページを削除
 */
export async function deleteWiki(id: number): Promise<number> {
  return await runExecute(
    'DELETE FROM wiki WHERE id = ?',
    [id]
  );
}

/**
 * ブログ記事を取得
 */
export async function getBlog(id: number): Promise<Blog | undefined> {
  return await runGet<Blog>(
    'SELECT * FROM blog WHERE id = ?',
    [id]
  );
}

/**
 * 新規ブログ記事を作成
 */
export async function createBlog(
  title: string,
  content: string,
  contentMarkdown: string,
  contentHtml: string,
  eyecatch: string,
  permalink: string,
  site: string,
  author: string,
  persona: string
): Promise<number> {
  return await runInsert(
    'INSERT INTO blog (title, content, content_markdown, content_html, eyecatch, permalink, site, author, persona, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
    [title, content, contentMarkdown, contentHtml, eyecatch, permalink, site, author, persona]
  );
}

/**
 * ブログ記事を更新
 */
export async function updateBlog(
  id: number,
  title: string,
  content: string,
  contentMarkdown: string,
  contentHtml: string
): Promise<number> {
  return await runExecute(
    'UPDATE blog SET title = ?, content = ?, content_markdown = ?, content_html = ? WHERE id = ?',
    [title, content, contentMarkdown, contentHtml, id]
  );
}

/**
 * ブログ記事を削除
 */
export async function deleteBlog(id: number): Promise<number> {
  return await runExecute(
    'DELETE FROM blog WHERE id = ?',
    [id]
  );
}

/**
 * 汎用：テーブル一覧を取得
 */
export async function listTables(): Promise<string[]> {
  const tables = await runSelect<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'"
  );
  return tables.map((t) => t.name);
}

/**
 * 汎用：テーブル構造を取得
 */
export async function describeTable(tableName: string): Promise<any[]> {
  // テーブル名が英数字とアンダースコアのみであることを確認（SQLインジェクション対策）
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    throw new Error('Invalid table name');
  }
  return await runSelect(`PRAGMA table_info(${tableName})`);
}

/**
 * 汎用：任意のクエリを実行（SELECTのみ）
 */
export async function executeQuery(sql: string, params: any[] = []): Promise<any[]> {
  const trimmedSql = sql.trim().toUpperCase();
  if (!trimmedSql.startsWith('SELECT') && !trimmedSql.startsWith('PRAGMA') && !trimmedSql.startsWith('WITH')) {
    throw new Error('Only SELECT, PRAGMA, or WITH queries are allowed via this tool.');
  }
  return await runSelect(sql, params);
}