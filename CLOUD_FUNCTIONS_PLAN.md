# Block-Storage-First Pipeline Plan

## Model

Primary model is VM-hosted pipeline state on mounted block storage:

- scraper writes `raw.db`
- parser writes `parsed.db`
- migrator rebuilds `avoimempi-eduskunta.db`

All state lives under local storage, typically:

```bash
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=/mnt/pipeline-data/data
```

## Why

- no S3 dependency
- no serverless SQL dependency
- simple operational model
- full rebuild remains possible from source API

## Queue orchestration

SQS queue orchestration remains valid:

1. inspector enqueues scrape tasks
2. scraper enqueues parse tasks
3. parser writes parsed row store
4. migrator runs separately (scheduled/manual)

## Serverless limitation

Scaleway Functions cannot mount VM block volumes.

Implication:

- local block-storage durability is guaranteed on VM workers
- serverless functions can still run, but local filesystem state is not a durable shared row-store

So the recommended durable setup is:

- queue workers + migrator on VM with mounted block storage
- optional serverless only for stateless dispatch if needed

## Environment baseline

```bash
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=/mnt/pipeline-data/data
```

Optional, only if using external row-store:

```bash
ROW_STORE_PROVIDER=postgres
ROW_STORE_DATABASE_URL=postgres://...
```

## Operations

- Run workers continuously on the VM
- Run migrator periodically (systemd timer/cron) after parse backlog clears
- Publish app DB locally to the serving process

No object storage sync step is required in this model.
