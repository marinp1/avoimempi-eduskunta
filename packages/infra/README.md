# Scaleway Infra (Bucket + SQS Queues)

This folder provisions:

- one hardcoded Scaleway Object Storage bucket for pipeline data
- Scaleway Queues (SQS API) resources for datapipe orchestration

## What it creates

- Bucket: `bkt-avoimempi-eduskunta-pipeline`
- Region: `nl-ams`
- ACL: `private` (not public)
- Queues service activation (`scaleway_mnq_sqs`)
- One SQS credential for pipeline workers (manage/publish/receive)
- Three SQS queues:
  - `datapipe-inspector`
  - `datapipe-scraper`
  - `datapipe-parser`
- Logical prefixes used by the app:
  - `raw/`
  - `parsed/`
  - `metadata/`
  - `artifacts/`

Note: S3-compatible storage does not require explicit folder resources. Prefixes appear automatically when objects are written.

## Usage

Optional (recommended) override for project ID used for queue resources:

```bash
export TF_VAR_project_id="<your-scaleway-project-id>"
```

Then run:

```bash
cd packages/infra
tofu init
tofu plan
tofu apply
```

If `TF_VAR_project_id` is omitted, the provider default project configuration is used.

## Useful outputs

After apply, inspect outputs:

```bash
tofu output pipeline_queue_names
tofu output pipeline_queue_urls
tofu output pipeline_queue_env_template
tofu output -json pipeline_sqs_credentials
```

`pipeline_sqs_credentials` is marked sensitive and contains:

- `PIPELINE_SQS_ACCESS_KEY_ID`
- `PIPELINE_SQS_SECRET_ACCESS_KEY`

## Upload existing local data

After bucket creation, sync local pipeline folders:

```bash
cp .env.sync-storage-s3.example .env.sync-storage-s3
bun --env-file=.env.sync-storage-s3 run sync:storage:s3 --dry-run
bun --env-file=.env.sync-storage-s3 run sync:storage:s3
```

Defaults to uploading `data/raw` and `data/parsed`, and row-store DB backups (`raw.db`, `parsed.db`) to `artifacts/row-store/latest/`.
Use `--all` to include `metadata` and `artifacts`:

```bash
bun --env-file=.env.sync-storage-s3 run sync:storage:s3 --all
```

Optional: also write timestamped row-store DB snapshots:

```bash
bun --env-file=.env.sync-storage-s3 run sync:storage:s3 --snapshot-row-store-dbs
```

## Local requirements for sync script

`bun run sync:storage:s3` requires:

- Bun installed (repo runtime)
- AWS CLI installed (`aws` command) for S3-compatible sync operations
- Network access to `https://s3.nl-ams.scw.cloud`
- A filled `.env.sync-storage-s3` file with:
  - `STORAGE_S3_BUCKET`
  - `STORAGE_S3_REGION`
  - `STORAGE_S3_ENDPOINT`
  - credentials via one of:
    - `STORAGE_S3_ACCESS_KEY_ID` + `STORAGE_S3_SECRET_ACCESS_KEY`
    - `SCW_ACCESS_KEY` + `SCW_SECRET_KEY`
    - `SCW_PROFILE` (requires `scw` CLI installed and profile configured)

Quick checks:

```bash
command -v bun
command -v aws
```

If using `SCW_PROFILE`:

```bash
command -v scw
scw config get access-key
```

## If bucket name is taken

Edit `packages/infra/main.tf` and change `scaleway_object_bucket.pipeline.name`.
