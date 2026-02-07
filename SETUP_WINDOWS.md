# Windows でのセットアップガイド

開発環境で Private Desk MCP Server を Windows にセットアップするためのガイドです。

## 前提条件

- Node.js 18 以上
- Git
- Visual Studio Build Tools（better-sqlite3 ビルド用）

## セットアップ手順

### 1. Node.js と npm のインストール

1. Node.js LTS 版をインストール
2. PowerShell で確認：

```powershell
node --version
npm --version
```

### 2. Visual Studio Build Tools のインストール

better-sqlite3 をビルドするために必要です。

1. Visual Studio Community をインストール
2. 「Desktop development with C++」ワークロードを選択

### 3. プロジェクトのセットアップ

```powershell
cd d:\001_work_dir\004_project\private-desk-mcp-server
npm install --build-from-source
```

### 4. 環境変数の設定

`.env.example` をコピーして `.env` を作成：

```powershell
Copy-Item .env.example -Destination .env
```

例：

```env
PRIVATE_DESK_DB_PATH=D:\001_work_dir\004_project\private-desk\data\database.sqlite
```

### 5. ビルドと起動

```powershell
npm run build
npm start
```

## IDE セットアップ

### VS Code

推奨拡張機能：
- ESLint
- Prettier

設定例（`.vscode/settings.json`）：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "eslint.enable": true,
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## トラブルシューティング

### better-sqlite3 のビルドが失敗する

```powershell
rm -r node_modules package-lock.json
npm cache clean --force
npm install --build-from-source
```

エラーが続く場合：

1. Visual Studio Build Tools がインストール済みか確認
2. `cl.exe` が実行可能か確認

```powershell
where cl.exe
```

### better-sqlite3 を使わずに起動したい

`better-sqlite3` は optional 依存です。未インストールの場合、DB 機能は無効になります。

```powershell
npm start
```

### npm が見つからない

```powershell
npm install -g npm@latest
```

## Windows 特有の注意点

### パス区切り文字

設定ファイルでは `/` を使用することを推奨します：

```env
PRIVATE_DESK_DB_PATH=D:/001_work_dir/004_project/private-desk/data/database.sqlite
```

### バックアップ

```powershell
$source = "D:\001_work_dir\004_project\private-desk\data\database.sqlite"
$dest = "D:\backups\database_$(Get-Date -Format 'yyyyMMdd_HHmmss').sqlite"
Copy-Item $source -Destination $dest
```

## 参考資料

- Node.js 公式ドキュメント
- TypeScript ハンドブック
- better-sqlite3 インストールガイド
