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
