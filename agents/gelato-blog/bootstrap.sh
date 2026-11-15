#!/bin/bash
# Точка входа на VM (~/gelato-blog/run.sh): тянет свежий main и запускает агента из репозитория.
# Скрипт копируется во временный файл, потому что run.sh сам делает reset репозитория во время работы.
set -eu
REPO=~/gelato-blog/repo
[ -d "$REPO/.git" ] || git clone -q https://github.com/jumpleGo/ai-platform-learn.git "$REPO"
git -C "$REPO" fetch -q origin main && git -C "$REPO" reset -q --hard origin/main
TMP=$(mktemp /tmp/gelato-blog-run.XXXXXX.sh)
cp "$REPO/agents/gelato-blog/run.sh" "$TMP" && chmod +x "$TMP"
exec "$TMP"
