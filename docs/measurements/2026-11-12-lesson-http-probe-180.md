# #180: проверка HTTP до стриминга урока

Гипотеза: проверка существования урока выше `loading.tsx` позволит отправить
настоящий HTTP 404 до начала стриминга. Техническая метрика — три заведомо
несуществующих урока отвечают 404, существующие уроки sitemap отвечают 200.
Изменение `organic_users_7d` здесь не измерено; продуктовый замер требует
выкладки и выдержки минимум 72 часа.

## Состояние ветки и разведка

Проверка начата 2026-11-12 01:58 UTC в `hq/vera/180`, исходный HEAD
`e493d400cdf1526fe9210957b87d478662fc06eb`. Сохранённых незакоммиченных изменений
не было. Уже существующий фикс добавляет проверку `resolveLesson()` в layout
сегмента `[lessonNumber]`; прод-код в этом запуске не изменялся.

Дифф #71 `a2e5824` исправляет бесплатный CTA и прямо сообщает:
«Поведение soft-404 не изменено». Его файлы — лендинг курса, тест ссылок и
отчёт. Пересечения с layout урока нет. Файл
`src/app/(app)/courses/[courseSlug]/page.tsx`, занятый замером #52, не изменён.
Слаги, редиректы, автостатьи, платежи, авторизация и запрещённые пути не менялись.

Установленная документация Next.js 16.2.9, `loading.md`, описывает границу:
`loading.js` оборачивает страницу, но не layout того же сегмента. Раздел
Status Codes предупреждает, что после начала стриминга HTTP 200 уже нельзя
заменить на 404. Unit-тест layout не доказывает порядок отправки HTTP-заголовков.

## Вариант A: сборка заблокирована

В `eval/buildsrc/` подготовлена копия отслеживаемых файлов этой ветки без
`.env*`, credentials, `firestore.rules`, `.github/` и `certificates/`.
Только в копии конфигурации Webpack задан alias `@/lib/db/courses` на тестовый
модуль: `resolveLesson` возвращает `null` для трёх проверяемых отсутствующих
уроков, а для `claude-code-agents/1` — фикстуру опубликованного урока.
Ответ мока задержан на 250 мс для выявления раннего стриминга. Прод-код и
общий `node_modules` не исправлялись. Использованы только параметры локального
эмулятора с проектом `demo-lesson-http-probe`, без прод-кредов.

Команда: `export PATH=$HOME/.local/node/bin:$PATH && npx next build --webpack`.
Build exit 1, цитаты блокера:

```text
Module not found: Can't resolve 'lenis'
Module not found: Can't resolve 'lenis/dist/lenis.css'
Module not found: Can't resolve 'simple-icons'
Module not found: Can't resolve 'nodemailer'
```

Это известная проблема общего `node_modules` (#140); установка зависимостей
и изменение затронутых компонентов не входят в задачу. Вариант A невозможен
без этой внешней зависимости, поэтому выбран разрешённый вариант B в пределах
12 минут. `next start` не запускался: пригодной сборки нет. Копия сборки,
`.next` и контрольная копия теста удалены. Небольшие логи, конфигурация мока
и ответы сохранены только в исключённом через `info/exclude` каталоге `eval/`.

## Проверки кода

`export PATH=$HOME/.local/node/bin:$PATH && npx tsc --noEmit -p .`:
фактический exit **1** в этом запуске; только TS2307 для `simple-icons`,
`lenis`, `nodemailer`. Упомянутый в задании exit 2 не воспроизведён.
Дельта относительно main не вычислялась, зависимости не исправлялись.

`npx vitest run`: exit **0**, **19 файлов / 167 тестов прошли**, в том числе
три отсутствующих урока и один существующий в `tests/lesson-404.test.tsx`.
Существующий тест не изменён и не ослаблен. В `HEAD^` layout урока отсутствует;
неизменённый тест в изолированной копии с отсутствующим модулем завершился
с exit 1 (`Cannot find package .../lessons/[lessonNumber]/layout`). Это отказ
регрессионного набора на отсутствии нового layout, а не HTTP-замер старой версии.
Для контрольного запуска использован `--configLoader native`, чтобы временная
конфигурация не требовала записи в общий `node_modules/.vite-temp`.

HTTP-проверка **ветки не выполнена**. В итоговых ключах `PROBE_404_N=0`
означает ноль подтверждённых ответов ветки из трёх, а
`PROBE_EXISTING_200=no` — отсутствие подтверждения 200 на ветке; это не
наблюдавшиеся HTTP-коды. `PROBE_MODE=B`, `PROBE_PLAN=post_ship_curl`.
BRANCH_PROBE остаётся неподтверждённым до следующего замера.

## Вариант B: точные команды после ship

Запускать после выкладки этой ветки, из `workspaces/vera/180/`. Деплой этим
отчётом не выполнялся. Запросы без `-L`: перенаправление не считается 200/404.
User-Agent `curl` проверяет обычный стримящийся ответ, а не особый режим ботов.

```bash
curl --max-time 30 -sS -o /dev/null -w '%{http_code}\n' 'https://gelato.education/courses/claude-code/lessons/999'
curl --max-time 30 -sS -o /dev/null -w '%{http_code}\n' 'https://gelato.education/courses/claude-code/lessons/abc'
curl --max-time 30 -sS -o /dev/null -w '%{http_code}\n' 'https://gelato.education/courses/no-such-course/lessons/1'
curl --max-time 30 -sS -o /dev/null -w '%{http_code}\n' 'https://gelato.education/courses/claude-code-agents/lessons/1'
curl --max-time 30 -sS -o /dev/null -w '%{http_code}\n' 'https://gelato.education/courses/claude-code/lessons/4'
```

Ожидаемые коды по порядку: **404, 404, 404, 200, 200**. Последний урок
есть в публичном sitemap на момент разведки. Для полного исходного ACCEPT
с пятью отсутствующими адресами дополнительно проверить:

```bash
curl --max-time 30 -sS -o /dev/null -w '%{http_code}\n' 'https://gelato.education/courses/claude-code/lessons/0'
curl --max-time 30 -sS -o /dev/null -w '%{http_code}\n' 'https://gelato.education/courses/no-such-course/lessons/999'
```

Оба ожидаются **404**. Ноль не является допустимым порядковым номером;
второй адрес относится к отсутствующему курсу.

До ship read-only запрос `/sitemap.xml` ответил 200 и содержал **30 URL**;
это снимок публичного сайта, не проверка ветки. После ship получить свежую
карту и сохранить коды и тела всех её URL, включая все уроки:

```bash
mkdir -p eval/post-ship
curl --max-time 30 --fail -sS 'https://gelato.education/sitemap.xml' -o eval/post-ship/sitemap.xml
python3 - <<'PY'
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

directory = Path('eval/post-ship')
urls = [node.text for node in ET.parse(directory / 'sitemap.xml').findall(
    './/{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
assert urls and all(urlparse(url).netloc == 'gelato.education' for url in urls)
(directory / 'urls.txt').write_text('\n'.join(urls) + '\n')
print('SITEMAP_URL_N=' + str(len(urls)))
PY

probe_index=0
while IFS= read -r probe_url; do
  probe_index=$((probe_index + 1))
  curl --max-time 30 -sS -o "eval/post-ship/body-$probe_index.html" -w '%{http_code}\n' "$probe_url" > "eval/post-ship/status-$probe_index.txt"
done < eval/post-ship/urls.txt

python3 - <<'PY'
from pathlib import Path

directory = Path('eval/post-ship')
urls = (directory / 'urls.txt').read_text().splitlines()
bad = []
soft404 = []
rollback = []
for index, url in enumerate(urls, 1):
    code = (directory / f'status-{index}.txt').read_text().strip()
    body_path = directory / f'body-{index}.html'
    body = body_path.read_text(errors='replace') if body_path.exists() else ''
    fallback = 'NEXT_HTTP_ERROR_FALLBACK;404' in body
    if code != '200' or fallback:
        bad.append((url, code, fallback))
    if code == '200' and fallback:
        soft404.append(url)
    if '/lessons/' in url and (code != '200' or fallback):
        rollback.append(url)
print('SITEMAP_SOFT404=' + str(len(soft404)))
print('SITEMAP_NON_200_OR_404_BODY=' + str(len(bad)))
print('ROLLBACK=' + ('yes' if rollback else 'no'))
for row in bad:
    print(row)
raise SystemExit(1 if bad else 0)
PY
```

Нужны 200 у всех URL текущего sitemap и отсутствие 404-маркера в их HTML.
Повторить **неизменённый аудит #173**, включая внутренние ссылки, тем же
методом: `SITEMAP_SOFT404=0`, `BROKEN_N=0`. Приведённая проверка sitemap
не заменяет проверку внутренних ссылок и не выдаёт её за проведённую.

**Критерий отката:** любой существующий урок из sitemap отвечает не 200
(либо 200 со страницей not-found) → revert коммита этой ветки обычным
`git revert`, без переписывания истории. Если отсутствующий урок остаётся
200, BRANCH_PROBE/ACCEPT не закрывать и продолжить исправление; если
существующие уроки доступны, сам этот результат не требует автоматического
отката. Откат и выкладка в этом запуске не выполнялись.
