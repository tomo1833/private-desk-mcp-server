# Raspberry Pi セットアップガイド

Private Desk MCP Server を Raspberry Pi にセットアップするための詳細な手順です。

## システム要件

- Raspberry Pi 3 以上（推奨: Raspberry Pi 4 以上）
- Raspberry Pi OS（Bookworm または Bullseye）
- Node.js 18 以上
- npm 9 以上

## セットアップ手順

### 1. 前提条件の確認

まず、Node.js がインストール済みか確認します：

```bash
node --version
npm --version
```

Node.js がまだインストールされていない場合、以下のコマンドでインストールしてください：

```bash
# 最新の LTS 版をインストール（推奨）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# または Raspberry Pi 公式リポジトリから
sudo apt-get install nodejs npm
```

### 2. ビルドツールのセットアップ

better-sqlite3 をソースからビルドするために、ビルドツールが必要です：

```bash
sudo apt-get update
sudo apt-get install -y python3 make g++ build-essential
```

### 3. プロジェクトのクローン

```bash
cd /home/pi/projects  # または任意のディレクトリ
git clone <your-mcp-server-repo-url> private-desk-mcp-server
cd private-desk-mcp-server
```

### 4. Private Desk との共有設定

MCP サーバーと Private Desk のデータベースが同じマシン上にある場合、以下の手順で設定します。

#### 4.1 ローカルの場合（推奨）

Private Desk が同じ Raspberry Pi にインストールされている場合：

```bash
# Private Desk のパスを確認
ls -la /home/pi/projects/private-desk/data/

# .env ファイルを作成
cp .env.example .env

# .env を編集（使用しているエディタで）
nano .env
```

`.env` の内容：

```env
PRIVATE_DESK_DB_PATH=/home/pi/projects/private-desk/data/database.sqlite
```

#### 4.2 NFS マウントの場合（異なるマシンの場合）

Private Desk が別のマシン（例: NAS）にある場合、NFS でマウントします：

```bash
# NFS マウントポイントを作成
sudo mkdir -p /mnt/private-desk

# 別のマシンにある NFS サーバーをマウント
sudo mount -t nfs <nfs-server-ip>:/path/to/private-desk /mnt/private-desk

# 自動マウントの設定（/etc/fstab に追加）
sudo nano /etc/fstab

# 以下の行を追加：
# <nfs-server-ip>:/path/to/private-desk /mnt/private-desk nfs defaults,auto,noatime,nolock,bg,nfsvers=4.1 0 0

# マウント状態を確認
mount | grep private-desk
```

`.env` の内容（NFS の場合）：

```env
PRIVATE_DESK_DB_PATH=/mnt/private-desk/data/database.sqlite
```

#### 4.3 Samba 共有の場合

Windows または他の OS で共有されている場合：

```bash
# Samba クライアントをインストール
sudo apt-get install cifs-utils

# マウントポイントを作成
sudo mkdir -p /mnt/private-desk-smb

# 共有をマウント
sudo mount -t cifs //<share-server>/<share-path> /mnt/private-desk-smb -o username=<user>,password=<password>

# 自動マウントの設定
sudo nano /etc/fstab

# 以下の行を追加：
# //<share-server>/<share-path> /mnt/private-desk-smb cifs username=<user>,password=<password>,auto,noatime 0 0
```

### 5. 依存関係のインストール

```bash
# ビルド環境でインストール（best-sqlite3 をソースからコンパイル）
npm install --build-from-source
```

初回インストール時は 5-10 分程度かかる場合があります。

### 6. TypeScript のビルド

```bash
npm run build
```

`dist/` ディレクトリに JavaScript コンパイル済みファイルが生成されます。

### 7. MCP サーバーの起動テスト

```bash
npm start
```

以下のようなメッセージが出力されればサーバーが正常に起動しています：

```
Private Desk MCP server started
```

Ctrl+C で終了できます。

### 8. systemd サービスの設定（オプション）

MCP サーバーを自動起動するサービスとして設定できます。

```bash
# サービスファイルを作成
sudo nano /etc/systemd/system/private-desk-mcp.service
```

以下の内容を入力：

```ini
[Unit]
Description=Private Desk MCP Server
After=network.target
Wants=private-desk.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/projects/private-desk-mcp-server
ExecStart=/usr/bin/node /home/pi/projects/private-desk-mcp-server/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

Environment="PRIVATE_DESK_DB_PATH=/home/pi/projects/private-desk/data/database.sqlite"

[Install]
WantedBy=multi-user.target
```

サービスを有効化：

```bash
# サービスを有効化
sudo systemctl enable private-desk-mcp.service

# サービスを開始
sudo systemctl start private-desk-mcp.service

# ステータスを確認
sudo systemctl status private-desk-mcp.service

# ログを確認
sudo journalctl -u private-desk-mcp.service -f
```

### 9. local-llm-chat での設定

local-llm-chat（または Claude など）から MCP サーバーを呼び出すには、以下の設定を行います。

**Claude Desktop の場合（`claude_desktop_config.json`）：**

```json
{
  "mcpServers": {
    "private-desk": {
      "command": "node",
      "args": ["/home/pi/projects/private-desk-mcp-server/dist/index.js"],
      "env": {
        "PRIVATE_DESK_DB_PATH": "/home/pi/projects/private-desk/data/database.sqlite"
      }
    }
  }
}
```

**local-llm-chat の場合（`.env`）：**

```env
MCP_SERVER_PRIVATE_DESK=/home/pi/projects/private-desk-mcp-server/dist/index.js
```

## トラブルシューティング

### better-sqlite3 のビルドが失敗する

```bash
# キャッシュをクリアして再インストール
rm -rf node_modules package-lock.json
npm install --build-from-source
```

もしそれでも失敗する場合：

```bash
# ビルドツールのバージョンを確認
gcc --version
python3 --version

# 不足しているツールをインストール
sudo apt-get install -y build-essential python3-dev
```

### データベースに接続できない

```bash
# ファイルの権限を確認
ls -la /home/pi/projects/private-desk/data/database.sqlite

# 権限を修正（必要に応じて）
chmod 666 /home/pi/projects/private-desk/data/database.sqlite
```

### メモリ不足エラー

Raspberry Pi 3 などメモリが少ない場合、以下のコマンドで Node.js のメモリを制限します：

```bash
# systemd サービスの場合
# /etc/systemd/system/private-desk-mcp.service に追加：
# Environment="NODE_OPTIONS=--max-old-space-size=256"

# 直接実行の場合
NODE_OPTIONS=--max-old-space-size=256 npm start
```

### Ollama が利用できない

Ollama がインストールされていない場合、MCP サーバーは Ollama なしで動作します：

```bash
# MCP サーバーを起動（Ollama なし）
npm start

# search_private_desk ツール使用時に use_llm: false を指定すると、
# ローカルで要約が生成されます。
```

## パフォーマンス最適化

### 1. データベースのインデックス作成

初回実行時にデータベースのインデックスがない場合、以下で作成します：

```bash
# Private Desk の scripts/init-db.ts で自動作成されますが、
# 手動で実行する場合：
cd /home/pi/projects/private-desk
npx ts-node scripts/init-db.ts
```

### 2. メモリ使用量の最適化

large な検索結果を扱う場合、以下の環境変数を設定します：

```bash
# .env に追加
NODE_OPTIONS=--max-old-space-size=512
```

### 3. ストレージの確認

SQLite データベースファイルが大きくなる場合：

```bash
# ディスク使用量を確認
df -h /home/pi/projects/private-desk/data/

# データベースサイズを確認
du -sh /home/pi/projects/private-desk/data/database.sqlite
```

## アップデート手順

新しいバージョンが利用可能になった場合：

```bash
cd /home/pi/projects/private-desk-mcp-server

# 最新コードを取得
git pull origin main

# 依存関係を更新
npm install

# ビルド
npm run build

# サービスを再起動（systemd の場合）
sudo systemctl restart private-desk-mcp.service

# 直接実行の場合は Ctrl+C で停止して npm start で再起動
```

## ライセンス

MIT
