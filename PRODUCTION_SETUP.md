# Production Setup and Readiness Review

This document describes the current infrastructure/deployment model in this repository and evaluates production readiness.

## Executive verdict

Current status: **partially ready, not yet production-grade**.

You have a working baseline for a small VM-based production topology (separated app and pipeline hosts, private network, scheduled ETL, DB handoff). However, several critical controls are still missing.

## Current production topology (as implemented)

Infra is defined in [`packages/infra/main.tf`](/workspaces/avoimempi-eduskunta/packages/infra/main.tf):

- 1 public app VM + 1 private pipeline VM
- Shared security group (inbound SSH + 80 + 443)
- VPC + private network for app/pipeline traffic
- Separate block volumes for pipeline row-store and app DB

Key behavior:

- Pipeline writes raw/parsed row-store data to local storage path (`/mnt/pipeline-raw-parsed/data`)
- Pipeline migrates into a local SQLite file
- Pipeline pushes the SQLite file to app VM with `rsync --delay-updates`
- App serves data from the synced SQLite file

Outputs and intended operational wiring are documented in
[`packages/infra/README.md`](/workspaces/avoimempi-eduskunta/packages/infra/README.md).

## Deployment and runtime flow

Deploy:

- [`scripts/deploy.mts`](/workspaces/avoimempi-eduskunta/scripts/deploy.mts) builds and `scp`s app/pipeline artifacts to remote hosts.
- App artifact includes server build + config + [`scripts/start.sh`](/workspaces/avoimempi-eduskunta/scripts/start.sh).
- Pipeline artifact includes compiled CLIs and cron helper scripts.

Runtime:

- App process can be managed by `systemd` using:
  - [`scripts/install-app-systemd-service.sh`](/workspaces/avoimempi-eduskunta/scripts/install-app-systemd-service.sh)
  - [`scripts/run-app.sh`](/workspaces/avoimempi-eduskunta/scripts/run-app.sh)
- Pipeline jobs can be managed by `systemd` timers using:
  - [`scripts/install-pipeline-systemd-jobs.sh`](/workspaces/avoimempi-eduskunta/scripts/install-pipeline-systemd-jobs.sh)
  - scrape every 3 hours (default includes 03:00 start cadence)
  - parse every 3 hours (default includes 05:00 start cadence)
  - migrate+sync every 3 hours (default includes 07:00 start cadence)
  - scraper service timeout defaults to 30 minutes
- Health endpoint exists at `/api/health` in [`packages/server/routes/core-routes.ts`](/workspaces/avoimempi-eduskunta/packages/server/routes/core-routes.ts).

Release activation:

- [`scripts/deploy.mts`](/workspaces/avoimempi-eduskunta/scripts/deploy.mts) now deploys app builds as versioned releases under `${APP_DIR}/releases/<release-id>`.
- [`scripts/app-release.sh`](/workspaces/avoimempi-eduskunta/scripts/app-release.sh) updates the `${APP_DIR}/current` symlink, restarts systemd service, checks `/api/health`, and rolls back automatically if unhealthy.

## What is already good

- Separation of read-serving app and write-heavy pipeline workloads.
- Private network DB synchronization between hosts.
- Atomic-ish DB handoff with `rsync --delay-updates`.
- Migration locking and scheduled ETL automation scripts.
- Infrastructure as code exists (Terraform/OpenTofu module).

## Blocking gaps for production-grade operation

### P0 (must fix first)

1. **No TLS termination setup in repo**
   - Security group opens 443 ([`packages/infra/main.tf`](/workspaces/avoimempi-eduskunta/packages/infra/main.tf:163)), but no reverse proxy/cert management is provisioned.
   - App itself defaults to plain HTTP port 80 ([`packages/server/config/runtime-config.ts`](/workspaces/avoimempi-eduskunta/packages/server/config/runtime-config.ts:33)).
   - Action:
     - Add reverse proxy + certificates (Caddy/Nginx/Traefik) and HTTP->HTTPS redirect.

2. **Verify boot-time mount behavior in each environment**
   - Terraform now includes cloud-init mount bootstrap for app/pipeline attached volumes.
   - Action:
     - Keep device path variables (`TF_VAR_app_db_device_path`, `TF_VAR_pipeline_raw_parsed_device_path`) aligned with the actual VM hardware mapping.

### P1 (strongly recommended)

1. **No backup/restore runbook for SQLite and volumes**
   - Action:
     - Define automated snapshot/backup schedule and restore drills.

2. **No CI/CD pipeline in repository**
   - No `.github/workflows` pipeline for test/lint/build/deploy gating.
   - Action:
     - Add CI checks and controlled deployment promotion flow.

3. **No centralized observability/alerting**
   - Current logging is local file append.
   - Action:
     - Add metrics/log shipping, uptime checks, and alerts for ETL failures and app downtime.

4. **Terraform state backend policy should be explicit**
   - State is `.gitignore`d, but state handling policy (remote backend, encryption, locking, access controls) is not documented/enforced in code.
   - Action:
     - Define and document a single remote backend strategy for all environments.

### P2 (quality hardening)

1. **Security hardening beyond SG baseline**
   - Consider SSH allowlisting, fail2ban, unattended upgrades, non-root runtime user.

2. **Disaster recovery tests**
   - Regularly validate full rebuild from source row-store and from backups.

## How the current setup is intended to work (runbook)

1. Provision infra with OpenTofu/Terraform in `packages/infra`.
2. Configure VM storage mounts to match Terraform path contract.
3. Deploy artifacts with:
   - `bun scripts/deploy.mts app`
   - `bun scripts/deploy.mts pipeline`
4. On pipeline VM, install cron jobs via `scripts/install-pipeline-jobs.sh install`.
5. Pipeline runs scrape -> parse -> migrate, then `rsync`s DB to app VM.
6. App serves from synced SQLite file, exposing `/api/health`.

## Deploying a new application version

### Prerequisites

1. SSH aliases for app/pipeline hosts are configured locally (defaults used by deploy script: `scaleway-app`, `scaleway-pipeline`).
2. Bun is installed locally (deploy script runs local builds).
3. App VM has `systemd` and Bun installed.
4. Pipeline VM has `systemd`, Bun, and `rsync` installed.

### First deployment on a fresh environment

1. Provision infrastructure:
   - `cd packages/infra`
   - `tofu init`
   - `tofu apply`
2. Deploy app release and install/enable app `systemd` service:
   - `cd /path/to/repo`
   - `bun scripts/deploy.mts app`
3. Deploy pipeline artifacts and install/enable pipeline `systemd` timers:
   - `bun scripts/deploy.mts pipeline`
4. (Optional) Deploy everything in one command:
   - `bun scripts/deploy.mts all`

### Subsequent deployments (new app version)

1. Deploy app:
   - `bun scripts/deploy.mts app`
2. Deploy pipeline if pipeline code/scripts changed:
   - `bun scripts/deploy.mts pipeline`

What happens during `app` deploy:

- A new release is uploaded to `${APP_DIR}/releases/<release-id>`.
- `${APP_DIR}/current` is repointed to the release.
- `systemd` service is restarted.
- Health check runs against `http://127.0.0.1/api/health`.
- If health check fails, previous release is restored automatically.

### Post-deploy verification

Run these checks:

1. App service:
   - `ssh scaleway-app 'systemctl status avoimempi-eduskunta-app --no-pager'`
2. App health:
   - `ssh scaleway-app 'curl -fsS http://127.0.0.1/api/health && echo OK'`
3. Pipeline timers:
   - `ssh scaleway-pipeline 'systemctl list-timers --all | grep avoimempi-eduskunta-pipeline'`
4. Latest pipeline logs:
   - `ssh scaleway-pipeline 'journalctl -u avoimempi-eduskunta-pipeline-migrate.service -n 100 --no-pager'`

## Minimum checklist before calling this production-grade

- [ ] Enforce/document remote Terraform/OpenTofu backend policy
- [ ] Add TLS termination + certificate automation
- [ ] Validate mount bootstrap after first apply in each environment
- [ ] Implement backup + restore procedures
- [ ] Add CI/CD gating
- [ ] Add monitoring + alerting
