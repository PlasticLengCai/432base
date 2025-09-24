# Terraform deployment for CAB432 Assessment 2

This Terraform configuration creates all AWS resources referenced by the Node.js application:

* Cognito user pool, app client (with MFA), and user groups (`admin`, `user`).
* S3 buckets for original and transcoded videos plus a lifecycle rule for processed outputs.
* DynamoDB table for video metadata.
* Systems Manager Parameter Store parameters for API routing and external API base URLs.
* Secrets Manager secrets for API keys, database credentials, and the Cognito app client secret.
* Route53 record mapping your assessment subdomain to the EC2 instance that hosts the API.

## Usage

1. Install Terraform 1.5+ and configure AWS credentials for the CAB432 account (the same profile you use in the console).
2. Copy `terraform.tfvars.example` to `terraform.tfvars` and populate it with the live values:
   * `project_prefix = "n12005371"`
   * `region = "ap-southeast-2"`
   * `owner_email = "n12005371@qut.edu.au"`
   * `api_base_url = "https://n12005371.cab432.com"`
   * `subdomain = "n12005371"`
   * `ec2_public_ip = "3.106.244.57"`
   * Provide valid keys for YouTube, TMDB (v3 or v4), Pixabay, and the JSON object containing the database credentials or admin credentials that the Node.js service should read from Secrets Manager.
3. Run `terraform init`.
4. Run `terraform plan` and confirm the resource changes look correct.
5. Run `terraform apply` to create or update the resources.
6. After apply completes, map the outputs back into the Node.js environment:
   * `cognito_user_pool_id` → `COGNITO_USER_POOL_ID`
   * `cognito_user_pool_client_id` → `COGNITO_APP_CLIENT_ID`
   * `cognito_user_pool_client_secret` (stored in Secrets Manager) → `COGNITO_APP_CLIENT_SECRET`
   * `ssm_parameters.api_base_url` → `PARAM_API_BASE_URL`
   * `ssm_parameters.yt_api_base` → `PARAM_YT_API_BASE`
   * `ssm_parameters.tmdb_api_base` → `PARAM_TMDB_API_BASE`
   * `ssm_parameters.pixabay_api_base` → `PARAM_PIXABAY_API_BASE`
   * `secret_arns` entries → `SECRET_YT_API_KEY`, `SECRET_TMDB_API_KEY`, `SECRET_TMDB_V4_TOKEN`, `SECRET_PIXABAY_API_KEY`, `SECRET_DB_CREDENTIALS`
7. Update the `.env` file (or EC2 instance environment variables) with those values and restart the Node.js service.

The configuration is idempotent—rerunning `terraform apply` keeps resources up to date and records drifts introduced manually. Keep the generated `terraform.tfvars` file out of version control so API keys and passwords remain private.
