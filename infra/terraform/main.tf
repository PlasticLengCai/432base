locals {
  fqdn = "${var.subdomain}.${data.aws_route53_zone.zone.name}"
}

data "aws_route53_zone" "zone" {
  zone_id = var.route53_zone_id
}

resource "aws_route53_record" "app_a" {
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = local.fqdn
  type    = "A"
  ttl     = 300
  records = [var.ec2_public_ip]
}

data "aws_ssm_parameter" "api_base_url" {
  name = var.param_api_base_url_name
}

data "aws_secretsmanager_secret" "admin" {
  name = var.secret_admin_name
}

data "aws_secretsmanager_secret_version" "admin_current" {
  secret_id = data.aws_secretsmanager_secret.admin.id
}

resource "aws_resourcegroups_taggingapi_resources" "noop" {
  resource_arn_list = []
  depends_on = [aws_route53_record.app_a]
}
