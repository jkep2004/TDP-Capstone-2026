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

# 3. Firewall Rule A: Allow Azure internal services
resource "azurerm_mssql_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.sql_server.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# 4. Firewall Rule B: Allow your local machine
resource "azurerm_mssql_firewall_rule" "allow_local_dev" {
  count            = var.client_ip_address != "0.0.0.0" ? 1 : 0
  name             = "AllowLocalDeveloperIP"
  server_id        = azurerm_mssql_server.sql_server.id
  start_ip_address = var.client_ip_address
  end_ip_address   = var.client_ip_address
}

# 5. Azure SQL Database
resource "azurerm_mssql_database" "sql_db" {
  name           = "CarbonFootprintDB"
  server_id      = azurerm_mssql_server.sql_server.id
  collation      = "SQL_Latin1_General_CP1_CI_AS"
  sku_name       = "Basic"
  max_size_gb    = 2
  zone_redundant = false
}

# 6. Azure Container Apps Environment
resource "azurerm_container_app_environment" "api_env" {
  name                = "cae-${var.project_name}-${var.environment}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

# 7. Azure Container App (Backend API Host)
resource "azurerm_container_app" "api_app" {
  name                         = "ca-${var.project_name}-api-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.api_env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  ingress {
    external_enabled = true
    target_port      = 8000
    transport        = "auto" # 【修复】补全传输协议
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  registry {
    server               = "ghcr.io"
    username             = "Helen_kuku"
    password_secret_name = "ghcr-password"
  }

  secret {
    name  = "ghcr-password"
    value = var.github_pat
  }

  template {
    container {
      name   = "carbon-api"
      image  = "ghcr.io/jkep2004/tdp-capstone-2026-backend:unstable"
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
      env {
        name  = "DB_DRIVER"
        value = "ODBC Driver 18 for SQL Server"
      }
      env {
        name  = "DB_ADMIN_USER"
        value = var.sql_admin_username
      }
      env {
        name        = "DB_ADMIN_PASSWORD"
        secret_name = "db-password"
      }
      env {
        name  = "AZURE_TENANT_ID"
        value = "c2f2b391-a7cb-4676-b83c-59b507c6f6b7"
      }
      env {
        name  = "AZURE_CLIENT_ID"
        value = "38344a61-f922-47e6-b292-c374f1ea7076"
      }
    }
  }

  secret {
    name  = "db-password"
    value = var.sql_admin_password
  }
}

# 8. Azure Container App (Frontend Web Host)
resource "azurerm_container_app" "frontend_app" {
  name                         = "ca-${var.project_name}-web-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.api_env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  ingress {
    external_enabled = true
    target_port      = 80
    transport        = "auto" # 【修复】补全传输协议
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  registry {
    server               = "ghcr.io"
    username             = "Helen_kuku"
    password_secret_name = "ghcr-password"
  }

  secret {
    name  = "ghcr-password"
    value = var.github_pat
  }

  template {
    container {
      name   = "carbon-frontend"
      image  = "ghcr.io/jkep2004/tdp-capstone-2026-frontend:unstable"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "VITE_API_BASE_URL"
        value = "https://${azurerm_container_app.api_app.ingress[0].fqdn}"
      }
    }
  }

  #
  depends_on = [
    azurerm_container_app.api_app
  ]
}