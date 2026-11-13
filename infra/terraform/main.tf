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

# 6. App Service Plan (Linux B1 Tier)
resource "azurerm_service_plan" "app_plan" {
  name                = "asp-${var.project_name}-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = "B1"
}

# 7. Linux Web App (API Host)
resource "azurerm_linux_web_app" "api_app" {
  name                = "app-${var.project_name}-api-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  service_plan_id     = azurerm_service_plan.app_plan.id
  https_only          = true

  site_config {
    minimum_tls_version = "1.2"
    # Startup command for FastAPI skeleton
    app_command_line    = "uvicorn src.api.main:app --host 0.0.0.0 --port 8000"
  }

  # Inject non-sensitive DB connection settings into the cloud API environment
  app_settings = {
    "DB_SERVER"   = "${azurerm_mssql_server.sql_server.fully_qualified_domain_name},1433"
    "DB_NAME"     = azurerm_mssql_database.sql_db.name
    "DB_USER"     = var.sql_admin_username
    "DB_PASSWORD" = var.sql_admin_password
  }
}