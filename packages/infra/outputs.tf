output "pipeline_storage_env" {
  description = "Environment values to wire the pipeline to local block storage mounted on VM."
  value       = local.pipeline_storage_env
}

output "pipeline_private_network" {
  description = "VPC and Private Network created for private row-store traffic."
  value = {
    vpc_id             = scaleway_vpc.pipeline.id
    private_network_id = scaleway_vpc_private_network.pipeline.id
    region             = var.pipeline_region
  }
}

output "pipeline_block_storage" {
  description = "Block-storage expectations for VM deployment (define/attach/mount in instance infrastructure)."
  value       = local.pipeline_block_storage
}

output "pipeline_row_store_env" {
  description = "Row-store environment values (private managed PostgreSQL) for pipeline workers."
  sensitive   = true
  value       = local.pipeline_row_store_env
}

output "pipeline_row_store_connection" {
  description = "Non-secret private row-store connection metadata."
  value = {
    host          = module.pipeline_private_row_store.instance_ip
    port          = var.pipeline_row_store_port
    user_name     = var.pipeline_row_store_user_name
    database_name = var.pipeline_row_store_database_name
  }
}

output "pipeline_row_store_public_endpoint" {
  description = "Public row-store endpoint metadata (if provisioned by module/provider)."
  value = {
    has_public_endpoint = length(module.pipeline_private_row_store.load_balancer) > 0
    endpoint            = length(module.pipeline_private_row_store.load_balancer) > 0 ? module.pipeline_private_row_store.load_balancer[0].ip : null
    temporary_seed_cidrs = var.temporary_seed_cidrs
  }
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
  value = local.pipeline_queue_env_template
}

output "cloud_function_namespace" {
  description = "Serverless function namespace."
  value       = scaleway_function_namespace.pipeline.id
}

output "cloud_functions" {
  description = "IDs for serverless functions and their triggers."
  value = {
    inspector_dispatcher_function_id = scaleway_function.inspector_dispatcher.id
    inspector_cron_id                = scaleway_function_cron.inspector.id
    inspector_worker_function_id     = scaleway_function.inspector_worker.id
    inspector_worker_trigger_id      = scaleway_function_trigger.inspector_worker.id
    scraper_function_id              = scaleway_function.scraper_worker.id
    scraper_trigger_id               = scaleway_function_trigger.scraper_worker.id
    parser_function_id               = scaleway_function.parser_worker.id
    parser_trigger_id                = scaleway_function_trigger.parser_worker.id
    migrator_function_id             = scaleway_function.migrator.id
  }
}

output "cloud_functions_network" {
  description = "Private Network attachment for serverless functions."
  value = {
    private_network_id = scaleway_vpc_private_network.pipeline.id
    inspector_dispatcher_function_private_network_id = scaleway_function.inspector_dispatcher.private_network_id
    inspector_worker_function_private_network_id     = scaleway_function.inspector_worker.private_network_id
    scraper_function_private_network_id              = scaleway_function.scraper_worker.private_network_id
    parser_function_private_network_id               = scaleway_function.parser_worker.private_network_id
    migrator_function_private_network_id             = scaleway_function.migrator.private_network_id
  }
}
