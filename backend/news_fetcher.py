import feedparser
import asyncio
from typing import List, Dict, Any
from datetime import datetime, timezone
from dateutil import parser as date_parser

# List of global financial/geopolitical RSS feeds to poll
NEWS_FEEDS = [
    {"name": "Yahoo Finance (Top News)", "url": "https://finance.yahoo.com/news/rss"},
    {"name": "CoinDesk (Crypto)", "url": "https://www.coindesk.com/arc/outboundfeeds/rss/"},
    {"name": "CNBC (US)", "url": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114"}
]

class NewsFetcher:
    def __init__(self):
        # Initial timestamp so we only alert for *new* items after startup
        # Set it to exactly now, to prevent a flood of historical news on startup
        self.last_fetch_time = datetime.now(timezone.utc)
        
    def _parse_pub_date(self, entry) -> datetime:
        """Helper to parse various date formats from RSS feeds."""
        date_str = entry.get('published', entry.get('pubDate', entry.get('created')))
        if date_str:
            try:
                date_obj = date_parser.parse(date_str)
                # Ensure it's tz-aware
                if date_obj.tzinfo is None:
                    date_obj = date_obj.replace(tzinfo=timezone.utc)
                return date_obj
            except Exception as e:
                print(f"Error parsing date {date_str}: {e}")
        return datetime.min.replace(tzinfo=timezone.utc)

    def _categorize_news(self, title: str, summary: str) -> str:
        text = (title + " " + summary).lower()
        
        # Define keywords for each category
        categories = {
            "Geopolitics": ["israel", "gaza", "russia", "ukraine", "putin", "biden", "war", "peace", "nato", "un", "diplomat", "sanction", "military", "election", "geopolitics", "taiwan"],
            "Economy": ["rate cut", "interest rate", "inflation", "cpi", "fed", "federal reserve", "economy", "gdp", "tariff", "tax", "powell", "central bank", "unemployment", "jobs report", "recession", "ecb", "boj", "pboc"],
            "Commodities": ["gold", "silver", "copper", "oil", " crude", "brent", "opec", "energy", "natural gas", "agriculture", "wheat", "corn", "metal"],
            "Crypto": ["bitcoin", "btc", "ethereum", "eth", "crypto", "blockchain", "coinbase", "binance", "sec", "etf", "solana", "xrp", "web3", "token"],
            "Equities": ["stocks", "spx", "s&p 500", "nasdaq", "dow", "earnings", "wall street", "shares", "dividend", "ipo", "buyback", "market cap", "apple", "aapl", "microsoft", "msft", "nvidia", "nvda", "tesla", "tsla"]
        }
        
        # Check against categories
        for category, keywords in categories.items():
            if any(kw in text for kw in keywords):
                return category
                
        # If no match, return Generic
        return "Generic"

    def fetch_latest_news(self) -> List[Dict[str, Any]]:
        """Parses all RSS feeds and returns a list of *new* articles."""
        new_articles = []
        
        # We track the highest timestamp seen in this run to update our cursor
        max_time_this_run = self.last_fetch_time

        for feed in NEWS_FEEDS:
            try:
                parsed = feedparser.parse(feed["url"])
                
                for entry in parsed.entries:
                    pub_date = self._parse_pub_date(entry)
                    
                    if pub_date > self.last_fetch_time:
                        title = entry.get("title", "No Title")
                        summary = entry.get("summary", "")
                        
                        # Apply categorization
                        category = self._categorize_news(title, summary)

                        article = {
                            "title": title,
                            "link": entry.get("link", ""),
                            "source": feed["name"],
                            "published": pub_date.isoformat(),
                            "id": entry.get("id", entry.get("link", "")),
                            "category": category  # New addition
                        }
                        new_articles.append(article)
                        
                        if pub_date > max_time_this_run:
                            max_time_this_run = pub_date

            except Exception as e:
                print(f"Failed to fetch {feed['name']}: {e}")

        self.last_fetch_time = max_time_this_run
        
        # Sort so oldest new articles are first if we want to process them in order,
        # or newest first. Let's send newest first.
        new_articles.sort(key=lambda x: x["published"], reverse=True)
        
        return new_articles

# Global instance
news_fetcher = NewsFetcher()
