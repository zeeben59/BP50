import React from 'react';
import { useAppContext, Page } from '@/contexts/AppContext';
import { LayoutDashboard, TrendingUp, ArrowLeftRight, Wallet, Clock, ArrowDownToLine, Flag, Shield, LogOut, X, ChevronLeft, DollarSign } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems: { page: Page; label: string; icon: React.ReactNode; requiresAuth?: boolean }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { page: 'markets', label: 'Markets', icon: <TrendingUp size={20} /> },
  { page: 'trade', label: 'Trade', icon: <ArrowLeftRight size={20} />, requiresAuth: true },
  { page: 'wallet', label: 'Wallet', icon: <Wallet size={20} />, requiresAuth: true },
  { page: 'deposit', label: 'Deposit', icon: <DollarSign size={20} />, requiresAuth: true },
  { page: 'history', label: 'History', icon: <Clock size={20} />, requiresAuth: true },
  { page: 'withdraw', label: 'Withdraw', icon: <ArrowDownToLine size={20} />, requiresAuth: true },
  { page: 'report', label: 'Report User', icon: <Flag size={20} />, requiresAuth: true },
];

const Sidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar, currentPage, setCurrentPage, isLoggedIn, isAdmin, logout, setShowAuthModal, setAuthMode } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.requiresAuth && !isLoggedIn) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }

    if (location.pathname !== '/') {
      navigate('/');
    }
    setCurrentPage(item.page);

    if (window.innerWidth < 1024) toggleSidebar();
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={toggleSidebar} />
      )}
      <aside className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-in-out flex flex-col glass-premium
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-20 lg:translate-x-0'}
        bg-card border-r border-white/5 shadow-2xl shadow-black/50`}>

        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-xl shadow-emerald-500/20 rotate-3 border border-white/20 group cursor-pointer transition-transform hover:scale-105 active:scale-95">
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 8H22C26.4183 8 30 11.5817 30 16C30 18.2091 29.1046 20.2091 27.6569 21.6569C29.1046 23.1046 30 25.1046 30 27.3333C30 31.5675 26.5675 35 22.3333 35H10V8Z" fill="white" />
                <path d="M15 13H20C21.6569 13 23 14.3431 23 16C23 17.6569 21.6569 19 20 19H15V13Z" fill="url(#logo-grad)" />
                <path d="M15 24H22C23.6569 24 25 25.3431 25 27C25 28.6569 23.6569 30 22 30H15V24Z" fill="url(#logo-grad)" />
                <defs>
                  <linearGradient id="logo-grad" x1="10" y1="8" x2="30" y2="35" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#10b981" />
                    <stop offset="1" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="text-white font-black text-2xl tracking-tighter leading-none">B50 <span className="text-emerald-400">Trade</span></span>
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-0.5 opacity-50">Global Terminal</span>
              </div>
            )}
          </div>
          <button onClick={toggleSidebar} className="text-muted-foreground hover:text-white lg:hidden transition-colors">
            <X size={20} />
          </button>
          <button onClick={toggleSidebar} className="text-gray-400 hover:text-white hidden lg:block">
            <ChevronLeft size={18} className={`transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-black uppercase tracking-tight transition-all duration-300 group
                  ${isActive
                    ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20 glow-border-emerald scale-[1.02]'
                    : 'text-muted-foreground hover:text-white hover:bg-white/5 active:scale-95'
                  }
                  ${!sidebarOpen ? 'lg:justify-center lg:px-2' : ''}
                `}
                title={item.label}
              >
                <span className={isActive ? 'text-emerald-400' : ''}>{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
                {item.requiresAuth && !isLoggedIn && sidebarOpen && (
                  <svg className="ml-auto w-3.5 h-3.5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-white/5">
          {isLoggedIn ? (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to log out?')) {
                  logout();
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all
                ${!sidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}
            >
              <LogOut size={20} />
              {sidebarOpen && <span>Logout</span>}
            </button>
          ) : (
            <button
              onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:opacity-90 transition-all
                ${!sidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              {sidebarOpen && <span>Sign In</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
