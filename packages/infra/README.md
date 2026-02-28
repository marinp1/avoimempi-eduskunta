# Scaleway Infra (VM-Only)

This Terraform defines a simplified VM-first setup:

- Shared security group (SSH + HTTP/HTTPS inbound)
- VPC + Private Network
- App VM (`DEV1-S`, Debian 13) — 2 vCPUs for concurrent HTTP/SQLite read handling
- Pipeline VM (`STARDUST1-S`, Debian 13) — sequential batch ETL, 1 vCPU is sufficient
- Raw+parsed Block Storage volume attached to the pipeline VM
- Final DB Block Storage volume attached to the pipeline VM
- Local block-storage env contract for datapipe storage paths

## Storage model

Local filesystem path contract:

- `STORAGE_PROVIDER=local`
- `STORAGE_LOCAL_DIR=/mnt/pipeline-raw-parsed/data` (configurable via Terraform var)

## DB sync model

After each migration run, the pipeline VM rsync's the finished SQLite DB to the app VM over
the private network. Use `tofu output sync_config` for the exact command and hostnames.

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
export TF_VAR_pipeline_db_volume_name="avoimempi-eduskunta-db"
export TF_VAR_pipeline_db_volume_size_gb=40
export TF_VAR_app_db_mount_path="/mnt/app-db"
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
tofu output debian_image
tofu output app_vm
tofu output pipeline_vm
tofu output sync_config
```

## Notes

- Queue and cloud-function resources are intentionally removed in this topology.
- This stack is intended for running scraper/parser/migrator directly on the pipeline VM.
- Both VMs share the same security group; private network traffic between them is unrestricted.
- Both VMs use a non-standard SSH port (default 22) set via cloud-init. Use `-p $TF_VAR_ssh_port` in SSH commands.
- Pipeline VM has no public IP. Access it via the app VM as a jump host:
  `ssh -J user@<app-public-ip>:<port> -p <port> user@avoimempi-eduskunta-pipeline.pn-avoimempi-eduskunta.priv`
