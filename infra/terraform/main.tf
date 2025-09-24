terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.61"
    }
  }
}

provider "aws" {
  region = var.region
}

locals {
  project = var.project_prefix
  tags    = merge({
    Project = var.project_prefix
    Owner   = var.owner_email
    Purpose = "assessment-2"
  }, var.extra_tags)

  parameter_prefix = coalesce(var.ssm_parameter_prefix, "/cab432/${var.project_prefix}")
}

# ---------------------------
# S3 buckets for video storage
# ---------------------------
resource "aws_s3_bucket" "raw" {
  bucket        = "${var.project_prefix}-raw-videos"
  force_destroy = true
  tags          = local.tags
}

resource "aws_s3_bucket" "processed" {
  bucket        = "${var.project_prefix}-transcoded-videos"
  force_destroy = true
  tags          = local.tags
}

# Optional lifecycle configuration for processed outputs
resource "aws_s3_bucket_lifecycle_configuration" "processed" {
  bucket = aws_s3_bucket.processed.id

  rule {
    id     = "expire-old-outputs"
    status = "Enabled"

    expiration {
      days = var.transcoded_retention_days
    }
  }
}

# ---------------------------
# DynamoDB table for metadata
# ---------------------------
resource "aws_dynamodb_table" "videos" {
  name         = "${var.project_prefix}-videos"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "owner"
    type = "S"
  }

  global_secondary_index {
    name            = "owner-index"
    hash_key        = "owner"
    projection_type = "ALL"
  }

  tags = local.tags
}

# ---------------------------
# Cognito user pool and client
# ---------------------------
resource "aws_cognito_user_pool" "this" {
  name                     = "${var.project_prefix}-user-pool"
  auto_verified_attributes = ["email"]
  mfa_configuration        = "ON"

  software_token_mfa_configuration {
    enabled = true
  }

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  schema {
    attribute_data_type      = "String"
    name                     = "email"
    required                 = true
    developer_only_attribute = false
    mutable                  = true
  }

  tags = local.tags
}

resource "aws_cognito_user_pool_client" "app" {
  name         = "${var.project_prefix}-web"
  user_pool_id = aws_cognito_user_pool.this.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  generate_secret = true
  refresh_token_validity = 30
  id_token_validity     = 1
  access_token_validity = 1

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  prevent_user_existence_errors = "ENABLED"

  callback_urls = var.app_callback_urls
  logout_urls   = var.app_logout_urls

  tags = local.tags
}

resource "aws_secretsmanager_secret" "cognito_client_secret" {
  name = "${var.project_prefix}-cognito-client-secret"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "cognito_client_secret" {
  secret_id     = aws_secretsmanager_secret.cognito_client_secret.id
  secret_string = aws_cognito_user_pool_client.app.client_secret
}

resource "aws_cognito_user_group" "admins" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.this.id
  precedence   = 2
  description  = "Users with administrative access to video metadata"
}

resource "aws_cognito_user_group" "users" {
  name         = "user"
  user_pool_id = aws_cognito_user_pool.this.id
  precedence   = 1
  description  = "Standard application users"
}

# ---------------------------
# Route53 record for public access
# ---------------------------
data "aws_route53_zone" "selected" {
  name         = var.route53_zone_name
  private_zone = false
}

resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.selected.zone_id
  name    = "${var.subdomain}.${chomp(var.route53_zone_name)}"
  type    = "A"
  ttl     = 60
  records = [var.ec2_public_ip]
}

# ---------------------------
# Systems Manager Parameter Store
# ---------------------------
resource "aws_ssm_parameter" "api_base" {
  name  = "${local.parameter_prefix}/api/base_url"
  type  = "String"
  value = var.api_base_url
  tags  = local.tags
}

resource "aws_ssm_parameter" "yt_base" {
  name  = "${local.parameter_prefix}/external/youtube_base"
  type  = "String"
  value = var.yt_api_base
  tags  = local.tags
}

resource "aws_ssm_parameter" "tmdb_base" {
  name  = "${local.parameter_prefix}/external/tmdb_base"
  type  = "String"
  value = var.tmdb_api_base
  tags  = local.tags
}

resource "aws_ssm_parameter" "pixabay_base" {
  name  = "${local.parameter_prefix}/external/pixabay_base"
  type  = "String"
  value = var.pixabay_api_base
  tags  = local.tags
}

# ---------------------------
# Secrets Manager — external APIs and database credentials
# ---------------------------
resource "aws_secretsmanager_secret" "yt_api_key" {
  name = "${var.project_prefix}-yt-api-key"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "yt_api_key" {
  secret_id     = aws_secretsmanager_secret.yt_api_key.id
  secret_string = var.youtube_api_key
}

resource "aws_secretsmanager_secret" "tmdb_api_key" {
  name = "${var.project_prefix}-tmdb-api-key"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "tmdb_api_key" {
  secret_id     = aws_secretsmanager_secret.tmdb_api_key.id
  secret_string = var.tmdb_api_key
}

resource "aws_secretsmanager_secret" "tmdb_v4_token" {
  name = "${var.project_prefix}-tmdb-v4-token"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "tmdb_v4_token" {
  secret_id     = aws_secretsmanager_secret.tmdb_v4_token.id
  secret_string = var.tmdb_v4_token
}

resource "aws_secretsmanager_secret" "pixabay_api_key" {
  name = "${var.project_prefix}-pixabay-api-key"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "pixabay_api_key" {
  secret_id     = aws_secretsmanager_secret.pixabay_api_key.id
  secret_string = var.pixabay_api_key
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.project_prefix}-db-credentials"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id     = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode(var.db_credentials)
}

# ---------------------------
# Outputs exported for application configuration
# ---------------------------
resource "aws_ssm_parameter" "cognito_region" {
  name  = "${local.parameter_prefix}/cognito/region"
  type  = "String"
  value = var.region
  tags  = local.tags
}

resource "aws_ssm_parameter" "cognito_pool_id" {
  name  = "${local.parameter_prefix}/cognito/user_pool_id"
  type  = "String"
  value = aws_cognito_user_pool.this.id
  tags  = local.tags
}

resource "aws_ssm_parameter" "cognito_client_id" {
  name  = "${local.parameter_prefix}/cognito/app_client_id"
  type  = "String"
  value = aws_cognito_user_pool_client.app.id
  tags  = local.tags
  }
  