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
    ChevronDown,
    LogOut
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Button } from "./components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "./components/ui/tooltip";
import { formatNumber, formatVolume } from "./utils/formatters";
import { MarketStatus } from "./components/MarketStatus";
import { TickerTabs } from "./components/TickerTabs";
import { PriceCard } from "./components/PriceCard";
import { RangeBandsCard } from "./components/RangeBandsCard";
import { HistoricalRangesCard } from "./components/HistoricalRangesCard";
import { StatsCard } from "./components/StatsCard";
import { AllTickersPanel } from "./components/AllTickersPanel";
import { TickerTape } from "./components/TickerTape";
import { Scoreboard, TradingPanel } from "./components/TradingPanel";
import { LoginPage } from "./components/LoginPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
    // Auth state
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    
    const [selectedTicker, setSelectedTicker] = useState('SPY');
    const [tickers, setTickers] = useState([]);
    const [tickerData, setTickerData] = useState(null);
    const [rangeData, setRangeData] = useState(null);
    const [allTickersData, setAllTickersData] = useState([]);
    const [marketStatus, setMarketStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(30);
    const [lastUpdate, setLastUpdate] = useState(null);
    
    // Paper Trading State
    const [scoreboard, setScoreboard] = useState(null);
    const [openTrades, setOpenTrades] = useState([]);
    
    const fetchTickers = useCallback(async () => {
        try {
            const response = await axios.get(`${API}/tickers`);
            setTickers(response.data);
        } catch (e) {
            console.error("Error fetching tickers:", e);
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
    
    const fetchScoreboard = useCallback(async () => {
        try {
            const response = await axios.get(`${API}/scoreboard`);
            setScoreboard(response.data);
        } catch (e) {
            console.error("Error fetching scoreboard:", e);
        }
    }, []);
    
    const fetchOpenTrades = useCallback(async () => {
        try {
            const response = await axios.get(`${API}/trades/open`);
            setOpenTrades(response.data);
        } catch (e) {
            console.error("Error fetching open trades:", e);
        }
    }, []);
    
    const refreshData = useCallback(async () => {
        setIsLoading(true);
        await Promise.all([
            fetchTickerData(selectedTicker),
            fetchRangeData(selectedTicker),
            fetchAllTickers(),
            fetchMarketStatus(),
            fetchScoreboard(),
            fetchOpenTrades()
        ]);
        setLastUpdate(new Date());
        setIsLoading(false);
    }, [selectedTicker, fetchTickerData, fetchRangeData, fetchAllTickers, fetchMarketStatus, fetchScoreboard, fetchOpenTrades]);
    
    // Check for 4PM auto-settle
    const checkAutoSettle = useCallback(async () => {
        try {
            const response = await axios.get(`${API}/check-market-close`);
            if (response.data.auto_settled) {
                toast.success(`Market closed! ${response.data.result.settled_trades?.length || 0} bets auto-settled`);
                await fetchScoreboard();
                await fetchOpenTrades();
            }
        } catch (e) {
            console.error("Error checking auto-settle:", e);
        }
    }, [fetchScoreboard, fetchOpenTrades]);
    
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
    
    const handleTrade = async (symbol, direction, amount, fenceMultiplier = 1.0) => {
        try {
            const response = await axios.post(`${API}/trade`, {
                symbol,
                direction,
                amount,
                fence_multiplier: fenceMultiplier
            });
            const betType = direction === 'inside' ? 'INSIDE' : 'OUTSIDE';
            toast.success(`BET ${betType} placed: $${amount}`);
            await fetchScoreboard();
            await fetchOpenTrades();
        } catch (e) {
            console.error("Error opening trade:", e);
            toast.error(e.response?.data?.detail || "Failed to place bet");
        }
    };
    
    const handleCloseTrade = async (tradeId) => {
        try {
            const response = await axios.post(`${API}/trade/close`, {
                trade_id: tradeId
            });
            const pnl = response.data.pnl;
            const isWin = response.data.is_win;
            toast.success(`Trade closed: ${isWin ? '+' : ''}$${pnl.toFixed(2)} ${isWin ? '🎉' : ''}`);
            await fetchScoreboard();
            await fetchOpenTrades();
        } catch (e) {
            console.error("Error closing trade:", e);
            toast.error("Failed to close trade");
        }
    };
    
    const handleResetAccount = async () => {
        try {
            await axios.post(`${API}/account/reset`);
            toast.success("Account reset to $10,000");
            await fetchScoreboard();
            await fetchOpenTrades();
        } catch (e) {
            console.error("Error resetting account:", e);
            toast.error("Failed to reset account");
        }
    };
    
    const handleSettleAll = async () => {
        try {
            const response = await axios.post(`${API}/auto-settle`);
            const settled = response.data.settled_trades || [];
            const wins = settled.filter(t => t.is_win).length;
            const losses = settled.length - wins;
            toast.success(`Settled ${settled.length} bets: ${wins} wins, ${losses} losses`);
            await fetchScoreboard();
            await fetchOpenTrades();
        } catch (e) {
            console.error("Error settling trades:", e);
            toast.error("Failed to settle bets");
        }
    };
    
    // Login handler
    const handleLogin = async (username, password) => {
        // For demo - accept any login
        // In production, this would call your auth API
        try {
            const response = await axios.post(`${API}/auth/login`, { username, password });
            setCurrentUser(response.data.user);
            setIsLoggedIn(true);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            toast.success(`Welcome, ${response.data.user.username}!`);
        } catch (e) {
            // Demo mode - allow any login
            const user = { username, id: Date.now().toString() };
            setCurrentUser(user);
            setIsLoggedIn(true);
            localStorage.setItem('user', JSON.stringify(user));
            toast.success(`Welcome, ${username}!`);
        }
    };
    
    // Logout handler
    const handleLogout = () => {
        setIsLoggedIn(false);
        setCurrentUser(null);
        localStorage.removeItem('user');
        toast.success("Logged out successfully");
    };
    
    // Check for saved login on mount
    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setCurrentUser(JSON.parse(savedUser));
            setIsLoggedIn(true);
        }
    }, []);
    
    useEffect(() => {
        if (isLoggedIn) {
            fetchTickers();
            refreshData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoggedIn]);
    
    useEffect(() => {
        if (isLoggedIn) {
            refreshData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTicker]);
    
    useEffect(() => {
        if (!isLoggedIn) return;
        
        const interval = setInterval(() => {
            refreshData();
        }, refreshInterval * 1000);
        
        return () => clearInterval(interval);
    }, [refreshInterval, refreshData, isLoggedIn]);
    
    // Check for 4PM market close every minute
    useEffect(() => {
        if (!isLoggedIn) return;
        
        const interval = setInterval(() => {
            checkAutoSettle();
        }, 60000); // Check every minute
        
        return () => clearInterval(interval);
    }, [checkAutoSettle, isLoggedIn]);
    
    // Show login page if not logged in
    if (!isLoggedIn) {
        return <LoginPage onLogin={handleLogin} />;
    }
    
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
                        
                        {/* User & Logout */}
                        <div className="flex items-center gap-2 pl-4 border-l border-border">
                            <span className="text-xs text-muted-foreground font-mono">
                                {currentUser?.username}
                            </span>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={handleLogout}
                                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                        data-testid="logout-btn"
                                    >
                                        <LogOut className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="tooltip-content">
                                    Logout
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </header>
                
                <main className="main-content" data-testid="main-content">
                    {/* Row 1: Price + Range Bands */}
                    <PriceCard data={tickerData} isLoading={isLoading && !tickerData} />
                    <RangeBandsCard 
                        rangeData={rangeData} 
                        onSetAnchor={handleSetAnchor}
                        isLoading={isLoading && !rangeData}
                    />
                    
                    {/* Row 2: Historical + Trading Panel */}
                    <HistoricalRangesCard rangeData={rangeData} isLoading={isLoading && !rangeData} />
                    
                    <div className="md:col-span-2 space-y-4">
                        <Scoreboard 
                            scoreboard={scoreboard} 
                            onReset={handleResetAccount} 
                            onSettleAll={handleSettleAll}
                            hasOpenBets={openTrades && openTrades.length > 0}
                        />
                        <TradingPanel
                            selectedTicker={selectedTicker}
                            tickerData={tickerData}
                            rangeData={rangeData}
                            scoreboard={scoreboard}
                            onTrade={handleTrade}
                            onCloseTrade={handleCloseTrade}
                            openTrades={openTrades}
                        />
                    </div>
                    
                    {/* Row 3: Stats */}
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
                
                <TickerTape tickersData={allTickersData} />
                
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
