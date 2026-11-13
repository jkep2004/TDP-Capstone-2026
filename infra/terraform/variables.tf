variable "project_name" {
  description = "Project name used as a prefix for all Azure resources"
  type        = string
  default     = "tdp26-carbon-team3"
}

variable "environment" {
  description = "Deployment environment (dev, test, prod)"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Azure region for resource deployment"
  type        = string
  default     = "uksouth"
}

variable "sql_admin_username" {
  description = "Administrator username for Azure SQL Server"
  type        = string
  default     = "sqladminuser"
}

variable "sql_admin_password" {
  description = "Administrator password for Azure SQL Server (must be passed via TF_VAR_sql_admin_password)"
  type        = string
  sensitive   = true
}

variable "client_ip_address" {
  description = "Your local public IP address to allow running init_db.py against Azure SQL"
  type        = string
  default     = "0.0.0.0" # Will be overridden during deployment
}