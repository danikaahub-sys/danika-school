#!/usr/bin/env bash
# Build a short deploy changelog from git.
#
# Usage:
#   changelog.sh [previous_sha]
# Prints the changelog to stdout. Exit 0 always.
set -u

PREV="${1:-}"
MAX="${CHANGELOG_MAX_COMMITS:-15}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TO_SHA="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
DIRTY=""
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  DIRTY=", dirty"
fi

SUBJECTS=()
if [ -n "$PREV" ] && git cat-file -e "${PREV}^{commit}" 2>/dev/null; then
  FROM_SHORT="$(git rev-parse --short "$PREV" 2>/dev/null || echo "$PREV")"
  while IFS= read -r line; do
    [ -n "$line" ] && SUBJECTS+=("$line")
  done < <(git log --pretty=format:'%s' "${PREV}..HEAD" 2>/dev/null || true)
else
  FROM_SHORT="(unknown)"
  while IFS= read -r line; do
    [ -n "$line" ] && SUBJECTS+=("$line")
  done < <(git log --pretty=format:'%s' -n "$MAX" 2>/dev/null || true)
fi

TO_SHORT="$(git rev-parse --short HEAD 2>/dev/null || echo "$TO_SHA")"
N=${#SUBJECTS[@]}
printf '%s → %s  (%s commit%s%s)\n\n' "$FROM_SHORT" "$TO_SHORT" "$N" "$([ "$N" = 1 ] && echo '' || echo 's')" "$DIRTY"

classify() {
  local s="$1"
  local lower first
  lower="$(printf '%s' "$s" | tr '[:upper:]' '[:lower:]')"
  first="${lower%% *}"
  case "$lower" in
    *fix*|*bug*|*repair*|*hotfix*|*regression*) echo Fix; return ;;
  esac
  case "$lower" in
    *test*|*spec*) echo Test; return ;;
  esac
  case "$first" in
    add|adds|added|make|makes|made|enable|enables|enabled|support|supports|supported|introduce|introduces|introduced|implement|implements|implemented|new) echo Feature; return ;;
  esac
  echo Other
}

FEATURES=(); FIXES=(); TESTS=(); OTHERS=()
for s in "${SUBJECTS[@]+"${SUBJECTS[@]}"}"; do
  case "$(classify "$s")" in
    Feature) FEATURES+=("$s") ;;
    Fix) FIXES+=("$s") ;;
    Test) TESTS+=("$s") ;;
    *) OTHERS+=("$s") ;;
  esac
done

emit_group() {
  local title="$1"; shift
  local arr=("$@")
  [ "${#arr[@]}" -eq 0 ] && return 0
  printf '%s\n' "$title"
  local line
  for line in "${arr[@]}"; do
    printf -- '- %s\n' "$line"
  done
  printf '\n'
}

emit_group Feature "${FEATURES[@]+"${FEATURES[@]}"}"
emit_group Fix "${FIXES[@]+"${FIXES[@]}"}"
emit_group Test "${TESTS[@]+"${TESTS[@]}"}"
emit_group Other "${OTHERS[@]+"${OTHERS[@]}"}"

exit 0
