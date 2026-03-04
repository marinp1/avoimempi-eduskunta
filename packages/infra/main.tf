terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

variable "hcloud_token" {
  sensitive = true
}

# Configure the Hetzner Cloud Provider
provider "hcloud" {
  token = var.hcloud_token
}

variable "location" {
  description = "Hetzner Cloud location (hel1, nbg1, fsn1, ash, hil, sin)."
  type        = string
  default     = "hel1"
}

variable "ssh_key_name" {
  description = "Name of the SSH key already uploaded to Hetzner Cloud (required)."
  type        = string
}

variable "server_name" {
  description = "Name of the VM."
  type        = string
  default     = "avoimempi-eduskunta"
}

variable "server_type" {
  description = "Hetzner server type."
  type        = string
  default     = "cpx22"
}

variable "server_image" {
  description = "Hetzner OS image."
  type        = string
  default     = "debian-13"
}

variable "ssh_port" {
  description = "SSH port configured via cloud-init."
  type        = number
  default     = 1363
}

variable "storage_local_dir" {
  description = "Directory for raw/parsed pipeline row-store files."
  type        = string
  default     = "/var/lib/avoimempi-eduskunta/data"
}

variable "db_path" {
  description = "Absolute path where the migrator writes the SQLite DB."
  type        = string
  default     = "/var/lib/avoimempi-eduskunta/avoimempi-eduskunta.db"
}

data "hcloud_ssh_key" "default" {
  name = var.ssh_key_name
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
      - mkdir -p ${var.storage_local_dir}
      - mkdir -p $(dirname ${var.db_path})
      - systemctl restart sshd || systemctl restart ssh
    CLOUDINIT
}

resource "hcloud_firewall" "main" {
  name = "fw-avoimempi-eduskunta"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = tostring(var.ssh_port)
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  # ICMP — needed for path MTU discovery (required for IPv6 correctness)
  rule {
    direction  = "in"
    protocol   = "icmp"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}

resource "hcloud_server" "main" {
  name         = var.server_name
  server_type  = var.server_type
  image        = var.server_image
  location     = var.location
  ssh_keys     = [data.hcloud_ssh_key.default.id]
  user_data    = local.cloud_init
  firewall_ids = [hcloud_firewall.main.id]

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }

  labels = {
    "stack" = "avoimempi-eduskunta"
  }
}
