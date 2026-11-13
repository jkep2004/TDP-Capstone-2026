import os
import sys
from dotenv import load_dotenv
import pyodbc
from pathlib import Path

# Load environment variables from .env file
load_dotenv()

# Database connection configuration
SERVER = os.getenv("DB_SERVER", "localhost,1433")
DATABASE = os.getenv("DB_NAME", "CarbonFootprintDB")

# Strict administrative credential check (Fail-Fast principle)
ADMIN_USER = os.getenv("DB_ADMIN_USER", "sa")
ADMIN_PASSWORD = os.getenv("DB_ADMIN_PASSWORD") or os.getenv("SA_PASSWORD")

if not ADMIN_PASSWORD:
    raise ValueError(
        "CRITICAL SECURITY ERROR: 'DB_ADMIN_PASSWORD' (or 'SA_PASSWORD') is not set in the environment variables or .env file! "
        "Application startup aborted to prevent insecure execution."
    )

DRIVER = "{ODBC Driver 18 for SQL Server}"

def create_database_if_not_exists():
    """
    Connect to the 'master' database using administrator privileges 
    to check if the target business database exists. If not, create it automatically.
    """
    conn_str = f"DRIVER={DRIVER};SERVER={SERVER};DATABASE=master;UID={ADMIN_USER};PWD={ADMIN_PASSWORD};TrustServerCertificate=yes;"
    
    try:
        conn = pyodbc.connect(conn_str)
        conn.autocommit = True
        cursor = conn.cursor()
        
        cursor.execute(f"SELECT database_id FROM sys.databases WHERE Name = '{DATABASE}'")
        exists = cursor.fetchone()
        
        if not exists:
            print(f"Creating database: {DATABASE} ...")
            cursor.execute(f"CREATE DATABASE [{DATABASE}]")
            print("Database created successfully!")
        else:
            print(f"Database {DATABASE} already exists. Skipping creation.")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error while checking or creating database: {e}")
        raise e

def execute_sql_file(file_name):
    """
    Read a SQL file, split T-SQL batches by 'GO', 
    and execute them sequentially against the target database.
    """
    base_dir = Path(__file__).resolve().parent
    file_path = base_dir / file_name
    
    if not file_path.exists():
        print(f"Error: {file_name} not found at path: {file_path}")
        return

    print(f"Processing script: {file_name} ...")
    with open(file_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    # Split T-SQL script by 'GO' statements since pyodbc cannot parse 'GO' directly
    batches = []
    current_batch = []
    for line in sql_content.splitlines():
        if line.strip().upper() == "GO":
            if current_batch:
                batches.append("\n".join(current_batch))
                current_batch = []
        else:
            current_batch.append(line)
    if current_batch:
        batches.append("\n".join(current_batch))

    conn_str = f"DRIVER={DRIVER};SERVER={SERVER};DATABASE={DATABASE};UID={ADMIN_USER};PWD={ADMIN_PASSWORD};TrustServerCertificate=yes;"
    
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        for i, batch in enumerate(batches):
            if batch.strip():
                try:
                    cursor.execute(batch)
                    conn.commit()
                except Exception as e:
                    print(f"Error executing batch #{i+1} in {file_name}: {e}")
                    raise e

        print(f"Successfully executed: {file_name}")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Failed to execute {file_name}: {e}")
        raise e

if __name__ == "__main__":
    # Optional flag: python init_db.py --with-test-data
    # also loads the sample spending from test_spending.sql (testing only)
    with_test_data = "--with-test-data" in sys.argv

    print("=== Starting Secure Database Infrastructure Initialization & Seeding ===")
    
    # 1. Check and create database if not exists
    create_database_if_not_exists()
    
    # 2. Initialize table structures and views (schema.sql)
    execute_sql_file("schema.sql")
    
    # 3. Insert reference/seed data (seed.sql) - no spending data
    execute_sql_file("seed.sql")

    # 4. Optional: load sample spending for testing (test_spending.sql)
    if with_test_data:
        execute_sql_file("test_spending.sql")
    else:
        print("Skipping test spending data (add --with-test-data to load it).")
    
    print("=== Secure Database Initialization & Seeding Completed Successfully ===")
