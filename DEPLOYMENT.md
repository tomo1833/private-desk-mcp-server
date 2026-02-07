# デプロイメントガイド（Raspberry Pi）

Private Desk MCP Server を Raspberry Pi にデプロイするためのガイドです。

## 1. 事前準備（開発環境）

```powershell
git pull origin main
npm install
npm run build
```

## 2. Raspberry Pi へのデプロイ

### 2.1 ファイルの転送

```bash
scp -r dist/ pi@raspberrypi.local:/home/pi/projects/private-desk-mcp-server/
scp -r package.json package-lock.json .env.example README.md pi@raspberrypi.local:/home/pi/projects/private-desk-mcp-server/
```

### 2.2 Raspberry Pi 上での設定

```bash
ssh pi@raspberrypi.local
cd /home/pi/projects/private-desk-mcp-server
npm install --production
cp .env.example .env
nano .env
```

## 3. systemd サービス設定

```bash
sudo tee /etc/systemd/system/private-desk-mcp.service > /dev/null <<EOF
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
EOF

sudo systemctl enable private-desk-mcp.service
sudo systemctl start private-desk-mcp.service
sudo systemctl status private-desk-mcp.service
```

## 4. バックアップ

```bash
#!/bin/bash
BACKUP_DIR="/home/pi/backups"
DB_PATH="/home/pi/projects/private-desk/data/database.sqlite"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
cp "$DB_PATH" "$BACKUP_DIR/database_$TIMESTAMP.sqlite"
find "$BACKUP_DIR" -name "database_*.sqlite" -mtime +7 -delete
```

## 5. アップデート手順

```bash
ssh pi@raspberrypi.local "sudo systemctl stop private-desk-mcp.service"
scp -r dist/ pi@raspberrypi.local:/home/pi/projects/private-desk-mcp-server/
ssh pi@raspberrypi.local "sudo systemctl start private-desk-mcp.service"
ssh pi@raspberrypi.local "sudo journalctl -u private-desk-mcp.service -f"
```

## 6. トラブルシューティング

```bash
sudo systemctl status private-desk-mcp.service
sudo journalctl -u private-desk-mcp.service -n 50
node /home/pi/projects/private-desk-mcp-server/dist/index.js
```
