import { Target } from "lucide-react";
import { Button } from "./ui/button";
import { formatNumber } from "../utils/formatters";

export const RangeBandsCard = ({ rangeData, onSetAnchor, isLoading }) => {
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
    const glowClass = isInside ? 'glow-green' : 'glow-red';
    const statusClass = isInside ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500';
    const markerClass = isInside ? 'bg-green-500 glow-green' : 'bg-red-500 glow-red';
    
    return (
        <div className={`terminal-card col-span-2 card-hover ${glowClass}`} data-testid="range-bands-card">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <span className="label-text">Expected Range</span>
                    <h3 className="font-mono text-lg font-bold">Market Maker Bands</h3>
                </div>
                <div className={`px-3 py-1 font-mono text-xs uppercase tracking-wider ${statusClass}`} data-testid="range-status">
                    {isInside ? 'INSIDE RANGE' : 'OUTSIDE RANGE'}
                </div>
            </div>
            
            <div className="mb-6">
                <div className="flex justify-between mb-2">
                    <span className="font-mono text-sm text-red-500" data-testid="low-band">${formatNumber(rangeData.low_band)}</span>
                    <span className="font-mono text-xs text-muted-foreground">AVG: ${formatNumber(rangeData.avg_daily_range)}</span>
                    <span className="font-mono text-sm text-green-500" data-testid="high-band">${formatNumber(rangeData.high_band)}</span>
                </div>
                
                <div className="range-container">
                    <div className="range-fill range-bar-track opacity-30" style={{ width: '100%' }}></div>
                    <div className={`range-marker ${markerClass}`} style={{ left: `${position}%` }} data-testid="price-marker"></div>
                </div>
                
                <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
                    <span>LOW BAND</span>
                    <span>CURRENT: ${formatNumber(rangeData.current_price)}</span>
                    <span>HIGH BAND</span>
                </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                    <span className="label-text">Anchor Price</span>
                    <p className="font-mono text-sm" data-testid="anchor-price">
                        {rangeData.anchor_price ? `$${formatNumber(rangeData.anchor_price)}` : 'Not Set'}
                    </p>
                </div>
                <Button onClick={onSetAnchor} className="btn-terminal primary" data-testid="set-anchor-btn">
                    <Target className="w-3 h-3 mr-2" />
                    SET 10AM ANCHOR
                </Button>
            </div>
        </div>
    );
};
