import { useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, Trophy, XCircle, RefreshCw } from "lucide-react";
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
                    <Trophy className="w-4 h-4 text-yellow-500" />
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
                        {isProfit ? '+' : ''}{formatNumber(scoreboard.total_pnl)}
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
    
    const handleTrade = async (direction) => {
        if (!tickerData?.price || tradeAmount <= 0) return;
        setIsTrading(true);
        try {
            await onTrade(selectedTicker, direction, tradeAmount);
        } finally {
            setIsTrading(false);
        }
    };
    
    const maxBet = scoreboard?.balance || 0;
    
    return (
        <div className="terminal-card card-hover" data-testid="trading-panel">
            <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span className="label-text">Paper Trading</span>
            </div>
            
            {/* Trade Amount */}
            <div className="mb-4">
                <span className="label-text">Trade Amount</span>
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
            
            {/* Current Price Info */}
            <div className="mb-4 p-3 bg-surface-highlight/50 rounded border border-border">
                <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Entry Price</span>
                    <span className="font-mono text-sm font-bold">${formatNumber(tickerData?.price)}</span>
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Range</span>
                    <span className="font-mono text-xs">
                        ${formatNumber(rangeData?.low_band)} - ${formatNumber(rangeData?.high_band)}
                    </span>
                </div>
            </div>
            
            {/* Trade Buttons */}
            <div className="grid grid-cols-2 gap-3">
                <Button
                    onClick={() => handleTrade('long')}
                    disabled={isTrading || tradeAmount <= 0 || tradeAmount > maxBet}
                    className="bg-green-600 hover:bg-green-500 text-white font-mono text-xs uppercase tracking-wider h-10"
                    data-testid="long-btn"
                >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Long
                </Button>
                <Button
                    onClick={() => handleTrade('short')}
                    disabled={isTrading || tradeAmount <= 0 || tradeAmount > maxBet}
                    className="bg-red-600 hover:bg-red-500 text-white font-mono text-xs uppercase tracking-wider h-10"
                    data-testid="short-btn"
                >
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Short
                </Button>
            </div>
            
            {/* Open Trades */}
            {openTrades && openTrades.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                    <span className="label-text">Open Positions</span>
                    <div className="space-y-2 mt-2">
                        {openTrades.map(function(trade) {
                            const isProfit = (trade.unrealized_pnl || 0) >= 0;
                            return (
                                <div 
                                    key={trade.id} 
                                    className="flex items-center justify-between p-2 bg-surface-highlight/30 rounded border border-border"
                                    data-testid={`open-trade-${trade.id}`}
                                >
                                    <div>
                                        <span className={`font-mono text-xs uppercase ${trade.direction === 'long' ? 'text-green-500' : 'text-red-500'}`}>
                                            {trade.direction}
                                        </span>
                                        <span className="font-mono text-xs ml-2">{trade.symbol}</span>
                                        <span className="font-mono text-xs text-muted-foreground ml-2">
                                            ${formatNumber(trade.amount)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-mono text-xs font-bold ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                                            {isProfit ? '+' : ''}{formatNumber(trade.unrealized_pnl || 0)}
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
