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
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "./components/ui/tooltip";
import { 
    formatNumber, 
    formatVolume, 
    MarketStatus, 
    TickerTabs, 
    PriceCard, 
    HistoricalRangesCard, 
    StatsCard, 
    AllTickersPanel 
} from "./components/TradingComponents";
import { RangeBandsCard } from "./components/RangeBandsCard";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
    
    const fetchTickers = useCallback(async () => {
        try {
            const response = await axios.get(`${API}/tickers`);
            setTickers(response.data);
        } catch (e) {
            console.error("Error fetching tickers:", e);
            toast.error("Failed to load tickers");
        }
    }, []);
    
    const fetchTickerData = useCallback(async (symbol) => {
        try {
            const response = await axios.get(`${API}/ticker/${symbol}`);
            setTickerData(response.data);
        } catch (e) {
            console.error("Error fetching ticker data:", e);
        }
    }, []);
    
    const fetchRangeData = useCallback(async (symbol) => {
        try {
            const response = await axios.get(`${API}/range/${symbol}`);
            setRangeData(response.data);
        } catch (e) {
            console.error("Error fetching range data:", e);
        }
    }, []);
    
    const fetchAllTickers = useCallback(async () => {
        try {
            const response = await axios.get(`${API}/multi-ticker`);
            setAllTickersData(response.data);
        } catch (e) {
            console.error("Error fetching all tickers:", e);
        }
    }, []);
    
    const fetchMarketStatus = useCallback(async () => {
        try {
            const response = await axios.get(`${API}/market-status`);
            setMarketStatus(response.data);
        } catch (e) {
            console.error("Error fetching market status:", e);
        }
    }, []);
    
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
            
            const response = await axios.get(`${API}/range/${selectedTicker}?anchor_price=${tickerData.price}`);
            setRangeData(response.data);
            
            toast.success(`Anchor set at $${formatNumber(tickerData.price)}`);
        } catch (e) {
            console.error("Error setting anchor:", e);
            toast.error("Failed to set anchor");
        }
    };
    
    useEffect(() => {
        fetchTickers();
        refreshData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    useEffect(() => {
        refreshData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTicker]);
    
    useEffect(() => {
        const interval = setInterval(() => {
            refreshData();
        }, refreshInterval * 1000);
        
        return () => clearInterval(interval);
    }, [refreshInterval, refreshData]);
    
    return (
        <TooltipProvider>
            <div className="dashboard-container" data-testid="dashboard-container">
                <div className="scanlines"></div>
                
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
                
                <main className="main-content" data-testid="main-content">
                    <PriceCard data={tickerData} isLoading={isLoading && !tickerData} />
                    
                    <RangeBandsCard 
                        rangeData={rangeData} 
                        onSetAnchor={handleSetAnchor}
                        isLoading={isLoading && !rangeData}
                    />
                    
                    <HistoricalRangesCard rangeData={rangeData} isLoading={isLoading && !rangeData} />
                    
                    <AllTickersPanel 
                        tickersData={allTickersData}
                        selectedTicker={selectedTicker}
                        onSelect={setSelectedTicker}
                        isLoading={isLoading && allTickersData.length === 0}
                    />
                    
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
