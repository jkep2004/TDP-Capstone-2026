import os
from dotenv import load_dotenv
import pyodbc
from pathlib import Path

load_dotenv()

# Database connection configuration (reads from environment variables or uses safe defaults)
SERVER = os.getenv("DB_SERVER", "localhost,1433")
DATABASE = os.getenv("DB_NAME", "CarbonFootprintDB")
USERNAME = os.getenv("DB_USER", "sa")
PASSWORD = os.getenv("DB_PASSWORD", "YourStrong@Password123")
DRIVER = "{ODBC Driver 18 for SQL Server}"

def create_database_if_not_exists():
    """
    Connect to the 'master' database to check if the target database exists.
    If it does not exist, automatically create it.
    """
    conn_str = f"DRIVER={DRIVER};SERVER={SERVER};DATABASE=master;UID={USERNAME};PWD={PASSWORD};TrustServerCertificate=yes;"
    
    try:
        # Establish connection with autocommit enabled for DDL statements
        conn = pyodbc.connect(conn_str)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if the target database already exists in the system catalog
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

def init_schema():
    """
    Read the 'schema.sql' file, split T-SQL batches by 'GO', 
    and execute them sequentially against the target database.
    """
    # Locate schema.sql in the same directory as this script
    base_dir = Path(__file__).resolve().parent
    schema_path = base_dir / "schema.sql"
    
    if not schema_path.exists():
        print(f"Error: schema.sql not found at path: {schema_path}")
        return

    # Read the contents of the DDL script
    with open(schema_path, "r", encoding="utf-8") as f:
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

    # Connect to the target CarbonFootprintDB database
    conn_str = f"DRIVER={DRIVER};SERVER={SERVER};DATABASE={DATABASE};UID={USERNAME};PWD={PASSWORD};TrustServerCertificate=yes;"
    
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        print("Starting database schema initialization...")
        for i, batch in enumerate(batches):
            if batch.strip():
                try:
                    cursor.execute(batch)
                    conn.commit()
                except Exception as e:
                    print(f"Error executing SQL batch #{i+1}: {e}")
                    raise e

        print("All database tables and views initialized successfully!")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Database initialization failed: {e}")
        raise e

if __name__ == "__main__":
    print("=== Starting Database Infrastructure Initialization ===")
    create_database_if_not_exists()
    init_schema()
    print("=== Database Initialization Completed Successfully ===")