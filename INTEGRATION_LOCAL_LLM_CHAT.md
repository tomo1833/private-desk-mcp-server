# local-llm-chat / Claude Desktop 統合ガイド

Private Desk MCP Server を MCP クライアント（例: Claude Desktop / local-llm-chat）から利用するための設定手順です。

## 概要

```
MCP Client (Claude Desktop / local-llm-chat)
    ↓ MCP (stdio)
private-desk-mcp-server
    ↓ SQLite
Private Desk DB
```

## セットアップ

### 1. ビルド

```bash
# Private Desk MCP Server
cd /path/to/private-desk-mcp-server
npm run build
```

### 2. MCP 設定

#### Claude Desktop の場合

**macOS:**
```bash
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows (PowerShell):**
```powershell
notepad "$env:APPDATA\Claude\claude_desktop_config.json"
```

**Linux:**
```bash
nano ~/.config/Claude/claude_desktop_config.json
```

設定例：

```json
{
  "mcpServers": {
    "private-desk": {
      "command": "node",
      "args": ["/absolute/path/to/private-desk-mcp-server/dist/index.js"],
      "env": {
        "PRIVATE_DESK_DB_PATH": "/absolute/path/to/private-desk/data/database.sqlite"
      }
    }
  }
}
```

#### local-llm-chat の場合（`.env`）

```env
MCP_SERVERS=private-desk
MCP_PRIVATE_DESK_COMMAND=node
MCP_PRIVATE_DESK_ARGS=/absolute/path/to/private-desk-mcp-server/dist/index.js
MCP_PRIVATE_DESK_ENV_PRIVATE_DESK_DB_PATH=/absolute/path/to/private-desk/data/database.sqlite
```

### 3. アプリケーションを再起動

- Claude Desktop: 完全に閉じて再起動
- local-llm-chat: サーバーを再起動

## 使用例

### 例 1: 検索

```
ユーザー: 「最近の『プロジェクト』関連の内容を教えてください」

クライアント:
1. search_private_desk を呼び出す
   - query: "プロジェクト"
   - limit: 5

2. MCP サーバーが日報 / Wiki / ブログを検索
3. summary / context / sources を JSON 文字列で返却
```

### 例 2: 日報の作成

```
ユーザー: 「今日の日報を記録してください。内容は『会議で新しいプロジェクトの説明を受けた』」

クライアント:
1. write_diary を呼び出し
   - title: "2026年2月6日の日報"
   - content: "会議で新しいプロジェクトの説明を受けた"
```

### 例 3: Wiki ページの作成

```
ユーザー: 「Wiki に『開発環境の構築手順』を作成してください」

クライアント:
1. write_wiki を呼び出し
   - title: "開発環境の構築手順"
   - content: "..."
```

## ツール一覧

### 検索・取得

| ツール | 説明 | パラメータ |
|--------|------|-----------|
| `search_private_desk` | 統合検索 | `query` (必須), `limit` |
| `read_diary` | 日報取得 | `id` |
| `read_wiki` | Wiki 取得 | `id` |
| `read_blog` | ブログ取得 | `id` |

### 作成

| ツール | 説明 | パラメータ |
|--------|------|-----------|
| `write_diary` | 日報作成 | `title`, `content` |
| `write_wiki` | Wiki 作成 | `title`, `content` |
| `write_blog` | ブログ作成 | `title`, `content`, `content_markdown`, `content_html`, `eyecatch`, `permalink`, `site`, `author`, `persona` |

### 更新

| ツール | 説明 | パラメータ |
|--------|------|-----------|
| `update_diary` | 日報更新 | `id`, `title`, `content` |
| `update_wiki` | Wiki 更新 | `id`, `title`, `content` |
| `update_blog` | ブログ更新 | `id`, `title`, `content`, `content_markdown`, `content_html` |

### 削除

| ツール | 説明 | パラメータ |
|--------|------|-----------|
| `delete_diary` | 日報削除 | `id` |
| `delete_wiki` | Wiki 削除 | `id` |
| `delete_blog` | ブログ削除 | `id` |

> HTTP モードでは削除系ツールは無効です。

## トラブルシューティング

### MCP サーバーに接続できない

1. `dist/index.js` のパスが正しいか確認
2. MCP サーバーが単独で起動するか確認
   ```bash
   node /absolute/path/to/private-desk-mcp-server/dist/index.js
   ```
3. Claude Desktop のログを確認
   - Windows: `%APPDATA%\Claude\logs\`
   - macOS: `~/Library/Logs/Claude/`
   - Linux: `~/.config/Claude/logs/`

### データベースに接続できない

1. データベースのパスが正しいか確認
2. ファイルの読み書き権限を確認
3. 別のプロセスがデータベースをロックしていないか確認

## 参考資料

- Model Context Protocol (MCP) 仕様
- Private Desk リポジトリ
- local-llm-chat リポジトリ
