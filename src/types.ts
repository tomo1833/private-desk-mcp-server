// Type definitions for Private Desk data

export interface Password {
  id: number;
  site_name: string;
  site_url: string;
  login_id?: string;
  password: string;
  email?: string;
  memo?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface Diary {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export interface Wiki {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export interface Blog {
  id: number;
  title: string;
  content: string;
  content_markdown: string;
  content_html: string;
  eyecatch: string;
  permalink: string;
  site: string;
  author: string;
  persona: string;
  created_at: string;
}

export interface Schedule {
  id: number;
  title: string;
  start: string;
  end: string;
  memo?: string;
  google_event_id?: string;
  createdAt: string;
}

export interface Expense {
  id: number;
  category: string;
  amount: number;
  shop: string;
  product_name?: string;
  remark?: string;
  used_at: string;
  created_at: string;
}

export interface SearchResult {
  passwords: Password[];
  diaries: Diary[];
  wikis: Wiki[];
  blogs: Blog[];
}
