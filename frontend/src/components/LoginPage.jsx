import { useState } from "react";
import { Zap, Eye, EyeOff, Lock, User, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";

export const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        
        if (!username || !password) {
            setError("Please enter username and password");
            return;
        }
        
        setIsLoading(true);
        
        try {
            await onLogin(username, password);
        } catch (err) {
            setError(err.message || "Login failed");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
                {/* Grid lines */}
                <div 
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: `linear-gradient(rgba(34, 197, 94, 0.3) 1px, transparent 1px),
                                          linear-gradient(90deg, rgba(34, 197, 94, 0.3) 1px, transparent 1px)`,
                        backgroundSize: '50px 50px'
                    }}
                />
                
                {/* Animated lines */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-pulse" />
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-pulse" />
                
                {/* Floating chart lines */}
                <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 1000 600">
                    <path 
                        d="M0,300 Q100,250 200,280 T400,260 T600,290 T800,240 T1000,270" 
                        fill="none" 
                        stroke="#22c55e" 
                        strokeWidth="2"
                        className="animate-pulse"
                    />
                    <path 
                        d="M0,350 Q150,320 300,340 T500,310 T700,350 T900,320 T1000,340" 
                        fill="none" 
                        stroke="#ef4444" 
                        strokeWidth="2"
                        className="animate-pulse"
                        style={{ animationDelay: '0.5s' }}
                    />
                </svg>
            </div>
            
            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <Zap className="w-10 h-10 text-green-500" />
                        <h1 className="text-4xl font-bold">
                            <span className="text-green-500">0DTE</span>
                            <span className="text-white ml-2">RANGE</span>
                        </h1>
                    </div>
                    <p className="text-zinc-400 text-sm font-mono">Market Maker Fence Trading</p>
                </div>
                
                {/* Card */}
                <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-lg p-8 shadow-2xl">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        <h2 className="text-xl font-bold text-white">Login</h2>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2">
                                Username
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md pl-11 pr-4 py-3 text-white font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                    placeholder="Enter username"
                                    data-testid="login-username"
                                />
                            </div>
                        </div>
                        
                        {/* Password */}
                        <div>
                            <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md pl-11 pr-12 py-3 text-white font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                    placeholder="Enter password"
                                    data-testid="login-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded-md px-4 py-2 text-red-400 text-sm" data-testid="login-error">
                                {error}
                            </div>
                        )}
                        
                        {/* Login Button */}
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-md transition-all hover:shadow-lg hover:shadow-green-500/25"
                            data-testid="login-button"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Logging in...
                                </span>
                            ) : (
                                "Login"
                            )}
                        </Button>
                    </form>
                    
                    {/* Demo hint */}
                    <div className="mt-6 pt-4 border-t border-zinc-800">
                        <p className="text-xs text-zinc-500 text-center">
                            Demo: Use any username/password to login
                        </p>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="text-center mt-6 text-zinc-500 text-xs">
                    <p>Market Maker Fence Strategy</p>
                    <p className="mt-1">SPY • SPX • QQQ • BTC</p>
                </div>
            </div>
        </div>
    );
};
