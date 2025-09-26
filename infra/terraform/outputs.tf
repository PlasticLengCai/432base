output "fqdn" {
  value = aws_route53_record.app_a.fqdn
}

output "param_api_base_url_name" {
  value = aws_ssm_parameter.api_base_url.name
}

output "param_api_base_url_value" {
  value     = data.aws_ssm_parameter.api_base_url.value
  sensitive = true
}

output "secret_admin_name" {
  value = aws_secretsmanager_secret.admin.name
}

output "secret_admin_arn" {
  value = aws_secretsmanager_secret.admin.arn
}