import { 
    TrendingUp, 
    TrendingDown, 
    BarChart3,
    Activity
} from "lucide-react";

// Format number with commas
export const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return '---';
    return num.toLocaleString('en-US', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
    });
};

// Format volume
export const formatVolume = (vol) => {
    if (!vol) return '---';
    if (vol >= 1000000000) return (vol / 1000000000).toFixed(2) + 'B';
    if (vol >= 1000000) return (vol / 1000000).toFixed(2) + 'M';
    if (vol >= 1000) return (vol / 1000).toFixed(2) + 'K';
    return vol.toString();
};

// Market Status Component
export const MarketStatus = ({ status }) => {
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
export const TickerTabs = ({ tickers, selectedTicker, onSelect }) => {
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
export const PriceCard = ({ data, isLoading }) => {
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

// Historical Ranges Table
export const HistoricalRangesCard = ({ rangeData, isLoading }) => {
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
export const StatsCard = ({ title, value, icon: Icon, color = "blue" }) => {
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
export const AllTickersPanel = ({ tickersData, selectedTicker, onSelect, isLoading }) => {
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
                                className={`w-full p-3 flex items-center justify-between rounded border ${
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
