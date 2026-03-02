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
  description = "Scaleway project ID used for all resources."
  type        = string
  default     = null
}

variable "pipeline_region" {
  description = "Scaleway region used for regional resources (VPC/Private Network)."
  type        = string
  default     = "nl-ams"
}

variable "pipeline_zone" {
  description = "Scaleway zone used for compute and block storage."
  type        = string
  default     = "nl-ams-1"
}

variable "app_server_name" {
  description = "Name of the app VM."
  type        = string
  default     = "avoimempi-eduskunta-app"
}

variable "pipeline_server_name" {
  description = "Name of the pipeline VM."
  type        = string
  default     = "avoimempi-eduskunta-pipeline"
}

variable "app_server_type" {
  description = "Scaleway commercial type for the app VM."
  type        = string
  default     = "DEV1-S"
}

variable "pipeline_server_type" {
  description = "Scaleway commercial type for the pipeline VM."
  type        = string
  default     = "STARDUST1-S"
}

variable "ssh_port" {
  description = "Non-standard SSH port configured via cloud-init on both VMs."
  type        = number
  default     = 22
}

variable "pipeline_storage_local_dir" {
  description = "Directory used by the pipeline for raw/parsed row-store files."
  type        = string
  default     = "/mnt/pipeline-raw-parsed/data"
}

variable "pipeline_raw_parsed_volume_mount_path" {
  description = "Expected mount path for the raw+parsed block volume on the pipeline VM."
  type        = string
  default     = "/mnt/pipeline-raw-parsed"
}

variable "pipeline_raw_parsed_volume_name" {
  description = "Logical name for the raw+parsed block volume."
  type        = string
  default     = "avoimempi-eduskunta-raw-parsed"
}

variable "pipeline_raw_parsed_volume_size_gb" {
  description = "Size in GB for raw+parsed row-store volume."
  type        = number
  default     = 10
}

variable "pipeline_db_volume_mount_path" {
  description = "Expected mount path for the final DB/trace block volume on the pipeline VM."
  type        = string
  default     = "/mnt/pipeline-db"
}

variable "pipeline_local_db_path" {
  description = "Absolute local-disk path on pipeline VM where migrator writes SQLite before rsync."
  type        = string
  default     = "/var/lib/avoimempi-eduskunta/avoimempi-eduskunta.db"
}

variable "pipeline_db_volume_name" {
  description = "Logical name for the final DB/trace block volume."
  type        = string
  default     = "avoimempi-eduskunta-db"
}

variable "pipeline_db_volume_size_gb" {
  description = "Size in GB for final SQLite DB artifacts."
  type        = number
  default     = 20
}

variable "app_db_mount_path" {
  description = "Directory on the app VM where the pipeline rsync's the finished SQLite DB."
  type        = string
  default     = "/mnt/app-db"
}

locals {
  cloud_init = <<-CLOUDINIT
    #cloud-config
    package_update: false

    ssh_pwauth: false

    write_files:
      - path: /etc/ssh/sshd_config.d/port.conf
        content: |
          Port ${var.ssh_port}

    runcmd:
      - systemctl restart sshd || systemctl restart ssh
    CLOUDINIT

  pipeline_storage_env = {
    STORAGE_PROVIDER  = "local"
    STORAGE_LOCAL_DIR = var.pipeline_storage_local_dir
  }

  pipeline_block_storage = {
    PIPELINE_RAW_PARSED_VOLUME_NAME       = var.pipeline_raw_parsed_volume_name
    PIPELINE_RAW_PARSED_VOLUME_SIZE_GB    = tostring(var.pipeline_raw_parsed_volume_size_gb)
    PIPELINE_RAW_PARSED_VOLUME_MOUNT_PATH = var.pipeline_raw_parsed_volume_mount_path
    PIPELINE_DB_VOLUME_NAME               = var.pipeline_db_volume_name
    PIPELINE_DB_VOLUME_SIZE_GB            = tostring(var.pipeline_db_volume_size_gb)
    PIPELINE_DB_VOLUME_MOUNT_PATH         = var.pipeline_db_volume_mount_path
  }
}

resource "scaleway_instance_security_group" "shared" {
  name                    = "sg-avoimempi-eduskunta"
  project_id              = var.project_id
  inbound_default_policy  = "drop"
  outbound_default_policy = "accept"

  inbound_rule {
    action   = "accept"
    protocol = "TCP"
    port     = var.ssh_port
  }

  inbound_rule {
    action   = "accept"
    protocol = "TCP"
    port     = 80
  }

  inbound_rule {
    action   = "accept"
    protocol = "TCP"
    port     = 443
  }
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

resource "scaleway_instance_ip" "app" {
  project_id = var.project_id
  zone       = var.pipeline_zone
}

resource "scaleway_instance_volume" "pipeline_raw_parsed" {
  name       = var.pipeline_raw_parsed_volume_name
  project_id = var.project_id
  zone       = var.pipeline_zone
  size_in_gb = var.pipeline_raw_parsed_volume_size_gb
  type       = "l_ssd"
}

resource "scaleway_instance_volume" "pipeline_db" {
  name       = var.pipeline_db_volume_name
  project_id = var.project_id
  zone       = var.pipeline_zone
  size_in_gb = var.pipeline_db_volume_size_gb
  type       = "l_ssd"
}

resource "scaleway_instance_server" "app" {
  project_id        = var.project_id
  zone              = var.pipeline_zone
  name              = var.app_server_name
  type              = var.app_server_type
  image             = "debian_trixie"
  ip_id             = scaleway_instance_ip.app.id
  security_group_id = scaleway_instance_security_group.shared.id
  user_data         = { cloud-init = local.cloud_init }
  additional_volume_ids = [
    scaleway_instance_volume.pipeline_db.id
  ]
  tags = [
    "stack:avoimempi-eduskunta",
    "role:app",
  ]
}

resource "scaleway_instance_server" "pipeline" {
  project_id        = var.project_id
  zone              = var.pipeline_zone
  name              = var.pipeline_server_name
  type              = var.pipeline_server_type
  image             = "debian_trixie"
  security_group_id = scaleway_instance_security_group.shared.id
  user_data         = { cloud-init = local.cloud_init }
  additional_volume_ids = [
    scaleway_instance_volume.pipeline_raw_parsed.id
  ]
  tags = [
    "stack:avoimempi-eduskunta",
    "role:pipeline",
  ]
}

resource "scaleway_instance_private_nic" "app" {
  server_id          = scaleway_instance_server.app.id
  private_network_id = scaleway_vpc_private_network.pipeline.id
}

resource "scaleway_instance_private_nic" "pipeline" {
  server_id          = scaleway_instance_server.pipeline.id
  private_network_id = scaleway_vpc_private_network.pipeline.id
}
