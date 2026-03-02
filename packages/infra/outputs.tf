output "pipeline_storage_env" {
  description = "Environment values to wire the pipeline to local block storage mounted on VM."
  value       = local.pipeline_storage_env
}

output "pipeline_private_network" {
  description = "VPC and Private Network created for app/pipeline VM traffic."
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

output "app_vm" {
  description = "App VM details."
  value = {
    id                  = scaleway_instance_server.app.id
    name                = scaleway_instance_server.app.name
    commercial_type     = var.app_server_type
    zone                = var.pipeline_zone
    public_ip           = scaleway_instance_ip.app.address
    private_nic_id      = scaleway_instance_private_nic.app.id
    private_network_id  = scaleway_vpc_private_network.pipeline.id
    db_mount_path       = var.app_db_mount_path
  }
}

output "sync_config" {
  description = "Atomic DB sync configuration: pipeline pushes DB artifact to app VM release directory, then flips current symlink."
  value = {
    source                = var.pipeline_local_db_path
    app_current_db_link   = "${var.app_db_mount_path}/current.db"
    app_releases_dir      = "${var.app_db_mount_path}/releases"
    app_private_host      = "${var.app_server_name}.${scaleway_vpc_private_network.pipeline.name}.priv"
    service_reload_command = "systemctl restart avoimempi-eduskunta-app*.service"
    rsync_command         = "rsync -az --delay-updates ${var.pipeline_local_db_path} ${var.app_server_name}.${scaleway_vpc_private_network.pipeline.name}.priv:${var.app_db_mount_path}/releases/.incoming-<release>.db"
  }
}

output "pipeline_vm" {
  description = "Pipeline VM details. No public IP — access via app VM as jump host: ssh -J <app-ip> <pipeline-private-host>"
  value = {
    id                         = scaleway_instance_server.pipeline.id
    name                       = scaleway_instance_server.pipeline.name
    commercial_type            = var.pipeline_server_type
    zone                       = var.pipeline_zone
    private_nic_id             = scaleway_instance_private_nic.pipeline.id
    private_network_id         = scaleway_vpc_private_network.pipeline.id
    private_hostname           = "${var.pipeline_server_name}.${scaleway_vpc_private_network.pipeline.name}.priv"
    raw_parsed_volume_id       = scaleway_instance_volume.pipeline_raw_parsed.id
    raw_parsed_volume_size_gb  = var.pipeline_raw_parsed_volume_size_gb
    raw_parsed_mount_path      = var.pipeline_raw_parsed_volume_mount_path
    app_db_volume_id           = scaleway_instance_volume.app_db.id
    app_db_volume_size_gb      = var.pipeline_db_volume_size_gb
    app_db_mount_path          = var.app_db_mount_path
  }
}
