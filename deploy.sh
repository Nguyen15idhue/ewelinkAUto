#!/usr/bin/env bash
set -euo pipefail

echo
echo "Deploy script: build & run docker-compose.prod.yml for ewelinkAUto"
echo

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Vui lòng cài Docker trước khi chạy script này." >&2
  exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose không tìm thấy. Cài docker-compose-plugin hoặc docker-compose." >&2
  # không exit, vì một số hệ thống dùng 'docker compose'
fi

# Prompt values (with sensible defaults)
read -p "MYSQL_ROOT_PASSWORD (leave empty to auto-generate): " MYSQL_ROOT_PASSWORD
if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
  MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)
  echo "Generated MYSQL_ROOT_PASSWORD"
fi

read -p "MYSQL_DATABASE [cgbas_monitor]: " MYSQL_DATABASE
MYSQL_DATABASE=${MYSQL_DATABASE:-cgbas_monitor}

read -p "MYSQL_USER [appuser]: " MYSQL_USER
MYSQL_USER=${MYSQL_USER:-appuser}

read -s -p "MYSQL_PASSWORD (leave empty to auto-generate): " MYSQL_PASSWORD
echo
if [ -z "$MYSQL_PASSWORD" ]; then
  MYSQL_PASSWORD=$(openssl rand -hex 12)
  echo "Generated MYSQL_PASSWORD"
fi

read -p "SESSION_SECRET (leave empty to auto-generate): " SESSION_SECRET
if [ -z "$SESSION_SECRET" ]; then
  SESSION_SECRET=$(openssl rand -base64 32)
  echo "Generated SESSION_SECRET"
fi

echo
read -p "Bạn có muốn lưu các biến này vào file .env trong thư mục hiện tại? [y/N]: " SAVE_ENV
SAVE_ENV=${SAVE_ENV,,}

if [ "$SAVE_ENV" = "y" ] || [ "$SAVE_ENV" = "yes" ]; then
  cat > .env <<EOF
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_DATABASE=${MYSQL_DATABASE}
MYSQL_USER=${MYSQL_USER}
MYSQL_PASSWORD=${MYSQL_PASSWORD}
SESSION_SECRET=${SESSION_SECRET}
NODE_ENV=production
EOF
  echo ".env đã tạo (KHÔNG commit file này vào git)."
  DOCKER_ENV_CMD=""
else
  DOCKER_ENV_CMD="MYSQL_ROOT_PASSWORD='${MYSQL_ROOT_PASSWORD}' MYSQL_DATABASE='${MYSQL_DATABASE}' MYSQL_USER='${MYSQL_USER}' MYSQL_PASSWORD='${MYSQL_PASSWORD}' SESSION_SECRET='${SESSION_SECRET}'"
  echo "Sẽ chạy compose với biến môi trường tạm thời (không lưu)"
fi

echo
echo "Bắt đầu build & chạy docker-compose..."
echo

# Run docker compose (support both 'docker compose' and 'docker-compose')
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  if [ -z "${DOCKER_ENV_CMD}" ]; then
    docker compose -f docker-compose.prod.yml up -d --build
  else
    eval ${DOCKER_ENV_CMD} docker compose -f docker-compose.prod.yml up -d --build
  fi
else
  if [ -z "${DOCKER_ENV_CMD}" ]; then
    docker-compose -f docker-compose.prod.yml up -d --build
  else
    eval ${DOCKER_ENV_CMD} docker-compose -f docker-compose.prod.yml up -d --build
  fi
fi

echo
echo "Hoàn tất. Kiểm tra trạng thái container:"
docker ps --format 'table {{.Names}}	{{.Image}}	{{.Status}}	{{.Ports}}'

echo
echo "Xem logs: docker compose -f docker-compose.prod.yml logs -f"
echo
echo "Lưu ý: Nếu bạn lưu .env, KHÔNG commit file đó vào VCS."
