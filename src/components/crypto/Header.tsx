import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Bell, Search, Menu, User, TrendingUp, TrendingDown, DollarSign, Wallet as WalletIcon, LogIn, Info, CheckCircle, AlertCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Header: React.FC = () => {
  const {
    toggleSidebar, user, isLoggedIn, prices, previousPrices, demoBalance, totalPnL,
    setShowAuthModal, setAuthMode, notifications, markNotificationsAsRead
  } = useAppContext();

  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const [scrollDir, setScrollDir] = useState<number>(0);
  useEffect(() => {
    let lastScroll = 0;
    const handleScroll = () => {
      const currentScroll = window.pageYOffset;
      if (currentScroll > 50) setScrollDir(1);
      else setScrollDir(0);
      lastScroll = currentScroll;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const topMovers = [...prices].sort((a, b) => Math.abs(b.change_24h) - Math.abs(a.change_24h)).slice(0, 5);

  return (
    <header className={`sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 h-20 border-b transition-all duration-500
      ${scrollDir > 0 ? 'bg-background/80 backdrop-blur-xl border-white/10 shadow-2xl shadow-black/50' : 'bg-transparent border-white/5'}`}>

      <div className="flex items-center gap-4 flex-1">
        <button onClick={toggleSidebar} className="text-gray-400 hover:text-white lg:hidden">
          <Menu size={24} />
        </button>

        {/* Ticker - Desktop Only */}
        <div className="hidden xl:flex items-center gap-8 overflow-hidden max-w-4xl">
          {topMovers.map(coin => {
            const prev = previousPrices.find(p => p.symbol === coin.symbol);
            const priceFlash = prev && prev.price !== coin.price;
            const priceUp = prev ? coin.price > prev.price : false;
            return (
              <div key={coin.symbol} className="flex items-center gap-3 whitespace-nowrap group cursor-crosshair">
                <span className="text-muted-foreground font-black text-[10px] uppercase tracking-widest group-hover:text-primary transition-colors">{coin.symbol}</span>
                <span className={`text-sm font-mono font-black transition-all duration-700 ${priceFlash ? (priceUp ? 'text-emerald-400 glow-text-emerald' : 'text-rose-400') : 'text-white'}`}>
                  ${coin.price < 1 ? coin.price.toFixed(4) : coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className={`flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black ${coin.change_24h >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {coin.change_24h >= 0 ? '▲' : '▼'} {Math.abs(coin.change_24h).toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-5">
        {isLoggedIn ? (
          <>
            {/* Demo Balance & P&L */}
            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                <WalletIcon size={12} className="text-emerald-400" />
                <span>${demoBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className={`text-[10px] font-mono flex items-center gap-1 ${totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                <span className="text-gray-600">(Total P&L)</span>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) markNotificationsAsRead();
                }}
                className={`text-muted-foreground hover:text-white relative p-2.5 rounded-2xl hover:bg-white/5 transition-all
                  ${showNotifications ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : ''}`}
              >
                <Bell size={20} className={showNotifications ? 'animate-bounce' : ''} />
                {unreadCount > 0 && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-primary text-primary-foreground text-[8px] font-black rounded-full border-2 border-background flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </div>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-4 w-96 glass-premium border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                      <div>
                        <h3 className="text-white font-black text-lg tracking-tight">Signal Feed</h3>
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-0.5">Real-time system updates</p>
                      </div>
                      <button
                        onClick={() => {
                          // In a real app, this would call a backend clear
                          // We can just simulate it or if Context supports it
                          markNotificationsAsRead();
                        }}
                        className="p-2 hover:bg-white/5 rounded-xl text-muted-foreground hover:text-rose-400 transition-all"
                        title="Clear signals"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-12 text-center">
                          <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                            <Bell size={24} className="text-muted-foreground/20" />
                          </div>
                          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-40">Zero Signals Detected</p>
                        </div>
                      ) : (
                        notifications.map((notif: any) => (
                          <div key={notif.id} className={`p-5 border-b border-white/5 hover:bg-white/[0.03] transition-colors group ${!notif.read ? 'bg-primary/5' : ''}`}>
                            <div className="flex gap-4">
                              <div className={`mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 shadow-inner
                                ${notif.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                                  notif.type === 'error' ? 'bg-rose-500/10 text-rose-400' :
                                    notif.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-400'}`}>
                                {notif.type === 'success' ? <CheckCircle size={18} /> :
                                  notif.type === 'error' ? <XCircle size={18} /> :
                                    notif.type === 'warning' ? <AlertCircle size={18} /> : <Info size={18} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-white mb-1 group-hover:text-primary transition-colors">{notif.title}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed font-medium">{notif.message}</p>
                                <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground/40 font-bold uppercase tracking-tighter font-mono">
                                  <Clock size={12} />
                                  <span>{formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-4 bg-white/[0.02] text-center border-t border-white/5">
                        <button className="text-primary text-[10px] font-black uppercase tracking-[0.2em] hover:tracking-[0.3em] transition-all">Archive Protocol</button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="h-8 w-px bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-4 group cursor-pointer pl-1 py-1 pr-4 rounded-2xl hover:bg-white/5 transition-all ring-1 ring-white/5 hover:ring-white/10">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-sm font-black text-white shadow-lg overflow-hidden border border-white/10 group-hover:scale-105 transition-transform">
                {user?.username?.[0].toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-white text-xs font-black tracking-tight leading-none group-hover:text-primary transition-colors">{user?.username}</p>
                <p className="text-muted-foreground text-[8px] uppercase font-black tracking-[0.2em] mt-1.5">{user?.role} PROTOCOL</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Log In
            </button>
            <button
              onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
              className="px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
