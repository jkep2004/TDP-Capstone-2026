output "resource_group_name" {
  description = "Provisioned Azure Resource Group"
  value       = azurerm_resource_group.rg.name
}

output "azure_sql_server_fqdn" {
  description = "Azure SQL Server address (use this for DB_SERVER in .env)"
  value       = "${azurerm_mssql_server.sql_server.fully_qualified_domain_name},1433"
}

output "azure_api_url" {
  description = "HTTPS endpoint for the deployed FastAPI application"
  value       = "https://${azurerm_linux_web_app.api_app.default_hostname}"
}