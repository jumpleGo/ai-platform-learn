Deploy to production VM (gelato.su):

1. Push current branch to GitHub:
```bash
git push origin main
```

2. Wait for the GitHub Actions build to finish — the VM pulls a prebuilt image, so
   deploying before CI is done just redeploys the previous version:
```bash
gh run watch $(gh run list --branch main --limit 1 --json databaseId -q '.[0].databaseId') --exit-status
```

3. SSH to VM and run deploy script:
```bash
gcloud compute ssh instance-20260629-154904 --zone=us-east1-b --project=project-60c23922-f4e8-4760-988 --command="~/deploy.sh"
```

The deploy script on VM does `git pull origin main && sudo docker pull ghcr.io/jumplego/ai-platform-learn:latest && sudo docker compose up -d` —
образ собирает CI (.github/workflows/build.yml), на VM ничего не билдится.

Если менялись переменные окружения — правь `~/ai-platform/.env` на VM до деплоя: compose
берёт их оттуда (`env_file: .env`), в образе их нет.

Report the final container status with `sudo docker compose -f ~/ai-platform/docker-compose.yml ps`.
