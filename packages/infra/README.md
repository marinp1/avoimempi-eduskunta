# Scaleway Infra (Full Stack, No Feature Flags)

This Terraform defines all pipeline resources unconditionally:

- VPC + Private Network
- private managed PostgreSQL row-store
- SQS queues + credentials + DLQs
- serverless functions + triggers for inspector/scraper/parser/migrator
- local block-storage env contract for VM-side storage paths

## Storage model

Local filesystem path contract:

- `STORAGE_PROVIDER=local`
- `STORAGE_LOCAL_DIR=/mnt/pipeline-data/data` (configurable via Terraform var)

Durable shared worker row-store:

- private managed PostgreSQL attached to Private Network
- exported as sensitive `ROW_STORE_DATABASE_URL`

## Required variables

These zip artifact vars are required (no optional function toggles):

```bash
export TF_VAR_pipeline_inspector_zip_file="/absolute/path/to/inspector.zip"
export TF_VAR_pipeline_inspector_worker_zip_file="/absolute/path/to/inspector-worker.zip"
export TF_VAR_pipeline_scraper_zip_file="/absolute/path/to/scraper.zip"
export TF_VAR_pipeline_parser_zip_file="/absolute/path/to/parser.zip"
export TF_VAR_pipeline_migrator_zip_file="/absolute/path/to/migrator.zip"
```

Common overrides:

```bash
export TF_VAR_project_id="<your-scaleway-project-id>"
export TF_VAR_pipeline_region="nl-ams"
export TF_VAR_pipeline_storage_local_dir="/mnt/pipeline-data/data"
export TF_VAR_pipeline_block_volume_mount_path="/mnt/pipeline-data"
export TF_VAR_pipeline_block_volume_name="avoimempi-eduskunta-data"
export TF_VAR_pipeline_block_volume_size_gb=100
```

Row-store tuning overrides (optional):

```bash
export TF_VAR_pipeline_row_store_name="avoimempi-eduskunta-row-store"
export TF_VAR_pipeline_row_store_engine="PostgreSQL-15"
export TF_VAR_pipeline_row_store_node_type="DB-DEV-S"
export TF_VAR_pipeline_row_store_user_name="pipeline"
export TF_VAR_pipeline_row_store_database_name="rdb"
export TF_VAR_pipeline_row_store_port=5432
```

## Apply

```bash
cd packages/infra
tofu init
tofu plan
tofu apply
```

## Temporary seed access (open -> seed -> close)

Use this only for one-off local seeding when your local machine needs direct DB access.

1. Open temporary access for your current public IP (`/32`):

```bash
export MY_IP="$(curl -s https://ifconfig.me)"
export TF_VAR_temporary_seed_cidrs="[\"${MY_IP}/32\"]"
cd packages/infra
tofu apply
```

2. Check whether a public DB endpoint exists:

```bash
tofu output pipeline_row_store_public_endpoint
```

If `has_public_endpoint = false`, local public seeding cannot connect until a public endpoint exists for the DB instance.

3. Seed from your local machine:

```bash
export ROW_STORE_DATABASE_URL="$(tofu output -json pipeline_row_store_env | jq -r '.ROW_STORE_DATABASE_URL')"
export ROW_STORE_DIR="/path/to/data"
bun run scripts/seed-postgres-row-store.ts
```

4. Close temporary access immediately:

```bash
export TF_VAR_temporary_seed_cidrs='[]'
cd packages/infra
tofu apply
```

## Useful outputs

```bash
tofu output pipeline_private_network
tofu output pipeline_storage_env
tofu output pipeline_block_storage
tofu output -json pipeline_row_store_env
tofu output pipeline_row_store_connection
tofu output pipeline_row_store_public_endpoint
tofu output pipeline_queue_names
tofu output pipeline_queue_urls
tofu output pipeline_queue_env_template
tofu output -json pipeline_sqs_credentials_inspector
tofu output -json pipeline_sqs_credentials_worker
tofu output cloud_function_namespace
tofu output cloud_functions
```

## Security notes

- All serverless functions are attached to the created Private Network (`private_network_id`).
- Row-store is provisioned on private networking (module `private_network` input), not intended for public exposure.
- SQS/MNQ endpoints are managed public control-plane endpoints by design; access is credential-controlled.
- Keep sensitive outputs (`pipeline_row_store_env`, SQS credentials) out of logs.
