# Deployment guide

This repository contains two fast options to run on a Linux server:

1) Docker (recommended for reproducible deployments)
2) PM2 (quick native Node + process manager)

-- Prerequisites on server (pick one path below) --

A) Using Docker

1. Install Docker and docker-compose (Debian/Ubuntu):
   sudo apt update; sudo apt install -y docker.io docker-compose
   sudo systemctl enable --now docker

2. Copy repo to server (git clone or scp/rsync). Then in project root:
   docker-compose build --no-cache
   docker-compose up -d

3. Check logs:
   docker-compose logs -f

Notes: The service listens on port 3000 by default. Use a reverse proxy (nginx) for HTTPS.

B) Using Node + PM2

1. Install Node (v18+) and PM2 (example for Ubuntu):
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -; sudo apt-get install -y nodejs
   sudo npm install -g pm2

2. Clone the repo on the server, then in project root:
   npm ci --production
   pm2 start ecosystem.config.js --env production
   pm2 startup systemd -u $USER --hp $HOME
   pm2 save

3. Check status and logs:
   pm2 status
   pm2 logs ewelink-auto --lines 200

4. Optional: Put nginx in front to serve HTTPS and reverse-proxy to localhost:3000.

-- Quick nginx reverse proxy example --

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

-- Notes and next steps --
- Set up a proper firewall (ufw) to allow only necessary ports.
- Store secrets (DB credentials, session secret) as environment variables, not in code.
- Enable automatic re-deploy: either build/pull & docker-compose up -d, or `git pull && npm ci && pm2 reload ecosystem.config.js`.
