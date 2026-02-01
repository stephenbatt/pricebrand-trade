import { TrendingUp, TrendingDown } from "lucide-react";
import { formatNumber } from "../utils/formatters";

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
    const bgClass = isPositive ? 'gradient-bullish' : 'gradient-bearish';
    const iconBgClass = isPositive ? 'bg-green-500/20' : 'bg-red-500/20';
    const priceClass = isPositive ? 'text-green-500 text-glow-green' : 'text-red-500 text-glow-red';
    const changeClass = isPositive ? 'text-green-500' : 'text-red-500';
    
    return (
        <div className={`terminal-card col-span-2 card-hover ${bgClass}`} data-testid="price-card">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <span className="label-text">{data?.name || 'Loading...'}</span>
                    <h2 className="font-mono text-xl font-bold tracking-tight">{data?.symbol}</h2>
                </div>
                <div className={`p-2 rounded ${iconBgClass}`}>
                    {isPositive ? <TrendingUp className="w-5 h-5 text-green-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                </div>
            </div>
            
            <div className={`price-large mb-2 ${priceClass}`} data-testid="current-price">
                ${formatNumber(data?.price)}
            </div>
            
            <div className="flex items-center gap-4">
                <span className={`font-mono text-sm ${changeClass}`} data-testid="price-change">
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
