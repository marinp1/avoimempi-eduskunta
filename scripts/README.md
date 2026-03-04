# Deployment & Operations

## Architecture

Single Hetzner VM running two applications as separate system users:

- **`avoimempi-eduskunta-app`** — Bun HTTP server, public-facing, reads DB only
- **`avoimempi-eduskunta-pipeline`** — scraper, parser, migrator (systemd timers), writes storage and DB

After each migration the pipeline user copies the finished SQLite DB to the app's releases
directory and flips a `current.db` symlink. A narrow sudoers entry allows the pipeline user to
restart the app service without any broader privileges.

SSH host alias is configured in your local `~/.ssh/config`. The deploy env var
(`DEPLOY_HOST_ALIAS`) can be set in `.env.local`.

---

## First-time setup

Provision **must** run before deploy — the deploy script activates a release and
health-checks the app, which requires the service user to already exist.

### 1. Install bun on the VM

```bash
ssh hetzner "curl -fsSL https://bun.sh/install | bash"
```

### 2. Provision VM

SSH in once to create users, directories, sudoers entry, and install systemd units:

```bash
ssh hetzner "/opt/avoimempi-eduskunta/scripts/provision-vm.sh"
```

### 3. Deploy

```bash
bun scripts/deploy.mts all
```

### 4. Upload and activate the database

```bash
bun scripts/deploy.mts database   # uploads DB, activates symlink, restarts app
bun scripts/deploy.mts data       # uploads row stores for incremental pipeline runs
```

The pipeline timers start automatically after provisioning.

---

## Routine deployments

```bash
bun scripts/deploy.mts app       # deploy new app release
bun scripts/deploy.mts pipeline  # deploy updated pipeline build
```

After deploying pipeline, re-install timers if job scripts changed:

```bash
ssh hetzner "/opt/avoimempi-eduskunta/scripts/pipeline/install-pipeline-systemd-jobs.sh install"
```

---

## Manually running pipeline jobs

```bash
ssh hetzner

sudo -u avoimempi-eduskunta-pipeline /opt/avoimempi-eduskunta/scripts/pipeline-jobs.sh scrape-all
sudo -u avoimempi-eduskunta-pipeline /opt/avoimempi-eduskunta/scripts/pipeline-jobs.sh parse-all
sudo -u avoimempi-eduskunta-pipeline /opt/avoimempi-eduskunta/scripts/pipeline-jobs.sh migrate-sync

# All three in sequence
sudo -u avoimempi-eduskunta-pipeline /opt/avoimempi-eduskunta/scripts/pipeline-jobs.sh full-cycle
```

If a previous job crashed and left a stale lock:

```bash
rm -rf /var/lib/avoimempi-eduskunta-pipeline/locks/pipeline.lock
```

Follow pipeline logs in real time:

```bash
tail -f /var/log/avoimempi-eduskunta/pipeline-jobs.log
```

---

## Checking status

```bash
# Pipeline timers and last run times
ssh hetzner "systemctl list-timers 'avoimempi-eduskunta-pipeline-*'"

# Pipeline timer status
ssh hetzner "/opt/avoimempi-eduskunta/scripts/pipeline/install-pipeline-systemd-jobs.sh status"

# App service
ssh hetzner "systemctl status avoimempi-eduskunta-app"

# App logs
ssh hetzner "journalctl -u avoimempi-eduskunta-app -n 50 --no-pager"

# Pipeline logs
ssh hetzner "journalctl -u 'avoimempi-eduskunta-pipeline-*' -n 50 --no-pager"
```

---

## Troubleshooting

**Stale lock file** — a job crashed without releasing the lock:
```bash
ssh hetzner "rm -rf /var/lib/avoimempi-eduskunta-pipeline/locks/pipeline.lock"
```

**App fails to start** — check journal for the actual error:
```bash
ssh hetzner "journalctl -u avoimempi-eduskunta-app -n 100 --no-pager"
```

**DB not updated after migration** — run migrate-sync manually:
```bash
ssh hetzner "sudo -u avoimempi-eduskunta-pipeline /opt/avoimempi-eduskunta/scripts/pipeline-jobs.sh migrate-sync"
```
