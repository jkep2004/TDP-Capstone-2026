# Personal Carbon Footprint & Savings Advisor

**Nationwide TDP 2026 - Capstone Project**\
**Learner Brief**

## Project Goal

Build a customer-facing sustainability product that analyses spending
behaviour, calculates carbon impact, and provides practical
recommendations to help customers reduce both carbon emissions and
costs.

You will work as a professional technology team, applying software
development, data, testing, security, DevSecOps, and business skills.

There will be an award for the team delivering the best MVP at the final
showcase.

## Project Background

Banks are increasingly focusing on sustainability and financial
wellbeing. This prototype application will help customers understand the
environmental impact of their spending and suggest cost-saving
behavioural changes.

This project will help customers understand:

- How their spending impacts the environment.
- Where they can reduce carbon emissions.
- How they can save money through behavioural changes.

The goal is to combine financial awareness with sustainability
awareness.

## Objectives

By the end of the project, your team will deliver a working MVP that
allows a customer to:

- Submit monthly spending data.
- Calculate estimated carbon impact.
- Receive category-based recommendations.
- Estimate potential savings.
- Track progress over time.
- Complete sustainability challenges.

## MVP Requirements

The product should allow a customer to:

- Submit monthly spending.
- Calculate estimated carbon impact.
- Receive recommendations.
- Estimate potential savings.
- View progress over time.
- Complete sustainability challenges.

## Technology

- Python 3.14
- GitHub for source control.
- SQL for emissions and spending data.
- Automated testing.
- Local or Azure hosting.
- GitHub Actions for CI/CD.

### Recommended Python Technologies

- FastAPI
- Uvicorn
- pytest
- SQLAlchemy / SQL database connectivity

## Local Development (API)

Tests are run from the **repo root**. `pytest.ini` sets `pythonpath = api`
and `testpaths = api/tests`.

### 1. Python environment

macOS / Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r api/requirements-dev.txt
```

Windows (PowerShell):

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r api/requirements-dev.txt
```

`requirements-dev.txt` includes `requirements.txt`. Install again after
pulling `dev`, because new dependencies are added over time (e.g.
`structlog`). The error `ModuleNotFoundError: No module named 'structlog'`
means your environment is out of date.

### 2. Environment variables

Create a `.env` file in the repo root. It is git-ignored, and CI blocks it
from being committed. Never commit it. Ask a teammate for the values. The
required names (checked by `api/src/Core/config.py`) are:

```
DB_SERVER, DB_NAME, DB_ADMIN_USER, DB_ADMIN_PASSWORD,
ENTRA_TENANT_ID, ENTRA_API_CLIENT_ID,
APP_JWT_SECRET, APP_JWT_ALGORITHM, APP_JWT_EXPIRE_MINUTES
```

Optional: `DB_DRIVER` (e.g. `ODBC Driver 18 for SQL Server`).

### 3. Database driver (only needed to talk to the real Azure SQL DB)

Unit tests mock the database, so they run without a driver. To run the
API against the real DB you need Microsoft's ODBC Driver 18.

- **macOS:** `brew install unixodbc`, then install `msodbcsql18` from
  Microsoft's Homebrew tap (see Microsoft's "Install the ODBC driver on
  macOS" page).
- **Windows:** install "ODBC Driver 18 for SQL Server".

Your public IP may also need adding to the Azure SQL firewall.

### 4. Run

```bash
python -m pytest -q                                   # all API tests (from repo root)
cd api && python -m uvicorn src.main:app --reload     # dev server, docs at http://127.0.0.1:8000/docs
```

## DevSecOps

Security is part of development throughout the project.

The CI/CD pipeline should demonstrate:

- Automated testing.
- Static Application Security Testing (SAST).
- Dependency / Software Composition Analysis (SCA) scanning.
- Dynamic Application Security Testing (DAST), where practical.
- Secure coding.
- Input validation.
- Secure database access.
- Secrets management.
- Vulnerability remediation.

## Delivery Plan: Four Sprints of Three Days

### Sprint 1 - Setup & First MVP

**Outcome:** Customer can submit spending and the data is securely
stored.

**Focus areas:**

- Agile planning.
- GitHub and branching.
- Python 3.14.
- API.
- SQL.
- Testing.
- Secure coding.
- Initial DevSecOps pipeline.

### Sprint 2 - Carbon Calculation

**Outcome:** Customer receives a carbon-impact estimate.

**Focus areas:**

- Emissions factors.
- SQL / T-SQL.
- Carbon calculations.
- Data quality.
- API development.
- Testing and security.

### Sprint 3 - Insights & Recommendations

**Outcome:** Customer understands their impact and receives
recommendations.

**Focus areas:**

- Carbon insights.
- Trends.
- Category analysis.
- Recommendations.
- Potential savings.
- Dashboard development.
- Testing and DevSecOps.

### Sprint 4 - Final MVP & Showcase

**Outcome:** Customer-ready product.

**Focus areas:**

- End-to-end testing.
- Security testing.
- Defect fixing.
- Deployment.
- Documentation.
- DevSecOps evidence.
- Final presentation.

## Team & Professional Skills

Throughout the project, demonstrate:

- Problem-solving.
- Teamwork.
- Cross-disciplinary collaboration.
- Communication.
- Planning.
- Stakeholder engagement.
- Understanding and using individual strengths.
- Commercial awareness.
- Customer focus.

Be prepared to explain what you built, why you built it, and the value
it provides.

## Responsible AI

AI can be used to support:

- Coding.
- Testing.
- SQL.
- Troubleshooting.
- Documentation.
- Data analysis.
- Recommendations.

However, you must review, understand, test, and security-check
AI-generated output before using it.

## Stretch Objectives

Choose appropriate enhancements if the MVP is complete:

- AI-assisted recommendations.
- Predictive savings.
- Advanced dashboard analytics.
- Spending trends.
- Main branch protection.
- Authentication.
- Role-based access.
- Azure Key Vault.
- Enhanced security controls.

## Final Showcase

Demonstrate:

- Customer journey.
- Spending submission.
- Carbon calculation.
- Insights.
- Recommendations.
- Potential savings.
- Sustainability challenges.
- Dashboard.
- Automated tests.
- CI/CD.
- SAST, SCA, and DAST.
- Security improvements.
- Deployment.
- Responsible AI use.

## Remember

> MVP first. Build small. Test early. Secure throughout.

The strongest team will combine technical capability, teamwork,
communication, security, and clear customer/business value.
