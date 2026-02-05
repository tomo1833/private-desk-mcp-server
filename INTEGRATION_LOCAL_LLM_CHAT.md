# local-llm-chat との統合ガイド

Private Desk MCP サーバーを local-llm-chat に統合するための設定手順です。

## 概要

local-llm-chat から MCP サーバーを呼び出すことで、チャット内から直接 Private Desk のデータにアクセスできます。

```
local-llm-chat (クライアント)
    ↓ MCP プロトコル (stdio)
private-desk-mcp-server (MCP サーバー)
    ↓ SQLite
Private Desk データベース
```

## セットアップ

### 1. 両方のプロジェクトが準備できていることを確認

```bash
# Private Desk MCP Server
cd /home/pi/projects/private-desk-mcp-server
npm run build

# local-llm-chat
cd /home/pi/projects/local-llm-chat
npm run build
```

### 2. local-llm-chat の設定ファイルを作成

#### 方法 A: Claude Desktop を使用する場合

Claude Desktop の設定ファイルを編集します：

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

以下の内容を設定：

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

**重要: `command` と `args` は絶対パスを使用してください**

#### 方法 B: local-llm-chat を直接使用する場合

local-llm-chat の `.env` ファイルに追加：

```env
# MCP サーバー設定
MCP_SERVERS=private-desk

# Private Desk MCP サーバーの設定
MCP_PRIVATE_DESK_COMMAND=node
MCP_PRIVATE_DESK_ARGS=/home/pi/projects/private-desk-mcp-server/dist/index.js
MCP_PRIVATE_DESK_ENV_PRIVATE_DESK_DB_PATH=/home/pi/projects/private-desk/data/database.sqlite
```

### 3. アプリケーションを再起動

設定ファイルの変更後、アプリケーションを再起動してください：

- **Claude Desktop:** 完全に閉じて再度開く
- **local-llm-chat:** サーバーを再起動

## 使用例

### 例 1: Private Desk の中身を検索して要約を生成

```
ユーザー: 「私の最近の日報の中で『プロジェクト』について言及されている内容を教えてください」

Claude:
1. search_private_desk ツールを呼び出し
   - query: "プロジェクト"
   - use_llm: true

2. MCP サーバーが Private Desk を検索
   - diary テーブルから該当エントリを取得
   - 他のテーブル (wiki, blog, passwords) からも検索

3. 検索結果をローカル要約で処理
   - ローカル要約が検索結果をまとめて返す

4. 結果をユーザーに返す
```

### 例 2: 新しい日報を作成

```
ユーザー: 「今日の日報を記録してください。内容は『会議で新しいプロジェクトの説明を受けた。Q2 のロードマップについて検討する予定』」

Claude:
1. write_diary ツールを呼び出し
   - title: "2026年2月5日の日報"
   - content: "会議で新しいプロジェクトの説明を受けた。Q2 のロードマップについて検討する予定"

2. MCP サーバーが diary テーブルに新規レコードを作成

3. 作成完了を通知
```

### 例 3: Wiki ページの作成

```
ユーザー: 「Wiki に『開発環境の構築手順』というページを作成してください。内容は...」

Claude:
1. write_wiki ツールを呼び出し
   - title: "開発環境の構築手順"
   - content: "..."

2. MCP サーバーが wiki テーブルにレコードを作成
```

## ツール一覧（local-llm-chat で呼び出し可能）

### 検索・取得

| ツール | 説明 | パラメータ |
|--------|------|-----------|
| `search_private_desk` | 統合検索を実行 | `query` (必須), `limit`, `use_llm` |
| `read_diary` | 日報を取得 | `id` |
| `read_wiki` | Wiki ページを取得 | `id` |
| `read_blog` | ブログ記事を取得 | `id` |
| `search_passwords` | パスワード情報を検索 | `query` |

### 作成

| ツール | 説明 | パラメータ |
|--------|------|-----------|
| `write_diary` | 日報を作成 | `title`, `content` |
| `write_wiki` | Wiki ページを作成 | `title`, `content` |
| `write_blog` | ブログ記事を作成 | 9 つのパラメータ（README 参照） |

### 更新

| ツール | 説明 | パラメータ |
|--------|------|-----------|
| `update_diary` | 日報を更新 | `id`, `title`, `content` |
| `update_wiki` | Wiki ページを更新 | `id`, `title`, `content` |
| `update_blog` | ブログ記事を更新 | `id`, `title`, `content`, `content_markdown`, `content_html` |

### 削除

| ツール | 説明 | パラメータ |
|--------|------|-----------|
| `delete_diary` | 日報を削除 | `id` |
| `delete_wiki` | Wiki ページを削除 | `id` |
| `delete_blog` | ブログ記事を削除 | `id` |

## トラブルシューティング

### MCP サーバーに接続できない

**症状:** Claude で「MCP server not available」というエラーが表示される

**解決方法:**

1. 設定ファイルのパスが正しいか確認
   ```bash
   ls -la /absolute/path/to/private-desk-mcp-server/dist/index.js
   ```

2. MCP サーバーが単独で起動するか確認
   ```bash
   node /absolute/path/to/private-desk-mcp-server/dist/index.js
   ```

3. Claude Desktop のログを確認
   - Windows: `%APPDATA%\Claude\logs\`
   - macOS: `~/Library/Logs/Claude/`
   - Linux: `~/.config/Claude/logs/`

### データベースに接続できない

**症状:** 「Error reading resource: ...」というエラー

**解決方法:**

1. データベースのパスが正しいか確認
   ```bash
   ls -la /absolute/path/to/private-desk/data/database.sqlite
   ```

2. ファイルの読み書き権限を確認
   ```bash
   # 権限を修正（必要に応じて）
   chmod 644 /path/to/private-desk/data/database.sqlite
   ```

3. 別のプロセスがデータベースをロックしていないか確認
   ```bash
   # lsof がある場合
   lsof | grep database.sqlite
   ```

## ネットワーク設定（複数マシン環境）

MCP サーバーと local-llm-chat が異なるマシンで動作する場合：

### 方法 1: SSH トンネル経由

```bash
# ローカルマシンで、リモートマシンへのトンネルを開く
ssh -L 5000:localhost:5000 pi@raspberrypi.local
```

### 方法 2: HTTP API ラッパー

MCP サーバーを HTTP API としてラップすることで、ネットワーク経由で呼び出し可能にできます（別途実装が必要）。

## リソース（Resources）

MCP サーバーは以下のリソースも提供しています：

| URI | 説明 |
|-----|------|
| `private-desk://search?q=<query>` | 指定した検索語で統合検索 |
| `private-desk://diaries` | すべての日報 |
| `private-desk://wikis` | すべての Wiki ページ |
| `private-desk://blogs` | すべてのブログ記事 |
| `private-desk://passwords` | すべてのパスワード情報（メタデータのみ） |

## パフォーマンス考慮事項

### 大量データの検索

Private Desk のデータベースが大きい場合、検索に時間がかかる可能性があります：

1. `limit` パラメータで結果の件数を制限
   ```
   search_private_desk(query="test", limit=3)
   ```

2. より具体的なクエリを使用

### メモリ使用量

local-llm-chat が複数の処理を実行する場合、メモリが不足する可能性があります：

```bash
# local-llm-chat 用に最大メモリを制限（Raspberry Pi の場合）
NODE_OPTIONS=--max-old-space-size=512 npm start
```

## セキュリティに関する注意

### パスワード情報の保護

`search_passwords` ツールは実際のパスワードを返しません。これはセキュリティのための制限です。

パスワード情報へのアクセスが必要な場合、別途セキュアな実装を検討してください。

### データベースのアクセス制御

```bash
# データベースファイルのパーミッションを設定
chmod 640 /path/to/private-desk/data/database.sqlite
chown pi:pi /path/to/private-desk/data/database.sqlite
```

## 参考資料

- [Model Context Protocol (MCP) 仕様](https://spec.modelcontextprotocol.io/)
- [Claude Desktop MCP 統合ガイド](https://github.com/anthropics/anthropic-sdk-python)
- [Private Desk リポジトリ](https://github.com/tomo1833/private-desk)
- [local-llm-chat リポジトリ](https://github.com/tomo1833/local-llm-chat)
