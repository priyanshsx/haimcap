import os
from dotenv import load_dotenv
load_dotenv()
print('FRED KEY:', os.getenv('FRED_API_KEY'))
from backend.fetchers_fred import fetch_fred_history
print('Fetching FRED...')
try:
    data = fetch_fred_history(years=1)
    print('Done. Economy entries:', len(data.get('economy', {})))
except Exception as e:
    print('Failed:', e)
