import { BarChart3 } from "lucide-react";
import { formatNumber } from "../utils/formatters";

const HistoricalRow = ({ day, idx }) => {
    return (
        <tr className="border-b border-border/50 hover:bg-surface-highlight/50" data-testid={`historical-row-${idx}`}>
            <td className="py-2 pr-4 text-muted-foreground">{day.date}</td>
            <td className="py-2 px-2 text-right text-green-500">${formatNumber(day.high)}</td>
            <td className="py-2 px-2 text-right text-red-500">${formatNumber(day.low)}</td>
            <td className="py-2 pl-2 text-right font-semibold">${formatNumber(day.range_value)}</td>
        </tr>
    );
};

export const HistoricalRangesCard = ({ rangeData, isLoading }) => {
    if (isLoading || !rangeData?.historical_ranges) {
        return (
            <div className="terminal-card md:col-span-2" data-testid="historical-loading">
                <div className="skeleton h-6 w-40 mb-4 rounded"></div>
                <div className="space-y-2">
                    <div className="skeleton h-8 w-full rounded"></div>
                    <div className="skeleton h-8 w-full rounded"></div>
                    <div className="skeleton h-8 w-full rounded"></div>
                    <div className="skeleton h-8 w-full rounded"></div>
                    <div className="skeleton h-8 w-full rounded"></div>
                </div>
            </div>
        );
    }
    
    const ranges = rangeData.historical_ranges;
    
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
                        {ranges.map(function(day, idx) {
                            return <HistoricalRow key={idx} day={day} idx={idx} />;
                        })}
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
