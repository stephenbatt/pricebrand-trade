// Format number with commas
export const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return '---';
    return num.toLocaleString('en-US', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
    });
};

// Format volume
export const formatVolume = (vol) => {
    if (!vol) return '---';
    if (vol >= 1000000000) return (vol / 1000000000).toFixed(2) + 'B';
    if (vol >= 1000000) return (vol / 1000000).toFixed(2) + 'M';
    if (vol >= 1000) return (vol / 1000).toFixed(2) + 'K';
    return vol.toString();
};
