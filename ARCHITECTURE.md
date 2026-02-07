# アーキテクチャ概要

Private Desk MCP Server は、Private Desk の SQLite データベースへアクセスするための **スタンドアロン MCP サーバー** です。stdio / HTTP トランスポートの両方を提供します。

## プロジェクト構造

```
private-desk-mcp-server/
├── src/
│   ├── index.ts                 # MCP サーバーのメインエントリーポイント
│   ├── types.ts                 # TypeScript 型定義
│   └── database/
│       ├── connection.ts        # データベース接続管理
│       └── queries.ts           # SQL クエリ関数
├── dist/                         # コンパイル済み JavaScript（自動生成）
├── .env.example                  # 環境変数テンプレート
├── package.json
├── tsconfig.json
├── README.md
├── SETUP_WINDOWS.md
├── SETUP_RASPBERRY_PI.md
├── INTEGRATION_LOCAL_LLM_CHAT.md
└── DEPLOYMENT.md
```

## 主要ファイル

### `src/index.ts`

- `McpServer` を初期化し、ツールを `registerTool` で登録
- stdio / HTTP を切り替えて起動
- HTTP モードでは `/health` と `/mcp` エンドポイントを提供
- HTTP モードでは削除ツールを無効化

### `src/types.ts`

データベーススキーマに対応する TypeScript 型定義：

- `Diary` / `Wiki` / `Blog` / `SearchResult`
- `Schedule` / `Expense` は将来拡張用に定義済み（現状は未使用）

### `src/database/connection.ts`

SQLite データベース接続管理：

- `getDatabase()` - DB インスタンス取得
- `runSelect<T>(sql, params)` - 複数レコード取得
- `runGet<T>(sql, params)` - 単一レコード取得
- `runInsert(sql, params)` - INSERT（ID 返却）
- `runExecute(sql, params)` - UPDATE/DELETE
- `runTransaction(fn)` - トランザクション実行
- `closeDatabase()` - 接続を閉じる

`better-sqlite3` は optional 依存で、未インストール時は DB 機能が無効化されます。

### `src/database/queries.ts`

Private Desk DB に対するクエリ実装：

**検索・取得**
- `searchPrivateDesk(query, limit)`
- `getDiary(id)` / `getWiki(id)` / `getBlog(id)`

**作成・更新・削除**
- `createDiary`, `updateDiary`, `deleteDiary`
- `createWiki`, `updateWiki`, `deleteWiki`
- `createBlog`, `updateBlog`, `deleteBlog`

**ユーティリティ**
- `buildLocalSummary(result)` - ローカル要約生成
- `buildSearchContext(result)` - 検索結果をコンテキスト化
- `clipText(text)` - テキスト切り詰め

## MCP ツール一覧

### 検索
- `search_private_desk`

### 読み込み
- `read_diary`
- `read_wiki`
- `read_blog`

### 作成
- `write_diary`
- `write_wiki`
- `write_blog`

### 更新
- `update_diary`
- `update_wiki`
- `update_blog`

### 削除
- `delete_diary`
- `delete_wiki`
- `delete_blog`

> HTTP モードでは削除系ツールを登録しません。

## データフロー

### 検索フロー（`search_private_desk`）

```
MCP Client
    ↓
MCP Server
    ↓ (searchPrivateDesk)
Private Desk DB
    ↓
buildLocalSummary / buildSearchContext
    ↓
JSON 文字列で返却
```

### 作成フロー（`write_diary` など）

```
MCP Client
    ↓
MCP Server
    ↓ (createDiary 等)
Private Desk DB
    ↓
作成 ID を返却
```

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `PRIVATE_DESK_DB_PATH` | Private Desk データベースパス | `../private-desk/data/database.sqlite` |
| `MCP_TRANSPORT_MODE` | `stdio` / `http` / `both` | `stdio` |
| `MCP_HTTP_HOST` | HTTP サーバーのホスト | `0.0.0.0` |
| `MCP_HTTP_PORT` | HTTP サーバーのポート | `3001` |

## 開発ワークフロー

```bash
npm install
npm run build
npm start
```

## テスト

```bash
# まだテストは用意されていません
npm test
```

## 今後の改善予定

- [ ] ユニットテスト / 統合テスト
- [ ] キャッシング層の導入
- [ ] メトリクス収集
