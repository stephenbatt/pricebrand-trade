# 0DTE Trading Range Calculator Dashboard

## Original Problem Statement
Build a market maker style trading range indicator that:
- Calculates daily expected range using 5-day historical high/low data
- Plots upper/lower bands based on average daily range
- Pulls live market data for SPY/SPX/QQQ/BTC
- Allows setting an anchor price at 10AM
- Shows if price is inside/outside expected range

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI (Terminal-style dark theme)
- **Backend**: FastAPI + MongoDB
- **Data Source**: Yahoo Finance API with caching + mock fallback

## User Personas
1. **Day Traders** - Use the range bands to identify 0DTE trade entry points
2. **Options Traders** - Sell premium when price is inside expected range
3. **Retail Investors** - Understand daily price movement expectations

## Core Requirements
- Real-time price data for SPY, SPX, QQQ, BTC-USD
- 5-day historical range calculation
- Visual range band indicator with price position
- Anchor price feature for 10AM price lock
- Market status indicator (open/closed)
- Auto-refresh with configurable interval

## What's Been Implemented (2026-02-01)

### Backend (/app/backend/server.py)
- GET /api/tickers - List supported tickers
- GET /api/ticker/{symbol} - Real-time price data
- GET /api/range/{symbol} - Range calculation with bands
- POST /api/anchor - Save anchor price
- GET /api/anchors/{symbol} - Get saved anchors
- GET /api/market-status - Market open/closed status
- GET /api/multi-ticker - All tickers at once

### Frontend
- Terminal-style dark theme dashboard
- Price card with OHLC data and change %
- Market Maker Bands card with visual range bar
- Historical ranges table (5-day data)
- All tickers panel with live prices
- Stats cards for key metrics
- Ticker tape footer with scrolling prices
- Refresh controls (10s/30s/60s intervals)

## Prioritized Backlog

### P0 (Critical - Done)
- [x] Live price data fetching
- [x] 5-day range calculation
- [x] Visual range indicator
- [x] Anchor price feature

### P1 (Important - Future)
- [ ] Broker integration (Alpaca for paper trading)
- [ ] Price alerts when outside range
- [ ] Historical anchor performance tracking
- [ ] Mobile-responsive layout improvements

### P2 (Nice to Have)
- [ ] Custom ticker support
- [ ] Range calculation customization (3-day, 7-day, 10-day)
- [ ] TradingView chart integration
- [ ] Export trade ideas to CSV

## Next Tasks
1. Integrate Alpaca broker for paper trading
2. Add price breach alerts/notifications
3. Track anchor performance over time
