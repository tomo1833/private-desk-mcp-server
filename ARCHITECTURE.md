# プロジェクト構造ガイド

```
private-desk-mcp-server/
├── src/                          # ソースコード（TypeScript）
│   ├── index.ts                 # MCP サーバーのメインエントリーポイント
│   ├── types.ts                 # 型定義
│   ├── database/
│   │   ├── connection.ts       # データベース接続管理
│   │   └── queries.ts          # SQL クエリ関数
│   └── utils/
│
├── dist/                         # コンパイル済み JavaScript（自動生成）
│   ├── index.js
│   ├── types.js
│   ├── database/
│   │   ├── connection.js
│   │   └── queries.js
│   └── utils/
│
├── docs/                         # ドキュメント
│   ├── API.md                   # API 仕様書
│   └── ARCHITECTURE.md          # アーキテクチャ設計
│
├── .env.example                  # 環境変数テンプレート
├── .gitignore                    # Git 無視ファイル
├── package.json                  # 依存関係定義
├── package-lock.json             # 依存関係ロック
├── tsconfig.json                 # TypeScript 設定
│
├── README.md                     # プロジェクト概要
├── SETUP_WINDOWS.md              # Windows セットアップ
├── SETUP_RASPBERRY_PI.md         # Raspberry Pi セットアップ
├── INTEGRATION_LOCAL_LLM_CHAT.md # local-llm-chat 統合ガイド
└── DEPLOYMENT.md                 # デプロイメント手順
```

## 主要ファイルの説明

### src/index.ts
MCP サーバーのメインファイル。以下の機能を実装：
- MCP プロトコルの初期化
- リソース定義（Resources）
- ツール定義と実装（Tools）
- stdio トランスポートでの通信

**主要な関数:**
- `server.setRequestHandler(ListResourcesRequestSchema)` - リソース一覧
- `server.setRequestHandler(ReadResourceRequestSchema)` - リソース読み込み
- `server.setRequestHandler(ListToolsRequestSchema)` - ツール一覧
- `server.setRequestHandler(CallToolRequestSchema)` - ツール実行

### src/types.ts
データベーススキーマに対応する TypeScript インターフェース：
- `Password` - パスワード管理テーブル
- `Diary` - 日報テーブル
- `Wiki` - Wiki テーブル
- `Blog` - ブログテーブル
- `Schedule` - スケジュールテーブル
- `Expense` - 家計簿テーブル
- `SearchResult` - 統合検索結果

### src/database/connection.ts
SQLite データベース接続の管理：

**公開関数:**
- `getDatabase()` - DB インスタンス取得
- `runSelect<T>(sql, params)` - 複数レコード取得
- `runGet<T>(sql, params)` - 単一レコード取得
- `runInsert(sql, params)` - INSERT（ID 返却）
- `runExecute(sql, params)` - UPDATE/DELETE
- `runTransaction(fn)` - トランザクション実行
- `closeDatabase()` - 接続を閉じる

### src/database/queries.ts
Private Desk データベースへのクエリ実装：

**検索・取得関数:**
- `searchPrivateDesk(query, limit)` - 統合検索
- `getDiary(id)`, `getAllDiaries()` - 日報取得
- `getWiki(id)`, `getAllWikis()` - Wiki ページ取得
- `getBlog(id)`, `getAllBlogs()` - ブログ取得
- `searchPasswords(query)` - パスワード検索

**作成・更新・削除関数:**
- `createDiary(title, content)` - 日報作成
- `updateDiary(id, title, content)` - 日報更新
- `deleteDiary(id)` - 日報削除
- 同様に Wiki、ブログ用の関数

**ユーティリティ関数:**
- `buildLocalSummary(result)` - ローカル要約生成
- `buildSearchContext(result)` - 検索コンテキスト構築
- `clipText(text)` - テキスト切り詰め

## MCP プロトコル実装

### リソース（Resources）

リソースは読み取り専用のデータを表します：

| URI | 説明 | 例 |
|-----|------|-----|
| `private-desk://search?q=...` | 統合検索結果 | `private-desk://search?q=meeting` |
| `private-desk://diaries` | すべての日報 | |
| `private-desk://wikis` | すべての Wiki | |
| `private-desk://blogs` | すべてのブログ | |
| `private-desk://passwords` | パスワード情報（メタデータのみ） | |

### ツール（Tools）

ツールは実行可能なアクションを表します：

#### 検索ツール
- `search_private_desk` - 統合検索

#### 読み込みツール
- `read_diary` - 日報読み込み
- `read_wiki` - Wiki 読み込み
- `read_blog` - ブログ読み込み

#### 書き込みツール
- `write_diary` - 日報作成
- `write_wiki` - Wiki 作成
- `write_blog` - ブログ作成

#### 更新ツール
- `update_diary` - 日報更新
- `update_wiki` - Wiki 更新
- `update_blog` - ブログ更新

#### 削除ツール
- `delete_diary` - 日報削除
- `delete_wiki` - Wiki 削除
- `delete_blog` - ブログ削除

#### その他
- `search_passwords` - パスワード検索

## データフロー

### 検索フロー

```
local-llm-chat
    ↓
  (MCP)
    ↓
MCP Server (search_private_desk ツール)
    ↓
  1. Private Desk DB から検索
    ↓
  2. 検索結果をコンテキスト化
    ↓
  3. 検索結果をローカル要約で処理
    ↓
  4. 結果を JSON で返却
    ↓
local-llm-chat に表示
```

### データ作成フロー

```
local-llm-chat
    ↓
  (MCP)
    ↓
MCP Server (write_diary など)
    ↓
  1. パラメータを検証
    ↓
  2. Private Desk DB に INSERT
    ↓
  3. 作成結果（ID）を返却
    ↓
local-llm-chat に通知
```

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `PRIVATE_DESK_DB_PATH` | Private Desk データベースパス | `../private-desk/data/database.sqlite` |
| `LOG_LEVEL` | ログレベル | `info` |
| `NODE_OPTIONS` | Node.js オプション | （デフォルトなし） |

## 開発ワークフロー

### 1. ローカル開発

```bash
# 開発環境セットアップ
npm install

# コードを編集
# src/ にファイルを作成・編集

# TypeScript をコンパイル
npm run build

# MCP サーバーを起動
npm start

# 別のターミナルで local-llm-chat やテストクライアントから接続
```

### 2. テスト

```bash
# 単体テストを実行（準備中）
npm test

# 手動でツールをテスト
# stdio 経由で JSON-RPC 2.0 メッセージを送信
```

### 3. Raspberry Pi へのデプロイ

```bash
# ビルド
npm run build

# ファイルを転送
scp -r dist/ pi@raspberrypi.local:/path/to/mcp-server/

# Raspberry Pi 上で実行
npm install --production
npm start
```

## デバッグ方法

### コンソールログ

```typescript
// src/index.ts 内
console.error('デバッグメッセージ'); // stderr に出力
console.log('情報メッセージ');       // stdout に出力
```

### MCP サーバーの直接実行

```bash
node dist/index.js
```

stdio 経由で JSON-RPC メッセージを送信可能。

### journalctl でのログ確認（Raspberry Pi）

```bash
sudo journalctl -u private-desk-mcp.service -f
```

## パフォーマンス最適化のポイント

1. **データベースインデックス**: Private Desk の `init-db.ts` で自動作成
2. **キャッシング**: 頻繁に使用されるクエリ結果のメモ化（将来実装）
3. **メモリ管理**: 大量データ検索時の `limit` パラメータ
4. **接続プーリング**: better-sqlite3 は同期アクセスのため不要

## 今後の改善予定

- [ ] ユニットテスト の実装
- [ ] 統合テスト の追加
- [ ] キャッシング層 の導入
- [ ] gRPC トランスポート のサポート
- [ ] データベース マイグレーション ツール
- [ ] メトリクス収集 (Prometheus)
- [ ] GraphQL API サポート
