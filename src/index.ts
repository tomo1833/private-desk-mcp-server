#!/usr/bin/env node

import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from 'http';
import { z } from 'zod';

import {
  searchPrivateDesk,
  buildLocalSummary,
  buildSearchContext,
  getDiary,
  getAllDiaries,
  createDiary,
  updateDiary,
  deleteDiary,
  getWiki,
  getAllWikis,
  createWiki,
  updateWiki,
  deleteWiki,
  getBlog,
  getAllBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  searchPasswords,
  getAllPasswords,
} from './database/queries.js';
import type { SearchResult } from './types.js';

// MCP サーバーの初期化
const mcpServer = new McpServer(
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

// ツールとリソースの登録
function registerToolsAndResources() {
  // search_private_desk ツール
  mcpServer.registerTool(
    'search_private_desk',
    {
      description: 'Search across Private Desk data (passwords, diaries, wikis, blogs)',
      inputSchema: {
        query: z.string().describe('Search query'),
        limit: z.number().optional().describe('Maximum number of results per table (default: 5)'),
      },
    },
    async ({ query, limit }) => {
      const result = await searchPrivateDesk(query, limit ?? 5);
      const context = buildSearchContext(result);
      const summary = buildLocalSummary(result);
      
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ summary, context, sources: result }, null, 2),
        }],
      };
    }
  );

  // read_diary ツール
  mcpServer.registerTool(
    'read_diary',
    {
      description: 'Read a specific diary entry',
      inputSchema: {
        id: z.number().describe('Diary entry ID'),
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
  mcpServer.registerTool(
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
  mcpServer.registerTool(
    'update_diary',
    {
      description: 'Update an existing diary entry',
      inputSchema: {
        id: z.number().describe('Diary entry ID'),
        title: z.string().describe('Diary entry title'),
        content: z.string().describe('Diary entry content (Markdown)'),
      },
    },
    async ({ id, title, content }) => {
      const changes = await updateDiary(id, title, content);
      return {
        content: [{ type: 'text' as const, text: `Diary entry updated: ${changes} row(s) changed` }],
      };
    }
  );

  // delete_diary ツール
  mcpServer.registerTool(
    'delete_diary',
    {
      description: 'Delete a diary entry',
      inputSchema: {
        id: z.number().describe('Diary entry ID'),
      },
    },
    async ({ id }) => {
      const changes = await deleteDiary(id);
      return {
        content: [{ type: 'text' as const, text: `Diary entry deleted: ${changes} row(s) deleted` }],
      };
    }
  );

  // read_wiki ツール
  mcpServer.registerTool(
    'read_wiki',
    {
      description: 'Read a specific wiki page',
      inputSchema: {
        id: z.number().describe('Wiki page ID'),
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
  mcpServer.registerTool(
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
  mcpServer.registerTool(
    'update_wiki',
    {
      description: 'Update an existing wiki page',
      inputSchema: {
        id: z.number().describe('Wiki page ID'),
        title: z.string().describe('Wiki page title'),
        content: z.string().describe('Wiki page content (Markdown)'),
      },
    },
    async ({ id, title, content }) => {
      const changes = await updateWiki(id, title, content);
      return {
        content: [{ type: 'text' as const, text: `Wiki page updated: ${changes} row(s) changed` }],
      };
    }
  );

  // delete_wiki ツール
  mcpServer.registerTool(
    'delete_wiki',
    {
      description: 'Delete a wiki page',
      inputSchema: {
        id: z.number().describe('Wiki page ID'),
      },
    },
    async ({ id }) => {
      const changes = await deleteWiki(id);
      return {
        content: [{ type: 'text' as const, text: `Wiki page deleted: ${changes} row(s) deleted` }],
      };
    }
  );

  // read_blog ツール
  mcpServer.registerTool(
    'read_blog',
    {
      description: 'Read a specific blog post',
      inputSchema: {
        id: z.number().describe('Blog post ID'),
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
  mcpServer.registerTool(
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
  mcpServer.registerTool(
    'update_blog',
    {
      description: 'Update an existing blog post',
      inputSchema: {
        id: z.number().describe('Blog post ID'),
        title: z.string().describe('Blog post title'),
        content: z.string().describe('Blog post content'),
        content_markdown: z.string().describe('Blog post markdown content'),
        content_html: z.string().describe('Blog post HTML content'),
      },
    },
    async ({ id, title, content, content_markdown, content_html }) => {
      const changes = await updateBlog(id, title, content, content_markdown, content_html);
      return {
        content: [{ type: 'text' as const, text: `Blog post updated: ${changes} row(s) changed` }],
      };
    }
  );

  // delete_blog ツール
  mcpServer.registerTool(
    'delete_blog',
    {
      description: 'Delete a blog post',
      inputSchema: {
        id: z.number().describe('Blog post ID'),
      },
    },
    async ({ id }) => {
      const changes = await deleteBlog(id);
      return {
        content: [{ type: 'text' as const, text: `Blog post deleted: ${changes} row(s) deleted` }],
      };
    }
  );

  // search_passwords ツール
  mcpServer.registerTool(
    'search_passwords',
    {
      description: 'Search password manager entries',
      inputSchema: {
        query: z.string().describe('Search query'),
      },
    },
    async ({ query }) => {
      const passwords = await searchPasswords(query);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(passwords, null, 2) }],
      };
    }
  );

  // リソース登録
  mcpServer.resource(
    'All Diaries',
    'private-desk://diaries',
    async () => {
      const diaries = await getAllDiaries();
      return {
        contents: [{
          uri: 'private-desk://diaries',
          mimeType: 'application/json',
          text: JSON.stringify(diaries, null, 2),
        }],
      };
    }
  );

  mcpServer.resource(
    'All Wiki Pages',
    'private-desk://wikis',
    async () => {
      const wikis = await getAllWikis();
      return {
        contents: [{
          uri: 'private-desk://wikis',
          mimeType: 'application/json',
          text: JSON.stringify(wikis, null, 2),
        }],
      };
    }
  );

  mcpServer.resource(
    'All Blog Posts',
    'private-desk://blogs',
    async () => {
      const blogs = await getAllBlogs();
      return {
        contents: [{
          uri: 'private-desk://blogs',
          mimeType: 'application/json',
          text: JSON.stringify(blogs, null, 2),
        }],
      };
    }
  );

  mcpServer.resource(
    'Password Entries',
    'private-desk://passwords',
    async () => {
      const passwords = await getAllPasswords();
      return {
        contents: [{
          uri: 'private-desk://passwords',
          mimeType: 'application/json',
          text: JSON.stringify(passwords, null, 2),
        }],
      };
    }
  );
}

// HTTPサーバー起動
function startHttpServer() {
  const port = process.env.MCP_HTTP_PORT ? Number(process.env.MCP_HTTP_PORT) : 3001;
  const host = process.env.MCP_HTTP_HOST ?? '0.0.0.0';

  // StreamableHTTPServerTransportを作成
  const httpTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  // HTTPサーバーを作成
  const server = createServer(async (req, res) => {
    // ヘルスチェックエンドポイント
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      return;
    }

    // MCPエンドポイント
    if (req.url === '/mcp' || req.url === '/sse') {
      await httpTransport.handleRequest(req, res);
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  // MCPサーバーをHTTPトランスポートに接続
  mcpServer.connect(httpTransport).then(() => {
    server.listen(port, host, () => {
      console.error(`✓ HTTP server listening on http://${host}:${port}`);
      console.error(`  - Health check: GET http://${host}:${port}/health`);
      console.error(`  - MCP endpoint: POST http://${host}:${port}/mcp`);
    });
  });
}

// サーバー起動
async function main() {
  // ツールとリソースを登録
  registerToolsAndResources();
  
  const mode = process.env.MCP_TRANSPORT_MODE ?? 'stdio';
  
  if (mode === 'http') {
    // HTTPモードのみ
    console.error('🚀 Private Desk MCP server starting in HTTP mode...');
    startHttpServer();
    // HTTPモードではプロセスを維持（サーバーが動いている限り）
  } else if (mode === 'both') {
    // Stdio + HTTP 両方
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error('🚀 Private Desk MCP server started (stdio + HTTP)');
    startHttpServer();
  } else {
    // デフォルト: Stdioのみ
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error('🚀 Private Desk MCP server started (stdio only)');
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
