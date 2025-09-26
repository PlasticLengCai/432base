variable "region" {
  type = string
}

variable "route53_zone_id" {
  type = string
}

variable "subdomain" {
  type = string
}

variable "ec2_public_ip" {
  type = string
}

variable "param_api_base_url_name" {
  type = string
}

variable "param_api_base_url_value" {
  type    = string
  default = null
}

variable "api_base_url" {
  type    = string
  default = null
}

variable "secret_admin_name" {
  type = string
}

variable "admin_username" {
  type = string
}

variable "admin_password" {
  type      = string
  sensitive = true
}

variable "owner_email" {
  type = string
}

variable "extra_tags" {
  type    = map(string)
  default = {}
}