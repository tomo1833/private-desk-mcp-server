# Private Desk MCP Server

Private Desk の SQLite データベースにアクセスする **スタンドアロン MCP サーバー** です。日報 / Wiki / ブログの検索・読み取り・作成・更新・削除を提供します。

## 特徴

- **stdio トランスポート**: MCP クライアント（例: Claude Desktop）から呼び出し可能
- **HTTP トランスポート**: `/mcp` への JSON-RPC 2.0 リクエスト対応（`/health` あり）
- **統合検索**: 日報 / Wiki / ブログを横断検索
- **CRUD**: 日報 / Wiki / ブログの作成・更新・削除
- **Raspberry Pi 対応**: 低消費電力環境を想定

## 前提条件

- Node.js 18 以上
- Private Desk の SQLite データベースへアクセスできること

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成します：

```bash
cp .env.example .env
```

`.env` で必要な設定：

```env
# Private Desk のデータベースパス
PRIVATE_DESK_DB_PATH=/path/to/private-desk/data/database.sqlite
```

> 既定パスは `src/database/connection.ts` で解決されます。運用では `PRIVATE_DESK_DB_PATH` を明示指定してください。

### 3. ビルド

```bash
npm run build
```

### 4. 起動

#### Stdio モード（デフォルト）
```bash
npm start
```

#### HTTP モード
```bash
npm run start:http
# または
MCP_TRANSPORT_MODE=http npm start
```

`.env` に `MCP_TRANSPORT_MODE=http` を設定済みの場合は、`npm start` だけで起動できます。

#### 両方を有効にする
```bash
npm run start:both
# または
MCP_TRANSPORT_MODE=both npm start
```

`.env` に `MCP_TRANSPORT_MODE=both` を設定済みの場合は、`npm start` だけで起動できます。

## 使用方法

### HTTP サーバーとして使用する

HTTP モードで起動すると、`/mcp` で JSON-RPC 2.0 を受け付けます。`/health` は簡易ヘルスチェックです。

#### エンドポイント

- `GET /health` - ヘルスチェック
- `POST /mcp` - JSON-RPC 2.0
- `POST /sse` - StreamableHTTP 用（クライアント実装依存）

#### リクエスト例

```bash
# ヘルスチェック
curl http://localhost:3001/health

# ツール一覧を取得
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

# 検索を実行
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search_private_desk",
      "arguments": {
        "query": "日報",
        "limit": 5
      }
    }
  }'
```

### Claude Desktop / local-llm-chat から呼び出す

`claude_desktop_config.json` などに MCP サーバーを設定します：

```json
{
  "mcpServers": {
    "private-desk": {
      "command": "node",
      "args": ["/path/to/private-desk-mcp-server/dist/index.js"],
      "env": {
        "PRIVATE_DESK_DB_PATH": "/path/to/private-desk/data/database.sqlite"
      }
    }
  }
}
```

## ツール一覧

### `search_private_desk`

Private Desk 全体から統合検索を実行します。

パラメータ：
- `query` (必須): 検索キーワード
- `limit` (オプション): 各テーブルから取得する最大件数（デフォルト: 5）

レスポンスは JSON 文字列で、以下の情報を含みます：
- `summary`: ローカル要約（件数と上位タイトル）
- `context`: コンテキスト化された本文スニペット
- `sources`: 結果のメタデータ（id / title / created_at など）

### `read_diary`
日報エントリーを読み込みます（`id` 必須）。

### `write_diary`
新規日報エントリーを作成します（`title`, `content` 必須）。

### `update_diary`
既存の日報エントリーを更新します（`id`, `title`, `content` 必須）。

### `delete_diary`
日報エントリーを削除します（`id` 必須）。

### `read_wiki`
Wiki ページを読み込みます（`id` 必須）。

### `write_wiki`
新規 Wiki ページを作成します（`title`, `content` 必須）。

### `update_wiki`
既存の Wiki ページを更新します（`id`, `title`, `content` 必須）。

### `delete_wiki`
Wiki ページを削除します（`id` 必須）。

### `read_blog`
ブログ記事を読み込みます（`id` 必須）。

### `write_blog`
新規ブログ記事を作成します。必須パラメータ：
- `title`, `content`, `content_markdown`, `content_html`
- `eyecatch`, `permalink`, `site`, `author`, `persona`

### `update_blog`
既存のブログ記事を更新します。必須パラメータ：
- `id`, `title`, `content`, `content_markdown`, `content_html`

### `delete_blog`
ブログ記事を削除します（`id` 必須）。

> HTTP モードでは削除系ツールが無効化されます（stdio のみ有効）。

## プロジェクト構造

```
src/
├── index.ts              # MCP サーバーのエントリーポイント
├── types.ts              # TypeScript 型定義
└── database/
    ├── connection.ts     # データベース接続管理
    └── queries.ts        # SQL クエリ定義
```

## トラブルシューティング

### データベースに接続できない

- `PRIVATE_DESK_DB_PATH` が正しいか確認
- ファイルの読み書き権限を確認
- ネットワークパスの場合、マウント状態を確認

### better-sqlite3 がインストールされていない

`better-sqlite3` は optional 依存です。未インストール時は DB 機能が無効になります。

```bash
npm install better-sqlite3
```

### MCP サーバーが起動しない

- Node.js のバージョンが 18 以上か確認
- `npm install` を実行して依存関係を再インストール
- コンソールのエラーメッセージを確認

### Windows で better-sqlite3 のインストールに失敗する

```bash
# Visual Studio Build Tools をインストール
# https://visualstudio.microsoft.com/downloads/
# 「Desktop development with C++」ワークロードを選択
```

### HTTP サーバーの動作確認（PowerShell）

```powershell
# HTTP モードで起動
npm run start:http

# ヘルスチェック
Invoke-WebRequest -Uri http://localhost:3001/health

# JSON-RPC リクエストのテスト
$body = @{
  jsonrpc = "2.0"
  id = 1
  method = "tools/list"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:3001/mcp `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

## 環境変数リファレンス

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `PRIVATE_DESK_DB_PATH` | `../private-desk/data/database.sqlite` | データベースファイルのパス |
| `MCP_TRANSPORT_MODE` | `stdio` | トランスポートモード: `stdio` / `http` / `both` |
| `MCP_HTTP_HOST` | `0.0.0.0` | HTTP サーバーのホスト |
| `MCP_HTTP_PORT` | `3001` | HTTP サーバーのポート |

## ライセンス

MIT

## 関連プロジェクト

- Private Desk - 個人向けデスクトップアプリ
- local-llm-chat - MCP クライアント
