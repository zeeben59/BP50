import React, { useState } from 'react';
import { useAdminFinancialOverview, useAdminFinancialLedger, useAdminWithdrawals, useAdminMutations } from '@/hooks/useAdmin';
import { DollarSign, Lock, PiggyBank, AlertTriangle, Clock, Loader2, TrendingUp, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const FinancialOversight: React.FC = () => {
  const { data: overview, isLoading: overviewLoading } = useAdminFinancialOverview();
  const [ledgerPage, setLedgerPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const { data: ledger, isLoading: ledgerLoading } = useAdminFinancialLedger(ledgerPage, typeFilter);
  const { data: withdrawals } = useAdminWithdrawals();
  const { processWithdrawal } = useAdminMutations();

  if (overviewLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>;
  }

  const cards = [
    { label: 'Total Available', value: overview?.totalAvailable ?? 0, icon: DollarSign, color: 'emerald' },
    { label: 'Frozen Funds', value: overview?.totalFrozen ?? 0, icon: Lock, color: 'blue' },
    { label: 'Savings', value: overview?.totalSavings ?? 0, icon: PiggyBank, color: 'purple' },
    { label: 'Total Liabilities', value: overview?.totalLiabilities ?? 0, icon: TrendingUp, color: 'orange' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-emerald-500" />
          Financial Oversight
        </h2>
        <p className="text-slate-400 text-sm mt-1">Platform liabilities, withdrawal queue, and immutable transaction ledger.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`w-4 h-4 text-${c.color}-400`} />
              <span className="text-sm text-slate-400">{c.label}</span>
            </div>
            <p className={`text-2xl font-bold text-${c.color}-400`}>
              ${c.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      {/* Pending Withdrawals */}
      {(overview?.pendingWithdrawals ?? 0) > 0 && (
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-bold text-orange-400">
              Pending Withdrawals ({overview?.pendingWithdrawals})
            </h3>
            <span className="text-sm text-orange-400/60 ml-auto">
              Total: ${(overview?.pendingAmount ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="space-y-2">
            {(withdrawals?.data || []).filter((w: any) => w.status === 'pending').slice(0, 10).map((w: any) => (
              <div key={w.id} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3 border border-slate-800/50">
                <div>
                  <span className="text-slate-300 font-medium">${w.amount?.toLocaleString()}</span>
                  <span className="text-slate-500 text-sm ml-3">{w.user_id?.substring(0, 8)}...</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => processWithdrawal.mutate({ withdrawalId: w.id, action: 'approve' })}
                    className="px-3 py-1 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition"
                  >Approve</button>
                  <button 
                    onClick={() => processWithdrawal.mutate({ withdrawalId: w.id, action: 'reject', reason: 'Rejected by admin' })}
                    className="px-3 py-1 text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition"
                  >Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Large Transaction Alerts */}
      {(overview?.recentLargeTransactions?.length ?? 0) > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-bold text-slate-200">Large Transactions</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {overview.recentLargeTransactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800/50">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="border-orange-500/30 text-orange-400 bg-orange-500/10">{tx.type}</Badge>
                  <span className="text-slate-300 font-bold">${Math.abs(tx.amount).toLocaleString()}</span>
                </div>
                <span className="text-xs text-slate-500 font-mono">{format(new Date(tx.created_at), 'MMM d, HH:mm')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Immutable Ledger */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="text-lg font-bold text-slate-200">Transaction Ledger</h3>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1">
            <Filter className="w-4 h-4 text-slate-500 ml-2" />
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setLedgerPage(1); }}
              className="bg-transparent text-sm text-slate-300 outline-none border-none [&>option]:bg-slate-900">
              <option value="">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="trade">Trades</option>
              <option value="admin_adjustment">Admin Adjustments</option>
              <option value="seizure">Seizures</option>
            </select>
          </div>
        </div>


        {ledgerLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3 font-medium">Time</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Before</th>
                    <th className="px-5 py-3 font-medium">After</th>
                    <th className="px-5 py-3 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {(ledger?.data || []).map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap text-slate-400 font-mono text-xs">
                        {format(new Date(tx.created_at), 'MMM d, HH:mm:ss')}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className="border-slate-700 text-slate-300">{tx.type}</Badge>
                      </td>
                      <td className={`px-5 py-3 font-bold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tx.amount >= 0 ? '+' : ''}${tx.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-slate-500">${tx.before_balance?.toLocaleString()}</td>
                      <td className="px-5 py-3 text-slate-400">${tx.after_balance?.toLocaleString()}</td>
                      <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{tx.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(ledger?.data || []).length === 0 && (
                <div className="p-8 text-center text-slate-500">No financial transactions recorded yet.</div>
              )}
            </div>

            {/* Pagination */}
            {(ledger?.pages ?? 0) > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800">
                <span className="text-sm text-slate-500">Page {ledger?.page} of {ledger?.pages} ({ledger?.total} records)</span>
                <div className="flex gap-2">
                  <button disabled={ledgerPage <= 1} onClick={() => setLedgerPage(p => p - 1)}
                    className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button disabled={ledgerPage >= (ledger?.pages ?? 1)} onClick={() => setLedgerPage(p => p + 1)}
                    className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FinancialOversight;
