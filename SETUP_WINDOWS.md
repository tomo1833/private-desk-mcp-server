# Windows でのセットアップガイド

開発環境で Private Desk MCP Server を Windows にセットアップするためのガイドです。

## 前提条件

- Node.js 18 以上（[nodejs.org](https://nodejs.org/) からダウンロード）
- Git（[git-scm.com](https://git-scm.com/) からダウンロード）
- Visual Studio Build Tools（better-sqlite3 ビルド用）

## セットアップ手順

### 1. Node.js と npm のインストール

1. [nodejs.org](https://nodejs.org/) から LTS 版をダウンロード
2. インストーラーを実行し、デフォルト設定でインストール
3. PowerShell またはコマンドプロンプトで確認：

```powershell
node --version
npm --version
```

### 2. Visual Studio Build Tools のインストール

better-sqlite3 をビルドするために必要です。

#### オプション A: Visual Studio Community（推奨）

1. [Visual Studio Community](https://visualstudio.microsoft.com/vs/community/) をダウンロード
2. インストール時に「Desktop development with C++」ワークロードを選択

#### オプション B: Windows Build Tools のみ

Node.js から直接 build tools をインストール：

```powershell
npm install --global --production windows-build-tools
```

### 3. プロジェクトのセットアップ

```powershell
# プロジェクトディレクトリに移動
cd d:\001_work_dir\004_project\private-desk-mcp-server

# 依存関係をインストール
npm install --build-from-source
```

初回インストールは 10-20 分かかる可能性があります。

### 4. 環境変数の設定

`.env.example` をコピーして `.env` を作成：

```powershell
Copy-Item .env.example -Destination .env
```

`notepad .env` で開いて編集：

```env
# Windows ローカル開発
PRIVATE_DESK_DB_PATH=D:\001_work_dir\004_project\private-desk\data\database.sqlite
OLLAMA_HOST=localhost
OLLAMA_PORT=11434
OLLAMA_MODEL=Gemma3:12b
```

### 5. ビルドとテスト

```powershell
# TypeScript をコンパイル
npm run build

# MCP サーバーを起動してテスト
npm start
```

## IDE セットアップ

### VS Code

1. **拡張機能のインストール:**
   - Pylance（Python 言語サーバー）
   - ESLint
   - Prettier

2. **VS Code 設定（`.vscode/settings.json`）:**

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

### その他のエディタ

- **WebStorm/IntelliJ IDEA:** Node.js と TypeScript のサポートが組み込まれています
- **Sublime Text:** TypeScript と ESLint の拡張機能をインストール

## トラブルシューティング

### better-sqlite3 のビルドが失敗する

```powershell
# キャッシュをクリア
rm -r node_modules package-lock.json
npm cache clean --force

# 再インストール
npm install --build-from-source
```

エラーが続く場合：

1. Visual Studio Build Tools がインストール済みか確認
2. コマンドラインから `cl.exe` が実行可能か確認

```powershell
where cl.exe
```

見つからない場合、Visual Studio のインストールを再確認してください。

### npm が見つからない

```powershell
# npm を再インストール
npm install -g npm@latest
```

### ポート 11434 が既に使用されている

```powershell
# ポート 11434 を使用しているプロセスを確認
netstat -ano | findstr :11434

# 別のポートを指定
# .env を編集して OLLAMA_PORT を変更
```

## Windows-Specific Tips

### パス区切り文字

Windows では `\` または `/` のどちらも使用できます。設定ファイルでは `/` を使用することを推奨します：

```env
# 推奨
PRIVATE_DESK_DB_PATH=D:/001_work_dir/004_project/private-desk/data/database.sqlite

# または Windows パス
PRIVATE_DESK_DB_PATH=D:\001_work_dir\004_project\private-desk\data\database.sqlite
```

### バックアップ

定期的にデータベースをバックアップしてください：

```powershell
# PowerShell スクリプト（backup.ps1）
$source = "D:\001_work_dir\004_project\private-desk\data\database.sqlite"
$dest = "D:\backups\database_$(Get-Date -Format 'yyyyMMdd_HHmmss').sqlite"
Copy-Item $source -Destination $dest
```

## WSL（Windows Subsystem for Linux）での実行

WSL を使用する場合：

```powershell
# WSL 2 をインストール
wsl --install

# Ubuntu を起動
wsl

# 以下は Ubuntu 内のコマンド
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git build-essential
```

## パフォーマンス最適化

### メモリ設定

```powershell
# 最大メモリを制限（4GB）
$env:NODE_OPTIONS = "--max-old-space-size=4096"
npm start
```

### ディスク使用量の最適化

```powershell
# ディスク使用量を確認
Get-ChildItem -Path D:\001_work_dir\004_project -Recurse -Force | Measure-Object -Property Length -Sum | Select-Object @{Name="Size";Expression={$_.Sum/1GB}}

# node_modules をクリーンアップ
npm prune
```

## デプロイメント

Raspberry Pi へのデプロイ：

```powershell
# ビルド
npm run build

# SSH 経由でファイルを転送
scp -r dist d:/backups/dist pi@raspberrypi.local:/home/pi/projects/private-desk-mcp-server/

# または WinSCP を使用してグラフィカルにアップロード
```

## 参考資料

- [Node.js 公式ドキュメント](https://nodejs.org/docs/)
- [TypeScript ハンドブック](https://www.typescriptlang.org/docs/)
- [better-sqlite3 インストールガイド](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/installation.md)
- [WSL 公式ドキュメント](https://docs.microsoft.com/en-us/windows/wsl/)
