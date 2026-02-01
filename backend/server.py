from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =====================
# MODELS
# =====================

class TickerConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    symbol: str
    name: str
    enabled: bool = True

class DailyRange(BaseModel):
    model_config = ConfigDict(extra="ignore")
    date: str
    high: float
    low: float
    range_value: float
    open_price: float
    close_price: float

class RangeCalculation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    symbol: str
    current_price: float
    anchor_price: Optional[float] = None
    anchor_time: Optional[str] = None
    avg_daily_range: float
    high_band: float
    low_band: float
    is_inside_range: bool
    price_position_percent: float
    historical_ranges: List[DailyRange]
    last_updated: str

class AnchorPrice(BaseModel):
    symbol: str
    price: float

class TickerData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    high: float
    low: float
    open_price: float
    volume: int
    last_updated: str

class SavedAnchor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str
    anchor_price: float
    anchor_time: str
    high_band: float
    low_band: float
    avg_range: float
    created_at: str

# =====================
# YAHOO FINANCE API
# =====================

YAHOO_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart"

async def fetch_yahoo_data(symbol: str, period: str = "5d", interval: str = "1d") -> Dict[str, Any]:
    """Fetch data from Yahoo Finance API"""
    url = f"{YAHOO_BASE_URL}/{symbol}"
    params = {
        "period1": int((datetime.now() - timedelta(days=10)).timestamp()),
        "period2": int(datetime.now().timestamp()),
        "interval": interval,
        "includePrePost": "false"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching Yahoo data for {symbol}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch data for {symbol}")

def parse_yahoo_response(data: Dict[str, Any], symbol: str) -> Dict[str, Any]:
    """Parse Yahoo Finance response"""
    try:
        result = data.get("chart", {}).get("result", [])
        if not result:
            raise ValueError("No data in response")
        
        chart_data = result[0]
        meta = chart_data.get("meta", {})
        indicators = chart_data.get("indicators", {}).get("quote", [{}])[0]
        timestamps = chart_data.get("timestamp", [])
        
        highs = indicators.get("high", [])
        lows = indicators.get("low", [])
        opens = indicators.get("open", [])
        closes = indicators.get("close", [])
        volumes = indicators.get("volume", [])
        
        # Current price info
        current_price = meta.get("regularMarketPrice", 0)
        previous_close = meta.get("previousClose", current_price)
        
        return {
            "symbol": symbol,
            "current_price": current_price,
            "previous_close": previous_close,
            "timestamps": timestamps,
            "highs": [h for h in highs if h is not None],
            "lows": [l for l in lows if l is not None],
            "opens": [o for o in opens if o is not None],
            "closes": [c for c in closes if c is not None],
            "volumes": [v for v in volumes if v is not None],
            "day_high": meta.get("regularMarketDayHigh", current_price),
            "day_low": meta.get("regularMarketDayLow", current_price),
            "open": meta.get("regularMarketOpen", current_price),
            "volume": meta.get("regularMarketVolume", 0)
        }
    except Exception as e:
        logger.error(f"Error parsing Yahoo response: {e}")
        raise ValueError(f"Failed to parse data: {e}")

# =====================
# SUPPORTED TICKERS
# =====================

DEFAULT_TICKERS = [
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF", "enabled": True},
    {"symbol": "SPX", "name": "S&P 500 Index", "enabled": True},
    {"symbol": "QQQ", "name": "Invesco QQQ Trust", "enabled": True},
    {"symbol": "BTC-USD", "name": "Bitcoin USD", "enabled": True},
]

# =====================
# API ROUTES
# =====================

@api_router.get("/")
async def root():
    return {"message": "0DTE Trading Range Calculator API"}

@api_router.get("/tickers")
async def get_tickers():
    """Get list of supported tickers"""
    return DEFAULT_TICKERS

@api_router.get("/ticker/{symbol}")
async def get_ticker_data(symbol: str):
    """Get current price data for a ticker"""
    # Map SPX to ^GSPC for Yahoo Finance
    yahoo_symbol = "^GSPC" if symbol.upper() == "SPX" else symbol.upper()
    
    try:
        data = await fetch_yahoo_data(yahoo_symbol, period="1d", interval="1m")
        parsed = parse_yahoo_response(data, symbol.upper())
        
        change = parsed["current_price"] - parsed["previous_close"]
        change_percent = (change / parsed["previous_close"]) * 100 if parsed["previous_close"] else 0
        
        # Get ticker name
        ticker_name = next((t["name"] for t in DEFAULT_TICKERS if t["symbol"] == symbol.upper()), symbol.upper())
        
        return TickerData(
            symbol=symbol.upper(),
            name=ticker_name,
            price=round(parsed["current_price"], 2),
            change=round(change, 2),
            change_percent=round(change_percent, 2),
            high=round(parsed["day_high"], 2),
            low=round(parsed["day_low"], 2),
            open_price=round(parsed["open"], 2),
            volume=int(parsed["volume"]),
            last_updated=datetime.now(timezone.utc).isoformat()
        )
    except Exception as e:
        logger.error(f"Error getting ticker data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/range/{symbol}")
async def calculate_range(symbol: str, anchor_price: Optional[float] = None):
    """Calculate the expected daily range for a ticker"""
    # Map SPX to ^GSPC for Yahoo Finance
    yahoo_symbol = "^GSPC" if symbol.upper() == "SPX" else symbol.upper()
    
    try:
        data = await fetch_yahoo_data(yahoo_symbol, period="10d", interval="1d")
        parsed = parse_yahoo_response(data, symbol.upper())
        
        # Calculate daily ranges for last 5 trading days
        historical_ranges = []
        highs = parsed["highs"][-6:-1] if len(parsed["highs"]) > 5 else parsed["highs"][:-1]
        lows = parsed["lows"][-6:-1] if len(parsed["lows"]) > 5 else parsed["lows"][:-1]
        opens = parsed["opens"][-6:-1] if len(parsed["opens"]) > 5 else parsed["opens"][:-1]
        closes = parsed["closes"][-6:-1] if len(parsed["closes"]) > 5 else parsed["closes"][:-1]
        timestamps = parsed["timestamps"][-6:-1] if len(parsed["timestamps"]) > 5 else parsed["timestamps"][:-1]
        
        for i in range(min(5, len(highs))):
            if i < len(highs) and i < len(lows):
                range_val = highs[i] - lows[i]
                date_str = datetime.fromtimestamp(timestamps[i]).strftime("%Y-%m-%d") if i < len(timestamps) else f"Day {i+1}"
                historical_ranges.append(DailyRange(
                    date=date_str,
                    high=round(highs[i], 2),
                    low=round(lows[i], 2),
                    range_value=round(range_val, 2),
                    open_price=round(opens[i], 2) if i < len(opens) else 0,
                    close_price=round(closes[i], 2) if i < len(closes) else 0
                ))
        
        # Calculate average daily range
        if historical_ranges:
            avg_range = sum(r.range_value for r in historical_ranges) / len(historical_ranges)
        else:
            avg_range = 0
        
        # Current price
        current_price = parsed["current_price"]
        
        # Use anchor price if provided, otherwise use current price
        base_price = anchor_price if anchor_price else current_price
        
        # Calculate bands (split range in half)
        half_range = avg_range / 2
        high_band = base_price + half_range
        low_band = base_price - half_range
        
        # Determine if price is inside range
        is_inside = low_band <= current_price <= high_band
        
        # Calculate price position as percentage (0% = at low band, 100% = at high band)
        if avg_range > 0:
            position_percent = ((current_price - low_band) / avg_range) * 100
        else:
            position_percent = 50
        
        return RangeCalculation(
            symbol=symbol.upper(),
            current_price=round(current_price, 2),
            anchor_price=round(base_price, 2) if anchor_price else None,
            anchor_time=datetime.now(timezone.utc).isoformat() if anchor_price else None,
            avg_daily_range=round(avg_range, 2),
            high_band=round(high_band, 2),
            low_band=round(low_band, 2),
            is_inside_range=is_inside,
            price_position_percent=round(position_percent, 2),
            historical_ranges=historical_ranges,
            last_updated=datetime.now(timezone.utc).isoformat()
        )
    except Exception as e:
        logger.error(f"Error calculating range: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/anchor")
async def save_anchor(anchor: AnchorPrice):
    """Save an anchor price for a ticker"""
    # Get range calculation with anchor
    range_data = await calculate_range(anchor.symbol, anchor.price)
    
    saved = SavedAnchor(
        symbol=anchor.symbol.upper(),
        anchor_price=anchor.price,
        anchor_time=datetime.now(timezone.utc).isoformat(),
        high_band=range_data.high_band,
        low_band=range_data.low_band,
        avg_range=range_data.avg_daily_range,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    
    # Save to MongoDB
    doc = saved.model_dump()
    await db.anchors.insert_one(doc)
    
    return saved

@api_router.get("/anchors/{symbol}")
async def get_anchors(symbol: str):
    """Get saved anchors for a ticker"""
    anchors = await db.anchors.find(
        {"symbol": symbol.upper()},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    return anchors

@api_router.delete("/anchors/{symbol}")
async def clear_anchors(symbol: str):
    """Clear all anchors for a ticker"""
    await db.anchors.delete_many({"symbol": symbol.upper()})
    return {"message": f"Cleared anchors for {symbol.upper()}"}

@api_router.get("/market-status")
async def get_market_status():
    """Check if the US stock market is currently open"""
    now = datetime.now(timezone.utc)
    # Convert to EST (UTC-5)
    est_offset = timedelta(hours=-5)
    est_now = now + est_offset
    
    # Market hours: 9:30 AM - 4:00 PM EST, Monday-Friday
    is_weekday = est_now.weekday() < 5
    market_open = est_now.replace(hour=9, minute=30, second=0, microsecond=0)
    market_close = est_now.replace(hour=16, minute=0, second=0, microsecond=0)
    
    is_open = is_weekday and market_open <= est_now <= market_close
    
    # Time until market opens/closes
    if is_open:
        time_remaining = market_close - est_now
        status_text = "MARKET OPEN"
    elif is_weekday and est_now < market_open:
        time_remaining = market_open - est_now
        status_text = "PRE-MARKET"
    else:
        # Calculate next market open
        days_until_monday = (7 - est_now.weekday()) % 7
        if days_until_monday == 0 and est_now > market_close:
            days_until_monday = 1 if est_now.weekday() < 4 else (7 - est_now.weekday())
        next_open = est_now.replace(hour=9, minute=30, second=0, microsecond=0) + timedelta(days=days_until_monday)
        time_remaining = next_open - est_now
        status_text = "MARKET CLOSED"
    
    return {
        "is_open": is_open,
        "status": status_text,
        "current_time_est": est_now.strftime("%Y-%m-%d %H:%M:%S EST"),
        "market_open_time": "9:30 AM EST",
        "market_close_time": "4:00 PM EST",
        "time_remaining_seconds": int(time_remaining.total_seconds()),
        "time_remaining_formatted": str(time_remaining).split('.')[0]
    }

@api_router.get("/multi-ticker")
async def get_multi_ticker_data():
    """Get data for all enabled tickers at once"""
    results = []
    for ticker in DEFAULT_TICKERS:
        if ticker["enabled"]:
            try:
                data = await get_ticker_data(ticker["symbol"])
                results.append(data.model_dump())
            except Exception as e:
                logger.error(f"Error fetching {ticker['symbol']}: {e}")
                results.append({
                    "symbol": ticker["symbol"],
                    "name": ticker["name"],
                    "price": 0,
                    "change": 0,
                    "change_percent": 0,
                    "error": str(e)
                })
    return results

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
