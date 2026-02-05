#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from 'http';

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

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: number | string | null;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
};

// MCP サーバーの初期化
const server = new Server(
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

// リソース定義
async function listResources() {
  return {
    resources: [
      {
        uri: 'private-desk://search',
        name: 'Private Desk Search',
        description: 'Search across all Private Desk data (passwords, diaries, wikis, blogs)',
        mimeType: 'application/json',
      },
      {
        uri: 'private-desk://diaries',
        name: 'All Diaries',
        description: 'List all diary entries',
        mimeType: 'application/json',
      },
      {
        uri: 'private-desk://wikis',
        name: 'All Wiki Pages',
        description: 'List all wiki pages',
        mimeType: 'application/json',
      },
      {
        uri: 'private-desk://blogs',
        name: 'All Blog Posts',
        description: 'List all blog posts',
        mimeType: 'application/json',
      },
      {
        uri: 'private-desk://passwords',
        name: 'Password Entries (metadata only)',
        description: 'List all password manager entries (without passwords)',
        mimeType: 'application/json',
      },
    ],
  };
}

// リソース読み込み
async function readResource(uri: string) {
  try {
    if (uri === 'private-desk://diaries') {
      const diaries = getAllDiaries();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(diaries, null, 2),
          },
        ],
      };
    }

    if (uri === 'private-desk://wikis') {
      const wikis = getAllWikis();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(wikis, null, 2),
          },
        ],
      };
    }

    if (uri === 'private-desk://blogs') {
      const blogs = getAllBlogs();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(blogs, null, 2),
          },
        ],
      };
    }

    if (uri === 'private-desk://passwords') {
      const passwords = getAllPasswords();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(passwords, null, 2),
          },
        ],
      };
    }

    if (uri.startsWith('private-desk://search?q=')) {
      const query = decodeURIComponent(uri.replace('private-desk://search?q=', ''));
      const result = searchPrivateDesk(query, 10);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text: 'Resource not found',
        },
      ],
    };
  } catch (error) {
    return {
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text: `Error reading resource: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

// ツール定義
async function listTools() {
  return {
    tools: [
      {
        name: 'search_private_desk',
        description: 'Search across Private Desk data (passwords, diaries, wikis, blogs)',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results per table (default: 5)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'read_diary',
        description: 'Read a specific diary entry',
        inputSchema: {
          type: 'object' as const,
          properties: {
            id: {
              type: 'number',
              description: 'Diary entry ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'write_diary',
        description: 'Create a new diary entry',
        inputSchema: {
          type: 'object' as const,
          properties: {
            title: {
              type: 'string',
              description: 'Diary entry title',
            },
            content: {
              type: 'string',
              description: 'Diary entry content (Markdown)',
            },
          },
          required: ['title', 'content'],
        },
      },
      {
        name: 'update_diary',
        description: 'Update an existing diary entry',
        inputSchema: {
          type: 'object' as const,
          properties: {
            id: {
              type: 'number',
              description: 'Diary entry ID',
            },
            title: {
              type: 'string',
              description: 'Diary entry title',
            },
            content: {
              type: 'string',
              description: 'Diary entry content (Markdown)',
            },
          },
          required: ['id', 'title', 'content'],
        },
      },
      {
        name: 'delete_diary',
        description: 'Delete a diary entry',
        inputSchema: {
          type: 'object' as const,
          properties: {
            id: {
              type: 'number',
              description: 'Diary entry ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'read_wiki',
        description: 'Read a specific wiki page',
        inputSchema: {
          type: 'object' as const,
          properties: {
            id: {
              type: 'number',
              description: 'Wiki page ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'write_wiki',
        description: 'Create a new wiki page',
        inputSchema: {
          type: 'object' as const,
          properties: {
            title: {
              type: 'string',
              description: 'Wiki page title',
            },
            content: {
              type: 'string',
              description: 'Wiki page content (Markdown)',
            },
          },
          required: ['title', 'content'],
        },
      },
      {
        name: 'update_wiki',
        description: 'Update an existing wiki page',
        inputSchema: {
          type: 'object' as const,
          properties: {
            id: {
              type: 'number',
              description: 'Wiki page ID',
            },
            title: {
              type: 'string',
              description: 'Wiki page title',
            },
            content: {
              type: 'string',
              description: 'Wiki page content (Markdown)',
            },
          },
          required: ['id', 'title', 'content'],
        },
      },
      {
        name: 'delete_wiki',
        description: 'Delete a wiki page',
        inputSchema: {
          type: 'object' as const,
          properties: {
            id: {
              type: 'number',
              description: 'Wiki page ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'read_blog',
        description: 'Read a specific blog post',
        inputSchema: {
          type: 'object' as const,
          properties: {
            id: {
              type: 'number',
              description: 'Blog post ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'write_blog',
        description: 'Create a new blog post',
        inputSchema: {
          type: 'object' as const,
          properties: {
            title: {
              type: 'string',
              description: 'Blog post title',
            },
            content: {
              type: 'string',
              description: 'Blog post content',
            },
            content_markdown: {
              type: 'string',
              description: 'Blog post markdown content',
            },
            content_html: {
              type: 'string',
              description: 'Blog post HTML content',
            },
            eyecatch: {
              type: 'string',
              description: 'Eyecatch image URL',
            },
            permalink: {
              type: 'string',
              description: 'Blog post permalink',
            },
            site: {
              type: 'string',
              description: 'Blog site name',
            },
            author: {
              type: 'string',
              description: 'Blog post author',
            },
            persona: {
              type: 'string',
              description: 'Blog post persona',
            },
          },
          required: ['title', 'content', 'content_markdown', 'content_html', 'eyecatch', 'permalink', 'site', 'author', 'persona'],
        },
      },
      {
        name: 'update_blog',
        description: 'Update an existing blog post',
        inputSchema: {
          type: 'object' as const,
          properties: {
            id: {
              type: 'number',
              description: 'Blog post ID',
            },
            title: {
              type: 'string',
              description: 'Blog post title',
            },
            content: {
              type: 'string',
              description: 'Blog post content',
            },
            content_markdown: {
              type: 'string',
              description: 'Blog post markdown content',
            },
            content_html: {
              type: 'string',
              description: 'Blog post HTML content',
            },
          },
          required: ['id', 'title', 'content', 'content_markdown', 'content_html'],
        },
      },
      {
        name: 'delete_blog',
        description: 'Delete a blog post',
        inputSchema: {
          type: 'object' as const,
          properties: {
            id: {
              type: 'number',
              description: 'Blog post ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_passwords',
        description: 'Search password manager entries',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
          },
          required: ['query'],
        },
      },
    ],
  };
}

// ツール実行
async function callTool(name: string, args: Record<string, unknown>) {
  try {
    if (name === 'search_private_desk') {
      const query = (args as Record<string, unknown>).query as string;
      const limit = (args as Record<string, unknown>).limit as number | undefined || 5;

      const result = searchPrivateDesk(query, limit);
      const context = buildSearchContext(result);

      const summary = buildLocalSummary(result);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                summary,
                context,
                sources: result,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'read_diary') {
      const id = (args as Record<string, unknown>).id as number;
      const diary = getDiary(id);
      if (!diary) {
        return {
          content: [{ type: 'text', text: `Diary entry with ID ${id} not found` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(diary, null, 2) }],
      };
    }

    if (name === 'write_diary') {
      const title = (args as Record<string, unknown>).title as string;
      const content = (args as Record<string, unknown>).content as string;
      const id = createDiary(title, content);
      return {
        content: [{ type: 'text', text: `Diary entry created with ID: ${id}` }],
      };
    }

    if (name === 'update_diary') {
      const id = (args as Record<string, unknown>).id as number;
      const title = (args as Record<string, unknown>).title as string;
      const content = (args as Record<string, unknown>).content as string;
      const changes = updateDiary(id, title, content);
      return {
        content: [{ type: 'text', text: `Diary entry updated: ${changes} row(s) changed` }],
      };
    }

    if (name === 'delete_diary') {
      const id = (args as Record<string, unknown>).id as number;
      const changes = deleteDiary(id);
      return {
        content: [{ type: 'text', text: `Diary entry deleted: ${changes} row(s) deleted` }],
      };
    }

    if (name === 'read_wiki') {
      const id = (args as Record<string, unknown>).id as number;
      const wiki = getWiki(id);
      if (!wiki) {
        return {
          content: [{ type: 'text', text: `Wiki page with ID ${id} not found` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(wiki, null, 2) }],
      };
    }

    if (name === 'write_wiki') {
      const title = (args as Record<string, unknown>).title as string;
      const content = (args as Record<string, unknown>).content as string;
      const id = createWiki(title, content);
      return {
        content: [{ type: 'text', text: `Wiki page created with ID: ${id}` }],
      };
    }

    if (name === 'update_wiki') {
      const id = (args as Record<string, unknown>).id as number;
      const title = (args as Record<string, unknown>).title as string;
      const content = (args as Record<string, unknown>).content as string;
      const changes = updateWiki(id, title, content);
      return {
        content: [{ type: 'text', text: `Wiki page updated: ${changes} row(s) changed` }],
      };
    }

    if (name === 'delete_wiki') {
      const id = (args as Record<string, unknown>).id as number;
      const changes = deleteWiki(id);
      return {
        content: [{ type: 'text', text: `Wiki page deleted: ${changes} row(s) deleted` }],
      };
    }

    if (name === 'read_blog') {
      const id = (args as Record<string, unknown>).id as number;
      const blog = getBlog(id);
      if (!blog) {
        return {
          content: [{ type: 'text', text: `Blog post with ID ${id} not found` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(blog, null, 2) }],
      };
    }

    if (name === 'write_blog') {
      const title = (args as Record<string, unknown>).title as string;
      const content = (args as Record<string, unknown>).content as string;
      const contentMarkdown = (args as Record<string, unknown>).content_markdown as string;
      const contentHtml = (args as Record<string, unknown>).content_html as string;
      const eyecatch = (args as Record<string, unknown>).eyecatch as string;
      const permalink = (args as Record<string, unknown>).permalink as string;
      const site = (args as Record<string, unknown>).site as string;
      const author = (args as Record<string, unknown>).author as string;
      const persona = (args as Record<string, unknown>).persona as string;

      const id = createBlog(title, content, contentMarkdown, contentHtml, eyecatch, permalink, site, author, persona);
      return {
        content: [{ type: 'text', text: `Blog post created with ID: ${id}` }],
      };
    }

    if (name === 'update_blog') {
      const id = (args as Record<string, unknown>).id as number;
      const title = (args as Record<string, unknown>).title as string;
      const content = (args as Record<string, unknown>).content as string;
      const contentMarkdown = (args as Record<string, unknown>).content_markdown as string;
      const contentHtml = (args as Record<string, unknown>).content_html as string;

      const changes = updateBlog(id, title, content, contentMarkdown, contentHtml);
      return {
        content: [{ type: 'text', text: `Blog post updated: ${changes} row(s) changed` }],
      };
    }

    if (name === 'delete_blog') {
      const id = (args as Record<string, unknown>).id as number;
      const changes = deleteBlog(id);
      return {
        content: [{ type: 'text', text: `Blog post deleted: ${changes} row(s) deleted` }],
      };
    }

    if (name === 'search_passwords') {
      const query = (args as Record<string, unknown>).query as string;
      const passwords = searchPasswords(query);
      return {
        content: [{ type: 'text', text: JSON.stringify(passwords, null, 2) }],
      };
    }

    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// MCP SDK へのハンドラ登録
server.setRequestHandler(ListResourcesRequestSchema, async () => listResources());
server.setRequestHandler(ReadResourceRequestSchema, async (request) => readResource(request.params.uri));
server.setRequestHandler(ListToolsRequestSchema, async () => listTools());
server.setRequestHandler(CallToolRequestSchema, async (request) =>
  callTool(request.params.name, request.params.arguments as Record<string, unknown>)
);

async function handleJsonRpc(request: JsonRpcRequest): Promise<JsonRpcResponse> {
  if (!request || request.jsonrpc !== '2.0' || !request.method) {
    return {
      jsonrpc: '2.0',
      id: request?.id ?? null,
      error: { code: -32600, message: 'Invalid Request' },
    };
  }

  try {
    switch (request.method) {
      case 'resources/list':
        return { jsonrpc: '2.0', id: request.id, result: await listResources() };
      case 'resources/read': {
        const uri = request.params?.uri as string | undefined;
        if (!uri) {
          return { jsonrpc: '2.0', id: request.id, error: { code: -32602, message: 'Missing uri' } };
        }
        return { jsonrpc: '2.0', id: request.id, result: await readResource(uri) };
      }
      case 'tools/list':
        return { jsonrpc: '2.0', id: request.id, result: await listTools() };
      case 'tools/call': {
        const name = request.params?.name as string | undefined;
        const args = (request.params?.arguments as Record<string, unknown> | undefined) ?? {};
        if (!name) {
          return { jsonrpc: '2.0', id: request.id, error: { code: -32602, message: 'Missing tool name' } };
        }
        return { jsonrpc: '2.0', id: request.id, result: await callTool(name, args) };
      }
      default:
        return { jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Method not found' } };
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: request.id ?? null,
      error: { code: -32603, message: error instanceof Error ? error.message : 'Internal error' },
    };
  }
}

function startHttpServer() {
  const httpEnabled = process.env.MCP_HTTP_ENABLED !== 'false';
  if (!httpEnabled) {
    return;
  }

  const port = process.env.MCP_HTTP_PORT ? Number(process.env.MCP_HTTP_PORT) : 3001;
  const host = process.env.MCP_HTTP_HOST ?? '127.0.0.1';

  const server = createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing URL' }));
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      return;
    }

    if (req.method !== 'POST' || req.url !== '/mcp') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    let body = '';
    const maxSize = 1024 * 1024; // 1MB

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > maxSize) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
      }
    });

    req.on('end', async () => {
      try {
        const json = JSON.parse(body) as JsonRpcRequest;
        const response = await handleJsonRpc(json);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: error instanceof Error ? error.message : 'Parse error' },
          })
        );
      }
    });
  });

  server.listen(port, host, () => {
    console.error(`Private Desk MCP HTTP server listening on http://${host}:${port}`);
  });
}

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Private Desk MCP server started');
  startHttpServer();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
