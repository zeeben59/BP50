import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import Sidebar from '@/components/crypto/Sidebar';
import Header from '@/components/crypto/Header';
import AuthModal from '@/components/crypto/AuthModal';
import Dashboard from '@/components/crypto/Dashboard';
import Markets from '@/components/crypto/Markets';
import Trading from '@/components/crypto/Trading';
import WalletPage from '@/components/crypto/WalletPage';
import History from '@/components/crypto/History';
import Withdraw from '@/components/crypto/Withdraw';
import ReportUser from '@/components/crypto/ReportUser';
import DepositPage from '@/components/crypto/DepositPage';
import { AlertTriangle, Lock, LogOut, Activity } from 'lucide-react';

const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const {
    sidebarOpen, currentPage, isLoggedIn, isAdmin, isMaintenanceMode, logout,
    reportingTargetId, setReportingTargetId, reportingRelatedEntityId
  } = useAppContext();
  const isMobile = useIsMobile();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'markets': return <Markets />;
      case 'trade': return isLoggedIn ? <Trading /> : <Dashboard />;
      case 'wallet': return isLoggedIn ? <WalletPage /> : <Dashboard />;
      case 'deposit': return isLoggedIn ? <DepositPage /> : <Dashboard />;
      case 'history': return isLoggedIn ? <History /> : <Dashboard />;
      case 'withdraw': return isLoggedIn ? <Withdraw /> : <Dashboard />;
      case 'report': return isLoggedIn ? (
        <ReportUser
          propTargetUserId={reportingTargetId || undefined}
          relatedEntityId={reportingRelatedEntityId || undefined}
        />
      ) : <Dashboard />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-white selection:bg-emerald-500/30">
      <Sidebar />
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <Header />
        <main className="p-4 lg:p-6 min-h-[calc(100vh-4rem)]">
          {isMaintenanceMode && !isAdmin ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <AlertTriangle size={40} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">System Under Maintenance</h2>
                <p className="text-gray-400 max-w-md mx-auto">
                  We are currently performing scheduled upgrades to improve your trading experience.
                  The platform will be back online shortly. Thank you for your patience.
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all font-medium flex items-center gap-2"
                >
                  <Activity size={16} />
                  Refresh Page
                </button>
                <button
                  onClick={logout}
                  className="px-6 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all font-medium flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          ) : (
            children || renderPage()
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 px-8 py-12 bg-card/30">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 rotate-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="text-white font-black text-xl tracking-tighter">B50 <span className="text-emerald-400">Trade</span></span>
              </div>
              <p className="text-muted-foreground text-xs font-medium leading-relaxed max-w-xs">
                Empowering the next generation of institutional traders through risk-free simulation and market analysis tools.
              </p>
            </div>
            <div>
              <h4 className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-6">Simulation Engine</h4>
              <ul className="space-y-3 text-muted-foreground text-[11px] font-bold uppercase tracking-widest">
                <li className="hover:text-primary cursor-pointer transition-colors">Neural Order Matcher</li>
                <li className="hover:text-primary cursor-pointer transition-colors">Dark Pool Liquidity</li>
                <li className="hover:text-primary cursor-pointer transition-colors">Quantum Rebalancing</li>
                <li className="hover:text-primary cursor-pointer transition-colors">Sub-ms Execution</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-6">Security Layer</h4>
              <ul className="space-y-3 text-muted-foreground text-[11px] font-bold uppercase tracking-widest">
                <li className="hover:text-primary cursor-pointer transition-colors">Cold Storage Forge</li>
                <li className="hover:text-primary cursor-pointer transition-colors">Zero-Knowledge Proofs</li>
                <li className="hover:text-primary cursor-pointer transition-colors">Sentinel AI Guard</li>
                <li className="hover:text-primary cursor-pointer transition-colors">Multi-Sig Approval</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-6">Connect</h4>
              <ul className="space-y-3 text-muted-foreground text-[11px] font-bold uppercase tracking-widest">
                <li className="hover:text-primary cursor-pointer transition-colors">Institutional API</li>
                <li className="hover:text-primary cursor-pointer transition-colors">Terminal Support</li>
                <li className="hover:text-primary cursor-pointer transition-colors">Privacy Charter</li>
                <li className="hover:text-primary cursor-pointer transition-colors">Strategic Ops</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground/30 text-[10px] font-bold uppercase tracking-widest">© 2026 B50 Trade Strategic Group • All Rights Reserved</p>
            <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Oracle Stream Active</span>
            </div>
          </div>
        </footer>
      </div>

      <AuthModal />
    </div>
  );
};

export default AppLayout;
