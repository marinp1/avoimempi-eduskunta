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

variable "enable_cloud_functions" {
  description = "When true, provision serverless functions + triggers for inspector/scraper/parser."
  type        = bool
  default     = false
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
  default     = null

  validation {
    condition     = !var.enable_cloud_functions || var.pipeline_inspector_zip_file != null
    error_message = "pipeline_inspector_zip_file must be set when enable_cloud_functions=true."
  }
}

variable "pipeline_inspector_worker_zip_file" {
  description = "Zip artifact path for the inspector-queue worker function."
  type        = string
  default     = null

  validation {
    condition     = !var.enable_cloud_functions || var.pipeline_inspector_worker_zip_file != null
    error_message = "pipeline_inspector_worker_zip_file must be set when enable_cloud_functions=true."
  }
}

variable "pipeline_scraper_zip_file" {
  description = "Zip artifact path for the scraper function."
  type        = string
  default     = null

  validation {
    condition     = !var.enable_cloud_functions || var.pipeline_scraper_zip_file != null
    error_message = "pipeline_scraper_zip_file must be set when enable_cloud_functions=true."
  }
}

variable "pipeline_parser_zip_file" {
  description = "Zip artifact path for the parser function."
  type        = string
  default     = null

  validation {
    condition     = !var.enable_cloud_functions || var.pipeline_parser_zip_file != null
    error_message = "pipeline_parser_zip_file must be set when enable_cloud_functions=true."
  }
}

variable "pipeline_migrator_zip_file" {
  description = "Zip artifact path for the optional migrator function."
  type        = string
  default     = null
}

locals {
  pipeline_queue_env_template = {
    PIPELINE_SQS_ENDPOINT        = "https://sqs.mnq.nl-ams.scw.cloud"
    PIPELINE_SQS_REGION          = "nl-ams"
    PIPELINE_QUEUE_INSPECTOR     = scaleway_mnq_sqs_queue.pipeline_inspector.name
    PIPELINE_QUEUE_SCRAPER       = scaleway_mnq_sqs_queue.pipeline_scraper.name
    PIPELINE_QUEUE_PARSER        = scaleway_mnq_sqs_queue.pipeline_parser.name
    PIPELINE_QUEUE_WAIT_SECONDS  = "10"
    PIPELINE_QUEUE_MAX_MESSAGES  = "1"
    PIPELINE_QUEUE_IDLE_DELAY_MS = "300"
  }

  pipeline_row_store_env = {
    ROW_STORE_PROVIDER     = "postgres"
    ROW_STORE_DATABASE_URL = "postgresql://${scaleway_iam_api_key.pipeline_db.access_key}:${scaleway_iam_api_key.pipeline_db.secret_key}@${scaleway_sdb_sql_database.pipeline_row_store.endpoint}/${scaleway_sdb_sql_database.pipeline_row_store.name}?sslmode=require"
  }

  pipeline_storage_env = {
    STORAGE_PROVIDER    = "s3"
    STORAGE_S3_REGION   = "nl-ams"
    STORAGE_S3_BUCKET   = scaleway_object_bucket.pipeline.name
    STORAGE_S3_ENDPOINT = "https://s3.nl-ams.scw.cloud"
  }

  cloud_worker_env_common = merge(local.pipeline_queue_env_template, {
    NODE_ENV                                         = "production"
    PIPELINE_QUEUE_INSPECTOR_VISIBILITY_TIMEOUT_SECONDS = "300"
    PIPELINE_QUEUE_SCRAPER_VISIBILITY_TIMEOUT_SECONDS   = "600"
    PIPELINE_QUEUE_PARSER_VISIBILITY_TIMEOUT_SECONDS    = "300"
    PIPELINE_QUEUE_RETRY_VISIBILITY_TIMEOUT_SECONDS     = "15"
  })
}

resource "scaleway_object_bucket" "pipeline" {
  # Keep this hardcoded and simple. Change the name once if already taken.
  name   = "bkt-avoimempi-eduskunta-pipeline"
  region = "nl-ams"
}

resource "scaleway_object_bucket_acl" "pipeline_private" {
  bucket = scaleway_object_bucket.pipeline.name
  region = "nl-ams"
  acl    = "private"
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

# ---------------------------------------------------------------------------
# Serverless SQL Database — shared row store for scraper and parser workers.
# Scales to 0 vCPUs when idle; billed per second when active.
# Estimated cost: ~€2/month at 3 sync cycles/day.
# ---------------------------------------------------------------------------

resource "scaleway_sdb_sql_database" "pipeline_row_store" {
  name    = "avoimempi-eduskunta-row-store"
  min_cpu = 0 # true scale-to-zero
  max_cpu = 2 # sufficient for 20 parallel function writes
}

# IAM application that pipeline workers authenticate as when connecting.
resource "scaleway_iam_application" "pipeline_db" {
  name = "pipeline-row-store-access"
}

resource "scaleway_iam_api_key" "pipeline_db" {
  application_id = scaleway_iam_application.pipeline_db.id
  description    = "Pipeline row store database credentials"
}

# Grant read/write access to the Serverless SQL Database.
# Verify the permission set name in the Scaleway console under IAM > Permission sets
# if apply fails — Scaleway occasionally renames these.
resource "scaleway_iam_policy" "pipeline_db" {
  name           = "policy-pipeline-row-store"
  application_id = scaleway_iam_application.pipeline_db.id

  rule {
    project_ids          = [var.project_id]
    permission_set_names = ["ServerlessSQLDatabaseReadWrite"]
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
# Optional: serverless functions for inspector (cron), scraper worker, parser
# worker, and migrator trigger. Disabled by default; enable by setting
# enable_cloud_functions=true and supplying zip artifacts.
# ---------------------------------------------------------------------------

resource "scaleway_function_namespace" "pipeline" {
  count      = var.enable_cloud_functions ? 1 : 0
  name       = "avoimempi-eduskunta"
  project_id = var.project_id
  region     = "nl-ams"
}

resource "scaleway_function" "inspector_dispatcher" {
  count        = var.enable_cloud_functions ? 1 : 0
  name          = "datapipe-inspector-dispatcher"
  namespace_id  = scaleway_function_namespace.pipeline[0].id
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
  count       = var.enable_cloud_functions ? 1 : 0
  function_id = scaleway_function.inspector_dispatcher[0].id
  schedule     = "0 */8 * * *" # every 8 hours
}

resource "scaleway_function" "inspector_worker" {
  count          = var.enable_cloud_functions ? 1 : 0
  name           = "datapipe-inspector-worker"
  namespace_id   = scaleway_function_namespace.pipeline[0].id
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
  count       = var.enable_cloud_functions ? 1 : 0
  function_id = scaleway_function.inspector_worker[0].id
  name        = "datapipe-inspector-trigger"

  sqs {
    project_id = scaleway_mnq_sqs.pipeline.project_id
    region     = "nl-ams"
    queue      = scaleway_mnq_sqs_queue.pipeline_inspector.name
  }
}

resource "scaleway_function" "scraper_worker" {
  count          = var.enable_cloud_functions ? 1 : 0
  name           = "datapipe-scraper-worker"
  namespace_id   = scaleway_function_namespace.pipeline[0].id
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
  count       = var.enable_cloud_functions ? 1 : 0
  function_id = scaleway_function.scraper_worker[0].id
  name        = "datapipe-scraper-trigger"

  sqs {
    project_id = scaleway_mnq_sqs.pipeline.project_id
    region     = "nl-ams"
    queue      = scaleway_mnq_sqs_queue.pipeline_scraper.name
  }
}

resource "scaleway_function" "parser_worker" {
  count          = var.enable_cloud_functions ? 1 : 0
  name           = "datapipe-parser-worker"
  namespace_id   = scaleway_function_namespace.pipeline[0].id
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

  environment_variables = merge(
    local.cloud_worker_env_common,
    local.pipeline_storage_env,
    local.pipeline_row_store_env,
  )

  secret_environment_variables = {
    PIPELINE_SQS_ACCESS_KEY_ID     = scaleway_mnq_sqs_credentials.pipeline_worker.access_key
    PIPELINE_SQS_SECRET_ACCESS_KEY = scaleway_mnq_sqs_credentials.pipeline_worker.secret_key
  }
}

resource "scaleway_function_trigger" "parser_worker" {
  count       = var.enable_cloud_functions ? 1 : 0
  function_id = scaleway_function.parser_worker[0].id
  name        = "datapipe-parser-trigger"

  sqs {
    project_id = scaleway_mnq_sqs.pipeline.project_id
    region     = "nl-ams"
    queue      = scaleway_mnq_sqs_queue.pipeline_parser.name
  }
}

resource "scaleway_function" "migrator" {
  count          = var.enable_cloud_functions && var.pipeline_migrator_zip_file != null ? 1 : 0
  name           = "datapipe-migrator"
  namespace_id   = scaleway_function_namespace.pipeline[0].id
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

  environment_variables = merge(
    local.pipeline_storage_env,
    local.pipeline_row_store_env,
  )
}
