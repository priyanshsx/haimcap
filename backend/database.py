import os
import json
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import declarative_base, sessionmaker

# Default to SQLite if no Supabase URL is provided
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./nexus.db")

# If it's Postgres, we don't need check_same_thread
if DATABASE_URL.startswith("postgres"):
    # SQLAlchemy 1.4+ requires postgresql:// instead of postgres://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(DATABASE_URL)
else:
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class DashboardData(Base):
    __tablename__ = "dashboard_data"
    
    id = Column(Integer, primary_key=True, index=True)
    last_updated = Column(String)
    
    # We will store the full JSON payload for each tab
    equities_json = Column(Text)
    commodities_json = Column(Text)
    bonds_json = Column(Text)
    forex_json = Column(Text)
    economy_json = Column(Text)
    crypto_json = Column(Text)
    news_json = Column(Text)

class SentimentScore(Base):
    __tablename__ = "sentiment_scores"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, index=True) # YYYY-MM-DD
    source = Column(String) # 'rss', 'reddit', 'edgar', 'composite'
    sector = Column(String) # 'market', 'tech', 'crypto', etc
    score = Column(Integer) # 0 to 100
    
class FundHolding(Base):
    __tablename__ = "fund_holdings"
    id = Column(Integer, primary_key=True, index=True)
    fund = Column(String, index=True)
    ticker = Column(String)
    action = Column(String) # 'buy', 'sell'
    size_change_pct = Column(String) # e.g., '+15.2%'
    date = Column(String) # period/filing date

class EdgarSignal(Base):
    __tablename__ = "edgar_signals"
    id = Column(Integer, primary_key=True, index=True)
    company = Column(String)
    signal_type = Column(String) # '8-K', '13-F', '10-Q'
    text = Column(String)
    score = Column(Integer)
    timestamp = Column(String) # YYYY-MM-DD HH:MM

class BitcoinTreasury(Base):
    __tablename__ = "bitcoin_treasury"
    id = Column(Integer, primary_key=True, index=True)
    rank = Column(Integer, index=True)
    name = Column(String)
    symbol = Column(String)
    btc_holdings = Column(Integer)
    price_change_7d = Column(String) # Stored as string to handle nulls/formatting if needed, or Float

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
