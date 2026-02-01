const TickerButton = ({ ticker, selectedTicker, onSelect }) => {
    return (
        <button
            onClick={() => onSelect(ticker.symbol)}
            className={`ticker-btn ${selectedTicker === ticker.symbol ? 'active' : ''}`}
            data-testid={`ticker-btn-${ticker.symbol}`}
        >
            {ticker.symbol}
        </button>
    );
};

export const TickerTabs = ({ tickers, selectedTicker, onSelect }) => {
    if (!tickers || tickers.length === 0) return null;
    
    return (
        <div className="flex gap-1" data-testid="ticker-tabs">
            {tickers.map(function(ticker) {
                return (
                    <TickerButton 
                        key={ticker.symbol}
                        ticker={ticker}
                        selectedTicker={selectedTicker}
                        onSelect={onSelect}
                    />
                );
            })}
        </div>
    );
};
