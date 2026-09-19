#!/usr/bin/env bash
# OLIMA AI — prod branch'ni tinglab, avtomatik deploy qiladi.
#
# Serverda systemd timer (olima-autodeploy.timer) har daqiqada chaqiradi.
# origin/prod da yangi commit bo'lsa: pull -> build -> up -> health-check.
# Health-check o'tmasa oldingi image'larga qaytadi (rollback) va o'sha commit'ni
# qayta urinmaydi — keyingi push'gacha kutadi.
#
# Qo'lda:  /opt/olima/src/deploy/autodeploy.sh           (faqat o'zgarish bo'lsa)
#          /opt/olima/src/deploy/autodeploy.sh --force   (majburan qayta deploy)
# Log:     journalctl -u olima-autodeploy -f   yoki   /opt/olima/deploy.log
set -euo pipefail

BRANCH="${OLIMA_BRANCH:-prod}"
ROOT=/opt/olima
SRC="$ROOT/src"
ENV_FILE="$ROOT/.env"
STATE="$ROOT/.deployed-sha"
FAILED="$ROOT/.failed-sha"
LOG="$ROOT/deploy.log"
HEALTH_URL="http://127.0.0.1:${OLIMA_PORT:-8095}/actuator/health"
SERVICES_BUILT=(olima/mockgov olima/api olima/web)

exec 9>"$ROOT/.deploy.lock"
flock -n 9 || exit 0   # oldingi deploy hali tugamagan

log()    { echo "[$(date '+%F %T')] $*" | tee -a "$LOG"; }
notify() { command -v notifier >/dev/null && notifier send "$*" >/dev/null 2>&1 || true; }
dc()     { docker compose --env-file "$ENV_FILE" -f "$SRC/deploy/docker-compose.yml" "$@"; }

cd "$SRC"
git fetch -q origin "$BRANCH"
NEW=$(git rev-parse "origin/$BRANCH")
OLD=$(cat "$STATE" 2>/dev/null || echo none)

if [[ "${1:-}" != "--force" ]]; then
  [[ "$NEW" == "$OLD" ]] && exit 0
  [[ "$NEW" == "$(cat "$FAILED" 2>/dev/null)" ]] && exit 0
fi

MSG=$(git log -1 --format='%h %an: %s' "$NEW")
log "deploy boshlandi: $MSG (oldingi: ${OLD:0:7})"

git reset -q --hard "$NEW"
git clean -qfd -e deploy/jars -e deploy/site

# Joriy image'larni zaxiraga olamiz — rollback uchun
for img in "${SERVICES_BUILT[@]}"; do
  docker image inspect "$img:latest" >/dev/null 2>&1 && docker tag "$img:latest" "$img:prev"
done

# Ketma-ket build: bir vaqtda uchta build MT prodini xotirasiz qoldirmasin.
# Build yiqilsa eski konteynerlar ishlashda davom etadi.
if ! COMPOSE_PARALLEL_LIMIT=1 dc build >>"$LOG" 2>&1; then
  echo "$NEW" > "$FAILED"
  log "BUILD YIQILDI: $MSG — prod o'zgarmadi"
  notify "❌ OLIMA deploy: build yiqildi — $MSG (prod eski versiyada)"
  exit 1
fi

dc up -d --remove-orphans >>"$LOG" 2>&1

for i in $(seq 1 36); do   # 3 daqiqagacha kutamiz (Spring ko'tarilishi ~40 s)
  if curl -fsS -m 5 "$HEALTH_URL" 2>/dev/null | grep -q '"UP"'; then
    echo "$NEW" > "$STATE"
    rm -f "$FAILED"
    log "deploy OK: $MSG"
    notify "✅ OLIMA prod yangilandi — $MSG"
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 5
done

log "HEALTH-CHECK O'TMADI: $MSG — rollback"
for img in "${SERVICES_BUILT[@]}"; do
  docker image inspect "$img:prev" >/dev/null 2>&1 && docker tag "$img:prev" "$img:latest"
done
dc up -d --no-build >>"$LOG" 2>&1 || true
echo "$NEW" > "$FAILED"
notify "⚠️ OLIMA deploy: health-check o'tmadi, oldingi versiyaga qaytarildi — $MSG"
exit 1
