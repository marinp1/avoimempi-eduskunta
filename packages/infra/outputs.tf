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
  value = {
    STORAGE_PROVIDER    = "s3"
    STORAGE_S3_REGION   = "nl-ams"
    STORAGE_S3_BUCKET   = scaleway_object_bucket.pipeline.name
    STORAGE_S3_ENDPOINT = "https://s3.nl-ams.scw.cloud"
  }
}

output "pipeline_prefixes" {
  description = "Logical prefixes used by the data pipeline."
  value       = ["raw/", "parsed/", "metadata/", "artifacts/"]
}
