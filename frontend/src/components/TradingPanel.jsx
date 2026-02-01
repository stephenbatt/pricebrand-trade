import { useState } from "react";
import { DollarSign, Shield, Zap, XCircle, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { formatNumber } from "../utils/formatters";

export const Scoreboard = ({ scoreboard, onReset }) => {
    if (!scoreboard) return null;
    
    const isProfit = scoreboard.total_pnl >= 0;
    const pnlClass = isProfit ? 'text-green-500' : 'text-red-500';
    
    return (
        <div className="terminal-card card-hover" data-testid="scoreboard">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-yellow-500" />
                    <span className="label-text">Scoreboard</span>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onReset}
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                    data-testid="reset-account-btn"
                >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reset
                </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <span className="label-text">Bankroll</span>
                    <p className="font-mono text-xl font-bold text-green-500" data-testid="bankroll">
                        ${formatNumber(scoreboard.balance)}
                    </p>
                </div>
                <div>
                    <span className="label-text">Total P&L</span>
                    <p className={`font-mono text-xl font-bold ${pnlClass}`} data-testid="total-pnl">
                        {isProfit ? '+' : ''}${formatNumber(scoreboard.total_pnl)}
                    </p>
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                <div className="text-center">
                    <span className="label-text">Wins</span>
                    <p className="font-mono text-lg font-bold text-green-500" data-testid="wins">
                        {scoreboard.wins}
                    </p>
                </div>
                <div className="text-center">
                    <span className="label-text">Losses</span>
                    <p className="font-mono text-lg font-bold text-red-500" data-testid="losses">
                        {scoreboard.losses}
                    </p>
                </div>
                <div className="text-center">
                    <span className="label-text">Win Rate</span>
                    <p className="font-mono text-lg font-bold text-blue-500" data-testid="win-rate">
                        {scoreboard.win_rate}%
                    </p>
                </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                    <span className="label-text">Return</span>
                    <span className={`font-mono text-sm font-bold ${scoreboard.return_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {scoreboard.return_pct >= 0 ? '+' : ''}{scoreboard.return_pct}%
                    </span>
                </div>
            </div>
        </div>
    );
};

export const TradingPanel = ({ selectedTicker, tickerData, rangeData, scoreboard, onTrade, onCloseTrade, openTrades }) => {
    const [tradeAmount, setTradeAmount] = useState(100);
    const [isTrading, setIsTrading] = useState(false);
    const [fenceMultiplier, setFenceMultiplier] = useState(1.0);
    
    const handleTrade = async (betType) => {
        if (!tickerData?.price || tradeAmount <= 0) return;
        setIsTrading(true);
        try {
            await onTrade(selectedTicker, betType, tradeAmount, fenceMultiplier);
        } finally {
            setIsTrading(false);
        }
    };
    
    const maxBet = scoreboard?.balance || 0;
    
    // Calculate adjusted fence
    const avgRange = rangeData?.avg_daily_range || 0;
    const adjustedRange = avgRange * fenceMultiplier;
    const currentPrice = rangeData?.current_price || tickerData?.price || 0;
    const anchorPrice = rangeData?.anchor_price || currentPrice;
    const adjustedHighBand = anchorPrice + (adjustedRange / 2);
    const adjustedLowBand = anchorPrice - (adjustedRange / 2);
    
    const fenceOptions = [
        { value: 1.0, label: "1x (Normal)" },
        { value: 1.25, label: "1.25x (Safer)" },
        { value: 1.5, label: "1.5x (Safe)" },
        { value: 2.0, label: "2x (Very Safe)" },
    ];
    
    return (
        <div className="terminal-card card-hover" data-testid="trading-panel">
            <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="label-text">Fence Betting</span>
            </div>
            
            {/* Fence Adjustment */}
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                <div className="flex items-center justify-between mb-2">
                    <span className="label-text text-blue-400">Fence Width</span>
                    <span className="font-mono text-sm text-blue-400">{fenceMultiplier}x</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                    {fenceOptions.map(function(opt) {
                        const isSelected = fenceMultiplier === opt.value;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => setFenceMultiplier(opt.value)}
                                className={`py-1 px-2 text-xs font-mono rounded transition-colors ${
                                    isSelected 
                                        ? 'bg-blue-500 text-white' 
                                        : 'bg-surface-highlight text-muted-foreground hover:text-foreground'
                                }`}
                                data-testid={`fence-${opt.value}`}
                            >
                                {opt.value}x
                            </button>
                        );
                    })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    Wider fence = easier to win INSIDE bets
                </p>
            </div>
            
            {/* Adjusted Fence Display */}
            <div className="mb-4 p-3 bg-surface-highlight/50 rounded border border-border">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">Your Fence</span>
                    <span className="font-mono text-xs text-green-500">${formatNumber(adjustedHighBand)}</span>
                </div>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">Current Price</span>
                    <span className="font-mono text-sm font-bold">${formatNumber(currentPrice)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Your Fence</span>
                    <span className="font-mono text-xs text-red-500">${formatNumber(adjustedLowBand)}</span>
                </div>
            </div>
            
            {/* Trade Amount */}
            <div className="mb-4">
                <span className="label-text">Bet Amount</span>
                <div className="flex gap-2 mt-2">
                    <input
                        type="number"
                        value={tradeAmount}
                        onChange={(e) => setTradeAmount(Math.min(Number(e.target.value), maxBet))}
                        className="flex-1 bg-surface-highlight border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Amount"
                        min="1"
                        max={maxBet}
                        data-testid="trade-amount-input"
                    />
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setTradeAmount(Math.floor(maxBet * 0.1))}
                        className="text-xs"
                    >
                        10%
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setTradeAmount(Math.floor(maxBet * 0.25))}
                        className="text-xs"
                    >
                        25%
                    </Button>
                </div>
            </div>
            
            {/* Bet Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <Button
                    onClick={() => handleTrade('inside')}
                    disabled={isTrading || tradeAmount <= 0 || tradeAmount > maxBet}
                    className="bg-green-600 hover:bg-green-500 text-white font-mono text-xs uppercase tracking-wider h-14 flex-col"
                    data-testid="bet-inside-btn"
                >
                    <Shield className="w-5 h-5 mb-1" />
                    BET INSIDE
                    <span className="text-[10px] opacity-75">Stay in fence = WIN</span>
                </Button>
                <Button
                    onClick={() => handleTrade('outside')}
                    disabled={isTrading || tradeAmount <= 0 || tradeAmount > maxBet}
                    className="bg-red-600 hover:bg-red-500 text-white font-mono text-xs uppercase tracking-wider h-14 flex-col"
                    data-testid="bet-outside-btn"
                >
                    <Zap className="w-5 h-5 mb-1" />
                    BET OUTSIDE
                    <span className="text-[10px] opacity-75">Break fence = WIN</span>
                </Button>
            </div>
            
            {/* Explanation */}
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs">
                <p className="text-yellow-400 font-bold mb-1">How it works:</p>
                <p className="text-muted-foreground">
                    <strong>BET INSIDE:</strong> You win if price stays between ${formatNumber(adjustedLowBand)} and ${formatNumber(adjustedHighBand)} at 4PM.
                </p>
                <p className="text-muted-foreground mt-1">
                    <strong>BET OUTSIDE:</strong> You win if price breaks above ${formatNumber(adjustedHighBand)} OR below ${formatNumber(adjustedLowBand)}.
                </p>
            </div>
            
            {/* Open Bets */}
            {openTrades && openTrades.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                    <span className="label-text">Open Bets</span>
                    <div className="space-y-2 mt-2">
                        {openTrades.map(function(trade) {
                            const isInside = trade.direction === 'inside';
                            const currentInRange = trade.low_band <= (trade.current_price || 0) && (trade.current_price || 0) <= trade.high_band;
                            const isWinning = isInside ? currentInRange : !currentInRange;
                            
                            return (
                                <div 
                                    key={trade.id} 
                                    className={`flex items-center justify-between p-3 rounded border ${
                                        isWinning ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                                    }`}
                                    data-testid={`open-trade-${trade.id}`}
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            {isInside ? <Shield className="w-4 h-4 text-green-500" /> : <Zap className="w-4 h-4 text-red-500" />}
                                            <span className={`font-mono text-xs uppercase font-bold ${isInside ? 'text-green-500' : 'text-red-500'}`}>
                                                {trade.direction}
                                            </span>
                                            <span className="font-mono text-xs">{trade.symbol}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Bet: ${formatNumber(trade.amount)} | Fence: ${formatNumber(trade.low_band)} - ${formatNumber(trade.high_band)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-mono text-xs font-bold ${isWinning ? 'text-green-500' : 'text-red-500'}`}>
                                            {isWinning ? 'WINNING' : 'LOSING'}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onCloseTrade(trade.id)}
                                            className="h-6 w-6 p-0"
                                            data-testid={`close-trade-${trade.id}`}
                                        >
                                            <XCircle className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
