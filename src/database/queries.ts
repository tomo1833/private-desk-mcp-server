import { runSelect, runGet, runInsert, runExecute } from './connection.js';
import type { Password, Diary, Wiki, Blog, SearchResult } from '../types.js';

const MAX_SNIPPET_LENGTH = 320;
const DEFAULT_LIMIT = 5;

const clipText = (text: string): string => {
  if (text.length <= MAX_SNIPPET_LENGTH) return text;
  return `${text.slice(0, MAX_SNIPPET_LENGTH)}...`;
};

/**
 * 統合検索を実行
 */
export function searchPrivateDesk(query: string, limit: number = DEFAULT_LIMIT): SearchResult {
  const like = `%${query}%`;

  const passwords = runSelect<Password>(
    'SELECT * FROM password_manager WHERE site_name LIKE ? OR site_url LIKE ? OR login_id LIKE ? OR email LIKE ? OR memo LIKE ? ORDER BY updated_at DESC LIMIT ?',
    [like, like, like, like, like, limit]
  );

  const diaries = runSelect<Diary>(
    'SELECT * FROM diary WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC LIMIT ?',
    [like, like, limit]
  );

  const wikis = runSelect<Wiki>(
    'SELECT * FROM wiki WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC LIMIT ?',
    [like, like, limit]
  );

  const blogs = runSelect<Blog>(
    'SELECT * FROM blog WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC LIMIT ?',
    [like, like, limit]
  );

  return { passwords, diaries, wikis, blogs };
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
    buildLine('パスワード', result.passwords.map((item) => item.site_name)),
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

  const passwordLines = result.passwords.map(
    (item) => `${item.site_name} (${item.site_url}) メモ: ${clipText(item.memo ?? '')}`.trim()
  );
  const diaryLines = result.diaries.map((item) => `${item.title} - ${clipText(item.content)}`);
  const wikiLines = result.wikis.map((item) => `${item.title} - ${clipText(item.content)}`);
  const blogLines = result.blogs.map((item) => `${item.title} - ${clipText(item.content)}`);

  return [
    formatList('パスワード管理', passwordLines),
    formatList('日報', diaryLines),
    formatList('Wiki', wikiLines),
    formatList('ブログ', blogLines),
  ].join('\n\n');
}

/**
 * 日報を取得
 */
export function getDiary(id: number): Diary | undefined {
  return runGet<Diary>(
    'SELECT * FROM diary WHERE id = ?',
    [id]
  );
}

/**
 * すべての日報を取得
 */
export function getAllDiaries(): Diary[] {
  return runSelect<Diary>(
    'SELECT * FROM diary ORDER BY created_at DESC'
  );
}

/**
 * 新規日報を作成
 */
export function createDiary(title: string, content: string): number {
  return runInsert(
    'INSERT INTO diary (title, content, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [title, content]
  );
}

/**
 * 日報を更新
 */
export function updateDiary(id: number, title: string, content: string): number {
  return runExecute(
    'UPDATE diary SET title = ?, content = ? WHERE id = ?',
    [title, content, id]
  );
}

/**
 * 日報を削除
 */
export function deleteDiary(id: number): number {
  return runExecute(
    'DELETE FROM diary WHERE id = ?',
    [id]
  );
}

/**
 * Wiki ページを取得
 */
export function getWiki(id: number): Wiki | undefined {
  return runGet<Wiki>(
    'SELECT * FROM wiki WHERE id = ?',
    [id]
  );
}

/**
 * すべての Wiki ページを取得
 */
export function getAllWikis(): Wiki[] {
  return runSelect<Wiki>(
    'SELECT * FROM wiki ORDER BY created_at DESC'
  );
}

/**
 * 新規 Wiki ページを作成
 */
export function createWiki(title: string, content: string): number {
  return runInsert(
    'INSERT INTO wiki (title, content, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [title, content]
  );
}

/**
 * Wiki ページを更新
 */
export function updateWiki(id: number, title: string, content: string): number {
  return runExecute(
    'UPDATE wiki SET title = ?, content = ? WHERE id = ?',
    [title, content, id]
  );
}

/**
 * Wiki ページを削除
 */
export function deleteWiki(id: number): number {
  return runExecute(
    'DELETE FROM wiki WHERE id = ?',
    [id]
  );
}

/**
 * ブログ記事を取得
 */
export function getBlog(id: number): Blog | undefined {
  return runGet<Blog>(
    'SELECT * FROM blog WHERE id = ?',
    [id]
  );
}

/**
 * すべてのブログ記事を取得
 */
export function getAllBlogs(): Blog[] {
  return runSelect<Blog>(
    'SELECT * FROM blog ORDER BY created_at DESC'
  );
}

/**
 * 新規ブログ記事を作成
 */
export function createBlog(
  title: string,
  content: string,
  contentMarkdown: string,
  contentHtml: string,
  eyecatch: string,
  permalink: string,
  site: string,
  author: string,
  persona: string
): number {
  return runInsert(
    'INSERT INTO blog (title, content, content_markdown, content_html, eyecatch, permalink, site, author, persona, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
    [title, content, contentMarkdown, contentHtml, eyecatch, permalink, site, author, persona]
  );
}

/**
 * ブログ記事を更新
 */
export function updateBlog(
  id: number,
  title: string,
  content: string,
  contentMarkdown: string,
  contentHtml: string
): number {
  return runExecute(
    'UPDATE blog SET title = ?, content = ?, content_markdown = ?, content_html = ? WHERE id = ?',
    [title, content, contentMarkdown, contentHtml, id]
  );
}

/**
 * ブログ記事を削除
 */
export function deleteBlog(id: number): number {
  return runExecute(
    'DELETE FROM blog WHERE id = ?',
    [id]
  );
}

/**
 * パスワード情報を検索
 */
export function searchPasswords(query: string): Password[] {
  const like = `%${query}%`;
  return runSelect<Password>(
    'SELECT * FROM password_manager WHERE site_name LIKE ? OR site_url LIKE ? OR login_id LIKE ? OR email LIKE ? OR memo LIKE ? ORDER BY updated_at DESC LIMIT 10',
    [like, like, like, like, like]
  );
}

/**
 * パスワード情報を取得（メモと基本情報のみ）
 */
export function getPassword(id: number): Password | undefined {
  return runGet<Password>(
    'SELECT id, site_name, site_url, memo, category, updated_at FROM password_manager WHERE id = ?',
    [id]
  );
}

/**
 * すべてのパスワード情報を取得（セキュリティのため制限情報のみ）
 */
export function getAllPasswords(): Array<Omit<Password, 'password' | 'login_id'>> {
  return runSelect<Omit<Password, 'password' | 'login_id'>>(
    'SELECT id, site_name, site_url, email, memo, category, created_at, updated_at FROM password_manager ORDER BY updated_at DESC'
  );
}
