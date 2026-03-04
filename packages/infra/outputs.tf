output "server" {
  description = "VM details."
  value = {
    id          = hcloud_server.main.id
    name        = hcloud_server.main.name
    server_type = var.server_type
    location    = var.location
    public_ipv4 = hcloud_server.main.ipv4_address
    public_ipv6 = hcloud_server.main.ipv6_address
  }
}

output "storage_env" {
  description = "Environment variables for the pipeline storage configuration."
  value = {
    STORAGE_PROVIDER  = "local"
    STORAGE_LOCAL_DIR = var.storage_local_dir
    DB_PATH           = var.db_path
  }
}
