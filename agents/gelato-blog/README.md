# gelato-blog — автоагент статей блога

Агент живёт здесь: на VM pipo-prod `~/gelato-blog/run.sh` — это копия `bootstrap.sh`, которая на каждом запуске
тянет свежий main и запускает `run.sh` и `prompt.md` из репозитория. Правки агента — коммитом в main, на VM ничего копировать не нужно.
На VM остаются только состояние и секреты: `pool/` (обложки, `used/` двигается), `state/`, `logs/`, `hf-*`.

Что делает: раз в день (таймер `gelato-blog.timer`, 18:30 UTC) проверяет свежую X-сводку `~/x-agent/logs`
и видео-дайджест `~/x-research/proposals`. Если есть новое — `claude -p` по `prompt.md` пишет до 4 статей
в `src/lib/blog.ts`, подбирает обложку из `pool/`, коммитит в main, ждёт сборку образа, деплоит,
пингует IndexNow и шлёт ссылки в Telegram.

- `run.sh` — весь цикл; `prompt.md` — промпт автора статей
- `pool/` — заранее сгенерированные обложки (`pool.tsv` — имя и описание), `pool/used/` — уже использованные
- `cover/hf.py`, `cover/probe.py` — генерация обложек через Higgsfield (на VM сейчас на паузе)
- `systemd/` — юниты `/etc/systemd/system/gelato-blog.{service,timer}`

Не в репозитории (секреты и состояние): `~/x-agent/.env` (Telegram), `hf-state.json` и `hf-profile/` (сессия Higgsfield),
`state/processed.txt`, `logs/`.
