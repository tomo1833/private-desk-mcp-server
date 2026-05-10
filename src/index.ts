#!/usr/bin/env node

import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { createServer } from 'http';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

// ブリッジ用カスタムトランスポート
class BridgeTransport implements Transport {
  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  private _onServerResponse?: (message: JSONRPCMessage) => void;

  constructor(onServerResponse: (message: JSONRPCMessage) => void) {
    this._onServerResponse = onServerResponse;
  }

  async start() {}
  async close() { this.onclose?.(); }
  async send(message: JSONRPCMessage) {
    // サーバーから出力されたメッセージをHTTPレスポンス等へ転送
    this._onServerResponse?.(message);
  }

  // クライアント(HTTP)からのメッセージをサーバーへ入力
  forward(message: JSONRPCMessage) {
    this.onmessage?.(message);
  }
}

import {
  searchPrivateDesk,
  buildLocalSummary,
  buildSearchContext,
  getDiary,
  createDiary,
  updateDiary,
  deleteDiary,
  getWiki,
  createWiki,
  updateWiki,
  deleteWiki,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  listTables,
  describeTable,
  executeQuery,
} from './database/queries.js';

// MCP サーバーの初期化
function createMcpServer() {
  return new McpServer(
    {
      name: 'private-desk-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );
}

// ツールとリソースの登録
function registerToolsAndResources(server: McpServer, options?: { allowDelete?: boolean }) {
  const allowDelete = options?.allowDelete ?? true;
  // search_private_desk ツール
  server.registerTool(
    'search_private_desk',
    {
      description: 'Search across Private Desk data (diaries, wikis, blogs)',
      inputSchema: {
        query: z.string().describe('Search query'),
        limit: z.number().int().min(1).max(50).optional().describe('Maximum number of results per table (default: 5)'),
      },
    },
    async ({ query, limit }) => {
      console.error(`[MCP DEBUG] Tool called: search_private_desk (query: ${query})`);
      const result = await searchPrivateDesk(query, limit ?? 5);
      const context = buildSearchContext(result);
      const summary = buildLocalSummary(result);
      const diaries = result.diaries ?? [];
      const wikis = result.wikis ?? [];
      const blogs = result.blogs ?? [];
      const sources = {
        diaries: diaries.map((item) => ({ id: item.id, title: item.title, created_at: item.created_at })),
        wikis: wikis.map((item) => ({ id: item.id, title: item.title, created_at: item.created_at })),
        blogs: blogs.map((item) => ({ id: item.id, title: item.title, created_at: item.created_at, permalink: item.permalink })),
      };

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ summary, context, sources }, null, 2),
        }],
      };
    }
  );

  // read_diary ツール
  server.registerTool(
    'read_diary',
    {
      description: 'Read a specific diary entry',
      inputSchema: {
        id: z.number().int().positive().describe('Diary entry ID'),
      },
    },
    async ({ id }) => {
      const diary = await getDiary(id);
      if (!diary) {
        return {
          content: [{ type: 'text' as const, text: `Diary entry with ID ${id} not found` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(diary, null, 2) }],
      };
    }
  );

  // write_diary ツール
  server.registerTool(
    'write_diary',
    {
      description: 'Create a new diary entry',
      inputSchema: {
        title: z.string().describe('Diary entry title'),
        content: z.string().describe('Diary entry content (Markdown)'),
      },
    },
    async ({ title, content }) => {
      const id = await createDiary(title, content);
      return {
        content: [{ type: 'text' as const, text: `Diary entry created with ID: ${id}` }],
      };
    }
  );

  // update_diary ツール
  server.registerTool(
    'update_diary',
    {
      description: 'Update an existing diary entry',
      inputSchema: {
        id: z.number().int().positive().describe('Diary entry ID'),
        title: z.string().describe('Diary entry title'),
        content: z.string().describe('Diary entry content (Markdown)'),
      },
    },
    async ({ id, title, content }) => {
      const changes = await updateDiary(id, title, content);
      if (changes === 0) {
        return {
          content: [{ type: 'text' as const, text: `Diary entry with ID ${id} not found` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: `Diary entry updated: ${changes} row(s) changed` }],
      };
    }
  );

  if (allowDelete) {
    // delete_diary ツール
    server.registerTool(
      'delete_diary',
      {
        description: 'Delete a diary entry',
        inputSchema: {
          id: z.number().int().positive().describe('Diary entry ID'),
        },
      },
      async ({ id }) => {
        const changes = await deleteDiary(id);
        if (changes === 0) {
          return {
            content: [{ type: 'text' as const, text: `Diary entry with ID ${id} not found` }],
            isError: true,
          };
        }
        return {
          content: [{ type: 'text' as const, text: `Diary entry deleted: ${changes} row(s) deleted` }],
        };
      }
    );
  }

  // read_wiki ツール
  server.registerTool(
    'read_wiki',
    {
      description: 'Read a specific wiki page',
      inputSchema: {
        id: z.number().int().positive().describe('Wiki page ID'),
      },
    },
    async ({ id }) => {
      const wiki = await getWiki(id);
      if (!wiki) {
        return {
          content: [{ type: 'text' as const, text: `Wiki page with ID ${id} not found` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(wiki, null, 2) }],
      };
    }
  );

  // write_wiki ツール
  server.registerTool(
    'write_wiki',
    {
      description: 'Create a new wiki page',
      inputSchema: {
        title: z.string().describe('Wiki page title'),
        content: z.string().describe('Wiki page content (Markdown)'),
      },
    },
    async ({ title, content }) => {
      const id = await createWiki(title, content);
      return {
        content: [{ type: 'text' as const, text: `Wiki page created with ID: ${id}` }],
      };
    }
  );

  // update_wiki ツール
  server.registerTool(
    'update_wiki',
    {
      description: 'Update an existing wiki page',
      inputSchema: {
        id: z.number().int().positive().describe('Wiki page ID'),
        title: z.string().describe('Wiki page title'),
        content: z.string().describe('Wiki page content (Markdown)'),
      },
    },
    async ({ id, title, content }) => {
      const changes = await updateWiki(id, title, content);
      if (changes === 0) {
        return {
          content: [{ type: 'text' as const, text: `Wiki page with ID ${id} not found` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: `Wiki page updated: ${changes} row(s) changed` }],
      };
    }
  );

  if (allowDelete) {
    // delete_wiki ツール
    server.registerTool(
      'delete_wiki',
      {
        description: 'Delete a wiki page',
        inputSchema: {
          id: z.number().int().positive().describe('Wiki page ID'),
        },
      },
      async ({ id }) => {
        const changes = await deleteWiki(id);
        if (changes === 0) {
          return {
            content: [{ type: 'text' as const, text: `Wiki page with ID ${id} not found` }],
            isError: true,
          };
        }
        return {
          content: [{ type: 'text' as const, text: `Wiki page deleted: ${changes} row(s) deleted` }],
        };
      }
    );
  }

  // read_blog ツール
  server.registerTool(
    'read_blog',
    {
      description: 'Read a specific blog post',
      inputSchema: {
        id: z.number().int().positive().describe('Blog post ID'),
      },
    },
    async ({ id }) => {
      const blog = await getBlog(id);
      if (!blog) {
        return {
          content: [{ type: 'text' as const, text: `Blog post with ID ${id} not found` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(blog, null, 2) }],
      };
    }
  );

  // write_blog ツール
  server.registerTool(
    'write_blog',
    {
      description: 'Create a new blog post',
      inputSchema: {
        title: z.string().describe('Blog post title'),
        content: z.string().describe('Blog post content'),
        content_markdown: z.string().describe('Blog post markdown content'),
        content_html: z.string().describe('Blog post HTML content'),
        eyecatch: z.string().describe('Eyecatch image URL'),
        permalink: z.string().describe('Blog post permalink'),
        site: z.string().describe('Blog site name'),
        author: z.string().describe('Blog post author'),
        persona: z.string().describe('Blog post persona'),
      },
    },
    async ({ title, content, content_markdown, content_html, eyecatch, permalink, site, author, persona }) => {
      const id = await createBlog(title, content, content_markdown, content_html, eyecatch, permalink, site, author, persona);
      return {
        content: [{ type: 'text' as const, text: `Blog post created with ID: ${id}` }],
      };
    }
  );

  // update_blog ツール
  server.registerTool(
    'update_blog',
    {
      description: 'Update an existing blog post',
      inputSchema: {
        id: z.number().int().positive().describe('Blog post ID'),
        title: z.string().describe('Blog post title'),
        content: z.string().describe('Blog post content'),
        content_markdown: z.string().describe('Blog post markdown content'),
        content_html: z.string().describe('Blog post HTML content'),
      },
    },
    async ({ id, title, content, content_markdown, content_html }) => {
      const changes = await updateBlog(id, title, content, content_markdown, content_html);
      if (changes === 0) {
        return {
          content: [{ type: 'text' as const, text: `Blog post with ID ${id} not found` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: `Blog post updated: ${changes} row(s) changed` }],
      };
    }
  );

  if (allowDelete) {
    // delete_blog ツール
    server.registerTool(
      'delete_blog',
      {
        description: 'Delete a blog post',
        inputSchema: {
          id: z.number().int().positive().describe('Blog post ID'),
        },
      },
      async ({ id }) => {
        const changes = await deleteBlog(id);
        if (changes === 0) {
          return {
            content: [{ type: 'text' as const, text: `Blog post with ID ${id} not found` }],
            isError: true,
          };
        }
        return {
          content: [{ type: 'text' as const, text: `Blog post deleted: ${changes} row(s) deleted` }],
        };
      }
    );
  }

  // list_tables ツール
  server.registerTool(
    'list_tables',
    {
      description: 'List all available tables in the database',
      inputSchema: {},
    },
    async () => {
      console.error('[MCP DEBUG] Tool called: list_tables');
      const tables = await listTables();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(tables, null, 2) }],
      };
    }
  );

  // describe_table ツール
  server.registerTool(
    'describe_table',
    {
      description: 'Get schema information for a specific table',
      inputSchema: {
        table_name: z.string().describe('Table name to describe'),
      },
    },
    async ({ table_name }) => {
      const info = await describeTable(table_name);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(info, null, 2) }],
      };
    }
  );

  // execute_query ツール
  server.registerTool(
    'execute_query',
    {
      description: 'Execute a custom SELECT query on the database',
      inputSchema: {
        sql: z.string().describe('The SQL SELECT query to execute'),
      },
    },
    async ({ sql }) => {
      console.error(`[MCP DEBUG] Tool called: execute_query (sql: ${sql})`);
      try {
        const results = await executeQuery(sql);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text' as const, text: `Error executing query: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
}


// HTTPサーバー起動 (Open WebUI 最適化版)
function startHttpServer(server: McpServer) {
  const port = process.env.MCP_HTTP_PORT ? Number(process.env.MCP_HTTP_PORT) : 3001;
  const host = process.env.MCP_HTTP_HOST ?? '0.0.0.0';

  // SSEストリームを保持するMap
  const sseResponses = new Map<string, any>();
  // 処理中のリクエストを追跡するMap (ID -> resolve関数)
  const pendingRequests = new Map<string | number, (response: any) => void>();

  // カスタムブリッジトランスポートの作成
  const transport = new BridgeTransport((msg) => {
    const response = msg as any;
    if (response.id !== undefined && pendingRequests.has(response.id)) {
      const resolve = pendingRequests.get(response.id)!;
      resolve(response);
      pendingRequests.delete(response.id);
    } else if (response.method?.startsWith('notifications/') || !response.id) {
      // 通知などをSSEストリームに流す
      const sseData = `data: ${JSON.stringify(response)}\n\n`;
      for (const res of sseResponses.values()) {
        res.write(sseData);
      }
    }
  });

  // サーバーに接続 (1回だけ)
  server.connect(transport).catch(err => {
    console.error('❌ Server Connect Error:', err);
  });

  const httpServerInstance = createServer(async (req, res) => {
    // 全リクエストのロギング
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const path = url.pathname;
    if (path !== '/health') {
      console.error(`[MCP DEBUG] ${req.method} ${req.url}`);
    }

    // CORSヘッダー (常に設定)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.writeHead(204); res.end(); return;
    }

    if (path === '/health') {
      res.writeHead(200); res.end('ok'); return;
    }

    // SSE 接続 (GET) - /health 以外はすべて SSE 候補とする
    if (req.method === 'GET' && path !== '/health') {
      const sessionId = url.searchParams.get('sessionId') ?? randomUUID();
      
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      res.write(': keep-alive\n\n');
      // エンドポイント通知 (絶対URLで送る)
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const hostHeader = req.headers.host || `${host}:${port}`;
      const absoluteEndpoint = `${protocol}://${hostHeader}${path}?sessionId=${sessionId}`;

      res.write(`event: endpoint\ndata: ${encodeURI(absoluteEndpoint)}\n\n`);
      sseResponses.set(sessionId, res);
      console.error(`[MCP DEBUG] SSE Connected (Path: ${path}, Session: ${sessionId})`);

      req.on('close', () => {
        sseResponses.delete(sessionId);
        console.error(`[MCP DEBUG] SSE Closed: ${sessionId}`);
      });
      return;
    }

    // メッセージ受信 (POST) - すべてのパスを許可
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          if (!body) {
            res.writeHead(400); res.end('Empty body');
            return;
          }

          const message = JSON.parse(body);
          console.error(`[MCP DEBUG] POST ${path} -> ${message.method} (ID: ${message.id})`);
          
          const responsePromise = new Promise((resolve) => {
            if (message.id !== undefined) {
              pendingRequests.set(message.id, resolve);
            } else {
              resolve({ jsonrpc: '2.0', result: {} });
            }
          });

          transport.forward(message);

          const timeout = setTimeout(() => {
            if (message.id !== undefined && pendingRequests.has(message.id)) {
              const resolve = pendingRequests.get(message.id)!;
              resolve({ jsonrpc: '2.0', id: message.id, error: { code: -32000, message: 'Request timeout' } });
              pendingRequests.delete(message.id);
            }
          }, 30000);

          const response = await responsePromise;
          clearTimeout(timeout);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));

        } catch (e: any) {
          console.error('❌ POST Error:', e.message);
          res.writeHead(400); res.end('Bad Request');
        }
      });
      return;
    }
  });

  httpServerInstance.listen(port, host, () => {
    console.error(`✓ MCP HTTP bridge listening on http://${host}:${port}`);
    console.error(`  - SSE endpoint: http://${host}:${port}/sse`);
  });
}

// サーバー起動
async function main() {
  const mode = process.env.MCP_TRANSPORT_MODE ?? 'stdio';

  if (mode === 'http') {
    // HTTPモードのみ
    console.error('🚀 Private Desk MCP server starting in HTTP mode...');
    const httpServer = createMcpServer();
    registerToolsAndResources(httpServer, { allowDelete: false });
    console.error('🧭 HTTP tools: delete disabled');
    startHttpServer(httpServer);
    // HTTPモードではプロセスを維持（サーバーが動いている限り）
  } else if (mode === 'both') {
    // Stdio + HTTP 両方
    const stdioServer = createMcpServer();
    registerToolsAndResources(stdioServer, { allowDelete: true });
    const transport = new StdioServerTransport();
    await stdioServer.connect(transport);
    console.error('🚀 Private Desk MCP server started (stdio + HTTP)');
    console.error('🧭 Stdio tools: delete enabled');
    const httpServer = createMcpServer();
    registerToolsAndResources(httpServer, { allowDelete: false });
    console.error('🧭 HTTP tools: delete disabled');
    startHttpServer(httpServer);
  } else {
    // デフォルト: Stdioのみ
    const stdioServer = createMcpServer();
    registerToolsAndResources(stdioServer, { allowDelete: true });
    const transport = new StdioServerTransport();
    await stdioServer.connect(transport);
    console.error('🚀 Private Desk MCP server started (stdio only)');
    console.error('🧭 Stdio tools: delete enabled');
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
