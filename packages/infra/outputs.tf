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
  value       = local.pipeline_storage_env
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

output "pipeline_row_store_env" {
  description = "Environment variables to activate the PostgreSQL row store in pipeline workers."
  sensitive   = true
  value       = local.pipeline_row_store_env
}

output "pipeline_queue_env_template" {
  description = "Shared environment values for queue workers (credentials injected separately per role)."
  value = local.pipeline_queue_env_template
}

output "cloud_function_namespace" {
  description = "Serverless function namespace (created when enable_cloud_functions=true)."
  value       = var.enable_cloud_functions ? scaleway_function_namespace.pipeline[0].id : null
}

output "cloud_functions" {
  description = "IDs for serverless functions and their triggers (when enabled)."
  value = var.enable_cloud_functions ? {
    inspector_dispatcher_function_id = scaleway_function.inspector_dispatcher[0].id
    inspector_cron_id                = scaleway_function_cron.inspector[0].id
    inspector_worker_function_id     = scaleway_function.inspector_worker[0].id
    inspector_worker_trigger_id      = scaleway_function_trigger.inspector_worker[0].id
    scraper_function_id              = scaleway_function.scraper_worker[0].id
    scraper_trigger_id               = scaleway_function_trigger.scraper_worker[0].id
    parser_function_id               = scaleway_function.parser_worker[0].id
    parser_trigger_id                = scaleway_function_trigger.parser_worker[0].id
    migrator_function_id             = length(scaleway_function.migrator) > 0 ? scaleway_function.migrator[0].id : null
  } : null
}
