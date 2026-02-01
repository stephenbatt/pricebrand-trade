import { formatNumber } from "../utils/formatters";

const TickerItem = ({ ticker }) => {
    const isPositive = ticker.change >= 0;
    const colorClass = isPositive ? 'text-green-500' : 'text-red-500';
    
    return (
        <span className="flex items-center gap-2">
            <span className="font-bold">{ticker.symbol}</span>
            <span className={colorClass}>
                ${formatNumber(ticker.price)}
            </span>
            <span className={colorClass}>
                ({isPositive ? '+' : ''}{formatNumber(ticker.change_percent)}%)
            </span>
        </span>
    );
};

export const TickerTape = ({ tickersData }) => {
    if (!tickersData || tickersData.length === 0) return null;
    
    const doubledData = tickersData.concat(tickersData);
    
    return (
        <footer className="ticker-tape" data-testid="ticker-tape">
            <div className="ticker-content ticker-scroll">
                {doubledData.map(function(ticker, idx) {
                    return <TickerItem key={`${ticker.symbol}-${idx}`} ticker={ticker} />;
                })}
            </div>
        </footer>
    );
};
