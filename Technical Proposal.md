# Technical Proposal

## Language

Python

FastAPI

SQL

## Infra

Docker (Host off my server?)

Github \+ CICD (Pipelines)

Azure blob

## Security

### Authentication

Entra ID (Azure AD)

OAuth2/OpenID Connect

JWT Bearer tokens

### Authorisation

RBAC (Cust/admin)

### Secrets

GitHub Secrets

.env local

Azure Key Vault (To investigate)

### Controls

HTTPS (Need cert)

JWT Validation

SQL parameterisation

SAST/SCA/DAST scanning (wtf is this?)

Audit logging

## API

Swagger documentation (Automated?)

### GET

/v1/docs

/v1/health

/v1/categories

/v1/emissions\-factors

/v1/emissions\-factors/\{ID\}

/v1/spend/\{custID\}

/v1/carbon\-impact/\{custID\}

/v1/insights/\{custID\}

/v1/trends/\{custID\}

/v1/recommendations/\{custID\}

/v1/savings/\{custID\}

### POST

/v1/spend

    {

        id: string

        category: string

        amount: float

        date: Date

    }

or

    {

        id: string

        transactions: [

            {

                category: string

                amount: float

                date: Date

            }

        ]

    }

/v1/category (ADMIN)

/v1/emissions\-factors (ADMIN)
