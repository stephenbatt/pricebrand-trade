import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
    Activity, 
    TrendingUp, 
    TrendingDown, 
    Clock, 
    RefreshCw,
    Target,
    BarChart3,
    Settings,
    Zap,
    ChevronDown
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Button } from "./components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Format number with commas
const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return '---';
    return num.toLocaleString('en-US', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
    });
};

// Format volume
const formatVolume = (vol) => {
    if (!vol) return '---';
    if (vol >= 1000000000) return (vol / 1000000000).toFixed(2) + 'B';
    if (vol >= 1000000) return (vol / 1000000).toFixed(2) + 'M';
    if (vol >= 1000) return (vol / 1000).toFixed(2) + 'K';
    return vol.toString();
};

// Market Status Component
const MarketStatus = ({ status }) => {
    const isOpen = status?.is_open;
    
    return (
        <div className="flex items-center gap-2" data-testid="market-status">
            <div className={`status-dot ${isOpen ? 'live animate-pulse-green' : 'closed'}`}></div>
            <span className="font-mono text-xs tracking-wider">
                {status?.status || 'LOADING'}
            </span>
            {status?.time_remaining_formatted && (
                <span className="text-muted-foreground text-xs font-mono ml-2">
                    {status.time_remaining_formatted}
                </span>
            )}
        </div>
    );
};

// Ticker Selection Tabs
const TickerTabs = ({ tickers, selectedTicker, onSelect }) => {
    return (
        <div className="flex gap-1" data-testid="ticker-tabs">
            {tickers.map(ticker => (
                <button
                    key={ticker.symbol}
                    onClick={() => onSelect(ticker.symbol)}
                    className={`ticker-btn ${selectedTicker === ticker.symbol ? 'active' : ''}`}
                    data-testid={`ticker-btn-${ticker.symbol}`}
                >
                    {ticker.symbol}
                </button>
            ))}
        </div>
    );
};

// Main Price Card
const PriceCard = ({ data, isLoading }) => {
    if (isLoading) {
        return (
            <div className="terminal-card col-span-2" data-testid="price-card-loading">
                <div className="skeleton h-8 w-24 mb-2 rounded"></div>
                <div className="skeleton h-12 w-40 mb-4 rounded"></div>
                <div className="skeleton h-4 w-32 rounded"></div>
            </div>
        );
    }
    
    const isPositive = data?.change >= 0;
    
    return (
        <div className={`terminal-card col-span-2 card-hover ${isPositive ? 'gradient-bullish' : 'gradient-bearish'}`} data-testid="price-card">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <span className="label-text">{data?.name || 'Loading...'}</span>
                    <h2 className="font-mono text-xl font-bold tracking-tight">{data?.symbol}</h2>
                </div>
                <div className={`p-2 rounded ${isPositive ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {isPositive ? <TrendingUp className="w-5 h-5 text-green-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                </div>
            </div>
            
            <div className={`price-large mb-2 ${isPositive ? 'text-green-500 text-glow-green' : 'text-red-500 text-glow-red'}`} data-testid="current-price">
                ${formatNumber(data?.price)}
            </div>
            
            <div className="flex items-center gap-4">
                <span className={`font-mono text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`} data-testid="price-change">
                    {isPositive ? '+' : ''}{formatNumber(data?.change)} ({isPositive ? '+' : ''}{formatNumber(data?.change_percent)}%)
                </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border">
                <div>
                    <span className="label-text">Open</span>
                    <p className="font-mono text-sm" data-testid="price-open">${formatNumber(data?.open_price)}</p>
                </div>
                <div>
                    <span className="label-text">High</span>
                    <p className="font-mono text-sm text-green-500" data-testid="price-high">${formatNumber(data?.high)}</p>
                </div>
                <div>
                    <span className="label-text">Low</span>
                    <p className="font-mono text-sm text-red-500" data-testid="price-low">${formatNumber(data?.low)}</p>
                </div>
            </div>
        </div>
    );
};

// Range Bands Card
const RangeBandsCard = ({ rangeData, onSetAnchor, isLoading }) => {
    if (isLoading || !rangeData) {
        return (
            <div className="terminal-card col-span-2" data-testid="range-card-loading">
                <div className="skeleton h-8 w-32 mb-4 rounded"></div>
                <div className="skeleton h-16 w-full mb-4 rounded"></div>
                <div className="skeleton h-4 w-24 rounded"></div>
            </div>
        );
    }
    
    const position = Math.min(100, Math.max(0, rangeData.price_position_percent));
    const isInside = rangeData.is_inside_range;
    
    return (
        <div className={`terminal-card col-span-2 card-hover ${isInside ? 'glow-green' : 'glow-red'}`} data-testid="range-bands-card">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <span className="label-text">Expected Range</span>
                    <h3 className="font-mono text-lg font-bold">Market Maker Bands</h3>
                </div>
                <div className={`px-3 py-1 font-mono text-xs uppercase tracking-wider ${isInside ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`} data-testid="range-status">
                    {isInside ? 'INSIDE RANGE' : 'OUTSIDE RANGE'}
                </div>
            </div>
            
            {/* Visual Range Bar */}
            <div className="mb-6">
                <div className="flex justify-between mb-2">
                    <span className="font-mono text-sm text-red-500" data-testid="low-band">${formatNumber(rangeData.low_band)}</span>
                    <span className="font-mono text-xs text-muted-foreground">AVG: ${formatNumber(rangeData.avg_daily_range)}</span>
                    <span className="font-mono text-sm text-green-500" data-testid="high-band">${formatNumber(rangeData.high_band)}</span>
                </div>
                
                <div className="range-container">
                    <div 
                        className="range-fill range-bar-track opacity-30" 
                        style={{ width: '100%' }}
                    ></div>
                    <div 
                        className={`range-marker ${isInside ? 'bg-green-500 glow-green' : 'bg-red-500 glow-red'}`}
                        style={{ left: `${position}%` }}
                        data-testid="price-marker"
                    ></div>
                </div>
                
                <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
                    <span>LOW BAND</span>
                    <span>CURRENT: ${formatNumber(rangeData.current_price)}</span>
                    <span>HIGH BAND</span>
                </div>
            </div>
            
            {/* Anchor Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                    <span className="label-text">Anchor Price</span>
                    <p className="font-mono text-sm" data-testid="anchor-price">
                        {rangeData.anchor_price ? `$${formatNumber(rangeData.anchor_price)}` : 'Not Set'}
                    </p>
                </div>
                <Button 
                    onClick={onSetAnchor}
                    className="btn-terminal primary"
                    data-testid="set-anchor-btn"
                >
                    <Target className="w-3 h-3 mr-2" />
                    SET 10AM ANCHOR
                </Button>
            </div>
        </div>
    );
};

// Historical Ranges Table
const HistoricalRangesCard = ({ rangeData, isLoading }) => {
    if (isLoading || !rangeData?.historical_ranges) {
        return (
            <div className="terminal-card md:col-span-2" data-testid="historical-loading">
                <div className="skeleton h-6 w-40 mb-4 rounded"></div>
                <div className="space-y-2">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className="skeleton h-8 w-full rounded"></div>
                    ))}
                </div>
            </div>
        );
    }
    
    return (
        <div className="terminal-card md:col-span-2 card-hover" data-testid="historical-ranges-card">
            <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <span className="label-text">5-Day Historical Ranges</span>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full data-table">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left py-2 pr-4">Date</th>
                            <th className="text-right py-2 px-2">High</th>
                            <th className="text-right py-2 px-2">Low</th>
                            <th className="text-right py-2 pl-2">Range</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rangeData.historical_ranges.map((day, idx) => (
                            <tr key={idx} className="border-b border-border/50 hover:bg-surface-highlight/50" data-testid={`historical-row-${idx}`}>
                                <td className="py-2 pr-4 text-muted-foreground">{day.date}</td>
                                <td className="py-2 px-2 text-right text-green-500">${formatNumber(day.high)}</td>
                                <td className="py-2 px-2 text-right text-red-500">${formatNumber(day.low)}</td>
                                <td className="py-2 pl-2 text-right font-semibold">${formatNumber(day.range_value)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t border-border">
                            <td className="py-3 pr-4 font-bold">AVERAGE</td>
                            <td colSpan="2"></td>
                            <td className="py-3 pl-2 text-right font-bold text-blue-500" data-testid="avg-range">
                                ${formatNumber(rangeData.avg_daily_range)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

// Stats Cards
const StatsCard = ({ title, value, icon: Icon, color = "blue" }) => {
    const colorClasses = {
        blue: "text-blue-500 bg-blue-500/20",
        green: "text-green-500 bg-green-500/20",
        red: "text-red-500 bg-red-500/20",
        yellow: "text-yellow-500 bg-yellow-500/20"
    };
    
    return (
        <div className="terminal-card card-hover" data-testid={`stats-card-${title.toLowerCase().replace(' ', '-')}`}>
            <div className="flex items-center justify-between mb-3">
                <span className="label-text">{title}</span>
                <div className={`p-1.5 rounded ${colorClasses[color]}`}>
                    <Icon className="w-3 h-3" />
                </div>
            </div>
            <p className="font-mono text-xl font-bold">{value}</p>
        </div>
    );
};

// All Tickers Panel
const AllTickersPanel = ({ tickersData, selectedTicker, onSelect, isLoading }) => {
    return (
        <div className="terminal-card md:col-span-2 card-hover" data-testid="all-tickers-panel">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-green-500" />
                <span className="label-text">All Tickers</span>
            </div>
            
            <div className="space-y-2">
                {isLoading ? (
                    [1,2,3,4].map(i => (
                        <div key={i} className="skeleton h-12 w-full rounded"></div>
                    ))
                ) : (
                    tickersData?.map(ticker => {
                        const isPositive = ticker.change >= 0;
                        const isSelected = ticker.symbol === selectedTicker;
                        
                        return (
                            <button
                                key={ticker.symbol}
                                onClick={() => onSelect(ticker.symbol)}
                                className={`w-full p-3 flex items-center justify-between rounded border transition-colors ${
                                    isSelected 
                                        ? 'border-primary bg-primary/10' 
                                        : 'border-border hover:border-primary/50 bg-surface-highlight/30'
                                }`}
                                data-testid={`all-ticker-${ticker.symbol}`}
                            >
                                <div className="text-left">
                                    <p className="font-mono text-sm font-bold">{ticker.symbol}</p>
                                    <p className="text-xs text-muted-foreground">{ticker.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-mono text-sm font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                        ${formatNumber(ticker.price)}
                                    </p>
                                    <p className={`font-mono text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                        {isPositive ? '+' : ''}{formatNumber(ticker.change_percent)}%
                                    </p>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
};

// Main Dashboard Component
function App() {
    const [selectedTicker, setSelectedTicker] = useState('SPY');
    const [tickers, setTickers] = useState([]);
    const [tickerData, setTickerData] = useState(null);
    const [rangeData, setRangeData] = useState(null);
    const [allTickersData, setAllTickersData] = useState([]);
    const [marketStatus, setMarketStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(30);
    const [lastUpdate, setLastUpdate] = useState(null);
    
    // Fetch tickers list
    const fetchTickers = useCallback(async () => {
        try {
            const response = await axios.get(`${API}/tickers`);
            setTickers(response.data);
        } catch (e) {
            console.error("Error fetching tickers:", e);
            toast.error("Failed to load tickers");
        }
    }, []);
    
    // Fetch single ticker data
    const fetchTickerData = useCallback(async (symbol) => {
        try {
            const response = await axios.get(`${API}/ticker/${symbol}`);
            setTickerData(response.data);
        } catch (e) {
            console.error("Error fetching ticker data:", e);
        }
    }, []);
    
    // Fetch range calculation
    const fetchRangeData = useCallback(async (symbol) => {
        try {
            const response = await axios.get(`${API}/range/${symbol}`);
            setRangeData(response.data);
        } catch (e) {
            console.error("Error fetching range data:", e);
        }
    }, []);
    
    // Fetch all tickers data
    const fetchAllTickers = useCallback(async () => {
        try {
            const response = await axios.get(`${API}/multi-ticker`);
            setAllTickersData(response.data);
        } catch (e) {
            console.error("Error fetching all tickers:", e);
        }
    }, []);
    
    // Fetch market status
    const fetchMarketStatus = useCallback(async () => {
        try {
            const response = await axios.get(`${API}/market-status`);
            setMarketStatus(response.data);
        } catch (e) {
            console.error("Error fetching market status:", e);
        }
    }, []);
    
    // Refresh all data
    const refreshData = useCallback(async () => {
        setIsLoading(true);
        await Promise.all([
            fetchTickerData(selectedTicker),
            fetchRangeData(selectedTicker),
            fetchAllTickers(),
            fetchMarketStatus()
        ]);
        setLastUpdate(new Date());
        setIsLoading(false);
    }, [selectedTicker, fetchTickerData, fetchRangeData, fetchAllTickers, fetchMarketStatus]);
    
    // Set anchor price (10 AM price)
    const handleSetAnchor = async () => {
        if (!tickerData?.price) {
            toast.error("No price data available");
            return;
        }
        
        try {
            await axios.post(`${API}/anchor`, {
                symbol: selectedTicker,
                price: tickerData.price
            });
            
            // Refetch range with new anchor
            const response = await axios.get(`${API}/range/${selectedTicker}?anchor_price=${tickerData.price}`);
            setRangeData(response.data);
            
            toast.success(`Anchor set at $${formatNumber(tickerData.price)}`);
        } catch (e) {
            console.error("Error setting anchor:", e);
            toast.error("Failed to set anchor");
        }
    };
    
    // Initial load
    useEffect(() => {
        fetchTickers();
        refreshData();
    }, []);
    
    // Refresh when ticker changes
    useEffect(() => {
        refreshData();
    }, [selectedTicker]);
    
    // Auto-refresh interval
    useEffect(() => {
        const interval = setInterval(() => {
            refreshData();
        }, refreshInterval * 1000);
        
        return () => clearInterval(interval);
    }, [refreshInterval, refreshData]);
    
    return (
        <TooltipProvider>
            <div className="dashboard-container" data-testid="dashboard-container">
                {/* Scanline overlay */}
                <div className="scanlines"></div>
                
                {/* Toast notifications */}
                <Toaster 
                    position="top-right" 
                    toastOptions={{
                        style: {
                            background: 'hsl(var(--surface))',
                            border: '1px solid hsl(var(--border))',
                            color: 'hsl(var(--foreground))',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.75rem'
                        }
                    }}
                />
                
                {/* Header */}
                <header className="dashboard-header" data-testid="dashboard-header">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-green-500" />
                            <span className="logo-text text-green-500">0DTE</span>
                            <span className="logo-text text-muted-foreground">RANGE</span>
                        </div>
                        
                        <TickerTabs 
                            tickers={tickers} 
                            selectedTicker={selectedTicker} 
                            onSelect={setSelectedTicker}
                        />
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <MarketStatus status={marketStatus} />
                        
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={refreshData}
                                    className="h-8 w-8"
                                    data-testid="refresh-btn"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="tooltip-content">
                                Refresh Data
                            </TooltipContent>
                        </Tooltip>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 font-mono text-xs" data-testid="settings-dropdown">
                                    <Settings className="w-4 h-4 mr-1" />
                                    {refreshInterval}s
                                    <ChevronDown className="w-3 h-3 ml-1" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-surface border-border">
                                <DropdownMenuItem onClick={() => setRefreshInterval(10)} data-testid="interval-10">
                                    10 seconds
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setRefreshInterval(30)} data-testid="interval-30">
                                    30 seconds
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setRefreshInterval(60)} data-testid="interval-60">
                                    60 seconds
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>
                
                {/* Main Content */}
                <main className="main-content" data-testid="main-content">
                    {/* Price Card - 2 cols */}
                    <PriceCard data={tickerData} isLoading={isLoading && !tickerData} />
                    
                    {/* Range Bands - 2 cols */}
                    <RangeBandsCard 
                        rangeData={rangeData} 
                        onSetAnchor={handleSetAnchor}
                        isLoading={isLoading && !rangeData}
                    />
                    
                    {/* Historical Ranges - 2 cols */}
                    <HistoricalRangesCard rangeData={rangeData} isLoading={isLoading && !rangeData} />
                    
                    {/* All Tickers Panel - 2 cols */}
                    <AllTickersPanel 
                        tickersData={allTickersData}
                        selectedTicker={selectedTicker}
                        onSelect={setSelectedTicker}
                        isLoading={isLoading && allTickersData.length === 0}
                    />
                    
                    {/* Stats Row */}
                    <StatsCard 
                        title="Avg Daily Range" 
                        value={rangeData ? `$${formatNumber(rangeData.avg_daily_range)}` : '---'} 
                        icon={BarChart3} 
                        color="blue" 
                    />
                    <StatsCard 
                        title="High Band" 
                        value={rangeData ? `$${formatNumber(rangeData.high_band)}` : '---'} 
                        icon={TrendingUp} 
                        color="green" 
                    />
                    <StatsCard 
                        title="Low Band" 
                        value={rangeData ? `$${formatNumber(rangeData.low_band)}` : '---'} 
                        icon={TrendingDown} 
                        color="red" 
                    />
                    <StatsCard 
                        title="Volume" 
                        value={tickerData ? formatVolume(tickerData.volume) : '---'} 
                        icon={Activity} 
                        color="yellow" 
                    />
                </main>
                
                {/* Footer / Ticker Tape */}
                <footer className="ticker-tape" data-testid="ticker-tape">
                    <div className="ticker-content ticker-scroll">
                        {allTickersData.concat(allTickersData).map((ticker, idx) => (
                            <span key={idx} className="flex items-center gap-2">
                                <span className="font-bold">{ticker.symbol}</span>
                                <span className={ticker.change >= 0 ? 'text-green-500' : 'text-red-500'}>
                                    ${formatNumber(ticker.price)}
                                </span>
                                <span className={ticker.change >= 0 ? 'text-green-500' : 'text-red-500'}>
                                    ({ticker.change >= 0 ? '+' : ''}{formatNumber(ticker.change_percent)}%)
                                </span>
                            </span>
                        ))}
                    </div>
                </footer>
                
                {/* Last Update */}
                {lastUpdate && (
                    <div className="fixed bottom-12 right-4 text-xs text-muted-foreground font-mono" data-testid="last-update">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {lastUpdate.toLocaleTimeString()}
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}

export default App;
