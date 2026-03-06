import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

from .database import engine, Base, get_db, DashboardData, SentimentScore, FundHolding, EdgarSignal, BitcoinTreasury, SessionLocal
from .scheduler import update_all_data
from .news_fetcher import news_fetcher
import asyncio
from typing import List
from fastapi import WebSocket, WebSocketDisconnect

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

# Set up the scheduler
scheduler = BackgroundScheduler()

# Active WebSocket connections
active_connections: List[WebSocket] = []

async def broadcast_news(articles: list):
    """Send new articles to all connected clients."""
    if not articles or not active_connections:
        return
    
    dead_connections = []
    message = json.dumps({"type": "news", "data": articles})
    
    for connection in active_connections:
        try:
            await connection.send_text(message)
        except Exception:
            dead_connections.append(connection)
            
    # Clean up dead connections
    for dead in dead_connections:
        active_connections.remove(dead)

# We need a robust way to broadcast from a synchronous APScheduler thread 
# to the asynchronous FastAPI event loop.
import threading
_news_queue = []
_queue_lock = threading.Lock()

def poll_news():
    """Background job run by apscheduler to fetch news and push to queue."""
    try:
        new_articles = news_fetcher.fetch_latest_news()
        if new_articles:
            with _queue_lock:
                _news_queue.extend(new_articles)
            
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
            finally:
                db.close()
                
    except Exception as e:
        print(f"Error polling news: {e}")

def flush_news():
    """Wipes the news database at 23:59 UTC every day to enforce a 24-hr rolling cache."""
    db = SessionLocal()
    try:
        record = db.query(DashboardData).first()
        if record:
            record.news_json = "[]"
            db.commit()
            print("News cache flushed successfully for the new day.")
    except Exception as e:
        print(f"Error flushing news: {e}")
    finally:
        db.close()

@app.on_event("startup")
async def startup_event_async():
    # Start a background task running in the main asyncio loop
    # to process the news queue and broadcast to websockets
    async def process_queue():
        while True:
            articles_to_send = []
            with _queue_lock:
                if _news_queue:
                    articles_to_send = list(_news_queue)
                    _news_queue.clear()
            
            if articles_to_send and active_connections:
                await broadcast_news(articles_to_send)
                
            await asyncio.sleep(5)  # Check queue every 5 seconds
            
    asyncio.create_task(process_queue())

@app.on_event("startup")
def startup_event():
    # Schedule the data update job to run at 4 PM EST every day (market close)
    scheduler.add_job(update_all_data, 'cron', day_of_week='mon-fri', hour=16, minute=0, timezone='America/New_York', id='daily_update', replace_existing=True)
    
    # Schedule news polling every 2 minutes
    scheduler.add_job(poll_news, 'interval', minutes=2, id='news_poll', replace_existing=True)
    
    # Schedule daily news flush exactly at end-of-day UTC (23:59 UTC)
    scheduler.add_job(flush_news, 'cron', hour=23, minute=59, timezone='UTC', id='news_flush', replace_existing=True)
    
    scheduler.start()

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()

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

@app.websocket("/ws/news")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        # Keep the connection open
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)
