export const StatsCard = ({ title, value, icon: Icon, color = "blue" }) => {
    const colorClasses = {
        blue: "text-blue-500 bg-blue-500/20",
        green: "text-green-500 bg-green-500/20",
        red: "text-red-500 bg-red-500/20",
        yellow: "text-yellow-500 bg-yellow-500/20"
    };
    
    const titleId = title.toLowerCase().replace(/\s+/g, '-');
    
    return (
        <div className="terminal-card card-hover" data-testid={`stats-card-${titleId}`}>
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
