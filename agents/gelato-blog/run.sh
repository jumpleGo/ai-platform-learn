#!/bin/bash
# Автоблог GELATO: по свежей AI-сводке из X (x-agent) пишет статьи для новичков,
# коммитит в main, ждёт сборку образа, деплоит и шлёт ссылки в Telegram.
# Запуск: systemd gelato-blog.timer (ежедневно, работает только по новой сводке) или вручную.
set -u

set -a
source ~/x-agent/.env            # TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID
set +a
source ~/.config/claude/env 2>/dev/null || true
export PATH="/home/painsearchdev/.local/bin:$PATH"

BASE=~/gelato-blog
REPO=$BASE/repo
STATE=$BASE/state/processed.txt
TOPIC=9                          # топик «🐦 X» — там же, где X-сводка
SITE=https://gelato.education
INDEXNOW_KEY=460dd8419dac7340d775ae7a71222585
STAMP=$(date -u +%Y-%m-%d_%H-%M)
TODAY=$(date -u +%Y-%m-%d)
mkdir -p "$BASE/logs" "$BASE/state"
LOG="$BASE/logs/$STAMP.log"
touch "$STATE"

tg() {
  curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" -d "message_thread_id=$TOPIC" \
    -d "disable_web_page_preview=false" --data-urlencode "text=$1" >/dev/null 2>&1 || true
}

exec 9>/tmp/gelato-blog.lock
flock -n 9 || { echo "[$STAMP] уже идёт" | tee -a "$LOG"; exit 0; }

# Источники: свежая сводка x-agent и видео-дайджест x-research — каждый берём один раз.
# Работаем, если новый хотя бы один из них.
new_or_empty() { [ -n "$1" ] && ! grep -qxF "$1" "$STATE" && echo "$1"; }
DIGEST=$(new_or_empty "$(ls -t ~/x-agent/logs/*_*.txt 2>/dev/null | grep -v '/run.log' | head -1)")
VDIGEST=$(new_or_empty "$(ls -t ~/x-research/proposals/*_video-digest.txt 2>/dev/null | head -1)")
if [ -z "$DIGEST" ] && [ -z "$VDIGEST" ]; then
  echo "[$STAMP] новых сводок нет" | tee -a "$LOG"; exit 0
fi
POSTS=""; [ -n "$DIGEST" ] && POSTS="${DIGEST%.txt}.posts.json"
mark_done() { for f in $DIGEST $VDIGEST; do echo "$f" >> "$STATE"; done; }
echo "[$STAMP] сводка: ${DIGEST:-—}, видео: ${VDIGEST:-—}" | tee -a "$LOG"

# Чистая копия main
if [ ! -d "$REPO/.git" ]; then
  git clone -q https://github.com/jumpleGo/ai-platform-learn.git "$REPO" >>"$LOG" 2>&1 || { tg "⚠️ gelato-blog: не смог клонировать репозиторий"; exit 1; }
fi
cd "$REPO"
git fetch -q origin main && git reset -q --hard origin/main && git clean -qfd
[ -d node_modules ] && [ package-lock.json -ot node_modules ] || npm ci --no-audit --no-fund >>"$LOG" 2>&1 || { tg "⚠️ gelato-blog: npm ci упал, см. $LOG"; exit 1; }

# Пак заранее сгенерированных обложек (Higgsfield, стиль Gelato): ~/gelato-blog/pool/<имя>.webp + pool.tsv
POOL=$BASE/pool
mkdir -p "$POOL/used"
COVERS=$(while IFS=$'\t' read -r n d; do [ -f "$POOL/$n.webp" ] && echo "$n — $d"; done < "$POOL/pool.tsv")
RESULT=$(mktemp)

echo "[$STAMP] пишу статьи..." | tee -a "$LOG"
claude -p "Сегодня (UTC): $TODAY.
Файл сводки X: ${DIGEST:-нет новой}
JSON постов: ${POSTS:-нет}
Видео-дайджест: ${VDIGEST:-нет нового}
Файл результата: $RESULT
Пак обложек (имя — тема):
${COVERS:-пусто}" \
  --append-system-prompt "$(cat "$REPO/agents/gelato-blog/prompt.md")" \
  --permission-mode bypassPermissions --no-session-persistence >>"$LOG" 2>&1
RC=$?

SLUGS=$(grep -v '^NONE$' "$RESULT" | awk '{print $1}' | grep -E '^[a-z0-9-]+$' || true)
if [ "$RC" -ne 0 ]; then
  git reset -q --hard origin/main
  tg "⚠️ gelato-blog: агент упал (rc=$RC), см. $LOG"; exit 1
fi
if [ -z "$SLUGS" ] || git diff --quiet; then
  mark_done
  echo "[$STAMP] подходящих тем нет" | tee -a "$LOG"; exit 0
fi

# Обложка из пака: выбор агента, иначе первая свободная; пак пуст — одна из старых обложек
COVER_NOTE=""; USED=""
for s in $SLUGS; do
  PICK=$(awk -v s="$s" '$1==s {print $2}' "$RESULT")
  # занятые в этом же запуске не берём повторно
  if [ -z "$PICK" ] || [ ! -f "$POOL/$PICK.webp" ] || echo " $USED " | grep -q " $PICK "; then
    PICK=$(ls "$POOL"/*.webp 2>/dev/null | xargs -r -n1 basename | sed 's/\.webp$//' | grep -vxF -f <(printf '%s\n' $USED x) | head -1)
  fi
  if [ -n "$PICK" ] && [ -f "$POOL/$PICK.webp" ]; then
    cp "$POOL/$PICK.webp" "public/blog/$s.webp"; USED="$USED $PICK"
  else
    cp "$(ls public/blog/*.webp | shuf -n1)" "public/blog/$s.webp"
    COVER_NOTE="$COVER_NOTE\n• $s: пак обложек пуст, взял старую"
  fi
  # путь обложки — всегда /blog/<slug>.webp, даже если агент написал другой
  node -e "
const fs=require('fs');const f='src/lib/blog.ts';let src=fs.readFileSync(f,'utf8');
const i=src.indexOf(\"slug: '$s'\");const j=src.indexOf('cover:',i);const k=src.indexOf('\\n',j);
src=src.slice(0,j)+\"cover: '/blog/$s.webp',\"+src.slice(k);fs.writeFileSync(f,src)"
  git add "public/blog/$s.webp"
done
LEFT=$(( $(ls "$POOL"/*.webp 2>/dev/null | wc -l) - $(echo $USED | wc -w) ))
[ "$LEFT" -lt 5 ] && COVER_NOTE="$COVER_NOTE\n• в паке осталось обложек: $LEFT — пора догенерировать"

# Страховка: меняться мог только blog.ts, и проверки должны проходить
CHANGED=$(git diff --name-only HEAD | grep -v '^public/blog/[a-z0-9-]*\.webp$')
if [ "$CHANGED" != "src/lib/blog.ts" ]; then
  git reset -q --hard origin/main; git clean -qfd
  tg "⚠️ gelato-blog: агент тронул лишнее ($CHANGED), откатил"; exit 1
fi
# Упавшие тесты (полные имена) в файл $1 — через JSON-репортёр vitest
failed_tests() {
  npx vitest run --reporter=json --outputFile="$1.json" >>"$LOG" 2>&1
  # нет отчёта — разобрать нечего, пишем маркер ошибки
  [ -s "$1.json" ] || { echo "__NO_REPORT__" > "$1"; return; }
  node -e 'const r=require(process.argv[1]);for(const f of r.testResults)for(const t of f.assertionResults)if(t.status==="failed")console.log(t.fullName)' "$1.json" | sort > "$1"
}
CHECK_FAIL=""
if ! npx tsc --noEmit -p . >>"$LOG" 2>&1; then
  CHECK_FAIL="tsc"
elif ! npx vitest run >>"$LOG" 2>&1; then
  # Красный тест мог прийти из main — блокируем только то, что сломали статьи
  TMPD=$(mktemp -d)
  failed_tests "$TMPD/after"
  git stash -q
  failed_tests "$TMPD/base"
  git stash pop -q
  NEW_FAILS=$(comm -23 "$TMPD/after" "$TMPD/base")
  if grep -q __NO_REPORT__ "$TMPD/after" "$TMPD/base"; then
    CHECK_FAIL="тесты: не удалось разобрать результат"
  elif [ ! -s "$TMPD/after" ]; then
    # на повторном прогоне всё зелёное — падение было нестабильным, публикуем
    echo "[$STAMP] нестабильный тест: на повторе всё зелёное" >>"$LOG"
  elif [ -n "$NEW_FAILS" ]; then
    CHECK_FAIL="тесты: $NEW_FAILS"
  else
    echo "[$STAMP] в main уже красные тесты, статьи их не меняют:" >>"$LOG"; cat "$TMPD/base" >>"$LOG"
    tg "⚠️ gelato-blog: в main красные тесты (не из-за статей), публикую. Список в $LOG"
  fi
  rm -rf "$TMPD"
fi
if [ -n "$CHECK_FAIL" ]; then
  git reset -q --hard origin/main; git clean -qfd
  tg "⚠️ gelato-blog: проверки не прошли ($CHECK_FAIL), статья не опубликована, см. $LOG"; exit 1
fi
for s in $SLUGS; do
  grep -q "slug: '$s'" src/lib/blog.ts || { git reset -q --hard origin/main; git clean -qfd; tg "⚠️ gelato-blog: slug $s не найден в blog.ts, откатил"; exit 1; }
done

TITLES=$(for s in $SLUGS; do node -e "
const src=require('fs').readFileSync('src/lib/blog.ts','utf8');
const i=src.indexOf(\"slug: '$s'\"); const m=src.slice(i).match(/title: '([^']+)'/); console.log(m?m[1]:'$s')"; done)

git -c user.name="gelato-blog" -c user.email="gelato-blog@users.noreply.github.com" \
  commit -q -am "feat(blog): автостатья по X-сводке — $(echo $SLUGS | tr ' ' ',')" >>"$LOG" 2>&1
git push -q origin HEAD:main >>"$LOG" 2>&1 || { tg "⚠️ gelato-blog: push не прошёл, см. $LOG"; git reset -q --hard origin/main; exit 1; }
SHA=$(git rev-parse HEAD)
mark_done
# обложки уходят из пака только после успешного push
for n in $USED; do mv "$POOL/$n.webp" "$POOL/used/"; done

# Ждём сборку образа для нашего коммита: VM тянет готовый образ из ghcr
RUN_ID=""
for _ in $(seq 1 30); do
  # gh на сервере 2.23 — без --commit, ищем запуск по headSha
  RUN_ID=$(gh run list -R jumpleGo/ai-platform-learn --limit 15 --json databaseId,headSha \
    -q ".[] | select(.headSha==\"$SHA\") | .databaseId" 2>>"$LOG" | head -1)
  [ -n "$RUN_ID" ] && break; sleep 10
done
if [ -z "$RUN_ID" ] || ! gh run watch "$RUN_ID" -R jumpleGo/ai-platform-learn --exit-status >>"$LOG" 2>&1; then
  tg "⚠️ gelato-blog: сборка не прошла или не нашлась для $SHA — статья в main, но не задеплоена"; exit 1
fi

sudo -u emil /home/emil/deploy.sh >>"$LOG" 2>&1 || { tg "⚠️ gelato-blog: deploy.sh упал, см. $LOG"; exit 1; }
sleep 15

URLS=""; MSG="📝 Новая статья в блоге GELATO"
i=0
for s in $SLUGS; do
  i=$((i+1)); URL="$SITE/blog/$s"
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "$URL")
  T=$(echo "$TITLES" | sed -n "${i}p")
  MSG="$MSG

$T
$URL$([ "$CODE" = 200 ] || echo " (⚠️ HTTP $CODE)")"
  URLS="$URLS\"$URL\","
done

# IndexNow: Яндекс и Bing узнают о странице сразу
BODY="{\"host\":\"gelato.education\",\"key\":\"$INDEXNOW_KEY\",\"keyLocation\":\"$SITE/$INDEXNOW_KEY.txt\",\"urlList\":[${URLS}\"$SITE/blog\"]}"
for EP in https://yandex.com/indexnow https://api.indexnow.org/indexnow; do
  curl -s -o /dev/null -w "$EP %{http_code}\n" -X POST -H 'Content-Type: application/json; charset=utf-8' -d "$BODY" "$EP" >>"$LOG"
done

[ -n "$COVER_NOTE" ] && MSG="$MSG

Обложки:$(printf "$COVER_NOTE")"
tg "$MSG"
echo "[$STAMP] опубликовано: $(echo $SLUGS)" | tee -a "$LOG"
