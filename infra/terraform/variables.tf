variable "project_prefix" {
  description = "Short identifier used to name AWS resources (e.g. n12005371)"
  type        = string
}

variable "region" {
  description = "AWS region to deploy all services"
  type        = string
  default     = "ap-southeast-2"
}

variable "owner_email" {
  description = "Contact email for tagging"
  type        = string
}

variable "extra_tags" {
  description = "Additional resource tags"
  type        = map(string)
  default     = {}
}

variable "ssm_parameter_prefix" {
  description = "Custom prefix for SSM parameters (defaults to /cab432/{project_prefix})"
  type        = string
  default     = null
}

variable "transcoded_retention_days" {
  description = "Number of days to keep transcoded outputs in S3"
  type        = number
  default     = 14
}

variable "api_base_url" {
  description = "Public base URL for the API"
  type        = string
}

variable "yt_api_base" {
  description = "Base URL for YouTube search API"
  type        = string
  default     = "https://www.googleapis.com/youtube/v3"
}

variable "tmdb_api_base" {
  description = "Base URL for TMDB API"
  type        = string
  default     = "https://api.themoviedb.org/3"
}

variable "pixabay_api_base" {
  description = "Base URL for Pixabay API"
  type        = string
  default     = "https://pixabay.com/api"
}

variable "youtube_api_key" {
  description = "YouTube API key stored in Secrets Manager"
  type        = string
  sensitive   = true
}

variable "tmdb_api_key" {
  description = "TMDB v3 API key stored in Secrets Manager"
  type        = string
  sensitive   = true
}

variable "tmdb_v4_token" {
  description = "TMDB v4 access token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "pixabay_api_key" {
  description = "Pixabay API key stored in Secrets Manager"
  type        = string
  sensitive   = true
}

variable "db_credentials" {
  description = "Database credentials stored as a JSON secret"
  type = object({
    username = string
    password = string
    host     = string
    port     = number
    engine   = string
    dbname   = string
  })
  sensitive = true
}

variable "route53_zone_name" {
  description = "Hosted zone to publish the subdomain"
  type        = string
  default     = "cab432.com"
}

variable "subdomain" {
  description = "Subdomain to map to the EC2 instance (without zone)"
  type        = string
}

variable "ec2_public_ip" {
  description = "IPv4 address of the EC2 instance running the API"
  type        = string
}

variable "app_callback_urls" {
  description = "Allowed Cognito app client callback URLs"
  type        = list(string)
  default     = []
}

variable "app_logout_urls" {
  description = "Allowed Cognito app client logout URLs"
  type        = list(string)
  default     = []
}
