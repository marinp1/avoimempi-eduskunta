# Scaleway Infra (VM-Only)

This Terraform defines a simplified VM-first setup:

- Shared security group (SSH + HTTP/HTTPS inbound)
- VPC + Private Network
- App VM (`DEV1-S`, Debian 13) — 2 vCPUs for concurrent HTTP/SQLite read handling
- Pipeline VM (`STARDUST1-S`, Debian 13) — sequential batch ETL, 1 vCPU is sufficient
- Raw+parsed Block Storage volume attached to the pipeline VM
- Final DB Block Storage volume attached to the app VM
- Cloud-init mount bootstrap for attached volumes (format-if-needed + `/etc/fstab` + mount)
- Local block-storage env contract for datapipe storage paths

## Storage model

Local filesystem path contract:

- `STORAGE_PROVIDER=local`
- `STORAGE_LOCAL_DIR=/mnt/pipeline-raw-parsed/data` (configurable via Terraform var)

## DB sync model

After each migration run, the pipeline VM rsync's the finished SQLite DB to the app VM over
the private network. Use `tofu output sync_config` for the exact command and hostnames.

Recommended runtime approach:

- Keep scraper/parser row stores on the mounted pipeline volume:
  `STORAGE_LOCAL_DIR=/mnt/pipeline-raw-parsed/data`
- Build the final DB on pipeline local disk (not block storage), for example:
  `DB_PATH=/var/lib/avoimempi-eduskunta/avoimempi-eduskunta.db`
- Rsync that DB file to app VM path:
  `/mnt/app-db/avoimempi-eduskunta.db`

The app VM receives the DB at `/mnt/app-db/avoimempi-eduskunta.db` (configurable via
`TF_VAR_app_db_mount_path`). Set up a systemd timer or cron job on the pipeline VM to run
the rsync after each successful migration.

`--delay-updates` ensures the app VM never reads a half-written file.

## Common overrides

```bash
export TF_VAR_project_id="<your-scaleway-project-id>"
export TF_VAR_pipeline_region="nl-ams"
export TF_VAR_pipeline_zone="nl-ams-1"
export TF_VAR_server_image_name="Debian 12"
export TF_VAR_app_server_type="DEV1-S"
export TF_VAR_pipeline_server_type="STARDUST1-S"
export TF_VAR_ssh_port=22  # set to a non-standard port to avoid exposing 22 publicly
export TF_VAR_pipeline_storage_local_dir="/mnt/pipeline-raw-parsed/data"
export TF_VAR_pipeline_raw_parsed_volume_mount_path="/mnt/pipeline-raw-parsed"
export TF_VAR_pipeline_raw_parsed_volume_name="avoimempi-eduskunta-raw-parsed"
export TF_VAR_pipeline_raw_parsed_volume_size_gb=100
export TF_VAR_pipeline_db_volume_mount_path="/mnt/pipeline-db"
export TF_VAR_pipeline_local_db_path="/var/lib/avoimempi-eduskunta/avoimempi-eduskunta.db"
export TF_VAR_pipeline_db_volume_name="avoimempi-eduskunta-db"
export TF_VAR_pipeline_db_volume_size_gb=40
export TF_VAR_app_db_mount_path="/mnt/app-db"
export TF_VAR_app_db_device_path="/dev/vdb"
export TF_VAR_pipeline_raw_parsed_device_path="/dev/vdb"
```

## Apply

```bash
cd packages/infra
tofu init
tofu plan
tofu apply
```

## Useful outputs

```bash
tofu output pipeline_private_network
tofu output pipeline_storage_env
tofu output pipeline_block_storage
tofu output app_vm
tofu output pipeline_vm
tofu output sync_config
```

## Pipeline job setup

From the pipeline VM, after code deploy:

```bash
# 1) Move existing row-store DBs onto mounted pipeline storage
STORAGE_LOCAL_DIR=/mnt/pipeline-raw-parsed/data \
  ./scripts/bootstrap-pipeline-storage.sh

# 2) Install systemd timers (scrape, parse, migrate+sync)
APP_VM_SYNC_HOST="root@avoimempi-eduskunta-app.pn-avoimempi-eduskunta.priv" \
STORAGE_LOCAL_DIR=/mnt/pipeline-raw-parsed/data \
DB_PATH=/var/lib/avoimempi-eduskunta/avoimempi-eduskunta.db \
APP_SYNC_DEST=/mnt/app-db/avoimempi-eduskunta.db \
./scripts/install-pipeline-systemd-jobs.sh install

# 3) Verify timers/services
./scripts/install-pipeline-systemd-jobs.sh status
```

Default schedules (override with env vars if needed):

- Scrape: `15 * * * *`
- Parse: `35 * * * *`
- Migrate + sync: `0 */6 * * *`

To deploy scraper/parser/migrator as separate pipeline applications, use these entrypoints:

- `./scripts/pipeline-scraper-app.sh`
- `./scripts/pipeline-parser-app.sh`
- `./scripts/pipeline-migrator-app.sh`

## Notes

- Queue and cloud-function resources are intentionally removed in this topology.
- This stack is intended for running scraper/parser/migrator directly on the pipeline VM.
- Both VMs share the same security group; private network traffic between them is unrestricted.
- Both VMs use a non-standard SSH port (default 22) set via cloud-init. Use `-p $TF_VAR_ssh_port` in SSH commands.
- Pipeline VM has no public IP. Access it via the app VM as a jump host:
  `ssh -J user@<app-public-ip>:<port> -p <port> user@avoimempi-eduskunta-pipeline.pn-avoimempi-eduskunta.priv`
