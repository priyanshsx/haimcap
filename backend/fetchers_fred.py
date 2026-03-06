import os
from fredapi import Fred
from datetime import datetime, timedelta

def fetch_fred_history(years=5):
    """
    Fetches historical US Economy and Bond data from FRED.
    Requires FRED_API_KEY environment variable.
    """
    fred_key = os.getenv("FRED_API_KEY")
    if not fred_key:
        print("WARNING: FRED_API_KEY not found. Returning empty economy data.")
        return {"economy": {}, "bonds": {}}

    fred = Fred(api_key=fred_key)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=years * 365)
    
    # ─── US ECONOMY ───────────────────────────────────────────────────────
    economy_series = {
        "nfp": "PAYEMS",          # All Employees, Total Nonfarm (Thousands)
        "unemp": "UNRATE",        # Unemployment Rate (%)
        "fedfunds": "FEDFUNDS",   # Federal Funds Effective Rate (%)
        "claims": "ICSA",         # Initial Claims (Weekly)
        "corepce": "PCEPILFE",    # Core PCE 
        "income": "DSPIC96",      # Real Disposable Personal Income
        "mortgage30": "MORTGAGE30US", # 30-Year Fixed Rate Mortgage Average
        "walcl": "WALCL",         # Assets: Total Assets: Total Assets 
        "ccdelinq": "DRCCLACBS",  # Delinquency Rate on Credit Card Loans
        "m2eco": "M2SL"           # M2 Money Stock
    }
    
    # ─── ADDITIONAL BONDS (Treasury Constant Maturities) ──────────────────
    # yfinance often struggles with short-term treasury reliable history, FRED is better
    bond_series = {
        "US2Y": "DGS2",
        "US10Y": "DGS10"
    }

    data = {"economy": {}, "bonds": {}}

    def fetch_series(target_dict, series_map):
        for key, series_id in series_map.items():
            try:
                # Fetch pandas Series
                s = fred.get_series(series_id, observation_start=start_date, observation_end=end_date)
                s = s.dropna()
                
                formatted_series = []
                for idx, val in s.items():
                    # For WALCL (millions to trillions)
                    if key == "walcl":
                        val = val / 1000000
                    # For Personal Income (billions to trillions)
                    elif key == "income":
                        val = val / 1000
                    # For M2 (billions to trillions)
                    elif key == "m2eco":
                        val = val / 1000
                    # Standardize NFP to monthly change if needed, but it's raw cumulative level usually, 
                    # we will calculate dif on frontend or backend.
                        
                    formatted_series.append({
                        "date": idx.strftime("%Y-%m-%d"),
                        "value": float(round(val, 4))
                    })
                
                target_dict[key] = formatted_series
                    
            except Exception as e:
                print(f"Error fetching {series_id} from FRED: {e}")
                target_dict[key] = []

    fetch_series(data["economy"], economy_series)
    fetch_series(data["bonds"], bond_series)

    # Calculate 10Y-2Y Spread
    if "US10Y" in data["bonds"] and "US2Y" in data["bonds"]:
        # Find matching dates
        d2y = {item['date']: item['value'] for item in data['bonds']['US2Y']}
        spreads = []
        for item in data['bonds']['US10Y']:
            date = item['date']
            if date in d2y:
                spread = item['value'] - d2y[date]
                spreads.append({"date": date, "value": float(round(spread, 4))})
        data["bonds"]["spread"] = spreads

    return data
