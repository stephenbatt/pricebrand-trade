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
