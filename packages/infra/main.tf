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
  visibility_timeout_seconds = 60

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
