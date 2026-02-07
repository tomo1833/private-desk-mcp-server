# プロジェクトサマリー

Private Desk MCP Server は、Private Desk の SQLite データベースに対して **日報 / Wiki / ブログ** の検索・読み取り・作成・更新・削除を提供する MCP サーバーです。

## 実装済み機能

- 統合検索（`search_private_desk`）
- 日報 / Wiki / ブログの CRUD
- stdio / HTTP トランスポート
- HTTP モードでは削除系ツールを無効化

## プロジェクト構造

```
private-desk-mcp-server/
├── src/
│   ├── index.ts
│   ├── types.ts
│   └── database/
│       ├── connection.ts
│       └── queries.ts
├── dist/
├── .env.example
├── README.md
├── SETUP_WINDOWS.md
├── SETUP_RASPBERRY_PI.md
├── INTEGRATION_LOCAL_LLM_CHAT.md
├── DEPLOYMENT.md
└── ARCHITECTURE.md
```

## MCP ツール一覧

### 検索・取得
- `search_private_desk`
- `read_diary`, `read_wiki`, `read_blog`

### 作成
- `write_diary`, `write_wiki`, `write_blog`

### 更新
- `update_diary`, `update_wiki`, `update_blog`

### 削除
- `delete_diary`, `delete_wiki`, `delete_blog`

## 技術スタック

| 技術 | 用途 |
|-----|------|
| TypeScript | 言語 |
| Node.js | ランタイム |
| @modelcontextprotocol/sdk | MCP 実装 |
| better-sqlite3 | SQLite ドライバ（optional） |

## 動作概要

```
MCP Client
    ↓ (stdio / HTTP)
Private Desk MCP Server
    ↓
SQLite (Private Desk DB)
```

## 備考

- `Schedule` / `Expense` の型定義は将来拡張用です（現状未使用）
- DB パスは `PRIVATE_DESK_DB_PATH` で明示指定を推奨

---

**最終更新**: 2026年2月6日
