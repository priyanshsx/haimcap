import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .database import engine, Base, get_db, DashboardData, SentimentScore, FundHolding, EdgarSignal, BitcoinTreasury, SessionLocal
from .news_fetcher import news_fetcher
from typing import List

# Load environment variables
load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Haim Capital Data Center API")

# Configure CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5175", "http://127.0.0.1:5175"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/data")
def get_dashboard_data():
    db = next(get_db())
    record = db.query(DashboardData).first()
    if not record:
        return {"error": "Data not yet available. Backend is syncing."}
        
    return {
        "last_updated": record.last_updated,
        "equities": json.loads(record.equities_json) if record.equities_json else {},
        "commodities": json.loads(record.commodities_json) if record.commodities_json else {},
        "bonds": json.loads(record.bonds_json) if record.bonds_json else {},
        "forex": json.loads(record.forex_json) if record.forex_json else {},
        "economy": json.loads(record.economy_json) if record.economy_json else {},
        "crypto": json.loads(record.crypto_json) if record.crypto_json else {},
        "news": json.loads(record.news_json) if record.news_json else []
    }

# --- NEW SENTIMENT ENDPOINTS ---

@app.get("/api/sentiment/scores")
def get_sentiment_scores():
    db = next(get_db())
    # Return 7 days of scores for the trend chart
    scores = db.query(SentimentScore).order_by(SentimentScore.date.desc()).limit(28).all()
    # Format group by date for easiest consumption
    grouped = {}
    for s in scores:
        if s.date not in grouped:
            grouped[s.date] = {"date": s.date}
        grouped[s.date][s.source] = s.score
        
    trend = sorted(list(grouped.values()), key=lambda x: x["date"])
    
    # Current single latest value (composite and sources)
    current = trend[-1] if trend else {"composite": 50, "rss": 50, "reddit": 50, "edgar": 50}
    
    return {
        "current": current,
        "trend": trend
    }

@app.get("/api/sentiment/funds")
def get_sentiment_funds():
    db = next(get_db())
    holdings = db.query(FundHolding).order_by(FundHolding.id.desc()).limit(20).all()
    return [{"fund": h.fund, "ticker": h.ticker, "action": h.action, "size": h.size_change_pct, "date": h.date} for h in holdings]
    
@app.get("/api/sentiment/signals")
def get_sentiment_signals():
    db = next(get_db())
    signals = db.query(EdgarSignal).order_by(EdgarSignal.id.desc()).limit(15).all()
    return [{"company": s.company, "type": s.signal_type, "text": s.text, "score": s.score, "time": s.timestamp} for s in signals]

@app.get("/api/crypto/treasuries")
def get_crypto_treasuries():
    db = next(get_db())
    treasuries = db.query(BitcoinTreasury).order_by(BitcoinTreasury.rank.asc()).limit(100).all()
    return [{
        "rank": t.rank,
        "name": t.name,
        "symbol": t.symbol,
        "btc_holdings": t.btc_holdings,
        "price_change_7d": t.price_change_7d
    } for t in treasuries]

@app.get("/api/cron/poll_news")
def cron_poll_news():
    """Cron endpoint to fetch latest news."""
    try:
        new_articles = news_fetcher.fetch_latest_news()
        if new_articles:
            # Save to Database persistently
            db = SessionLocal()
            try:
                record = db.query(DashboardData).first()
                if record:
                    existing_news = json.loads(record.news_json) if record.news_json else []
                    # Append new items to the front, deduplicate by ID just in case
                    existing_ids = {n.get("id", "") for n in existing_news}
                    for article in reversed(new_articles):
                        if article.get("id", "") not in existing_ids:
                            existing_news.insert(0, article)
                            existing_ids.add(article.get("id", ""))
                    
                    record.news_json = json.dumps(existing_news)
                    db.commit()
            except Exception as db_e:
                print(f"Error saving news to DB: {db_e}")
                raise HTTPException(status_code=500, detail="Database Error")
            finally:
                db.close()
                
        return {"status": "ok", "fetched_count": len(new_articles) if new_articles else 0}
    except Exception as e:
        print(f"Error polling news: {e}")
        raise HTTPException(status_code=500, detail="Error fetching news")

@app.get("/api/cron/flush_news")
def cron_flush_news():
    """Cron endpoint to wipe the news database daily."""
    db = SessionLocal()
    try:
        record = db.query(DashboardData).first()
        if record:
            record.news_json = "[]"
            db.commit()
            print("News cache flushed successfully for the new day.")
            return {"status": "ok"}
        return {"status": "no data to flush"}
    except Exception as e:
        print(f"Error flushing news: {e}")
        raise HTTPException(status_code=500, detail="Error flushing news")
    finally:
        db.close()

from .scheduler import update_all_data
@app.get("/api/cron/update_data")
def cron_update_all_data():
    """Cron endpoint to update the daily dashboard data."""
    try:
        update_all_data()
        return {"status": "ok"}
    except Exception as e:
        print(f"Error updating data: {e}")
        raise HTTPException(status_code=500, detail="Error updating dashboard data")
