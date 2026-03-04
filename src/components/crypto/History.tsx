import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Clock, TrendingUp, TrendingDown, Filter, ArrowDownToLine, ArrowUpFromLine, Flag } from 'lucide-react';

const History: React.FC = () => {
  const { transactions, totalRealizedPnL, setReportingTargetId, setReportingRelatedEntityId, setCurrentPage } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'deposit' | 'withdrawal'>('all');

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);

  const typeIcon = (type: string) => {
    switch (type) {
      case 'buy': return <ArrowDownToLine size={14} className="text-emerald-400" />;
      case 'sell': return <ArrowUpFromLine size={14} className="text-rose-400" />;
      case 'deposit': return <ArrowDownToLine size={14} className="text-cyan-400" />;
      case 'withdrawal': return <ArrowUpFromLine size={14} className="text-orange-400" />;
      default: return <Clock size={14} className="text-gray-400" />;
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'buy': return 'bg-emerald-500/10 text-emerald-400';
      case 'sell': return 'bg-rose-500/10 text-rose-400';
      case 'deposit': return 'bg-cyan-500/10 text-cyan-400';
      case 'withdrawal': return 'bg-orange-500/10 text-orange-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Transaction History</h1>
          <p className="text-gray-400 text-sm mt-1">{transactions.length} transactions total</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${totalRealizedPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            Realized P&L: {totalRealizedPnL >= 0 ? '+' : ''}${totalRealizedPnL.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'buy', 'sell', 'deposit', 'withdrawal'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all ${filter === f ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-500 hover:text-gray-300'}`}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111738] border border-white/5 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Clock size={40} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b border-white/5">
                  <th className="text-left p-4">Type</th>
                  <th className="text-left p-4">Asset</th>
                  <th className="text-right p-4">Amount</th>
                  <th className="text-right p-4">Price</th>
                  <th className="text-right p-4">Total</th>
                  <th className="text-right p-4">P&L</th>
                  <th className="text-right p-4">Date</th>
                  <th className="text-right p-4 tracking-widest opacity-50">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => {
                  const pnl = tx.realized_pnl || 0;
                  const hasPnl = tx.type === 'sell' && pnl !== 0;
                  return (
                    <tr key={tx.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors group/row">
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${typeColor(tx.type)}`}>
                          {typeIcon(tx.type)} {tx.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-white font-medium">{tx.symbol || '—'}</span>
                      </td>
                      <td className="p-4 text-right text-white font-mono">
                        {tx.type === 'buy' || tx.type === 'sell' ? tx.amount.toFixed(6) : '—'}
                      </td>
                      <td className="p-4 text-right text-gray-400 font-mono">
                        {tx.price ? `$${tx.price < 1 ? tx.price.toFixed(4) : tx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="p-4 text-right text-white font-mono">${tx.total.toFixed(2)}</td>
                      <td className="p-4 text-right font-mono">
                        {hasPnl ? (
                          <span className={`inline-flex items-center gap-1 ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pnl >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </span>
                        ) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="p-4 text-right text-gray-500 text-xs">
                        {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            // Using the SuperAdmin ID as default target for system-linked transactions
                            setReportingTargetId('16490799-e8e1-4869-812c-e26e4218f86d');
                            setReportingRelatedEntityId(tx.id);
                            setCurrentPage('report');
                          }}
                          className="opacity-0 group-hover/row:opacity-100 p-2 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 rounded-lg transition-all flex items-center justify-center ml-auto"
                          title="Report Transaction"
                        >
                          <Flag size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
