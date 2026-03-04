import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Search, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';

type SortKey = 'market_cap' | 'price' | 'change_24h' | 'volume_24h';

const Markets: React.FC = () => {
  const { prices, previousPrices, setSelectedCrypto, setCurrentPage, isLoggedIn, setShowAuthModal, setAuthMode } = useAppContext();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('market_cap');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let list = prices.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.symbol.toLowerCase().includes(search.toLowerCase())
    );
    list.sort((a, b) => {
      const av = a[sortBy] || 0;
      const bv = b[sortBy] || 0;
      return sortAsc ? av - bv : bv - av;
    });
    return list;
  }, [prices, search, sortBy, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
  };

  const handleTradeClick = (symbol: string) => {
    if (!isLoggedIn) { setShowAuthModal(true); setAuthMode('register'); return; }
    setSelectedCrypto(symbol);
    setCurrentPage('trade');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white glow-text-emerald">Markets</h1>
          <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mt-1">Global Liquidity Pool • {prices.length} Active Pairs</p>
        </div>
        <div className="relative w-full sm:w-80 group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search assets (BTC, ETH, etc)..."
            className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-white font-bold placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm group-hover:bg-white/[0.05]"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {(() => {
          const gainers = [...prices].filter(p => p.change_24h > 0).length;
          const losers = prices.length - gainers;
          const totalMcap = prices.reduce((s, p) => s + (p.market_cap || 0), 0);
          const totalVol = prices.reduce((s, p) => s + (p.volume_24h || 0), 0);
          return (
            <>
              <div className="glass-premium p-6 rounded-3xl border-white/5 group hover:glow-border-emerald transition-all">
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-2 font-mono">Total Traded Assets</p>
                <p className="text-white text-3xl font-black mt-1 tracking-tighter">{prices.length}</p>
                <div className="h-0.5 w-full bg-white/5 mt-4" />
              </div>
              <div className="glass-premium p-6 rounded-3xl border-white/5 group hover:glow-border-emerald transition-all">
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-2 font-mono">Market Polarity</p>
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-emerald-400 text-3xl font-black tracking-tighter">{gainers}</span>
                  <span className="text-muted-foreground text-xs font-black uppercase mb-1">Up</span>
                  <span className="text-rose-400 text-3xl font-black tracking-tighter ml-2">{losers}</span>
                  <span className="text-muted-foreground text-xs font-black uppercase mb-1">Down</span>
                </div>
                <div className="h-0.5 w-full bg-white/5 mt-4" />
              </div>
              <div className="glass-premium p-6 rounded-3xl border-white/5 group hover:glow-border-emerald transition-all">
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-2 font-mono">Dominator Cap</p>
                <p className="text-white text-3xl font-black mt-1 tracking-tighter">${(totalMcap / 1e12).toFixed(2)}T</p>
                <div className="h-0.5 w-full bg-white/5 mt-4" />
              </div>
              <div className="glass-premium p-6 rounded-3xl border-white/5 group hover:glow-border-emerald transition-all">
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-2 font-mono">24H Volume Flux</p>
                <p className="text-white text-3xl font-black mt-1 tracking-tighter">${(totalVol / 1e9).toFixed(1)}B</p>
                <div className="h-0.5 w-full bg-white/5 mt-4" />
              </div>
            </>
          );
        })()}
      </div>

      {/* Table */}
      <div className="glass-premium border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                <th className="text-left py-6 px-6">ID</th>
                <th className="text-left py-6 px-6">ASSET</th>
                <th className="text-right py-6 px-6 cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort('price')}>
                  <span className="inline-flex items-center gap-2">VALUATION <ArrowUpDown size={14} /></span>
                </th>
                <th className="text-right py-6 px-6 cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort('change_24h')}>
                  <span className="inline-flex items-center gap-2">PERFORMANCE <ArrowUpDown size={14} /></span>
                </th>
                <th className="text-right py-6 px-6 cursor-pointer select-none hover:text-white transition-colors hidden md:table-cell" onClick={() => toggleSort('volume_24h')}>
                  <span className="inline-flex items-center gap-2">LIQUIDITY <ArrowUpDown size={14} /></span>
                </th>
                <th className="text-right py-6 px-6 cursor-pointer select-none hover:text-white transition-colors hidden lg:table-cell" onClick={() => toggleSort('market_cap')}>
                  <span className="inline-flex items-center gap-2">MARKET CAP <ArrowUpDown size={14} /></span>
                </th>
                <th className="text-right py-6 px-6">EXECUTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.map((coin, idx) => {
                const prev = previousPrices.find(p => p.symbol === coin.symbol);
                const changed = prev && prev.price !== coin.price;
                const up = prev ? coin.price > prev.price : false;
                return (
                  <tr key={coin.symbol} className="group hover:bg-white/[0.03] transition-colors">
                    <td className="py-6 px-6 text-muted-foreground font-mono font-bold">{idx + 1}</td>
                    <td className="py-6 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform overflow-hidden shadow-lg">
                          {coin.image_url ? <img src={coin.image_url} alt={coin.symbol} className="w-8 h-8" /> :
                            <span className="text-xs font-black text-white">{coin.symbol.slice(0, 2)}</span>}
                        </div>
                        <div>
                          <p className="text-white font-black tracking-tight text-base">{coin.name}</p>
                          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">{coin.symbol} <span className="opacity-40">/ USDT</span></p>
                        </div>
                      </div>
                    </td>
                    <td className={`py-6 px-6 text-right font-mono font-black text-lg transition-all duration-700 ${changed ? (up ? 'text-emerald-400 glow-text-emerald' : 'text-rose-400') : 'text-white'}`}>
                      ${coin.price < 1 ? coin.price.toFixed(4) : coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-6 px-6 text-right">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black tracking-tight border ${coin.change_24h >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/5' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-lg shadow-rose-500/5'}`}>
                        {coin.change_24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {coin.change_24h >= 0 ? '+' : ''}{coin.change_24h.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-6 px-6 text-right text-muted-foreground font-mono font-bold hidden md:table-cell">
                      ${coin.volume_24h >= 1e9 ? `${(coin.volume_24h / 1e9).toFixed(2)}B` : `${(coin.volume_24h / 1e6).toFixed(1)}M`}
                    </td>
                    <td className="py-6 px-6 text-right text-muted-foreground font-mono font-bold hidden lg:table-cell">
                      ${coin.market_cap >= 1e12 ? `${(coin.market_cap / 1e12).toFixed(2)}T` : `${(coin.market_cap / 1e9).toFixed(1)}B`}
                    </td>
                    <td className="py-6 px-6 text-right">
                      <button onClick={() => handleTradeClick(coin.symbol)}
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20">
                        Institutional Order
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Markets;
