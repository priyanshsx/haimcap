import os
import sys
from dotenv import load_dotenv

# Add parent directory to path so we can import 'backend' as a package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load env variables first, BEFORE importing modules that might use them immediately
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from backend.scheduler import update_all_data
from backend.database import Base, engine

if __name__ == "__main__":
    print("Creating DB tables if missing...")
    Base.metadata.create_all(bind=engine)
    print("Running manual data sync...")
    update_all_data()
    print("Sync complete.")
