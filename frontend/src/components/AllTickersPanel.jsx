import { Activity } from "lucide-react";
import { formatNumber } from "../utils/formatters";

const TickerItem = ({ ticker, selectedTicker, onSelect }) => {
    const isPositive = ticker.change >= 0;
    const isSelected = ticker.symbol === selectedTicker;
    const priceClass = isPositive ? 'text-green-500' : 'text-red-500';
    const borderClass = isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 bg-surface-highlight/30';
    
    return (
        <button
            onClick={() => onSelect(ticker.symbol)}
            className={`w-full p-3 flex items-center justify-between rounded border ${borderClass}`}
            data-testid={`all-ticker-${ticker.symbol}`}
        >
            <div className="text-left">
                <p className="font-mono text-sm font-bold">{ticker.symbol}</p>
                <p className="text-xs text-muted-foreground">{ticker.name}</p>
            </div>
            <div className="text-right">
                <p className={`font-mono text-sm font-bold ${priceClass}`}>
                    ${formatNumber(ticker.price)}
                </p>
                <p className={`font-mono text-xs ${priceClass}`}>
                    {isPositive ? '+' : ''}{formatNumber(ticker.change_percent)}%
                </p>
            </div>
        </button>
    );
};

export const AllTickersPanel = ({ tickersData, selectedTicker, onSelect, isLoading }) => {
    return (
        <div className="terminal-card md:col-span-2 card-hover" data-testid="all-tickers-panel">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-green-500" />
                <span className="label-text">All Tickers</span>
            </div>
            
            <div className="space-y-2">
                {isLoading ? (
                    <>
                        <div className="skeleton h-12 w-full rounded"></div>
                        <div className="skeleton h-12 w-full rounded"></div>
                        <div className="skeleton h-12 w-full rounded"></div>
                        <div className="skeleton h-12 w-full rounded"></div>
                    </>
                ) : (
                    tickersData?.map(function(ticker) {
                        return (
                            <TickerItem 
                                key={ticker.symbol}
                                ticker={ticker}
                                selectedTicker={selectedTicker}
                                onSelect={onSelect}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
};
