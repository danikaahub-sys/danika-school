#!/usr/bin/env bash
# Post a message to the ops Telegram channel.
# Reads TELEGRAM_BOT_TOKEN + TELEGRAM_OPS_CHAT_ID from the environment
# (deploy.command exports them from the deployment env file).
# Never fails the caller: Telegram outages must not block a deploy.
#
# Usage:  notify-telegram.sh LEVEL "title" ["body"]
# LEVEL:  INFO | ALERT | CRITICAL
set -u

LEVEL="${1:-INFO}"
TITLE="${2:-}"
BODY="${3:-}"

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_OPS_CHAT_ID:-}" ]; then
  exit 0
fi
if [ -z "$TITLE" ]; then
  exit 0
fi

html_esc() {
  printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'
}

case "$LEVEL" in
  ALERT) LEVEL_EMOJI='⚠️' ;;
  CRITICAL) LEVEL_EMOJI='🚨' ;;
  *) LEVEL_EMOJI='ℹ️'; LEVEL=INFO ;;
esac

lower="$(printf '%s' "$TITLE" | tr '[:upper:]' '[:lower:]')"
TOPIC_EMOJI=''
case "$lower" in
  *deploy*fail*|*deploy*failed*) TOPIC_EMOJI='💥' ;;
  *deploy*) TOPIC_EMOJI='🚀' ;;
  *health*) TOPIC_EMOJI='🩺' ;;
esac

if [ -n "$TOPIC_EMOJI" ]; then
  MARK="$LEVEL_EMOJI $TOPIC_EMOJI"
else
  MARK="$LEVEL_EMOJI"
fi

TEXT="$(printf '%s <b>%s</b> %s' "$MARK" "$(html_esc "$LEVEL")" "$(html_esc "$TITLE")")"
if [ -n "$BODY" ]; then
  TEXT="$TEXT
$(html_esc "$BODY")"
fi

if [ "${#TEXT}" -gt 4090 ]; then
  TEXT="${TEXT:0:4090}…"
fi

URL="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage"
PAYLOAD="$(python3 -c '
import json, sys
print(json.dumps({
  "chat_id": sys.argv[1],
  "text": sys.argv[2],
  "parse_mode": "HTML",
  "disable_web_page_preview": True,
}))
' "$TELEGRAM_OPS_CHAT_ID" "$TEXT" 2>/dev/null)" || exit 0

curl -sS -m 8 -X POST "$URL" \
  -H 'content-type: application/json' \
  -d "$PAYLOAD" >/dev/null 2>&1 || true
exit 0
