# Deployment & Operations

## Architecture

Two Scaleway VMs connected via private network (`172.16.0.0/22`):

- **App VM** (`scaleway-app`, `172.16.0.2`) — Bun HTTP server, public-facing
- **Pipeline VM** (`scaleway-pipeline`, `172.16.0.3`) — scraper, parser, migrator (systemd timers)

Both run services as the `avoimempi-eduskunta` system user (non-root).
The pipeline VM pushes a new DB to the app VM after each migration via rsync over the private network.

SSH host aliases are configured in your local `~/.ssh/config`.
Deploy env vars (`DEPLOY_APP_HOST_ALIAS`, `DEPLOY_PIPELINE_HOST_ALIAS`) can be set in `.env.local`.

---

## First-time setup

### 1. Deploy

```bash
bun scripts/deploy.mts app       # build + activate on app VM
bun scripts/deploy.mts pipeline  # build + upload scripts to pipeline VM
```

### 2. Provision app VM

```bash
ssh scaleway-app "/opt/avoimempi-eduskunta/scripts/provision-app-vm.sh"
```

### 3. Provision pipeline VM

```bash
ssh scaleway-pipeline "/opt/avoimempi-eduskunta/scripts/provision-pipeline-vm.sh"
# Edit pipeline.env if APP_VM_SYNC_HOST needs adjusting
ssh scaleway-pipeline "cat /opt/avoimempi-eduskunta/shared/pipeline.env"
```

### 4. Set up pipeline → app VM SSH trust

```bash
# Args: APP_PRIV_HOST  APP_PRIV_PORT (SSH port on the private interface)
bash scripts/setup-vm-ssh-trust.sh root@172.16.0.2 1363
```

### 5. Install pipeline systemd timers

```bash
ssh scaleway-pipeline "/opt/avoimempi-eduskunta/scripts/install-pipeline-systemd-jobs.sh install"
```

### 6. Mount block storage on pipeline VM

```bash
ssh scaleway-pipeline "
  mkfs.ext4 /dev/vda
  mkdir -p /mnt/pipeline-raw-parsed
  mount /dev/vda /mnt/pipeline-raw-parsed
  echo '/dev/vda /mnt/pipeline-raw-parsed ext4 defaults 0 2' >> /etc/fstab
  mkdir -p /mnt/pipeline-raw-parsed/data
  chown avoimempi-eduskunta:avoimempi-eduskunta /mnt/pipeline-raw-parsed /mnt/pipeline-raw-parsed/data
"
```

---

## Routine deployments

```bash
bun scripts/deploy.mts app       # deploy new app release
bun scripts/deploy.mts pipeline  # deploy updated pipeline build
```

After deploying pipeline, re-install timers if the job scripts changed:

```bash
ssh scaleway-pipeline "/opt/avoimempi-eduskunta/scripts/install-pipeline-systemd-jobs.sh install"
```

---

## Manually running pipeline jobs

SSH into the pipeline VM and run as the service user:

```bash
ssh scaleway-pipeline

# Individual stages
sudo -u avoimempi-eduskunta /opt/avoimempi-eduskunta/scripts/pipeline-jobs.sh scrape-all
sudo -u avoimempi-eduskunta /opt/avoimempi-eduskunta/scripts/pipeline-jobs.sh parse-all
sudo -u avoimempi-eduskunta /opt/avoimempi-eduskunta/scripts/pipeline-jobs.sh migrate-sync

# All three in sequence
sudo -u avoimempi-eduskunta /opt/avoimempi-eduskunta/scripts/pipeline-jobs.sh full-cycle
```

If a previous job crashed and left a stale lock:

```bash
rm -rf /var/lib/avoimempi-eduskunta/pipeline-locks/pipeline.lock
```

Follow logs in real time:

```bash
tail -f /var/log/avoimempi-eduskunta/pipeline-jobs.log
```

---

## Checking status

```bash
# Pipeline timers and last run times
ssh scaleway-pipeline "systemctl list-timers 'avoimempi-eduskunta-pipeline-*'"

# Pipeline timer status
ssh scaleway-pipeline "/opt/avoimempi-eduskunta/scripts/install-pipeline-systemd-jobs.sh status"

# App service
ssh scaleway-app "systemctl status avoimempi-eduskunta-app"

# App logs
ssh scaleway-app "journalctl -u avoimempi-eduskunta-app -n 50 --no-pager"

# Pipeline logs
ssh scaleway-pipeline "journalctl -u 'avoimempi-eduskunta-pipeline-*' -n 50 --no-pager"
```

---

## Troubleshooting

**Stale lock file** — a job crashed without releasing the lock:
```bash
ssh scaleway-pipeline "rm -rf /var/lib/avoimempi-eduskunta/pipeline-locks/pipeline.lock"
```

**App fails to start** — check journal for the actual error:
```bash
ssh scaleway-app "journalctl -u avoimempi-eduskunta-app -n 100 --no-pager"
```

**DB not updated after migration** — test the sync manually:
```bash
ssh scaleway-pipeline "sudo -u avoimempi-eduskunta /opt/avoimempi-eduskunta/scripts/pipeline-jobs.sh migrate-sync"
```

**Block volume not mounted after reboot** — verify `/etc/fstab` has the entry and remount:
```bash
ssh scaleway-pipeline "mount -a && df -h /mnt/pipeline-raw-parsed"
```
