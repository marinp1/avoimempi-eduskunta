terraform {
  required_providers {
    scaleway = {
      source = "scaleway/scaleway"
    }
  }
  required_version = ">= 0.13"
}

provider "scaleway" {}

variable "project_id" {
  description = "Scaleway Project ID used for Queues resources."
  type        = string
  default     = null
}

variable "pipeline_region" {
  description = "Scaleway region used for regional resources."
  type        = string
  default     = "nl-ams"
}

variable "pipeline_function_runtime" {
  description = "Runtime used for pipeline serverless functions."
  type        = string
  default     = "node22"
}

variable "pipeline_inspector_handler" {
  description = "Handler for the scheduled inspector-dispatch function."
  type        = string
  default     = "inspector_dispatch.handle"
}

variable "pipeline_inspector_worker_handler" {
  description = "Handler for the inspector-queue worker function."
  type        = string
  default     = "inspector_worker.handle"
}

variable "pipeline_scraper_handler" {
  description = "Handler for the scraper function."
  type        = string
  default     = "scraper.handle"
}

variable "pipeline_parser_handler" {
  description = "Handler for the parser function."
  type        = string
  default     = "parser.handle"
}

variable "pipeline_migrator_handler" {
  description = "Handler for the migrator function."
  type        = string
  default     = "migrator.handle"
}

variable "pipeline_inspector_zip_file" {
  description = "Zip artifact path for the scheduled inspector-dispatch function."
  type        = string
}

variable "pipeline_inspector_worker_zip_file" {
  description = "Zip artifact path for the inspector-queue worker function."
  type        = string
}

variable "pipeline_scraper_zip_file" {
  description = "Zip artifact path for the scraper function."
  type        = string
}

variable "pipeline_parser_zip_file" {
  description = "Zip artifact path for the parser function."
  type        = string
}

variable "pipeline_migrator_zip_file" {
  description = "Zip artifact path for the migrator function."
  type        = string
}

variable "pipeline_storage_local_dir" {
  description = "Directory used by the pipeline for local storage on mounted block volume."
  type        = string
  default     = "/mnt/pipeline-data/data"
}

variable "pipeline_block_volume_mount_path" {
  description = "Expected mount path for the data block volume on the VM."
  type        = string
  default     = "/mnt/pipeline-data"
}

variable "pipeline_block_volume_name" {
  description = "Logical name for the pipeline block volume."
  type        = string
  default     = "avoimempi-eduskunta-data"
}

variable "pipeline_block_volume_size_gb" {
  description = "Recommended block volume size in GB for local row-store and artifacts."
  type        = number
  default     = 100
}

variable "pipeline_row_store_name" {
  description = "Name for the private managed PostgreSQL row-store."
  type        = string
  default     = "avoimempi-eduskunta-row-store"
}

variable "pipeline_row_store_engine" {
  description = "Managed PostgreSQL engine version."
  type        = string
  default     = "PostgreSQL-15"
}

variable "pipeline_row_store_node_type" {
  description = "Managed PostgreSQL node type."
  type        = string
  default     = "DB-DEV-S"
}

variable "pipeline_row_store_user_name" {
  description = "Initial PostgreSQL user name for row-store."
  type        = string
  default     = "pipeline"
}

variable "pipeline_row_store_database_name" {
  description = "Database name used in ROW_STORE_DATABASE_URL."
  type        = string
  default     = "rdb"
}

variable "pipeline_row_store_port" {
  description = "PostgreSQL port used in ROW_STORE_DATABASE_URL."
  type        = number
  default     = 5432
}

variable "temporary_seed_cidrs" {
  description = "Temporary public CIDR allowlist for one-off local seeding (for example [\"203.0.113.10/32\"]). Set to [] to close."
  type        = list(string)
  default     = []
}

locals {
  pipeline_queue_env_template = {
    PIPELINE_SQS_ENDPOINT        = "https://sqs.mnq.nl-ams.scw.cloud"
    PIPELINE_SQS_REGION          = var.pipeline_region
    PIPELINE_QUEUE_INSPECTOR     = scaleway_mnq_sqs_queue.pipeline_inspector.name
    PIPELINE_QUEUE_SCRAPER       = scaleway_mnq_sqs_queue.pipeline_scraper.name
    PIPELINE_QUEUE_PARSER        = scaleway_mnq_sqs_queue.pipeline_parser.name
    PIPELINE_QUEUE_WAIT_SECONDS  = "10"
    PIPELINE_QUEUE_MAX_MESSAGES  = "1"
    PIPELINE_QUEUE_IDLE_DELAY_MS = "300"
  }

  pipeline_storage_env = {
    STORAGE_PROVIDER  = "local"
    STORAGE_LOCAL_DIR = var.pipeline_storage_local_dir
  }

  pipeline_block_storage = {
    PIPELINE_BLOCK_VOLUME_NAME       = var.pipeline_block_volume_name
    PIPELINE_BLOCK_VOLUME_SIZE_GB    = tostring(var.pipeline_block_volume_size_gb)
    PIPELINE_BLOCK_VOLUME_MOUNT_PATH = var.pipeline_block_volume_mount_path
  }

  pipeline_row_store_env = {
    ROW_STORE_PROVIDER = "postgres"
    ROW_STORE_DATABASE_URL = "postgresql://${var.pipeline_row_store_user_name}:${module.pipeline_private_row_store.user_password}@${module.pipeline_private_row_store.instance_ip}:${var.pipeline_row_store_port}/${var.pipeline_row_store_database_name}?sslmode=require"
  }

  cloud_worker_env_common = merge(local.pipeline_queue_env_template, {
    NODE_ENV                                         = "production"
    PIPELINE_QUEUE_INSPECTOR_VISIBILITY_TIMEOUT_SECONDS = "300"
    PIPELINE_QUEUE_SCRAPER_VISIBILITY_TIMEOUT_SECONDS   = "600"
    PIPELINE_QUEUE_PARSER_VISIBILITY_TIMEOUT_SECONDS    = "300"
    PIPELINE_QUEUE_RETRY_VISIBILITY_TIMEOUT_SECONDS     = "15"
  })
}

resource "scaleway_vpc" "pipeline" {
  name       = "vpc-avoimempi-eduskunta"
  project_id = var.project_id
}

resource "scaleway_vpc_private_network" "pipeline" {
  name      = "pn-avoimempi-eduskunta"
  project_id = var.project_id
  vpc_id    = scaleway_vpc.pipeline.id
  region    = var.pipeline_region
}

module "pipeline_private_row_store" {
  source  = "scaleway-terraform-modules/rdb/scaleway"
  version = "1.1.0"

  project_id      = var.project_id
  region          = var.pipeline_region
  name            = var.pipeline_row_store_name
  engine          = var.pipeline_row_store_engine
  node_type       = var.pipeline_row_store_node_type
  user_name       = var.pipeline_row_store_user_name
  replica_enabled = false

  private_network = {
    pn_id       = scaleway_vpc_private_network.pipeline.id
    enable_ipam = true
  }
}

resource "scaleway_rdb_acl" "temporary_seed_access" {
  count       = length(var.temporary_seed_cidrs) > 0 ? 1 : 0
  instance_id = module.pipeline_private_row_store.instance_id
  region      = var.pipeline_region

  dynamic "acl_rules" {
    for_each = toset(var.temporary_seed_cidrs)
    content {
      ip          = acl_rules.value
      description = "temporary-seed-access"
    }
  }
}

resource "scaleway_mnq_sqs" "pipeline" {
  project_id = var.project_id
}

# Provisioner credential: used only by Terraform to create and configure queues.
resource "scaleway_mnq_sqs_credentials" "pipeline_provisioner" {
  project_id = scaleway_mnq_sqs.pipeline.project_id
  name       = "sqs-credentials-pipeline-provisioner"

  permissions {
    can_manage  = true
    can_receive = false
    can_publish = false
  }
}

# Inspector credential: publish-only — dispatches jobs to scraper/parser queues.
resource "scaleway_mnq_sqs_credentials" "pipeline_inspector" {
  project_id = scaleway_mnq_sqs.pipeline.project_id
  name       = "sqs-credentials-pipeline-inspector"

  permissions {
    can_manage  = false
    can_receive = false
    can_publish = true
  }
}

# Worker credential: receive + publish — consume own queue, forward results.
resource "scaleway_mnq_sqs_credentials" "pipeline_worker" {
  project_id = scaleway_mnq_sqs.pipeline.project_id
  name       = "sqs-credentials-pipeline-worker"

  permissions {
    can_manage  = false
    can_receive = true
    can_publish = true
  }
}

# Dead-letter queues — catch poison-pill messages after 3 failed deliveries.
resource "scaleway_mnq_sqs_queue" "pipeline_inspector_dlq" {
  project_id                = scaleway_mnq_sqs.pipeline.project_id
  name                      = "datapipe-inspector-dlq"
  access_key                = scaleway_mnq_sqs_credentials.pipeline_provisioner.access_key
  secret_key                = scaleway_mnq_sqs_credentials.pipeline_provisioner.secret_key
  message_retention_seconds = 1209600
}

resource "scaleway_mnq_sqs_queue" "pipeline_scraper_dlq" {
  project_id                = scaleway_mnq_sqs.pipeline.project_id
  name                      = "datapipe-scraper-dlq"
  access_key                = scaleway_mnq_sqs_credentials.pipeline_provisioner.access_key
  secret_key                = scaleway_mnq_sqs_credentials.pipeline_provisioner.secret_key
  message_retention_seconds = 1209600
}

resource "scaleway_mnq_sqs_queue" "pipeline_parser_dlq" {
  project_id                = scaleway_mnq_sqs.pipeline.project_id
  name                      = "datapipe-parser-dlq"
  access_key                = scaleway_mnq_sqs_credentials.pipeline_provisioner.access_key
  secret_key                = scaleway_mnq_sqs_credentials.pipeline_provisioner.secret_key
  message_retention_seconds = 1209600
}

resource "scaleway_mnq_sqs_queue" "pipeline_inspector" {
  project_id                 = scaleway_mnq_sqs.pipeline.project_id
  name                       = "datapipe-inspector"
  access_key                 = scaleway_mnq_sqs_credentials.pipeline_provisioner.access_key
  secret_key                 = scaleway_mnq_sqs_credentials.pipeline_provisioner.secret_key
  visibility_timeout_seconds = 300

  redrive_policy {
    dead_letter_queue_id = scaleway_mnq_sqs_queue.pipeline_inspector_dlq.id
    max_receive_count    = 3
  }
}

resource "scaleway_mnq_sqs_queue" "pipeline_scraper" {
  project_id                 = scaleway_mnq_sqs.pipeline.project_id
  name                       = "datapipe-scraper"
  access_key                 = scaleway_mnq_sqs_credentials.pipeline_provisioner.access_key
  secret_key                 = scaleway_mnq_sqs_credentials.pipeline_provisioner.secret_key
  visibility_timeout_seconds = 600

  redrive_policy {
    dead_letter_queue_id = scaleway_mnq_sqs_queue.pipeline_scraper_dlq.id
    max_receive_count    = 3
  }
}

resource "scaleway_mnq_sqs_queue" "pipeline_parser" {
  project_id                 = scaleway_mnq_sqs.pipeline.project_id
  name                       = "datapipe-parser"
  access_key                 = scaleway_mnq_sqs_credentials.pipeline_provisioner.access_key
  secret_key                 = scaleway_mnq_sqs_credentials.pipeline_provisioner.secret_key
  visibility_timeout_seconds = 300

  redrive_policy {
    dead_letter_queue_id = scaleway_mnq_sqs_queue.pipeline_parser_dlq.id
    max_receive_count    = 3
  }
}

# ---------------------------------------------------------------------------
# Serverless functions for inspector (cron), scraper worker, parser
# worker, and migrator trigger.
# ---------------------------------------------------------------------------

resource "scaleway_function_namespace" "pipeline" {
  name       = "avoimempi-eduskunta"
  project_id = var.project_id
  region     = var.pipeline_region
  # Required for function-level Private Network attachment.
  # Provider marks this as deprecated in newer versions because it is always true.
  activate_vpc_integration = true
}

resource "scaleway_function" "inspector_dispatcher" {
  name          = "datapipe-inspector-dispatcher"
  namespace_id  = scaleway_function_namespace.pipeline.id
  runtime       = var.pipeline_function_runtime
  handler       = var.pipeline_inspector_handler
  privacy       = "private"
  zip_file      = var.pipeline_inspector_zip_file
  zip_hash      = filesha256(var.pipeline_inspector_zip_file)
  deploy        = true
  min_scale     = 0
  max_scale     = 1
  memory_limit  = 512
  timeout       = 300
  private_network_id = scaleway_vpc_private_network.pipeline.id

  environment_variables = merge(
    local.cloud_worker_env_common,
    local.pipeline_storage_env,
    local.pipeline_row_store_env,
    {
      PIPELINE_SCRAPER_MAX_PAGES_PER_INVOCATION = "200"
    },
  )

  secret_environment_variables = {
    PIPELINE_SQS_ACCESS_KEY_ID     = scaleway_mnq_sqs_credentials.pipeline_inspector.access_key
    PIPELINE_SQS_SECRET_ACCESS_KEY = scaleway_mnq_sqs_credentials.pipeline_inspector.secret_key
  }
}

resource "scaleway_function_cron" "inspector" {
  function_id = scaleway_function.inspector_dispatcher.id
  schedule     = "0 */8 * * *" # every 8 hours
}

resource "scaleway_function" "inspector_worker" {
  name           = "datapipe-inspector-worker"
  namespace_id   = scaleway_function_namespace.pipeline.id
  runtime        = var.pipeline_function_runtime
  handler        = var.pipeline_inspector_worker_handler
  privacy        = "private"
  zip_file       = var.pipeline_inspector_worker_zip_file
  zip_hash       = filesha256(var.pipeline_inspector_worker_zip_file)
  deploy         = true
  min_scale      = 0
  max_scale      = 20
  memory_limit   = 1024
  timeout        = 300
  private_network_id = scaleway_vpc_private_network.pipeline.id

  environment_variables = merge(
    local.cloud_worker_env_common,
    local.pipeline_storage_env,
    local.pipeline_row_store_env,
    {
      PIPELINE_SCRAPER_MAX_PAGES_PER_INVOCATION = "200"
    },
  )

  secret_environment_variables = {
    PIPELINE_SQS_ACCESS_KEY_ID     = scaleway_mnq_sqs_credentials.pipeline_worker.access_key
    PIPELINE_SQS_SECRET_ACCESS_KEY = scaleway_mnq_sqs_credentials.pipeline_worker.secret_key
  }
}

resource "scaleway_function_trigger" "inspector_worker" {
  function_id = scaleway_function.inspector_worker.id
  name        = "datapipe-inspector-trigger"

  sqs {
    project_id = scaleway_mnq_sqs.pipeline.project_id
    region     = var.pipeline_region
    queue      = scaleway_mnq_sqs_queue.pipeline_inspector.name
  }
}

resource "scaleway_function" "scraper_worker" {
  name           = "datapipe-scraper-worker"
  namespace_id   = scaleway_function_namespace.pipeline.id
  runtime        = var.pipeline_function_runtime
  handler        = var.pipeline_scraper_handler
  privacy        = "private"
  zip_file       = var.pipeline_scraper_zip_file
  zip_hash       = filesha256(var.pipeline_scraper_zip_file)
  deploy         = true
  min_scale      = 0
  max_scale      = 20
  memory_limit   = 1024
  timeout        = 300
  private_network_id = scaleway_vpc_private_network.pipeline.id

  environment_variables = merge(
    local.cloud_worker_env_common,
    local.pipeline_storage_env,
    local.pipeline_row_store_env,
    {
      PIPELINE_SCRAPER_MAX_PAGES_PER_INVOCATION = "200"
    },
  )

  secret_environment_variables = {
    PIPELINE_SQS_ACCESS_KEY_ID     = scaleway_mnq_sqs_credentials.pipeline_worker.access_key
    PIPELINE_SQS_SECRET_ACCESS_KEY = scaleway_mnq_sqs_credentials.pipeline_worker.secret_key
  }
}

resource "scaleway_function_trigger" "scraper_worker" {
  function_id = scaleway_function.scraper_worker.id
  name        = "datapipe-scraper-trigger"

  sqs {
    project_id = scaleway_mnq_sqs.pipeline.project_id
    region     = var.pipeline_region
    queue      = scaleway_mnq_sqs_queue.pipeline_scraper.name
  }
}

resource "scaleway_function" "parser_worker" {
  name           = "datapipe-parser-worker"
  namespace_id   = scaleway_function_namespace.pipeline.id
  runtime        = var.pipeline_function_runtime
  handler        = var.pipeline_parser_handler
  privacy        = "private"
  zip_file       = var.pipeline_parser_zip_file
  zip_hash       = filesha256(var.pipeline_parser_zip_file)
  deploy         = true
  min_scale      = 0
  max_scale      = 20
  memory_limit   = 1024
  timeout        = 300
  private_network_id = scaleway_vpc_private_network.pipeline.id

  environment_variables = merge(
    local.cloud_worker_env_common,
    local.pipeline_storage_env,
    local.pipeline_row_store_env
  )

  secret_environment_variables = {
    PIPELINE_SQS_ACCESS_KEY_ID     = scaleway_mnq_sqs_credentials.pipeline_worker.access_key
    PIPELINE_SQS_SECRET_ACCESS_KEY = scaleway_mnq_sqs_credentials.pipeline_worker.secret_key
  }
}

resource "scaleway_function_trigger" "parser_worker" {
  function_id = scaleway_function.parser_worker.id
  name        = "datapipe-parser-trigger"

  sqs {
    project_id = scaleway_mnq_sqs.pipeline.project_id
    region     = var.pipeline_region
    queue      = scaleway_mnq_sqs_queue.pipeline_parser.name
  }
}

resource "scaleway_function" "migrator" {
  name           = "datapipe-migrator"
  namespace_id   = scaleway_function_namespace.pipeline.id
  runtime        = var.pipeline_function_runtime
  handler        = var.pipeline_migrator_handler
  privacy        = "private"
  zip_file       = var.pipeline_migrator_zip_file
  zip_hash       = filesha256(var.pipeline_migrator_zip_file)
  deploy         = true
  min_scale      = 0
  max_scale      = 1
  memory_limit   = 2048
  timeout        = 1800
  private_network_id = scaleway_vpc_private_network.pipeline.id

  environment_variables = merge(
    local.pipeline_storage_env,
    local.pipeline_row_store_env,
  )
}
