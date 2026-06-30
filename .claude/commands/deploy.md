Deploy to production VM (gelato.su):

1. Push current branch to GitHub:
```bash
git push origin main
```

2. SSH to VM and run deploy script:
```bash
gcloud compute ssh instance-20260629-154904 --zone=us-central1-b --project=project-60c23922-f4e8-4760-988 --command="~/deploy.sh"
```

The deploy script on VM does `git pull origin main && sudo docker compose up -d --build`.

Report the final container status with `sudo docker compose -f ~/ai-platform/docker-compose.yml ps`.
