import React, { useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight, BarChart3, Activity, Zap } from 'lucide-react';
import PositionCard from './PositionCard';
import PortfolioChart from './PortfolioChart';

type PriceRow = {
  symbol: string;
  name: string;
  price: number;
  change_24h: number;
  market_cap: number;
  image_url?: string;
};

function formatNum(n: number, decimals = 2) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(decimals)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(decimals)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(decimals)}M`;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

const Dashboard: React.FC = () => {
  const {
    isLoggedIn,
    demoBalance,
    savingsBalance,
    portfolioValue,
    prices,
    previousPrices,
    positions,
    transactions,
    totalRealizedPnL,
    totalUnrealizedPnL,
    totalPnL,
    setCurrentPage,
    setShowAuthModal,
    setAuthMode,
    setSelectedCrypto,
  } = useAppContext();

  const totalBalance = demoBalance + savingsBalance + portfolioValue;
  const pnlColor = totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400';

  const portfolioHistory = useMemo(() => {
    const points = 24;
    const data = [];
    const now = Math.floor(Date.now() / 1000);
    const hour = 3600;
    const safeTotalBalance = typeof totalBalance === 'number' && !Number.isNaN(totalBalance) ? totalBalance : 0;
    const baseValue = safeTotalBalance > 0 ? safeTotalBalance : 500;

    for (let i = points; i >= 0; i--) {
      const time = now - i * hour;
      const variance = Math.sin(i / 3) * 20 + Math.cos(i / 2) * 10;
      const value = baseValue - i * 2 + variance;
      data.push({ time: time as any, value: Number.isNaN(value) ? baseValue : Math.max(0, value) });
    }
    return data;
  }, [totalBalance]);

  const topCoins = useMemo<PriceRow[]>(() => prices.slice(0, 8), [prices]);
  const movers = useMemo<PriceRow[]>(() => [...prices].sort((a, b) => Math.abs(b.change_24h) - Math.abs(a.change_24h)).slice(0, 5), [prices]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {!isLoggedIn ? (
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] border border-white/10 p-5 sm:p-8 lg:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-emerald-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-52 sm:w-64 h-52 sm:h-64 bg-cyan-500/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2" />

          <h1 className="text-3xl sm:text-5xl font-black text-white mb-3 sm:mb-4 tracking-tighter">B50 Trade Terminal</h1>
          <p className="text-muted-foreground text-sm sm:text-xl mb-6 sm:mb-8 max-w-2xl">
            Institutional-style simulation with live market data, risk-free execution, and performance tracking.
          </p>

          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <div className="flex -space-x-3">
              {prices.slice(0, 4).map((p) => (
                <div key={p.symbol} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-background bg-secondary flex items-center justify-center overflow-hidden">
                  <img src={p.image_url} alt={p.symbol} className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              ))}
            </div>
            <span className="text-emerald-400 text-[11px] sm:text-sm font-black tracking-wider uppercase">{prices.length} assets live</span>
          </div>

          <button
            onClick={() => {
              setShowAuthModal(true);
              setAuthMode('register');
            }}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-primary text-primary-foreground text-sm sm:text-base font-black rounded-xl sm:rounded-2xl hover:scale-105 transition-all flex items-center gap-2 sm:gap-3 shadow-xl shadow-primary/20 uppercase tracking-wider"
          >
            <Zap size={18} fill="currentColor" />
            Initialize Account
          </button>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="glass-premium p-4 sm:p-5 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <Wallet size={18} className="text-emerald-400" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Balance</span>
              </div>
              <p className="text-white font-mono font-black text-lg sm:text-2xl">${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-muted-foreground mt-2">Demo ${demoBalance.toFixed(0)} • Savings ${savingsBalance.toFixed(0)}</p>
            </div>

            <div className="glass-premium p-4 sm:p-5 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <BarChart3 size={18} className="text-cyan-400" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Exposure</span>
              </div>
              <p className="text-white font-mono font-black text-lg sm:text-2xl">${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-emerald-400 mt-2">{positions.length} active positions</p>
            </div>

            <div className="glass-premium p-4 sm:p-5 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between mb-3">
                {totalPnL >= 0 ? <TrendingUp size={18} className="text-emerald-400" /> : <TrendingDown size={18} className="text-rose-400" />}
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">P&L</span>
              </div>
              <p className={`font-mono font-black text-lg sm:text-2xl ${pnlColor}`}>{totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground mt-2">Unrealized {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toFixed(0)}</p>
            </div>

            <div className="glass-premium p-4 sm:p-5 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <ArrowLeftRight size={18} className="text-violet-400" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Orders</span>
              </div>
              <p className="text-white font-mono font-black text-lg sm:text-2xl">{transactions.filter((t) => t.type === 'buy' || t.type === 'sell').length}</p>
              <p className="text-[10px] text-muted-foreground mt-2">Realized {totalRealizedPnL >= 0 ? '+' : ''}${totalRealizedPnL.toFixed(0)}</p>
            </div>
          </section>

          <section className="glass-premium p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-white font-black text-lg sm:text-2xl tracking-tight">Account Performance</h2>
              <div className={`text-xs sm:text-sm font-black ${pnlColor}`}>{totalPnL >= 0 ? '+' : ''}{((totalPnL / (totalBalance || 1)) * 100).toFixed(2)}%</div>
            </div>
            <div className="h-[220px] sm:h-[300px]">
              <PortfolioChart data={portfolioHistory} height={300} />
            </div>
          </section>
        </>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
        <div className="xl:col-span-8 glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-black tracking-tight text-lg sm:text-xl">Markets</h2>
            <button
              onClick={() => setCurrentPage('markets')}
              className="px-3 py-2 rounded-lg bg-white/5 text-primary text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
            >
              View All
            </button>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                  <th className="text-left pb-3">Pair</th>
                  <th className="text-right pb-3">Last Price</th>
                  <th className="text-right pb-3">24h</th>
                  <th className="text-right pb-3">Market Cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topCoins.map((coin) => {
                  const prev = previousPrices.find((p) => p.symbol === coin.symbol);
                  const changed = prev && prev.price !== coin.price;
                  const up = prev ? coin.price > prev.price : false;

                  return (
                    <tr
                      key={coin.symbol}
                      className="cursor-pointer hover:bg-white/[0.03]"
                      onClick={() => {
                        setSelectedCrypto(coin.symbol);
                        setCurrentPage('trade');
                      }}
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-secondary border border-white/10 flex items-center justify-center overflow-hidden">
                            {coin.image_url ? <img src={coin.image_url} alt={coin.symbol} className="w-6 h-6" /> : <span className="text-xs font-bold">{coin.symbol.slice(0, 2)}</span>}
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">{coin.symbol}/USDT</p>
                            <p className="text-muted-foreground text-[10px]">{coin.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`text-right font-mono font-bold ${changed ? (up ? 'text-emerald-400' : 'text-rose-400') : 'text-white'}`}>
                        ${coin.price < 1 ? coin.price.toFixed(4) : coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-right">
                        <span className={`text-xs font-bold ${coin.change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{coin.change_24h >= 0 ? '+' : ''}{coin.change_24h.toFixed(2)}%</span>
                      </td>
                      <td className="text-right text-muted-foreground font-mono text-xs">{formatNum(coin.market_cap, 1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {topCoins.map((coin) => (
              <button
                key={coin.symbol}
                onClick={() => {
                  setSelectedCrypto(coin.symbol);
                  setCurrentPage('trade');
                }}
                className="w-full text-left p-3 rounded-xl bg-white/[0.02] border border-white/5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">{coin.symbol}/USDT</p>
                    <p className="text-muted-foreground text-[10px]">{coin.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-mono text-sm">${coin.price < 1 ? coin.price.toFixed(4) : coin.price.toFixed(2)}</p>
                    <p className={`text-xs font-bold ${coin.change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{coin.change_24h >= 0 ? '+' : ''}{coin.change_24h.toFixed(2)}%</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="xl:col-span-4 space-y-4 sm:space-y-6">
          <div className="bg-[#111738] border border-white/5 rounded-2xl p-4 sm:p-5">
            <h3 className="text-white font-bold mb-3">Top Movers</h3>
            <div className="space-y-2">
              {movers.map((coin) => (
                <button
                  key={coin.symbol}
                  className="w-full flex items-center justify-between hover:bg-white/[0.03] p-2 rounded-lg"
                  onClick={() => {
                    setSelectedCrypto(coin.symbol);
                    setCurrentPage('trade');
                  }}
                >
                  <div className="text-left">
                    <p className="text-sm text-white font-semibold">{coin.symbol}</p>
                    <p className="text-[10px] text-muted-foreground">{coin.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white font-mono">${coin.price < 1 ? coin.price.toFixed(4) : coin.price.toFixed(2)}</p>
                    <p className={`text-xs font-bold ${coin.change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{coin.change_24h >= 0 ? '+' : ''}{coin.change_24h.toFixed(2)}%</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {isLoggedIn && positions.length > 0 && (
            <div className="bg-[#111738] border border-white/5 rounded-2xl p-4 sm:p-5">
              <h3 className="text-white font-semibold mb-3">Open Positions</h3>
              <div className="space-y-2">
                {positions.map((pos) => (
                  <PositionCard key={pos.symbol} symbol={pos.symbol} compact />
                ))}
              </div>
            </div>
          )}

          {!isLoggedIn && (
            <div className="bg-[#111738] border border-white/5 rounded-2xl p-4 sm:p-5">
              <h3 className="text-white font-semibold mb-2">Start Trading</h3>
              <p className="text-xs text-muted-foreground mb-4">Create your account to unlock live trading simulator access.</p>
              <button
                onClick={() => {
                  setShowAuthModal(true);
                  setAuthMode('register');
                }}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest"
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </section>

      {!isLoggedIn && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 sm:p-6 rounded-2xl bg-[#111738] border border-white/5 text-center">
            <div className="w-11 h-11 mx-auto mb-3 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Wallet size={20} className="text-emerald-400" />
            </div>
            <h3 className="text-white font-medium mb-1">$500 Demo Balance</h3>
            <p className="text-gray-500 text-xs">Practice with virtual capital and no risk.</p>
          </div>
          <div className="p-4 sm:p-6 rounded-2xl bg-[#111738] border border-white/5 text-center">
            <div className="w-11 h-11 mx-auto mb-3 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Activity size={20} className="text-violet-400" />
            </div>
            <h3 className="text-white font-medium mb-1">Live Market Feed</h3>
            <p className="text-gray-500 text-xs">Real-time prices and market momentum.</p>
          </div>
          <div className="p-4 sm:p-6 rounded-2xl bg-[#111738] border border-white/5 text-center">
            <div className="w-11 h-11 mx-auto mb-3 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <BarChart3 size={20} className="text-cyan-400" />
            </div>
            <h3 className="text-white font-medium mb-1">P&L Tracking</h3>
            <p className="text-gray-500 text-xs">Monitor performance in real-time.</p>
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
