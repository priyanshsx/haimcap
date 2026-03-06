import sqlite3
import json

conn = sqlite3.connect('nexus.db')
cursor = conn.cursor()

mock_news = [
    {
        "id": "mock-1",
        "title": "Federal Reserve signals steady rates amid inflation concerns.",
        "link": "https://example.com/fed-news",
        "published": "2026-03-03T09:00:00Z",
        "source": "Mock Finance"
    },
    {
        "id": "mock-2",
        "title": "Global markets rally as tech earnings beat expectations.",
        "link": "https://example.com/tech-news",
        "published": "2026-03-03T08:30:00Z",
        "source": "Mock Finance"
    }
]

cursor.execute('UPDATE dashboard_data SET news_json = ?', (json.dumps(mock_news),))
conn.commit()
print("Injected mock news into DB.")
conn.close()
