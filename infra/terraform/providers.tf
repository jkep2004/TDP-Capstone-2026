terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.15"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id            = "6525676e-4bad-424c-a4cd-702d84861fff"
  skip_provider_registration = true
}