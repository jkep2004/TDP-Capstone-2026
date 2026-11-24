import os
import dotenv

dotenv.load_dotenv()

def check_env_variables():
    required_vars = [
        "DB_SERVER",
        "DB_NAME",
        "DB_ADMIN_USER",
        "DB_ADMIN_PASSWORD",
        "ENTRA_TENANT_ID",
        "ENTRA_API_CLIENT_ID",
        "APP_JWT_SECRET",
        "APP_JWT_ALGORITHM",
        "APP_JWT_EXPIRE_MINUTES"
    ]
    
    for var in required_vars:
        if not os.getenv(var):
            raise ValueError(f"{var} environment variable is not set.")

if __name__ == "__main__":
    check_env_variables()