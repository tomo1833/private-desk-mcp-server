# Private Desk MCP Server

独立した MCP サーバー。Private Desk のデータベースにアクセスし、検索、日報、Wiki、ブログ、パスワード管理のデータを取得・書き込みできます。

## 特徴

- **スタンドアロン MCP サーバー**: stdio トランスポートで local-llm-chat などから呼び出し可能
- **検索機能**: パスワード、日報、Wiki、ブログを統合検索
- **要約生成**: Ollama（ローカルLLM）を使用した自動要約
- **データ書き込み**: 日報、Wiki、ブログのデータ作成・更新
- **Raspberry Pi 対応**: 低消費電力環境での動作を想定

## 前提条件

- Node.js 18 以上
- Private Desk が Raspberry Pi 上で稼働中

## セットアップ

### 1. プロジェクトの複製/作成

```bash
cd /path/to/your/projects
# このプロジェクトが既にある場合
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成します：

```bash
cp .env.example .env
```

`.env` で必要な設定：

```env
# Private Desk のデータベースパス（共有フォルダまたはネットワークパス）
PRIVATE_DESK_DB_PATH=/path/to/private-desk/data/database.sqlite
# または、NFS/Samba 経由で共有されている場合
# PRIVATE_DESK_DB_PATH=/mnt/private-desk/data/database.sqlite
```

### 3. ビルド

```bash
npm run build
```

### 4. 起動

#### Stdioモード（デフォルト、MCPクライアント用）
```bash
npm start
```

#### HTTPモード
```bash
npm run start:http
# または
MCP_TRANSPORT_MODE=http npm start
```

#### 両方を有効にする
```bash
npm run start:both
# または
MCP_TRANSPORT_MODE=both npm start
```

## 使用方法

### HTTPサーバーとして使用する

HTTPモードで起動すると、REST API経由でMCPサーバーにアクセスできます。

#### エンドポイント

- `GET /health` - ヘルスチェック
- `POST /mcp` - JSON-RPCリクエスト

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

### local-llm-chat から呼び出す

`local-llm-chat` の `claude.json` で MCP サーバーを設定します：

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

### 利用可能なリソース

#### 検索

```
私は"パスワード"について検索したい -> search_private_desk というツールを呼び出す
```

#### 日報の作成/更新

日報データの作成や更新が可能です。

#### Wiki の作成/更新

Wiki ページの作成や更新が可能です。

#### ブログの作成/更新

ブログ記事の作成や更新が可能です。

## プロジェクト構造

```
src/
├── index.ts              # MCP サーバーのエントリーポイント
├── database/
│   ├── connection.ts     # データベース接続管理
│   └── queries.ts        # SQLクエリ定義
├── tools/
│   ├── search.ts         # 検索ツール
│   ├── diary.ts          # 日報ツール
│   ├── wiki.ts           # Wiki ツール
│   ├── blog.ts           # ブログツール
│   └── password.ts       # パスワードツール
├── resources/
│   └── index.ts          # リソース定義
└── utils/
    └── ollama.ts         # Ollama API ラッパー
```

## ツール一覧

### `search_private_desk`

Private Desk 全体から統合検索を実行します。

パラメータ：
- `query` (必須): 検索キーワード
- `limit` (オプション): 各テーブルから取得する最大件数（デフォルト: 5）
- `use_llm` (オプション): Ollama で要約を生成するか（デフォルト: true）

### `read_diary`

日報エントリーを読み込みます。

### `write_diary`

新規日報エントリーを作成します。

### `update_diary`

既存の日報エントリーを更新します。

### `read_wiki`

Wiki ページを読み込みます。

### `write_wiki`

新規 Wiki ページを作成します。

### `update_wiki`

既存の Wiki ページを更新します。

### `read_blog`

ブログ記事を読み込みます。

### `write_blog`

新規ブログ記事を作成します。

### `update_blog`

既存のブログ記事を更新します。

### `search_passwords`

パスワード情報から検索します。

## トラブルシューティング

### データベースに接続できない

- `PRIVATE_DESK_DB_PATH` が正しい path に指定されているか確認
- ファイルの読み書き権限があるか確認
- ネットワークパスの場合、マウント状態を確認

### Ollama に接続できない

- Ollama が起動しているか確認: `ollama serve`
- ホストとポートが正しいか確認（デフォルト: http://localhost:11434）
- `.env` の設定を確認

### MCP サーバーが起動しない

- Node.js のバージョンが 18 以上か確認
- `npm install` を実行して依存関係を再インストール
- コンソールのエラーメッセージを確認

### Windows環境でbetter-sqlite3のインストールに失敗する

better-sqlite3はネイティブモジュールで、Windowsではビルドツールが必要です。

#### 解決方法1: プリビルドバイナリを使用
```bash
npm install --ignore-scripts
```

#### 解決方法2: ビルドツールをインストール
```bash
# Visual Studio Build Toolsをインストール
# https://visualstudio.microsoft.com/downloads/
# 「Desktop development with C++」ワークロードを選択
```

#### 解決方法3: データベース機能なしでHTTPサーバーのみ使用
```bash
# better-sqlite3がインストールされていなくても、HTTPサーバーは起動します
# ただし、データベース機能を呼び出すとエラーになります
MCP_TRANSPORT_MODE=http npm start
```

### HTTPサーバーの動作確認

```bash
# HTTPモードで起動
npm run start:http

# 別のターミナルでヘルスチェック（PowerShell）
Invoke-WebRequest -Uri http://localhost:3001/health

# または curl (Git Bash / WSL)
curl http://localhost:3001/health

# JSON-RPCリクエストのテスト（PowerShell）
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
| `MCP_HTTP_HOST` | `0.0.0.0` | HTTPサーバーのホスト |
| `MCP_HTTP_PORT` | `3001` | HTTPサーバーのポート |

## ライセンス

MIT

## 関連プロジェクト

- [Private Desk](https://github.com/tomo1833/private-desk) - 個人向けデスクトップアプリ
- [local-llm-chat](https://github.com/tomo1833/local-llm-chat) - Ollama ベースのチャットアプリ
