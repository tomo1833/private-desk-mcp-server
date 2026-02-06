// Type definitions for Private Desk data

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
  diaries: Diary[];
  wikis: Wiki[];
  blogs: Blog[];
}
