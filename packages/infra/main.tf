terraform {
  required_providers {
    scaleway = {
      source = "scaleway/scaleway"
    }
  }
  required_version = ">= 0.13"
}

provider "scaleway" {}

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
