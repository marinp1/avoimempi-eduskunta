# Scaleway Infra (Single Bucket)

This folder provisions one hardcoded Scaleway Object Storage bucket for pipeline data.

## What it creates

- Bucket: `bkt-avoimempi-eduskunta-pipeline`
- Region: `nl-ams`
- ACL: `private` (not public)
- Logical prefixes used by the app:
  - `raw/`
  - `parsed/`
  - `metadata/`
  - `artifacts/`

Note: S3-compatible storage does not require explicit folder resources. Prefixes appear automatically when objects are written.

## Usage

```bash
cd packages/infra
tofu init
tofu plan
tofu apply
```

## If bucket name is taken

Edit `packages/infra/main.tf` and change `scaleway_object_bucket.pipeline.name`.
