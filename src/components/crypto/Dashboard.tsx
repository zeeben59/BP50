import React, { useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight, DollarSign, BarChart3, Activity, Zap, RefreshCw } from 'lucide-react';
import PositionCard from './PositionCard';
import PortfolioChart from './PortfolioChart';
import { toast } from '@/components/ui/use-toast';

function formatNum(n: number, decimals = 2) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(decimals)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(decimals)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(decimals)}M`;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

const Dashboard: React.FC = () => {
  const {
    isLoggedIn, demoBalance, savingsBalance, portfolioValue, prices, previousPrices,
    positions, transactions, totalRealizedPnL, totalUnrealizedPnL, totalPnL,
    setCurrentPage, setShowAuthModal, setAuthMode, setSelectedCrypto, cryptoBalances,
  } = useAppContext();

  const totalBalance = demoBalance + savingsBalance + portfolioValue;
  const pnlColor = totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400';

  // Generate mock history for visual appeal
  const portfolioHistory = useMemo(() => {
    const points = 24;
    const data = [];
    const now = Math.floor(Date.now() / 1000);
    const hour = 3600;

    // Start with a value around the current portfolio value but with some variance
    const safeTotalBalance = typeof totalBalance === 'number' && !isNaN(totalBalance) ? totalBalance : 0;
    const baseValue = safeTotalBalance > 0 ? safeTotalBalance : 500;

    for (let i = points; i >= 0; i--) {
      const time = now - (i * hour);
      // Create a nice looking curve
      const variance = (Math.sin(i / 3) * 20) + (Math.cos(i / 2) * 10);
      const value = baseValue - (i * 2) + variance;

      data.push({
        time: time as any, // Pass unix timestamp directly
        value: isNaN(value) ? baseValue : Math.max(0, value)
      });
    }
    return data;
  }, [totalBalance]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      {!isLoggedIn ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] border border-white/10 p-10 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2" />
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tighter glow-text-emerald">B50 Trade Terminal <br />Institutional Simulation.</h1>
          <p className="text-muted-foreground text-xl mb-8 max-w-xl">Join thousands of professional traders using the B50 Trade institutional-grade simulator to master the markets with zero financial exposure.</p>
          <div className="flex items-center gap-3 mb-8">
            <div className="flex -space-x-3">
              {prices.slice(0, 4).map(p => (
                <div key={p.symbol} className="w-10 h-10 rounded-full border-2 border-background bg-secondary flex items-center justify-center overflow-hidden">
                  <img src={p.image_url} alt={p.symbol} className="w-6 h-6" />
                </div>
              ))}
            </div>
            <span className="text-emerald-400 text-sm font-black tracking-widest uppercase">Live market edge — {prices.length} assets</span>
          </div>
          <button onClick={() => { setShowAuthModal(true); setAuthMode('register'); }}
            className="px-8 py-4 bg-primary text-primary-foreground font-black rounded-2xl hover:scale-105 transition-all flex items-center gap-3 shadow-xl shadow-primary/20 uppercase tracking-widest">
            <Zap size={20} fill="currentColor" /> Initialize Account
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Balance */}
            <div className="glass-premium p-6 rounded-3xl group hover:glow-border-emerald transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Wallet size={20} />
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Net Value</span>
              <p className="text-3xl font-black text-white font-mono mt-1">${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <div className="h-0.5 w-full bg-white/5 my-3" />
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                <span>DEMO: ${demoBalance.toFixed(0)}</span>
                <span>SAVINGS: ${savingsBalance.toFixed(0)}</span>
              </div>
            </div>
            {/* Portfolio Value */}
            <div className="glass-premium p-6 rounded-3xl group hover:glow-border-emerald transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <BarChart3 size={20} />
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              </div>
              <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Trading Exposure</span>
              <p className="text-3xl font-black text-white font-mono mt-1">${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <div className="h-0.5 w-full bg-white/5 my-3" />
              <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <Activity size={10} />
                {positions.length} ACTIVE POSITIONS
              </p>
            </div>
            {/* Total P&L */}
            <div className={`glass-premium p-6 rounded-3xl group transition-all ${totalPnL >= 0 ? 'hover:glow-border-emerald' : 'hover:glow-border-rose'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {totalPnL >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
              </div>
              <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Global P&L</span>
              <p className={`text-3xl font-black font-mono mt-1 ${pnlColor}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <div className="h-0.5 w-full bg-white/5 my-3" />
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-muted-foreground">FLT: <span className={totalUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toFixed(0)}</span></span>
                <span className="text-muted-foreground">REAL: <span className={totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{totalRealizedPnL >= 0 ? '+' : ''}${totalRealizedPnL.toFixed(0)}</span></span>
              </div>
            </div>
            {/* Trades */}
            <div className="glass-premium p-6 rounded-3xl group hover:glow-border-emerald transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                  <ArrowLeftRight size={20} />
                </div>
              </div>
              <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Volume Output</span>
              <p className="text-3xl font-black text-white font-mono mt-1">{transactions.filter(t => t.type === 'buy' || t.type === 'sell').length}</p>
              <div className="h-0.5 w-full bg-white/5 my-3" />
              <div className="flex gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-black tracking-tighter uppercase">{transactions.filter(t => t.type === 'buy').length} BUYS</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[8px] font-black tracking-tighter uppercase">{transactions.filter(t => t.type === 'sell').length} SELLS</span>
              </div>
            </div>
          </div>

          {/* Performance Chart Section */}
          <div className="p-8 rounded-3xl glass-premium relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-white font-black tracking-tight text-2xl flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-primary rounded-full" />
                  Performance Metrics
                </h2>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Institutional-grade data tracking</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Total Equity</p>
                  <p className="text-white font-mono font-black text-2xl tracking-tighter">${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-xs font-black shadow-xl ring-1 ${totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20 shadow-emerald-500/10' : 'bg-rose-500/10 text-rose-400 ring-rose-500/20 shadow-rose-500/10'}`}>
                  {totalPnL >= 0 ? 'SIGNIFICANT GAIN ▲' : 'RETRACTION ▼'} {Math.abs(totalPnL / (totalBalance || 1) * 100).toFixed(2)}%
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <PortfolioChart data={portfolioHistory} height={300} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Overview */}
        <div className="lg:col-span-2 glass-premium rounded-3xl p-6 border-white/5 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-black tracking-tight text-xl flex items-center gap-2">
              <div className="w-1.5 h-6 bg-cyan-400 rounded-full" />
              Live Markets
            </h2>
            <button onClick={() => setCurrentPage('markets')} className="px-4 py-2 rounded-xl bg-white/5 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5">Global Markets</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                  <th className="text-left pb-4 px-2">ASSET CLASS</th>
                  <th className="text-right pb-4 px-2">VALUATION</th>
                  <th className="text-right pb-4 px-2">24H PERFORMANCE</th>
                  <th className="text-right pb-4 px-2">MARKET CAP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {prices.slice(0, 8).map(coin => {
                  const prev = previousPrices.find(p => p.symbol === coin.symbol);
                  const priceChanged = prev && prev.price !== coin.price;
                  const priceUp = prev ? coin.price > prev.price : false;
                  return (
                    <tr key={coin.symbol}
                      className="group cursor-pointer hover:bg-white/[0.03] transition-colors"
                      onClick={() => { setSelectedCrypto(coin.symbol); setCurrentPage('trade'); }}>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform overflow-hidden">
                            {coin.image_url ? <img src={coin.image_url} alt={coin.symbol} className="w-8 h-8" /> : <span className="text-xs font-black">{coin.symbol.slice(0, 2)}</span>}
                          </div>
                          <div>
                            <p className="text-white font-black tracking-tight">{coin.name}</p>
                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{coin.symbol} <span className="text-[8px] opacity-50">/ USDT</span></p>
                          </div>
                        </div>
                      </td>
                      <td className={`text-right font-mono font-black text-base px-2 transition-all duration-500 ${priceChanged ? (priceUp ? 'text-emerald-400 glow-text-emerald' : 'text-rose-400') : 'text-white'}`}>
                        ${coin.price < 1 ? coin.price.toFixed(4) : coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`text-right px-2`}>
                        <div className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-black ${coin.change_24h >= 0 ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20'}`}>
                          {coin.change_24h >= 0 ? '+' : ''}{coin.change_24h.toFixed(2)}%
                        </div>
                      </td>
                      <td className="text-right text-muted-foreground font-mono font-bold text-xs px-2">{formatNum(coin.market_cap, 1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Top Movers */}
          <div className="bg-[#111738] border border-white/5 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Top Movers</h2>
            <div className="space-y-3">
              {[...prices].sort((a, b) => Math.abs(b.change_24h) - Math.abs(a.change_24h)).slice(0, 5).map(coin => (
                <div key={coin.symbol}
                  className="flex items-center justify-between cursor-pointer hover:bg-white/[0.02] p-2 rounded-lg transition-colors"
                  onClick={() => { setSelectedCrypto(coin.symbol); setCurrentPage('trade'); }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-xs font-bold text-white">
                      {coin.image_url ? <img src={coin.image_url} alt={coin.symbol} className="w-5 h-5 rounded-full" /> : coin.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{coin.symbol}</p>
                      <p className="text-gray-500 text-xs">{coin.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-mono">${coin.price < 1 ? coin.price.toFixed(4) : coin.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                    <p className={`text-xs font-mono ${coin.change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {coin.change_24h >= 0 ? '+' : ''}{coin.change_24h.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Open Positions */}
          {isLoggedIn && positions.length > 0 && (
            <div className="bg-[#111738] border border-white/5 rounded-2xl p-5">
              <h2 className="text-white font-semibold mb-4">Open Positions</h2>
              <div className="space-y-2">
                {positions.map(pos => (
                  <PositionCard key={pos.symbol} symbol={pos.symbol} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {!isLoggedIn && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-2xl bg-[#111738] border border-white/5 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <DollarSign size={24} className="text-emerald-400" />
            </div>
            <h3 className="text-white font-medium mb-1">$500 Free Demo</h3>
            <p className="text-gray-500 text-xs">Practice with virtual money, zero risk</p>
          </div>
          <div className="p-6 rounded-2xl bg-[#111738] border border-white/5 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Activity size={24} className="text-violet-400" />
            </div>
            <h3 className="text-white font-medium mb-1">Real-Time Prices</h3>
            <p className="text-gray-500 text-xs">Live data from CoinGecko, {prices.length} coins</p>
          </div>
          <div className="p-6 rounded-2xl bg-[#111738] border border-white/5 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <BarChart3 size={24} className="text-cyan-400" />
            </div>
            <h3 className="text-white font-medium mb-1">Track Your P&L</h3>
            <p className="text-gray-500 text-xs">See profits and losses in real-time</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
