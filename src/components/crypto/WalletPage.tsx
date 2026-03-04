import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Wallet, Shield, DollarSign, ArrowDownToLine, ArrowUpRight, TrendingUp, Lock, CreditCard, X, RefreshCw, Activity } from 'lucide-react';

const WalletPage: React.FC = () => {
  const { 
    demoBalance, savingsBalance, cryptoBalances, portfolioValue, prices,
    totalPnL, totalRealizedPnL, totalUnrealizedPnL, depositSavings, resetAccount, user 
  } = useAppContext();
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleDeposit = () => {
    const amt = parseFloat(depositAmount);
    if (amt > 0) {
      depositSavings(amt);
      setDepositAmount('');
      setShowDeposit(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset your account? This will clear all positions and transactions, and reset your balance to $500.')) {
      setResetLoading(true);
      await resetAccount();
      setResetLoading(false);
    }
  };

  const pnlColor = totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallet</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your funds and track your performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleReset}
            disabled={resetLoading}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-sm font-medium hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <RefreshCw size={16} className={resetLoading ? 'animate-spin' : ''} />
            Reset Account
          </button>
          <button 
            onClick={() => setShowDeposit(true)}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
          >
            <DollarSign size={18} /> Deposit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Cards */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#111738] to-[#0f1629] border border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Wallet size={20} className="text-emerald-400" />
                </div>
                <span className="text-gray-400">Demo Trading Balance</span>
              </div>
              <p className="text-3xl font-bold text-white font-mono">${demoBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <Lock size={12} />
                <span>Available for active trading</span>
              </div>
            </div>
            
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#111738] to-[#0f1629] border border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <Shield size={20} className="text-cyan-400" />
                </div>
                <span className="text-gray-400">Savings Account</span>
              </div>
              <p className="text-3xl font-bold text-white font-mono">${savingsBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400/80">
                <TrendingUp size={12} />
                <span>Earn up to 12% APY (simulated)</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#111738] border border-white/5">
            <h2 className="text-white font-semibold mb-6 flex items-center gap-2">
              <Activity size={18} className="text-violet-400" />
              Performance Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="text-gray-500 text-xs mb-1">Portfolio Value</p>
                <p className="text-white font-bold font-mono">${portfolioValue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Total P&L</p>
                <p className={`font-bold font-mono ${pnlColor}`}>{totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Realized P&L</p>
                <p className={`font-bold font-mono ${totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {totalRealizedPnL >= 0 ? '+' : ''}${totalRealizedPnL.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Unrealized P&L</p>
                <p className={`font-bold font-mono ${totalUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Asset Allocation */}
          <div className="p-6 rounded-2xl bg-[#111738] border border-white/5">
            <h2 className="text-white font-semibold mb-6">Asset Allocation</h2>
            {cryptoBalances.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500 text-sm">No assets yet. Start trading to see your allocation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cryptoBalances.map(bal => {
                  const mkt = portfolioValue > 0 ? (bal.amount * (prices.find(p => p.symbol === bal.symbol)?.price || 0) / portfolioValue) * 100 : 0;
                  return (
                    <div key={bal.symbol} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{bal.symbol}</span>
                          <span className="text-gray-500 text-xs">{bal.amount.toFixed(6)}</span>
                        </div>
                        <span className="text-gray-400">{mkt.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${mkt}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#111738] border border-white/5">
            <h2 className="text-white font-semibold mb-4">Security Center</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                <div className="text-emerald-400"><Shield size={20} /></div>
                <div>
                  <p className="text-white text-sm font-medium">BVC Shield Active</p>
                  <p className="text-gray-500 text-[10px]">Accounts protected by BVC protocol</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                <div className="text-cyan-400"><Lock size={20} /></div>
                <div>
                  <p className="text-white text-sm font-medium">No Card Storage</p>
                  <p className="text-gray-500 text-[10px]">Your financial data stays with you</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                <div className="text-violet-400"><CreditCard size={20} /></div>
                <div>
                  <p className="text-white text-sm font-medium">Anti-Scam System</p>
                  <p className="text-gray-500 text-[10px]">Automated fraud detection enabled</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-transparent border border-white/5 overflow-hidden relative">
            <div className="relative z-10">
              <h2 className="text-white font-semibold mb-2">Want to trade for real?</h2>
              <p className="text-gray-400 text-xs mb-4">You've made {totalPnL >= 0 ? 'simulated profits' : 'great progress'}! Upgrade to a live account and start trading real assets.</p>
              <button className="w-full py-2 bg-white text-indigo-900 font-bold rounded-xl text-xs hover:bg-white/90 transition-all">
                Upgrade to Pro
              </button>
            </div>
            <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4">
              <TrendingUp size={100} className="text-white/5" />
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111738] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Deposit Funds</h3>
              <button onClick={() => setShowDeposit(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Amount to Deposit (USD)</label>
                <div className="relative">
                  <input 
                    type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                    placeholder="0.00" autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                  />
                  <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-emerald-400 text-xs leading-relaxed">
                  Note: This is a demo deposit. The amount will be added to your savings wallet instantly. 
                </p>
              </div>
              <button 
                onClick={handleDeposit}
                className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all"
              >
                Confirm Deposit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPage;
