import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

def fetch_yfinance_history(years=5):
    """
    Fetches historical data for a list of tickers from Yahoo Finance.
    Returns a dictionary mapping tickers to lists of dicts {date, value}.
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=years * 365)
    
    # yfinance bulk download
    data = {"equities": {}, "commodities": {}, "bonds": {}, "forex": {}}
    
    # ─── EQUITIES ─────────────────────────────────────────────────────────
    equity_tickers = {
        "SPX": "^GSPC", "NQ": "^IXIC", "DOWJ": "^DJI", "FTSE": "^FTSE",
        "N225": "^N225", "DAX": "^GDAXI", "HSI": "^HSI", "KOSPI": "^KS11"
    }
    
    # ─── COMMODITIES ──────────────────────────────────────────────────────
    commodity_tickers = {
        "GOLD": "GC=F", "SILVER": "SI=F", "COPPER": "HG=F", 
        "WTI": "CL=F", "BRENT": "BZ=F"
    }
    
    # ─── BONDS ────────────────────────────────────────────────────────────
    # In yfinance, treasury yields are available as ^IRX (13-week), ^FVX (5-yr), ^TNX (10-yr), ^TYX (30-yr)
    bond_tickers = {
        "US3M": "^IRX", "US5Y": "^FVX", "US10Y": "^TNX", "US30Y": "^TYX"
    }
    
    # ─── FOREX ────────────────────────────────────────────────────────────
    forex_tickers = {
        "DXY": "DX-Y.NYB", "USDJPY": "JPY=X", "EURUSD": "EURUSD=X", 
        "GBPUSD": "GBPUSD=X", "USDCAD": "CAD=X", "AUDUSD": "AUDUSD=X", 
        "USDCHF": "CHF=X", "NZDUSD": "NZDUSD=X"
    }

    all_maps = [
        (equity_tickers, data["equities"]),
        (commodity_tickers, data["commodities"]),
        (bond_tickers, data["bonds"]),
        (forex_tickers, data["forex"])
    ]

    for ticker_map, target_dict in all_maps:
        yf_symbols = list(ticker_map.values())
        if not yf_symbols: continue

        # Download historical data (Adj Close)
        df_raw = yf.download(yf_symbols, start=start_date, end=end_date, progress=False)
        
        # Protect against failures when Adj Close is missing (yfinance format changes)
        if "Adj Close" in df_raw:
            df = df_raw["Adj Close"]
        elif "Close" in df_raw:
            df = df_raw["Close"]
        else:
            df = df_raw
            
        # If only one symbol was requested, df is a Series, so we convert it to DataFrame
        if isinstance(df, pd.Series):
            df = df.to_frame()

        for our_key, yf_sym in ticker_map.items():
            if yf_sym in df.columns:
                series = df[yf_sym].dropna()
                
                # Format exactly as Recharts expects: [{date: 'YYYY-MM-DD', value: 123.45}]
                formatted_series = []
                for idx, val in series.items():
                    # Check if val is a scalar (yfinance sometimes returns Series/Dataframes instead of floats in certain multi-indexes)
                    if isinstance(val, pd.Series):
                         val = val.iloc[0]
                    # Convert to standard Python float safely
                    value = float(round(float(val), 4))
                    formatted_series.append({
                        "date": idx.strftime("%Y-%m-%d"),
                        "value": value
                    })
                
                target_dict[our_key] = formatted_series

    # Calculate 2Y bond yield using FRED later, or proxy if missing
    return data
