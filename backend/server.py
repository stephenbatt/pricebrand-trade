from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware  # ✅ KEEP THIS ONE ONLY
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
import time
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()

# ✅ CORS FIX (THIS IS WHAT WAS MISSING)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =====================
# CACHE - Shorter for crypto
# =====================
data_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_STOCK = 30  # 30 sec for stocks
CACHE_TTL_CRYPTO = 10  # 10 sec for crypto (24/7)

def get_cache_ttl(symbol: str) -> int:
    if "BTC" in symbol or "ETH" in symbol or "USD" in symbol.upper():
        return CACHE_TTL_CRYPTO
    return CACHE_TTL_STOCK

def get_cached_data(key: str, symbol: str) -> Optional[Dict[str, Any]]:
    if key in data_cache:
        cached = data_cache[key]
        ttl = get_cache_ttl(symbol)
        if time.time() - cached['timestamp'] < ttl:
            return cached['data']
    return None

def set_cached_data(key: str, data: Any):
    data_cache[key] = {'data': data, 'timestamp': time.time()}

# =====================
# MODELS
# =====================

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

# Paper Trading Models
class PaperAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    balance: float = 10000.0  # Starting bankroll
    initial_balance: float = 10000.0
    total_trades: int = 0
    wins: int = 0
    losses: int = 0
    total_pnl: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TradeRequest(BaseModel):
    symbol: str
    direction: str  # "inside" or "outside" (fence betting)
    amount: float  # Dollar amount to risk
    fence_multiplier: float = 1.0  # 1.0 = normal, 1.5 = wider fence, 2.0 = very wide
    entry_price: Optional[float] = None

class Trade(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str
    direction: str  # "inside" or "outside"
    amount: float
    entry_price: float
    exit_price: Optional[float] = None
    pnl: Optional[float] = None
    status: str = "open"  # open, closed, expired
    high_band: float
    low_band: float
    fence_multiplier: float = 1.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    closed_at: Optional[str] = None

class CloseTradeRequest(BaseModel):
    trade_id: str
    exit_price: Optional[float] = None

# =====================
# YAHOO FINANCE API
# =====================

YAHOO_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart"

async def fetch_yahoo_data(symbol: str, period: str = "5d", interval: str = "1d") -> Dict[str, Any]:
    cache_key = f"{symbol}_{period}_{interval}"
    cached = get_cached_data(cache_key, symbol)
    if cached:
        return cached
    
    url = f"{YAHOO_BASE_URL}/{symbol}"
    params = {
        "period1": int((datetime.now() - timedelta(days=10)).timestamp()),
        "period2": int(datetime.now().timestamp()),
        "interval": interval,
        "includePrePost": "false"
    }
    
    await asyncio.sleep(random.uniform(0.05, 0.2))
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    async with httpx.AsyncClient() as http_client:
        try:
            response = await http_client.get(url, params=params, headers=headers, timeout=15.0)
            response.raise_for_status()
            data = response.json()
            set_cached_data(cache_key, data)
            return data
        except Exception as e:
            logger.warning(f"Yahoo API error for {symbol}, using mock data: {e}")
            return generate_mock_data(symbol)

def generate_mock_data(symbol: str) -> Dict[str, Any]:
    base_prices = {"SPY": 597.50, "^GSPC": 5975.00, "QQQ": 518.75, "BTC-USD": 104500.00}
    base_price = base_prices.get(symbol, 100.0)
    
    # Add small random movement for BTC to simulate 24/7 movement
    if "BTC" in symbol:
        base_price += random.uniform(-500, 500)
    
    variation = base_price * 0.02
    timestamps, highs, lows, opens, closes = [], [], [], [], []
    
    for i in range(6):
        day_offset = 5 - i
        timestamps.append(int((datetime.now() - timedelta(days=day_offset)).timestamp()))
        day_var = random.uniform(-variation, variation)
        day_open = base_price + day_var
        day_close = day_open + random.uniform(-variation/2, variation/2)
        day_high = max(day_open, day_close) + random.uniform(0, variation/2)
        day_low = min(day_open, day_close) - random.uniform(0, variation/2)
        opens.append(day_open)
        closes.append(day_close)
        highs.append(day_high)
        lows.append(day_low)
    
    current_price = closes[-1] if closes else base_price
    
    return {
        "chart": {
            "result": [{
                "meta": {
                    "regularMarketPrice": current_price,
                    "previousClose": opens[-1] if opens else base_price,
                    "regularMarketDayHigh": highs[-1] if highs else current_price + 1,
                    "regularMarketDayLow": lows[-1] if lows else current_price - 1,
                    "regularMarketOpen": opens[-1] if opens else current_price,
                    "regularMarketVolume": random.randint(10000000, 100000000)
                },
                "timestamp": timestamps,
                "indicators": {"quote": [{"high": highs, "low": lows, "open": opens, "close": closes, "volume": [random.randint(10000000, 50000000) for _ in range(6)]}]}
            }]
        }
    }

def parse_yahoo_response(data: Dict[str, Any], symbol: str) -> Dict[str, Any]:
    try:
        result = data.get("chart", {}).get("result", [])
        if not result:
            raise ValueError("No data in response")
        
        chart_data = result[0]
        meta = chart_data.get("meta", {})
        indicators = chart_data.get("indicators", {}).get("quote", [{}])[0]
        timestamps = chart_data.get("timestamp", [])
        
        return {
            "symbol": symbol,
            "current_price": meta.get("regularMarketPrice", 0),
            "previous_close": meta.get("previousClose", 0),
            "timestamps": timestamps,
            "highs": [h for h in indicators.get("high", []) if h is not None],
            "lows": [l for l in indicators.get("low", []) if l is not None],
            "opens": [o for o in indicators.get("open", []) if o is not None],
            "closes": [c for c in indicators.get("close", []) if c is not None],
            "volumes": [v for v in indicators.get("volume", []) if v is not None],
            "day_high": meta.get("regularMarketDayHigh", 0),
            "day_low": meta.get("regularMarketDayLow", 0),
            "open": meta.get("regularMarketOpen", 0),
            "volume": meta.get("regularMarketVolume", 0)
        }
    except Exception as e:
        logger.error(f"Error parsing Yahoo response: {e}")
        raise ValueError(f"Failed to parse data: {e}")

DEFAULT_TICKERS = [
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF", "enabled": True},
    {"symbol": "SPX", "name": "S&P 500 Index", "enabled": True},
    {"symbol": "QQQ", "name": "Invesco QQQ Trust", "enabled": True},
    {"symbol": "BTC-USD", "name": "Bitcoin USD", "enabled": True},
]

# =====================
# AUTH ROUTES (Simple demo auth)
# =====================

class LoginRequest(BaseModel):
    username: str
    password: str

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    """Simple demo login - accepts any credentials"""
    # In production, you would validate against a real user database
    # For demo, accept any username/password
    user = {
        "id": str(uuid.uuid4()),
        "username": req.username,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Save user to DB for tracking
    await db.users.update_one(
        {"username": req.username},
        {"$set": user, "$setOnInsert": {"first_login": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"message": "Login successful", "user": user}

# =====================
# TICKER ROUTES
# =====================

@api_router.get("/")
async def root():
    return {"message": "0DTE Trading Range Calculator API"}

@api_router.get("/tickers")
async def get_tickers():
    return DEFAULT_TICKERS

@api_router.get("/ticker/{symbol}")
async def get_ticker_data(symbol: str):
    yahoo_symbol = "^GSPC" if symbol.upper() == "SPX" else symbol.upper()
    
    try:
        data = await fetch_yahoo_data(yahoo_symbol, period="5d", interval="1d")
        parsed = parse_yahoo_response(data, symbol.upper())
        
        change = parsed["current_price"] - parsed["previous_close"]
        change_percent = (change / parsed["previous_close"]) * 100 if parsed["previous_close"] else 0
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
    yahoo_symbol = "^GSPC" if symbol.upper() == "SPX" else symbol.upper()
    
    try:
        data = await fetch_yahoo_data(yahoo_symbol, period="10d", interval="1d")
        parsed = parse_yahoo_response(data, symbol.upper())
        
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
                    date=date_str, high=round(highs[i], 2), low=round(lows[i], 2),
                    range_value=round(range_val, 2),
                    open_price=round(opens[i], 2) if i < len(opens) else 0,
                    close_price=round(closes[i], 2) if i < len(closes) else 0
                ))
        
        avg_range = sum(r.range_value for r in historical_ranges) / len(historical_ranges) if historical_ranges else 0
        current_price = parsed["current_price"]
        base_price = anchor_price if anchor_price else current_price
        half_range = avg_range / 2
        high_band = base_price + half_range
        low_band = base_price - half_range
        is_inside = low_band <= current_price <= high_band
        position_percent = ((current_price - low_band) / avg_range) * 100 if avg_range > 0 else 50
        
        return RangeCalculation(
            symbol=symbol.upper(), current_price=round(current_price, 2),
            anchor_price=round(base_price, 2) if anchor_price else None,
            anchor_time=datetime.now(timezone.utc).isoformat() if anchor_price else None,
            avg_daily_range=round(avg_range, 2), high_band=round(high_band, 2), low_band=round(low_band, 2),
            is_inside_range=is_inside, price_position_percent=round(position_percent, 2),
            historical_ranges=historical_ranges, last_updated=datetime.now(timezone.utc).isoformat()
        )
    except Exception as e:
        logger.error(f"Error calculating range: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/anchor")
async def save_anchor(anchor: AnchorPrice):
    range_data = await calculate_range(anchor.symbol, anchor.price)
    saved = SavedAnchor(
        symbol=anchor.symbol.upper(), anchor_price=anchor.price,
        anchor_time=datetime.now(timezone.utc).isoformat(),
        high_band=range_data.high_band, low_band=range_data.low_band,
        avg_range=range_data.avg_daily_range, created_at=datetime.now(timezone.utc).isoformat()
    )
    doc = saved.model_dump()
    await db.anchors.insert_one(doc)
    return saved

@api_router.get("/anchors/{symbol}")
async def get_anchors(symbol: str):
    anchors = await db.anchors.find({"symbol": symbol.upper()}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    return anchors

@api_router.delete("/anchors/{symbol}")
async def clear_anchors(symbol: str):
    await db.anchors.delete_many({"symbol": symbol.upper()})
    return {"message": f"Cleared anchors for {symbol.upper()}"}

@api_router.get("/market-status")
async def get_market_status():
    now = datetime.now(timezone.utc)
    est_offset = timedelta(hours=-5)
    est_now = now + est_offset
    
    is_weekday = est_now.weekday() < 5
    market_open = est_now.replace(hour=9, minute=30, second=0, microsecond=0)
    market_close = est_now.replace(hour=16, minute=0, second=0, microsecond=0)
    is_open = is_weekday and market_open <= est_now <= market_close
    
    if is_open:
        time_remaining = market_close - est_now
        status_text = "MARKET OPEN"
    elif is_weekday and est_now < market_open:
        time_remaining = market_open - est_now
        status_text = "PRE-MARKET"
    else:
        days_until_monday = (7 - est_now.weekday()) % 7
        if days_until_monday == 0 and est_now > market_close:
            days_until_monday = 1 if est_now.weekday() < 4 else (7 - est_now.weekday())
        next_open = est_now.replace(hour=9, minute=30, second=0, microsecond=0) + timedelta(days=days_until_monday)
        time_remaining = next_open - est_now
        status_text = "MARKET CLOSED"
    
    return {
        "is_open": is_open, "status": status_text,
        "current_time_est": est_now.strftime("%Y-%m-%d %H:%M:%S EST"),
        "market_open_time": "9:30 AM EST", "market_close_time": "4:00 PM EST",
        "time_remaining_seconds": int(time_remaining.total_seconds()),
        "time_remaining_formatted": str(time_remaining).split('.')[0]
    }

@api_router.get("/multi-ticker")
async def get_multi_ticker_data():
    results = []
    for ticker in DEFAULT_TICKERS:
        if ticker["enabled"]:
            try:
                await asyncio.sleep(0.1)
                data = await get_ticker_data(ticker["symbol"])
                results.append(data.model_dump())
            except Exception as e:
                logger.error(f"Error fetching {ticker['symbol']}: {e}")
                results.append({"symbol": ticker["symbol"], "name": ticker["name"], "price": 0, "change": 0, "change_percent": 0, "error": str(e)})
    return results

# =====================
# PAPER TRADING ROUTES
# =====================

@api_router.get("/account")
async def get_account():
    """Get or create paper trading account"""
    account = await db.paper_account.find_one({}, {"_id": 0})
    if not account:
        new_account = PaperAccount()
        doc = new_account.model_dump()
        await db.paper_account.insert_one(doc)
        return new_account.model_dump()
    return account

@api_router.post("/account/reset")
async def reset_account(starting_balance: float = 10000.0):
    """Reset paper trading account"""
    await db.paper_account.delete_many({})
    await db.trades.delete_many({})
    
    new_account = PaperAccount(balance=starting_balance, initial_balance=starting_balance)
    doc = new_account.model_dump()
    await db.paper_account.insert_one(doc)
    return {"message": "Account reset", "account": new_account.model_dump()}

@api_router.post("/trade")
async def open_trade(trade_req: TradeRequest):
    """Open a new fence bet (inside or outside)"""
    # Get current account
    account = await db.paper_account.find_one({}, {"_id": 0})
    if not account:
        account = PaperAccount().model_dump()
        await db.paper_account.insert_one(account)
    
    if trade_req.amount > account["balance"]:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. You have ${account['balance']:.2f}")
    
    # Get current price and range
    ticker_data = await get_ticker_data(trade_req.symbol)
    range_data = await calculate_range(trade_req.symbol)
    
    entry_price = trade_req.entry_price or ticker_data.price
    
    # Apply fence multiplier to widen/narrow the bands
    avg_range = range_data.avg_daily_range * trade_req.fence_multiplier
    anchor = range_data.anchor_price or entry_price
    adjusted_high_band = anchor + (avg_range / 2)
    adjusted_low_band = anchor - (avg_range / 2)
    
    trade = Trade(
        symbol=trade_req.symbol.upper(),
        direction=trade_req.direction,  # "inside" or "outside"
        amount=trade_req.amount,
        entry_price=entry_price,
        high_band=round(adjusted_high_band, 2),
        low_band=round(adjusted_low_band, 2),
        fence_multiplier=trade_req.fence_multiplier
    )
    
    # Deduct from balance
    await db.paper_account.update_one({}, {"$inc": {"balance": -trade_req.amount, "total_trades": 1}})
    
    doc = trade.model_dump()
    await db.trades.insert_one(doc)
    
    bet_type = "INSIDE" if trade_req.direction == "inside" else "OUTSIDE"
    return {"message": f"BET {bet_type} opened", "trade": trade.model_dump()}

@api_router.post("/trade/close")
async def close_trade(close_req: CloseTradeRequest):
    """Close a fence bet and calculate win/loss"""
    trade = await db.trades.find_one({"id": close_req.trade_id, "status": "open"}, {"_id": 0})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found or already closed")
    
    # Get current price
    ticker_data = await get_ticker_data(trade["symbol"])
    exit_price = close_req.exit_price or ticker_data.price
    
    # Determine win/loss based on fence bet type
    is_inside_fence = trade["low_band"] <= exit_price <= trade["high_band"]
    
    if trade["direction"] == "inside":
        # BET INSIDE: Win if price stayed inside the fence
        is_win = is_inside_fence
    else:
        # BET OUTSIDE: Win if price broke out of the fence
        is_win = not is_inside_fence
    
    # Calculate P&L (simple win/lose for now - could add odds later)
    # Win = +90% of bet (like real options), Lose = -100% of bet
    if is_win:
        pnl = trade["amount"] * 0.9  # Win 90% profit
    else:
        pnl = -trade["amount"]  # Lose entire bet
    
    # Update trade
    await db.trades.update_one(
        {"id": close_req.trade_id},
        {"$set": {
            "exit_price": exit_price,
            "pnl": round(pnl, 2),
            "status": "closed",
            "closed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update account
    update_ops = {
        "$inc": {
            "balance": trade["amount"] + pnl,  # Return amount + profit/loss
            "total_pnl": pnl,
            "wins": 1 if is_win else 0,
            "losses": 0 if is_win else 1
        }
    }
    await db.paper_account.update_one({}, update_ops)
    
    updated_trade = await db.trades.find_one({"id": close_req.trade_id}, {"_id": 0})
    account = await db.paper_account.find_one({}, {"_id": 0})
    
    return {
        "message": "Trade closed",
        "trade": updated_trade,
        "pnl": round(pnl, 2),
        "is_win": is_win,
        "account": account
    }

@api_router.get("/trades")
async def get_trades(status: Optional[str] = None):
    """Get all trades, optionally filtered by status"""
    query = {}
    if status:
        query["status"] = status
    
    trades = await db.trades.find(query, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return trades

@api_router.get("/trades/open")
async def get_open_trades():
    """Get all open trades with current P&L"""
    trades = await db.trades.find({"status": "open"}, {"_id": 0}).to_list(100)
    
    result = []
    for trade in trades:
        try:
            ticker_data = await get_ticker_data(trade["symbol"])
            current_price = ticker_data.price
            
            if trade["direction"] == "long":
                price_change_pct = (current_price - trade["entry_price"]) / trade["entry_price"]
            else:
                price_change_pct = (trade["entry_price"] - current_price) / trade["entry_price"]
            
            unrealized_pnl = trade["amount"] * price_change_pct
            
            trade["current_price"] = current_price
            trade["unrealized_pnl"] = round(unrealized_pnl, 2)
            trade["is_inside_range"] = trade["low_band"] <= current_price <= trade["high_band"]
            result.append(trade)
        except Exception as e:
            logger.error(f"Error calculating trade P&L: {e}")
            result.append(trade)
    
    return result

@api_router.get("/scoreboard")
async def get_scoreboard():
    """Get win/loss scoreboard"""
    account = await db.paper_account.find_one({}, {"_id": 0})
    if not account:
        return {
            "balance": 10000.0,
            "initial_balance": 10000.0,
            "total_pnl": 0.0,
            "total_trades": 0,
            "wins": 0,
            "losses": 0,
            "win_rate": 0.0,
            "return_pct": 0.0
        }
    
    total_trades = account.get("total_trades", 0)
    wins = account.get("wins", 0)
    win_rate = (wins / total_trades * 100) if total_trades > 0 else 0
    initial = account.get("initial_balance", 10000.0)
    current = account.get("balance", 10000.0)
    return_pct = ((current - initial) / initial * 100) if initial > 0 else 0
    
    return {
        "balance": round(account.get("balance", 10000.0), 2),
        "initial_balance": round(initial, 2),
        "total_pnl": round(account.get("total_pnl", 0.0), 2),
        "total_trades": total_trades,
        "wins": wins,
        "losses": account.get("losses", 0),
        "win_rate": round(win_rate, 1),
        "return_pct": round(return_pct, 2)
    }

@api_router.post("/auto-settle")
async def auto_settle_trades():
    """Auto-settle all open trades at market close (4PM EST for stocks, anytime for crypto)"""
    settled = []
    
    # Get all open trades
    open_trades = await db.trades.find({"status": "open"}, {"_id": 0}).to_list(100)
    
    for trade in open_trades:
        try:
            # Get current price
            ticker_data = await get_ticker_data(trade["symbol"])
            exit_price = ticker_data.price
            
            # Determine win/loss based on fence bet type
            is_inside_fence = trade["low_band"] <= exit_price <= trade["high_band"]
            
            if trade["direction"] == "inside":
                is_win = is_inside_fence
            else:  # outside
                is_win = not is_inside_fence
            
            # Calculate P&L
            if is_win:
                pnl = trade["amount"] * 0.9  # Win 90% profit
            else:
                pnl = -trade["amount"]  # Lose entire bet
            
            # Update trade
            await db.trades.update_one(
                {"id": trade["id"]},
                {"$set": {
                    "exit_price": exit_price,
                    "pnl": round(pnl, 2),
                    "status": "settled",
                    "closed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Update account
            await db.paper_account.update_one({}, {
                "$inc": {
                    "balance": trade["amount"] + pnl,
                    "total_pnl": pnl,
                    "wins": 1 if is_win else 0,
                    "losses": 0 if is_win else 1
                }
            })
            
            settled.append({
                "trade_id": trade["id"],
                "symbol": trade["symbol"],
                "direction": trade["direction"],
                "is_win": is_win,
                "pnl": round(pnl, 2),
                "exit_price": exit_price
            })
            
        except Exception as e:
            logger.error(f"Error settling trade {trade['id']}: {e}")
    
    return {
        "message": f"Settled {len(settled)} trades",
        "settled_trades": settled
    }

@api_router.get("/check-market-close")
async def check_market_close():
    """Check if it's 4PM EST and auto-settle stock trades"""
    now = datetime.now(timezone.utc)
    est_offset = timedelta(hours=-5)
    est_now = now + est_offset
    
    # Check if it's around 4PM EST (4:00-4:05)
    is_close_time = est_now.hour == 16 and est_now.minute < 5
    is_weekday = est_now.weekday() < 5
    
    if is_close_time and is_weekday:
        # Get open stock trades (not crypto)
        stock_trades = await db.trades.find({
            "status": "open",
            "symbol": {"$in": ["SPY", "SPX", "QQQ"]}
        }, {"_id": 0}).to_list(100)
        
        if stock_trades:
            result = await auto_settle_trades()
            return {"auto_settled": True, "result": result}
    
    return {
        "auto_settled": False,
        "current_time_est": est_now.strftime("%H:%M:%S"),
        "is_market_close": is_close_time and is_weekday
    }

# Include router
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


# =========================
# AUTO-SETTLE BACKGROUND WORKER
# =========================

import threading
import time
from datetime import datetime


def auto_settle_trades():
    open_trades = list(trades_collection.find({"status": "open"}))

    for trade in open_trades:
        try:
            symbol = trade["symbol"]

            price_data = get_current_price(symbol)
            current_price = price_data["price"]

            high = trade["high_band"]
            low = trade["low_band"]

            is_inside = low <= current_price <= high

            if trade["direction"] == "inside":
                win = is_inside
            else:
                win = not is_inside

            pnl = trade["amount"] if win else -trade["amount"]

            trades_collection.update_one(
                {"_id": trade["_id"]},
                {"$set": {
                    "status": "closed",
                    "closed_price": current_price,
                    "pnl": pnl,
                    "is_win": win
                }}
            )

        except Exception as e:
            print("Trade error:", e)

    print(f"✅ Auto-settled {len(open_trades)} trades")


def background_worker():
    already_settled_today = False

    while True:
        try:
            now = datetime.utcnow()
            hour = now.hour - 4  # crude EST adjust
            minute = now.minute

            # Run ONLY once at exactly 4:00 PM EST
            if hour == 16 and minute == 0 and not already_settled_today:
                print("🔔 Running auto-settle check...")
                auto_settle_trades()
                already_settled_today = True

            # Reset flag after 5 PM so it works again next day
            if hour >= 17:
                already_settled_today = False

        except Exception as e:
            print("Worker error:", e)

        time.sleep(60)
threading.Thread(target=background_worker, daemon=True).start()
