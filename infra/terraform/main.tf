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
    transport        = "auto"
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  # use managed identity to access Key Vault secrets
  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.api_identity.id]
  }

  # pull secrets from Key Vault using the managed identity
  secret {
    name                = "db-password"
    key_vault_secret_id = azurerm_key_vault_secret.db_password.versionless_id
    identity            = azurerm_user_assigned_identity.api_identity.id
  }

  secret {
    name                = "app-jwt-secret"
    key_vault_secret_id = azurerm_key_vault_secret.app_jwt_secret.versionless_id
    identity            = azurerm_user_assigned_identity.api_identity.id
  }

  template {
    container {
      name   = "carbon-api"
      image  = "ghcr.io/jkep2004/tdp-capstone-2026-backend:unstable"
      cpu    = 0.25
      memory = "0.5Gi"

      # sensitive environment variables for database connection and JWT secret
      env {
        name        = "DB_PASSWORD"
        secret_name = "db-password"
      }
      env {
        name        = "DB_ADMIN_PASSWORD"
        secret_name = "db-password"
      }
      env {
        name        = "APP_JWT_SECRET"
        secret_name = "app-jwt-secret"
      }

      # non-sensitive environment variables for database connection
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
        name  = "DB_DRIVER"
        value = "ODBC Driver 18 for SQL Server"
      }
      env {
        name  = "DB_ADMIN_USER"
        value = var.sql_admin_username
      }
      env {
        name  = "AZURE_TENANT_ID"
        value = var.TENANT_ID
      }
      env {
        name  = "AZURE_CLIENT_ID"
        value = var.CLIENT_ID
      }
      env {
        name  = "ENTRA_TENANT_ID"
        value = var.TENANT_ID
      }
      env {
        name  = "ENTRA_API_CLIENT_ID"
        value = var.CLIENT_ID
      }
      env {
        name  = "APP_JWT_ALGORITHM"
        value = "HS256"
      }
      env {
        name  = "APP_JWT_EXPIRE_MINUTES"
        value = "15"
      }
      env {
        name  = "AZURE_KEY_VAULT_NAME"
        value = azurerm_key_vault.kv.name
      }
      env {
        name  = "AZURE_KEY_VAULT_URL"
        value = azurerm_key_vault.kv.vault_uri
      }
    }
  }

  # make sure the Key Vault secrets and access policies are created before the Container Appls
  depends_on = [
    azurerm_key_vault_access_policy.api_app,
    azurerm_key_vault_secret.db_password,
    azurerm_key_vault_secret.app_jwt_secret
  ]
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
    transport        = "auto"
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
        name  = "VITE_API_URL"
        value = "https://${azurerm_container_app.api_app.ingress[0].fqdn}"
      }
    }
  }

  depends_on = [
    azurerm_container_app.api_app
  ]
}

data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "kv" {
  name                       = "kv-tdp26-carbon-t3-dev"
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = false
  enable_rbac_authorization  = false
}

# 2. give read and write permissions to the current user
resource "azurerm_key_vault_access_policy" "current_user" {
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions = [
    "Get", "List", "Set", "Delete", "Recover", "Backup", "Restore", "Purge"
  ]
}

# 3. create backend managed identity for Container App (to avoid circular dependency)
resource "azurerm_user_assigned_identity" "api_identity" {
  name                = "id-tdp26-carbon-t3-api-dev"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

# 4. give backend managed identity read-only permissions to Key Vault (principle of least privilege)
resource "azurerm_key_vault_access_policy" "api_app" {
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.api_identity.principal_id

  secret_permissions = ["Get"]
}

# 5. write specific Secrets to Key Vault
resource "azurerm_key_vault_secret" "db_password" {
  name         = "db-password"
  value        = var.sql_admin_password
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [azurerm_key_vault_access_policy.current_user]
}

resource "azurerm_key_vault_secret" "app_jwt_secret" {
  name         = "app-jwt-secret"
  value        = var.app_jwt_secret
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [azurerm_key_vault_access_policy.current_user]
}