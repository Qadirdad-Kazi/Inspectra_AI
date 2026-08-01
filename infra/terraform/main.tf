# Inspectra cloud scaffolding — wire providers in a follow-up.
# Prefer applying `infra/k8s/*.yaml` until modules are filled in.

terraform {
  required_version = ">= 1.5.0"
}

# Example module hooks (unimplemented stubs):
# module "vpc" {}
# module "eks" {}
# module "rds_postgres" {}
# module "elasticache_redis" {}
# module "s3_artifacts" {}
