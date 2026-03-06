import json
from datetime import datetime
from sqlalchemy.orm import Session

from .database import SessionLocal, DashboardData
from .fetchers_yf import fetch_yfinance_history
from .fetchers_fred import fetch_fred_history
from .fetchers_sentiment import sync_all_sentiment
from .fetchers_crypto import fetch_bitcoin_treasuries

def update_all_data():
    """
    Main scheduled task. Fetches from all sources and updates the SQLite DB.
    """
    print(f"[{datetime.now()}] Starting scheduled data update...")
    
    db: Session = None
    try:
        yf_data = fetch_yfinance_history(years=5)
        fred_data = fetch_fred_history(years=5)
        # Sync sentiment data (RSS, Reddit, Edgar)
        sync_all_sentiment()
        # Sync Bitcoin Treasuries data
        fetch_bitcoin_treasuries()
        
        # Merge FRED bonds into YF bonds if necessary
        # YF handles most standard ones, FRED might just have Economy + Spreads
        bonds_combined = {**yf_data.get("bonds", {}), **fred_data.get("bonds", {})}

        db = SessionLocal()
        
        # Check if a record exists
        record = db.query(DashboardData).first()
        if not record:
            record = DashboardData()
            db.add(record)
            
        record.last_updated = datetime.now().isoformat()
        record.equities_json = json.dumps(yf_data.get("equities", {}))
        record.commodities_json = json.dumps(yf_data.get("commodities", {}))
        record.bonds_json = json.dumps(bonds_combined)
        record.forex_json = json.dumps(yf_data.get("forex", {}))
        record.economy_json = json.dumps(fred_data.get("economy", {}))
        record.crypto_json = "{}"
        
        db.commit()
        print(f"[{datetime.now()}] Data update completed successfully.")
        
    except Exception as e:
        print(f"[{datetime.now()}] Error during data update: {e}")
    finally:
        if db:
            db.close()
