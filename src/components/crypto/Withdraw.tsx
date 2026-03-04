import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { ArrowDownToLine, Shield, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';

const Withdraw: React.FC = () => {
  const { savingsBalance, submitWithdrawal, withdrawalRequests } = useAppContext();
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!bankName || !accountNumber || !accountName || amt <= 0) return;
    const success = submitWithdrawal(bankName, accountNumber, accountName, amt);
    if (success) {
      setBankName('');
      setAccountNumber('');
      setAccountName('');
      setAmount('');
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} className="text-amber-400" />;
      case 'approved': return <CheckCircle size={16} className="text-emerald-400" />;
      case 'rejected': return <XCircle size={16} className="text-rose-400" />;
      case 'paid': return <CheckCircle size={16} className="text-cyan-400" />;
      default: return null;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-400';
      case 'approved': return 'bg-emerald-500/10 text-emerald-400';
      case 'rejected': return 'bg-rose-500/10 text-rose-400';
      case 'paid': return 'bg-cyan-500/10 text-cyan-400';
      default: return 'bg-white/5 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Withdraw Funds</h1>
        <p className="text-gray-400 text-sm mt-1">Request a withdrawal from your savings wallet</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Withdrawal Form */}
        <div className="bg-[#111738] border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">New Withdrawal Request</h2>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-5 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-400 text-xs font-medium">Important Notice</p>
              <p className="text-amber-400/70 text-xs mt-0.5">Withdrawals are processed manually by admin. Processing may take 1-3 business days.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.03] mb-5">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Available Balance</span>
              <span className="text-white font-mono font-bold text-lg">${savingsBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Bank Name</label>
              <select
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-all text-sm appearance-none"
                required
              >
                <option value="" className="bg-[#111738]">Select your bank</option>
                <option value="GTBank" className="bg-[#111738]">GTBank</option>
                <option value="Access Bank" className="bg-[#111738]">Access Bank</option>
                <option value="First Bank" className="bg-[#111738]">First Bank</option>
                <option value="UBA" className="bg-[#111738]">UBA</option>
                <option value="Zenith Bank" className="bg-[#111738]">Zenith Bank</option>
                <option value="Sterling Bank" className="bg-[#111738]">Sterling Bank</option>
                <option value="Wema Bank" className="bg-[#111738]">Wema Bank</option>
                <option value="Kuda Bank" className="bg-[#111738]">Kuda Bank</option>
                <option value="OPay" className="bg-[#111738]">OPay</option>
                <option value="Moniepoint" className="bg-[#111738]">Moniepoint</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Account Number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10-digit account number"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                required
                pattern="\d{10}"
                maxLength={10}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Account Name</label>
              <input
                type="text"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                placeholder="Enter account holder name"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Amount (USD)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                min="1"
                max={savingsBalance}
                step="0.01"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={savingsBalance <= 0 || !bankName || !accountNumber || !accountName || !amount || parseFloat(amount) > savingsBalance}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ArrowDownToLine size={18} />
              Submit Withdrawal Request
            </button>
          </form>

          <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-emerald-400" />
              <p className="text-gray-500 text-xs">Bank details are encrypted. No BVN or card information stored.</p>
            </div>
          </div>
        </div>

        {/* Request History */}
        <div className="bg-[#111738] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white">Your Requests</h2>
          </div>
          {withdrawalRequests.length > 0 ? (
            <div className="divide-y divide-white/5">
              {withdrawalRequests.map(wr => (
                <div key={wr.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-mono font-semibold">${wr.amount.toFixed(2)}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize flex items-center gap-1 ${statusColor(wr.status)}`}>
                      {statusIcon(wr.status)}
                      {wr.status}
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs space-y-0.5">
                    <p>{wr.bank_name} - {wr.account_number.slice(0, 3)}****{wr.account_number.slice(-3)}</p>
                    <p>{wr.account_name}</p>
                    <p>{new Date(wr.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <ArrowDownToLine size={28} className="text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium">No withdrawal requests</p>
              <p className="text-gray-600 text-sm mt-1">Submit a request to withdraw from your savings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Withdraw;
