import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { DollarSign, CreditCard, CheckCircle, Clock, ArrowLeft, Zap, Shield, X } from 'lucide-react';

const DepositPage: React.FC = () => {
  const { user, initializePayment, verifyPayment, payments, demoBalance } = useAppContext();
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState<'paystack' | 'flutterwave'>('paystack');
  const [loading, setLoading] = useState(false);
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const presetAmounts = [500, 1000, 2000, 5000, 10000, 20000];

  const handleDeposit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 100) return;
    setLoading(true);
    try {
      const result = await initializePayment(amt, provider);
      if (!result) { setLoading(false); return; }

      if (result.demo_mode) {
        // Demo mode: auto-verify
        setPendingRef(result.reference);
        const ok = await verifyPayment(result.reference);
        if (ok) setShowSuccess(true);
      } else if (result.authorization_url) {
        // Redirect to payment page
        setPendingRef(result.reference);
        window.open(result.authorization_url, '_blank');
      }
    } catch (err) {
      console.error('Deposit error:', err);
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!pendingRef) return;
    setLoading(true);
    const ok = await verifyPayment(pendingRef);
    if (ok) { setShowSuccess(true); setPendingRef(null); }
    setLoading(false);
  };

  if (showSuccess) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-[#111738] border border-white/5 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Deposit Successful!</h2>
          <p className="text-gray-400 mb-4">Your funds have been added to your trading balance.</p>
          <p className="text-3xl font-bold text-emerald-400 font-mono mb-6">₦{parseFloat(amount).toLocaleString()}</p>
          <p className="text-gray-500 text-sm mb-6">New Balance: <span className="text-white font-mono">${demoBalance.toFixed(2)}</span></p>
          <button onClick={() => { setShowSuccess(false); setAmount(''); setPendingRef(null); }}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all">
            Make Another Deposit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Deposit Funds</h1>
        <p className="text-gray-400 text-sm mt-1">Add money to your trading balance via Paystack or Flutterwave</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deposit Form */}
        <div className="lg:col-span-2 bg-[#111738] border border-white/5 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-6 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-400" />
            Deposit Amount
          </h2>

          {/* Amount Input */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Amount (₦ Naira)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">₦</span>
              <input
                type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" min="100"
                className="w-full pl-10 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-2xl placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
            <p className="text-gray-600 text-xs mt-1">Minimum deposit: ₦100</p>
          </div>

          {/* Preset Amounts */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
            {presetAmounts.map(a => (
              <button key={a} onClick={() => setAmount(a.toString())}
                className={`py-3 rounded-xl text-sm font-medium transition-all ${parseFloat(amount) === a ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'}`}>
                ₦{a.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-3">Payment Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setProvider('paystack')}
                className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${provider === 'paystack' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`}>
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <CreditCard size={20} className="text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium text-sm">Paystack</p>
                  <p className="text-gray-500 text-xs">Card, Transfer, USSD</p>
                </div>
                {provider === 'paystack' && <CheckCircle size={16} className="text-emerald-400 ml-auto" />}
              </button>
              <button onClick={() => setProvider('flutterwave')}
                className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${provider === 'flutterwave' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`}>
                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <Zap size={20} className="text-orange-400" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium text-sm">Flutterwave</p>
                  <p className="text-gray-500 text-xs">Card, Bank, Mobile Money</p>
                </div>
                {provider === 'flutterwave' && <CheckCircle size={16} className="text-emerald-400 ml-auto" />}
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 mb-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Amount</span>
                <span className="text-white font-mono">₦{(parseFloat(amount) || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Processing Fee</span>
                <span className="text-emerald-400 font-mono">₦0.00</span>
              </div>
              <div className="border-t border-white/5 pt-2 flex justify-between text-sm">
                <span className="text-gray-400 font-medium">Total</span>
                <span className="text-white font-mono font-bold">₦{(parseFloat(amount) || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button onClick={handleDeposit}
            disabled={loading || !amount || parseFloat(amount) < 100}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-lg rounded-xl hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
            ) : (
              <><CreditCard size={20} /> Deposit ₦{(parseFloat(amount) || 0).toLocaleString()}</>
            )}
          </button>

          {/* Pending Verification */}
          {pendingRef && (
            <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-amber-400" />
                <p className="text-amber-400 font-medium text-sm">Payment Pending</p>
              </div>
              <p className="text-gray-400 text-xs mb-3">Complete the payment in the popup window, then click verify below.</p>
              <button onClick={handleVerify} disabled={loading}
                className="w-full py-2.5 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-all disabled:opacity-50">
                {loading ? 'Verifying...' : 'I\'ve Paid — Verify Now'}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Current Balance */}
          <div className="bg-[#111738] border border-white/5 rounded-2xl p-5">
            <p className="text-gray-400 text-sm mb-2">Current Balance</p>
            <p className="text-3xl font-bold text-white font-mono">${demoBalance.toFixed(2)}</p>
          </div>

          {/* Security info */}
          <div className="bg-[#111738] border border-white/5 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Shield size={16} className="text-emerald-400" />
              Payment Security
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-gray-400 text-xs">SSL encrypted transactions</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-gray-400 text-xs">PCI DSS compliant payment gateway</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-gray-400 text-xs">Instant balance credit on verification</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-gray-400 text-xs">No card details stored on our servers</p>
              </div>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-[#111738] border border-white/5 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">Recent Deposits</h3>
            {payments.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-4">No deposits yet</p>
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                    <div>
                      <p className="text-white text-sm font-mono">₦{p.amount.toLocaleString()}</p>
                      <p className="text-gray-600 text-[10px]">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${p.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : p.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositPage;
