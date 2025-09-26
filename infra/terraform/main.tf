terraform {
  required_version = ">= 1.4.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

data "aws_route53_zone" "zone" {
  zone_id = var.route53_zone_id
}

locals {
  zone_name = trim(data.aws_route53_zone.zone.name, ".")
  fqdn      = "${var.subdomain}.${local.zone_name}"
  tags = merge(
    var.extra_tags,
    {
      OwnerEmail = var.owner_email
    }
  )
  admin_secret_string = jsonencode({
    username = var.admin_username
    password = var.admin_password
  })
  api_base_url_value = coalesce(
    var.param_api_base_url_value,
    var.api_base_url,
    "https://${local.fqdn}"
  )
}


resource "aws_route53_record" "app_a" {
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = local.fqdn
  type    = "A"
  ttl     = 300
  records = [var.ec2_public_ip]
}

resource "aws_ssm_parameter" "api_base_url" {
  name  = var.param_api_base_url_name
  type  = "String"
  value = local.api_base_url_value

  tags = local.tags
}


data "aws_ssm_parameter" "api_base_url" {
  name = aws_ssm_parameter.api_base_url.name

  depends_on = [aws_ssm_parameter.api_base_url]
}

resource "aws_secretsmanager_secret" "admin" {
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "admin_current" {
  secret_id     = aws_secretsmanager_secret.admin.id
  secret_string = local.admin_secret_string
}
