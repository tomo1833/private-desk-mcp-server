# Raspberry Pi セットアップガイド

Private Desk MCP Server を Raspberry Pi にセットアップするための手順です。

## システム要件

- Raspberry Pi 3 以上（推奨: Raspberry Pi 4 以上）
- Raspberry Pi OS（Bookworm / Bullseye）
- Node.js 18 以上
- npm 9 以上

## セットアップ手順

### 1. Node.js の確認

```bash
node --version
npm --version
```

未インストールの場合：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. ビルドツールのセットアップ

```bash
sudo apt-get update
sudo apt-get install -y python3 make g++ build-essential
```

### 3. プロジェクトのクローン

```bash
cd /home/pi/projects
git clone <your-mcp-server-repo-url> private-desk-mcp-server
cd private-desk-mcp-server
```

### 4. Private Desk DB への接続設定

#### 4.1 ローカル（同一マシン）

```bash
cp .env.example .env
nano .env
```

`.env`：

```env
PRIVATE_DESK_DB_PATH=/home/pi/projects/private-desk/data/database.sqlite
```

#### 4.2 NFS マウント

```bash
sudo mkdir -p /mnt/private-desk
sudo mount -t nfs <nfs-server-ip>:/path/to/private-desk /mnt/private-desk
```

`.env`：

```env
PRIVATE_DESK_DB_PATH=/mnt/private-desk/data/database.sqlite
```

#### 4.3 Samba 共有

```bash
sudo apt-get install -y cifs-utils
sudo mkdir -p /mnt/private-desk-smb
sudo mount -t cifs //<share-server>/<share-path> /mnt/private-desk-smb -o username=<user>,password=<password>
```

`.env`：

```env
PRIVATE_DESK_DB_PATH=/mnt/private-desk-smb/data/database.sqlite
```

### 5. 依存関係のインストール

```bash
npm install --build-from-source
```

### 6. ビルド

```bash
npm run build
```

### 7. 起動テスト

```bash
npm start
```

### 8. systemd サービスの設定（任意）

```bash
sudo nano /etc/systemd/system/private-desk-mcp.service
```

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

```bash
sudo systemctl enable private-desk-mcp.service
sudo systemctl start private-desk-mcp.service
sudo systemctl status private-desk-mcp.service
```

## トラブルシューティング

### better-sqlite3 のビルドが失敗する

```bash
rm -rf node_modules package-lock.json
npm install --build-from-source
```

### データベースに接続できない

```bash
ls -la /home/pi/projects/private-desk/data/database.sqlite
chmod 666 /home/pi/projects/private-desk/data/database.sqlite
```

### メモリ不足

```bash
NODE_OPTIONS=--max-old-space-size=256 npm start
```

## アップデート手順

```bash
cd /home/pi/projects/private-desk-mcp-server
git pull origin main
npm install
npm run build
sudo systemctl restart private-desk-mcp.service
```

## ライセンス

MIT
