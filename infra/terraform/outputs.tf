output "cognito_user_pool_id" {
  description = "ID of the Cognito user pool"
  value       = aws_cognito_user_pool.this.id
}

output "cognito_user_pool_client_id" {
  description = "App client ID"
  value       = aws_cognito_user_pool_client.app.id
}

output "cognito_user_pool_client_secret" {
  description = "App client secret"
  value       = aws_cognito_user_pool_client.app.client_secret
  sensitive   = true
}

output "ssm_parameters" {
  description = "Names of SSM parameters configured for the application"
  value = {
    api_base_url = aws_ssm_parameter.api_base.name
    yt_api_base  = aws_ssm_parameter.yt_base.name
    tmdb_api_base = aws_ssm_parameter.tmdb_base.name
    pixabay_api_base = aws_ssm_parameter.pixabay_base.name
    cognito_region    = aws_ssm_parameter.cognito_region.name
    cognito_pool_id   = aws_ssm_parameter.cognito_pool_id.name
    cognito_client_id = aws_ssm_parameter.cognito_client_id.name
  }
}

output "secret_arns" {
  description = "Secrets Manager ARNs used by the application"
  value = {
    yt_api_key    = aws_secretsmanager_secret.yt_api_key.arn
    tmdb_api_key  = aws_secretsmanager_secret.tmdb_api_key.arn
    tmdb_v4_token = aws_secretsmanager_secret.tmdb_v4_token.arn
    pixabay_api_key = aws_secretsmanager_secret.pixabay_api_key.arn
    db_credentials  = aws_secretsmanager_secret.db_credentials.arn
    cognito_client_secret = aws_secretsmanager_secret.cognito_client_secret.arn
  }
  sensitive = true
}

output "s3_buckets" {
  description = "S3 buckets storing original and transcoded videos"
  value = {
    originals = aws_s3_bucket.raw.id
    transcoded = aws_s3_bucket.processed.id
  }
}

output "dynamodb_table_name" {
  description = "DynamoDB table storing video metadata"
  value       = aws_dynamodb_table.videos.name
}

output "route53_record_fqdn" {
  description = "FQDN pointing to the EC2 instance"
  value       = aws_route53_record.app.fqdn
}