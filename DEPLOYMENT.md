# デプロイメント & 本番環境ガイド

Private Desk MCP Server を本番環境（Raspberry Pi）にデプロイするための詳細なガイドです。

## 本番環境の要件

- Raspberry Pi 3 以上（推奨: Raspberry Pi 4 2GB 以上）
- Raspberry Pi OS Bookworm または Bullseye
- 安定したネットワーク接続
- UPS（停電対策、推奨）

## 1. 事前準備

### 1.1 開発環境でのビルド

Windows 環境での開発完了後：

```powershell
# 最新の状態にする
git pull origin main

# 依存関係を確認
npm install

# テストを実行
npm test

# ビルド
npm run build

# 成果物を確認
ls dist/
```

### 1.2 マニフェストの作成

デプロイするファイル一覧を作成（`deploy-manifest.json`）：

```json
{
  "version": "1.0.0",
  "files": [
    "dist/**/*",
    ".env.example",
    "package.json",
    "package-lock.json",
    "README.md",
    "SETUP_RASPBERRY_PI.md"
  ],
  "excludes": [
    "node_modules/**/*",
    "src/**/*",
    ".git/**/*",
    "*.ts"
  ]
}
```

## 2. Raspberry Pi へのデプロイ

### 2.1 SSH 接続の設定

```bash
# ローカル PC でキーペアを生成（初回のみ）
ssh-keygen -t rsa -b 4096 -f ~/.ssh/rpi_id_rsa

# 公開鍵を Raspberry Pi に登録
ssh-copy-id -i ~/.ssh/rpi_id_rsa.pub pi@raspberrypi.local
```

### 2.2 ファイルの転送

```bash
# ローカルディレクトリをまるごと転送
scp -r -i ~/.ssh/rpi_id_rsa dist/ pi@raspberrypi.local:/home/pi/projects/private-desk-mcp-server/

# または、個別に
scp -i ~/.ssh/rpi_id_rsa package.json pi@raspberrypi.local:/home/pi/projects/private-desk-mcp-server/
scp -i ~/.ssh/rpi_id_rsa package-lock.json pi@raspberrypi.local:/home/pi/projects/private-desk-mcp-server/
```

### 2.3 Raspberry Pi 上での設定

```bash
# SSH で Raspberry Pi に接続
ssh -i ~/.ssh/rpi_id_rsa pi@raspberrypi.local

# プロジェクトディレクトリに移動
cd /home/pi/projects/private-desk-mcp-server

# 必要な npm パッケージをインストール
npm install --production

# または、既存の node_modules を使用する場合
npm ci --production

# .env ファイルを設定
cp .env.example .env
nano .env
```

### 2.4 動作確認

```bash
# MCP サーバーを直接実行してテスト
npm start

# コンソールに以下が出力されれば成功:
# Private Desk MCP server started
```

Ctrl+C で終了。

## 3. systemd サービスの設定

```bash
# サービスファイルを作成
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

# サービスを有効化
sudo systemctl enable private-desk-mcp.service

# サービスを開始
sudo systemctl start private-desk-mcp.service

# ステータスを確認
sudo systemctl status private-desk-mcp.service

# ログを確認
sudo journalctl -u private-desk-mcp.service -f
```

## 4. ログ管理

### 4.1 ログローテーション設定

```bash
# ログ設定ファイルを作成
sudo tee /etc/logrotate.d/private-desk-mcp > /dev/null <<EOF
/var/log/private-desk-mcp.log {
  daily
  rotate 7
  compress
  delaycompress
  missingok
  notifempty
  create 0644 pi pi
  sharedscripts
  postrotate
    sudo systemctl reload private-desk-mcp > /dev/null 2>&1 || true
  endscript
}
EOF
```

### 4.2 ログレベルの設定

`.env` に追加：

```env
LOG_LEVEL=info  # debug, info, warn, error
```

## 5. バックアップとリカバリ

### 5.1 自動バックアップスクリプト

```bash
# /home/pi/scripts/backup-private-desk.sh を作成
#!/bin/bash

BACKUP_DIR="/home/pi/backups"
DB_PATH="/home/pi/projects/private-desk/data/database.sqlite"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# バックアップディレクトリを作成
mkdir -p "$BACKUP_DIR"

# データベースをバックアップ
cp "$DB_PATH" "$BACKUP_DIR/database_$TIMESTAMP.sqlite"

# 7日以上前のバックアップを削除
find "$BACKUP_DIR" -name "database_*.sqlite" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/database_$TIMESTAMP.sqlite"
```

権限を設定：

```bash
chmod +x /home/pi/scripts/backup-private-desk.sh
```

### 5.2 cron ジョブで自動バックアップ

```bash
# crontab を編集
crontab -e

# 毎日 3:00 AM にバックアップを実行
0 3 * * * /home/pi/scripts/backup-private-desk.sh
```

### 5.3 リカバリ手順

```bash
# バックアップから復元
sudo systemctl stop private-desk-mcp.service
cp /home/pi/backups/database_20260205_030000.sqlite /home/pi/projects/private-desk/data/database.sqlite
sudo systemctl start private-desk-mcp.service
```

## 6. ネットワーク設定

### 6.1 静的 IP アドレスの設定

```bash
# 現在の設定を確認
ip addr show

# netplan で静的 IP を設定（Debian/Ubuntu）
sudo nano /etc/netplan/01-netcfg.yaml
```

以下の内容を設定：

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      addresses: [192.168.1.100/24]
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
      dhcp4: no
```

適用：

```bash
sudo netplan apply
```

### 6.2 ファイアウォール設定

```bash
# UFW（Uncomplicated Firewall）をインストール
sudo apt-get install ufw

# デフォルトルール
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH を許可
sudo ufw allow 22/tcp

# ローカルネットワークからの接続を許可（必要に応じて）
sudo ufw allow from 192.168.1.0/24

# 有効化
sudo ufw enable
```

## 7. 監視とアラート

### 7.1 ヘルスチェック

```bash
# /home/pi/scripts/health-check.sh を作成
#!/bin/bash

# MCP サーバーが起動しているか確認
if systemctl is-active --quiet private-desk-mcp.service; then
    echo "MCP Server: OK"
else
    echo "MCP Server: ERROR - Not running"
    # 自動再起動
    sudo systemctl restart private-desk-mcp.service
    sleep 5
    if systemctl is-active --quiet private-desk-mcp.service; then
        echo "Restarted successfully"
    else
        echo "Failed to restart - manual intervention required"
    fi
fi

# ディスク使用量を確認
DISK_USAGE=$(df /home/pi | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "WARNING: Disk usage is high: $DISK_USAGE%"
fi

# メモリ使用量を確認
MEM_USAGE=$(free | awk 'NR==2 {print int($3/$2 * 100)}')
if [ $MEM_USAGE -gt 85 ]; then
    echo "WARNING: Memory usage is high: $MEM_USAGE%"
fi
```

### 7.2 cron ジョブで定期監視

```bash
# 5分ごとにヘルスチェック
*/5 * * * * /home/pi/scripts/health-check.sh >> /home/pi/logs/health-check.log 2>&1
```

## 8. アップデート手順

### 8.1 新バージョンのデプロイ

```bash
# ローカル PC で最新コードをビルド
npm run build

# 変更ファイルをリストアップ
git diff --name-only HEAD~1

# Raspberry Pi 上で停止
ssh pi@raspberrypi.local "sudo systemctl stop private-desk-mcp.service"

# ファイルを転送
scp -r dist/ pi@raspberrypi.local:/home/pi/projects/private-desk-mcp-server/

# Raspberry Pi 上で再開
ssh pi@raspberrypi.local "sudo systemctl start private-desk-mcp.service"

# ログを確認
ssh pi@raspberrypi.local "sudo journalctl -u private-desk-mcp.service -f"
```

### 8.2 ロールバック手順

```bash
# 前のバージョンをバックアップから復元
git checkout HEAD~1
npm run build

# 上記のデプロイ手順を実行
```

## 9. セキュリティ対策

### 9.1 ファイルパーミッション

```bash
# MCP サーバーディレクトリ
sudo chown -R pi:pi /home/pi/projects/private-desk-mcp-server
chmod 755 /home/pi/projects/private-desk-mcp-server
chmod 644 /home/pi/projects/private-desk-mcp-server/dist/*

# 環境変数ファイル
chmod 600 /home/pi/projects/private-desk-mcp-server/.env
```

### 9.2 ssh キーの保護

```bash
# キーファイルのパーミッション
chmod 600 ~/.ssh/rpi_id_rsa
chmod 644 ~/.ssh/rpi_id_rsa.pub
```

### 9.3 定期的なセキュリティアップデート

```bash
# 自動アップデート有効化
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 10. パフォーマンスチューニング

### 10.1 メモリ制限の設定

`.env` に追加：

```env
# Node.js メモリ制限（Raspberry Pi 4 1GB の場合）
NODE_OPTIONS=--max-old-space-size=256
```

systemd サービスに設定：

```ini
[Service]
Environment="NODE_OPTIONS=--max-old-space-size=256"
```

### 10.2 CPU スケーリングの調整

```bash
# 現在の CPU スケーリング状態を確認
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# パフォーマンス優先に変更（電力消費が増加）
echo "performance" | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

## 11. トラブルシューティング

### サービスが起動しない

```bash
# ステータスを確認
sudo systemctl status private-desk-mcp.service

# ジャーナルログを確認
sudo journalctl -u private-desk-mcp.service -n 50

# 直接実行してエラーを確認
cd /home/pi/projects/private-desk-mcp-server
node dist/index.js
```

### ディスク容量不足

```bash
# ディスク使用量を確認
df -h

# ログをクリーンアップ
sudo journalctl --vacuum=time=7d
sudo rm -rf /var/log/*.1

# 古いバックアップを削除
find /home/pi/backups -name "database_*.sqlite" -mtime +30 -delete
```

### データベースが破損した

```bash
# 最新のバックアップから復元
cp /home/pi/backups/database_latest.sqlite /home/pi/projects/private-desk/data/database.sqlite

# サービスを再起動
sudo systemctl restart private-desk-mcp.service
```

## 参考資料

- [systemd ドキュメント](https://www.freedesktop.org/wiki/Software/systemd/)
- [journalctl ドキュメント](https://man7.org/linux/man-pages/man1/journalctl.1.html)
- [Raspberry Pi 公式ドキュメント](https://www.raspberrypi.org/documentation/)
- [ファイアウォール設定ガイド](https://wiki.ubuntu.com/UncomplicatedFirewall)
