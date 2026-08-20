# Kira Music Bot — Production Deployment Guide

This guide covers production deployment strategies for Kira and Lavalink v4.

---

## 1. System Requirements

- **Operating System:** Linux (Ubuntu 22.04 LTS recommended), macOS, or Windows Server
- **Node.js:** v18.0.0 or higher (Node 22 LTS recommended)
- **Java:** OpenJDK 17 or higher (Required for Lavalink v4)
- **Memory:** Minimum 1 GB RAM (2 GB+ recommended for large bot clusters)

---

## 2. Option A: Docker Compose Deployment (Recommended)

The easiest and most reliable method is running both Kira and Lavalink v4 via Docker Compose.

### Step 1: Clone Repository
```bash
git clone https://github.com/Nex-Devz/Kira-Music.git
cd Kira-Music
```

### Step 2: Configure Environment
```bash
cp .env.example .env
nano .env
```
Ensure `LAVALINK_HOST=lavalink` in `.env` when using Docker Compose.

### Step 3: Launch Services
```bash
docker compose up -d --build
```

### Step 4: View Logs
```bash
docker compose logs -f kira
```

---

## 3. Option B: PM2 Process Manager

### Step 1: Install PM2 Globally
```bash
npm install -g pm2
```

### Step 2: Start Lavalink v4
```bash
# In your lavalink directory
java -jar Lavalink.jar
```

### Step 3: Start Kira with PM2
```bash
# In the Kira repository directory
pm2 start src/index.js --name "kira-music" --max-memory-restart 1G
pm2 save
pm2 startup
```

### Useful PM2 Commands
```bash
pm2 status
pm2 logs kira-music
pm2 restart kira-music
pm2 stop kira-music
```

---

## 4. Option C: Systemd Service (Linux)

Create a systemd service unit at `/etc/systemd/system/kira.service`:

```ini
[Unit]
Description=Kira Discord Music Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/Kira-Music
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable kira
sudo systemctl start kira
sudo systemctl status kira
```

---

## 5. Security & Maintenance Checklist

- [ ] Ensure `.env` is never committed to public version control.
- [ ] Set complex passwords for the Lavalink node in `application.yml` and `.env`.
- [ ] Configure automatic backups for `./data/kira.db`.
- [ ] Enable Discord Gateway Intents in the Discord Developer Portal:
  - `Guilds`
  - `GuildVoiceStates`
  - `GuildMessages`
  - `MessageContent`
  - `GuildMembers`
