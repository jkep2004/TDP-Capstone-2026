# 1. Azure Resource Group
resource "azurerm_resource_group" "rg" {
  name     = "rg-${var.project_name}-${var.environment}"
  location = var.location

  tags = {
    Project     = "Nationwide-TDP-Capstone-2026"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 2. Azure SQL Logical Server
resource "azurerm_mssql_server" "sql_server" {
  name                         = "sql-${var.project_name}-${var.environment}"
  resource_group_name          = azurerm_resource_group.rg.name
  location                     = azurerm_resource_group.rg.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
  minimum_tls_version          = "1.2"
}

# 3. Firewall Rule A: Allow Azure internal services (so Web App can talk to SQL Server)
resource "azurerm_mssql_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.sql_server.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# 4. Firewall Rule B: Allow your local machine (so you can run init_db.py & SSMS/Azure Data Studio)
resource "azurerm_mssql_firewall_rule" "allow_local_dev" {
  count            = var.client_ip_address != "0.0.0.0" ? 1 : 0
  name             = "AllowLocalDeveloperIP"
  server_id        = azurerm_mssql_server.sql_server.id
  start_ip_address = var.client_ip_address
  end_ip_address   = var.client_ip_address
}

# 5. Azure SQL Database (CarbonFootprintDB - Basic Tier for cost efficiency)
resource "azurerm_mssql_database" "sql_db" {
  name           = "CarbonFootprintDB"
  server_id      = azurerm_mssql_server.sql_server.id
  collation      = "SQL_Latin1_General_CP1_CI_AS"
  sku_name       = "Basic"
  max_size_gb    = 2
  zone_redundant = false
}

# 6. Azure Container Apps Environment (Bypasses App Service Plan 0-quota limit)
resource "azurerm_container_app_environment" "api_env" {
  name                = "cae-${var.project_name}-${var.environment}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

# 7. Azure Container App (API Host)
resource "azurerm_container_app" "api_app" {
  name                         = "ca-${var.project_name}-api-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.api_env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  ingress {
    external_enabled = true
    target_port      = 80
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    container {
      name   = "carbon-api"
      image  = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "DB_SERVER"
        value = "${azurerm_mssql_server.sql_server.fully_qualified_domain_name},1433"
      }
      env {
        name  = "DB_NAME"
        value = azurerm_mssql_database.sql_db.name
      }
      env {
        name  = "DB_USER"
        value = var.sql_admin_username
      }
      env {
        name        = "DB_PASSWORD"
        secret_name = "db-password"
      }
    }
  }

  secret {
    name  = "db-password"
    value = var.sql_admin_password
  }
}