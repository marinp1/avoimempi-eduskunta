output "pipeline_bucket_name" {
  description = "Primary pipeline bucket."
  value       = scaleway_object_bucket.pipeline.name
}

output "storage_endpoint" {
  description = "S3-compatible endpoint for this bucket region."
  value       = "https://s3.nl-ams.scw.cloud"
}

output "pipeline_storage_env" {
  description = "Environment values to wire the pipeline to this bucket."
  value = {
    STORAGE_PROVIDER    = "s3"
    STORAGE_S3_REGION   = "nl-ams"
    STORAGE_S3_BUCKET   = scaleway_object_bucket.pipeline.name
    STORAGE_S3_ENDPOINT = "https://s3.nl-ams.scw.cloud"
  }
}

output "pipeline_prefixes" {
  description = "Logical prefixes used by the data pipeline."
  value       = ["raw/", "parsed/", "metadata/", "artifacts/"]
}

output "pipeline_queue_names" {
  description = "SQS queue names used by datapipe orchestration."
  value = {
    PIPELINE_QUEUE_INSPECTOR = scaleway_mnq_sqs_queue.pipeline_inspector.name
    PIPELINE_QUEUE_SCRAPER   = scaleway_mnq_sqs_queue.pipeline_scraper.name
    PIPELINE_QUEUE_PARSER    = scaleway_mnq_sqs_queue.pipeline_parser.name
  }
}

output "pipeline_queue_urls" {
  description = "Created queue URLs (main and dead-letter)."
  value = {
    inspector     = scaleway_mnq_sqs_queue.pipeline_inspector.url
    scraper       = scaleway_mnq_sqs_queue.pipeline_scraper.url
    parser        = scaleway_mnq_sqs_queue.pipeline_parser.url
    inspector_dlq = scaleway_mnq_sqs_queue.pipeline_inspector_dlq.url
    scraper_dlq   = scaleway_mnq_sqs_queue.pipeline_scraper_dlq.url
    parser_dlq    = scaleway_mnq_sqs_queue.pipeline_parser_dlq.url
  }
}

output "pipeline_sqs_credentials_inspector" {
  description = "Publish-only credentials for the inspector service."
  sensitive   = true
  value = {
    PIPELINE_SQS_ACCESS_KEY_ID     = scaleway_mnq_sqs_credentials.pipeline_inspector.access_key
    PIPELINE_SQS_SECRET_ACCESS_KEY = scaleway_mnq_sqs_credentials.pipeline_inspector.secret_key
  }
}

output "pipeline_sqs_credentials_worker" {
  description = "Receive + publish credentials for scraper and parser workers."
  sensitive   = true
  value = {
    PIPELINE_SQS_ACCESS_KEY_ID     = scaleway_mnq_sqs_credentials.pipeline_worker.access_key
    PIPELINE_SQS_SECRET_ACCESS_KEY = scaleway_mnq_sqs_credentials.pipeline_worker.secret_key
  }
}

output "pipeline_queue_env_template" {
  description = "Shared environment values for queue workers (credentials injected separately per role)."
  value = {
    PIPELINE_SQS_ENDPOINT        = "https://sqs.mnq.nl-ams.scw.cloud"
    PIPELINE_SQS_REGION          = "nl-ams"
    PIPELINE_QUEUE_INSPECTOR     = scaleway_mnq_sqs_queue.pipeline_inspector.name
    PIPELINE_QUEUE_SCRAPER       = scaleway_mnq_sqs_queue.pipeline_scraper.name
    PIPELINE_QUEUE_PARSER        = scaleway_mnq_sqs_queue.pipeline_parser.name
    PIPELINE_QUEUE_WAIT_SECONDS  = "10"
    PIPELINE_QUEUE_MAX_MESSAGES  = "1"
    PIPELINE_QUEUE_IDLE_DELAY_MS = "300"
  }
}
