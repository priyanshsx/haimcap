import os
from dotenv import load_dotenv
load_dotenv()
print('Starting debug sync...')
from backend.fetchers_yf import fetch_yfinance_history
from backend.fetchers_fred import fetch_fred_history

print('Fetching YF...')
try:
    yf_data = fetch_yfinance_history(years=1)
    print('YF done. Fetched lengths:', {k: len(v) for k,v in yf_data.items()})
except Exception as e:
    print('YF failed:', e)

print('Fetching FRED...')
try:
    fred_data = fetch_fred_history(years=1)
    print('FRED done. Fetched economy length:', len(fred_data.get('economy', {})))
except Exception as e:
    print('FRED failed:', e)

from backend.scheduler import update_all_data
print('Running full update_all_data()...')
update_all_data()
print('Done!')
