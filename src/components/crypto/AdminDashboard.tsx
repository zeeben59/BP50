import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Users, DollarSign, AlertTriangle, Shield, Search, CheckCircle, XCircle, Ban, Snowflake, Play, Eye, ArrowDownToLine, Flag, Activity, TrendingUp } from 'lucide-react';

type AdminTab = 'overview' | 'users' | 'withdrawals' | 'reports';

const AdminDashboard: React.FC = () => {
  const { allUsers, allWithdrawals, allReports, approveWithdrawal, rejectWithdrawal, freezeUser, banUser, activateUser, isMaintenanceMode, toggleMaintenance, seizeFunds } = useAppContext();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [userSearch, setUserSearch] = useState('');
  
  // Seize Funds state
  const [showSeizeModal, setShowSeizeModal] = useState(false);
  const [seizeUid, setSeizeUid] = useState('');
  const [seizeAmount, setSeizeAmount] = useState('');
  const [seizeReason, setSeizeReason] = useState('');
  const [seizeTarget, setSeizeTarget] = useState<'demo' | 'savings'>('demo');
  const [seizeLoading, setSeizeLoading] = useState(false);

  const activeUsers = allUsers.filter(u => u.status === 'active').length;
  const frozenUsers = allUsers.filter(u => u.status === 'frozen').length;
  const bannedUsers = allUsers.filter(u => u.status === 'banned').length;
  const underReview = allUsers.filter(u => u.status === 'under_review').length;
  const pendingWithdrawals = allWithdrawals.filter(w => w.status === 'pending');
  const pendingReports = allReports.filter(r => r.status === 'pending');
  const suspiciousUsers = allUsers.filter(u => u.risk_score >= 5);
  const totalWithdrawalAmount = allWithdrawals.reduce((s, w) => s + w.amount, 0);

  const filteredUsers = allUsers.filter(u => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-emerald-500/10 text-emerald-400',
      frozen: 'bg-cyan-500/10 text-cyan-400',
      banned: 'bg-rose-500/10 text-rose-400',
      under_review: 'bg-amber-500/10 text-amber-400',
    };
    return colors[status] || 'bg-white/5 text-gray-400';
  };

  const tabs: { key: AdminTab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: 'Users', count: allUsers.length },
    { key: 'withdrawals', label: 'Withdrawals', count: pendingWithdrawals.length },
    { key: 'reports', label: 'Reports', count: pendingReports.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Shield size={28} className="text-violet-400" />
          Admin Dashboard
        </h1>
        <p className="text-gray-400 text-sm mt-1">Manage users, withdrawals, and platform security</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-0">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2
              ${tab === t.key ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === t.key ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-gray-400'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* System Control Panel */}
          <div className="bg-gradient-to-r from-violet-600/20 to-indigo-600/10 border border-violet-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${isMaintenanceMode ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                <Activity size={24} />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Platform Status: {isMaintenanceMode ? 'Maintenance' : 'Live'}</h3>
                <p className="text-gray-400 text-sm">{isMaintenanceMode ? 'Access is restricted to Admin accounts only.' : 'The trading engine is currently live for all users.'}</p>
              </div>
            </div>
            <button 
              onClick={() => toggleMaintenance(!isMaintenanceMode)}
              className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2
                ${isMaintenanceMode ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-rose-500 text-white hover:bg-rose-600'}`}
            >
              {isMaintenanceMode ? <Play size={18} /> : <AlertTriangle size={18} />}
              {isMaintenanceMode ? 'Resume Platform' : 'Start Maintenance'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111738] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">Total Users</span>
                <Users size={20} className="text-emerald-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-white">{allUsers.length}</p>
              <p className="text-emerald-400 text-xs mt-1">{activeUsers} active</p>
            </div>
            <div className="bg-[#111738] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">Pending Withdrawals</span>
                <ArrowDownToLine size={20} className="text-amber-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-white">{pendingWithdrawals.length}</p>
              <p className="text-amber-400 text-xs mt-1">${totalWithdrawalAmount.toFixed(2)} total</p>
            </div>
            <div className="bg-[#111738] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">Open Reports</span>
                <Flag size={20} className="text-rose-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-white">{pendingReports.length}</p>
              <p className="text-rose-400 text-xs mt-1">{allReports.length} total reports</p>
            </div>
            <div className="bg-[#111738] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">Suspicious</span>
                <AlertTriangle size={20} className="text-violet-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-white">{suspiciousUsers.length}</p>
              <p className="text-violet-400 text-xs mt-1">{underReview} under review</p>
            </div>
          </div>

          {/* Account Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#111738] border border-white/5 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Account Status</h3>
              <div className="space-y-3">
                {[
                  { label: 'Active', count: activeUsers, color: 'bg-emerald-500', pct: (activeUsers / allUsers.length) * 100 },
                  { label: 'Frozen', count: frozenUsers, color: 'bg-cyan-500', pct: (frozenUsers / allUsers.length) * 100 },
                  { label: 'Banned', count: bannedUsers, color: 'bg-rose-500', pct: (bannedUsers / allUsers.length) * 100 },
                  { label: 'Under Review', count: underReview, color: 'bg-amber-500', pct: (underReview / allUsers.length) * 100 },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">{s.label}</span>
                      <span className="text-white font-mono">{s.count}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.color} transition-all`} style={{ width: `${s.pct || 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suspicious Users */}
            <div className="bg-[#111738] border border-white/5 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                High Risk Users
              </h3>
              {suspiciousUsers.length > 0 ? (
                <div className="space-y-3">
                  {suspiciousUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                      <div>
                        <p className="text-white text-sm font-medium">{u.username}</p>
                        <p className="text-gray-500 text-xs">{u.email}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Activity size={12} className="text-rose-400" />
                          <span className="text-rose-400 font-mono text-sm font-bold">{u.risk_score}</span>
                        </div>
                        <span className={`text-[10px] capitalize ${statusBadge(u.status).split(' ')[1]}`}>{u.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">No high-risk users detected</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-all text-sm"
            />
          </div>
          <div className="bg-[#111738] border border-white/5 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase border-b border-white/5">
                    <th className="text-left py-3 px-5 font-medium">User</th>
                    <th className="text-left py-3 px-5 font-medium">Role</th>
                    <th className="text-center py-3 px-5 font-medium">Status</th>
                    <th className="text-center py-3 px-5 font-medium">Risk</th>
                    <th className="text-right py-3 px-5 font-medium">Joined</th>
                    <th className="text-right py-3 px-5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-5">
                        <div>
                          <p className="text-white text-sm font-medium">{u.username}</p>
                          <p className="text-gray-500 text-xs">{u.email}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-violet-500/10 text-violet-400' : 'bg-white/5 text-gray-400'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusBadge(u.status)}`}>
                          {u.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`font-mono text-sm font-bold ${u.risk_score >= 7 ? 'text-rose-400' : u.risk_score >= 4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {u.risk_score}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right text-gray-500 text-sm">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {u.role !== 'admin' && (
                          <div className="flex items-center justify-end gap-1">
                            {u.status !== 'active' && (
                              <button onClick={() => activateUser(u.id)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all" title="Activate">
                                <Play size={14} />
                              </button>
                            )}
                            {u.status !== 'frozen' && (
                              <button onClick={() => freezeUser(u.id)} className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all" title="Freeze">
                                <Snowflake size={14} />
                              </button>
                            )}
                            {u.status !== 'banned' && (
                              <button onClick={() => banUser(u.id)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all" title="Ban">
                                <Ban size={14} />
                              </button>
                            )}
                            <button 
                              onClick={() => { setSeizeUid(u.id); setShowSeizeModal(true); }}
                              className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all" title="Seize Funds"
                            >
                              <DollarSign size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawals Tab */}
      {tab === 'withdrawals' && (
        <div className="bg-[#111738] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b border-white/5">
                  <th className="text-left py-3 px-5 font-medium">User</th>
                  <th className="text-right py-3 px-5 font-medium">Amount</th>
                  <th className="text-left py-3 px-5 font-medium">Bank Details</th>
                  <th className="text-center py-3 px-5 font-medium">Status</th>
                  <th className="text-right py-3 px-5 font-medium">Date</th>
                  <th className="text-right py-3 px-5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allWithdrawals.map(w => (
                  <tr key={w.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-5 text-white text-sm font-medium">{w.username || 'User'}</td>
                    <td className="py-3.5 px-5 text-right text-white font-mono text-sm font-semibold">${w.amount.toFixed(2)}</td>
                    <td className="py-3.5 px-5">
                      <div className="text-xs">
                        <p className="text-gray-300">{w.bank_name}</p>
                        <p className="text-gray-500">{w.account_number} - {w.account_name}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize
                        ${w.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                          w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                          w.status === 'rejected' ? 'bg-rose-500/10 text-rose-400' :
                          'bg-cyan-500/10 text-cyan-400'}`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right text-gray-500 text-sm">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="py-3.5 px-5 text-right">
                      {w.status === 'pending' && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => approveWithdrawal(w.id)} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-all">
                            Approve
                          </button>
                          <button onClick={() => rejectWithdrawal(w.id)} className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 text-xs font-medium hover:bg-rose-500/20 transition-all">
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {allWithdrawals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">No withdrawal requests</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <div className="bg-[#111738] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b border-white/5">
                  <th className="text-left py-3 px-5 font-medium">Reporter</th>
                  <th className="text-left py-3 px-5 font-medium">Reported User</th>
                  <th className="text-left py-3 px-5 font-medium">Reason</th>
                  <th className="text-left py-3 px-5 font-medium">Description</th>
                  <th className="text-center py-3 px-5 font-medium">Status</th>
                  <th className="text-right py-3 px-5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {allReports.map(r => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-5 text-gray-300 text-sm">{r.reporter_name || 'Unknown'}</td>
                    <td className="py-3.5 px-5 text-white text-sm font-medium">{r.reported_name || 'Unknown'}</td>
                    <td className="py-3.5 px-5 text-amber-400 text-sm">{r.reason}</td>
                    <td className="py-3.5 px-5 text-gray-400 text-sm max-w-xs truncate">{r.description}</td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize
                        ${r.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                          r.status === 'reviewed' ? 'bg-cyan-500/10 text-cyan-400' :
                          r.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' :
                          'bg-gray-500/10 text-gray-400'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right text-gray-500 text-sm">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {allReports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">No reports submitted</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showSeizeModal && (
        <SeizeModal 
          uid={seizeUid} 
          onClose={() => setShowSeizeModal(false)}
          onConfirm={seizeFunds}
        />
      )}
    </div>
  );
};

// ─── Modals ──────────────────────────────────────────────────────────────────
const SeizeModal: React.FC<{ 
  uid: string; 
  onClose: () => void; 
  onConfirm: (uid: string, amount: number, reason: string, target?: 'demo' | 'savings') => Promise<boolean> 
}> = ({ uid, onClose, onConfirm }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [target, setTarget] = useState<'demo' | 'savings'>('demo');
  const [loading, setLoading] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#111738] border border-white/10 rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="text-amber-400" />
            Seize User Funds
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><XCircle size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block uppercase tracking-wider">Target Balance</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setTarget('demo')}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all
                  ${target === 'demo' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-white/5 border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                Demo Wallet
              </button>
              <button 
                onClick={() => setTarget('savings')}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all
                  ${target === 'savings' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                Savings Wallet
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block uppercase tracking-wider">Amount ($)</label>
            <input 
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50"
              placeholder="e.g. 500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block uppercase tracking-wider">Reason for Seizure</label>
            <textarea 
              value={reason} onChange={e => setReason(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 h-24"
              placeholder="Suspicious activity, policy violation..."
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
          <button 
            disabled={!amount || !reason || loading}
            onClick={async () => {
              setLoading(true);
              await onConfirm(uid, parseFloat(amount), reason, target);
              setLoading(false);
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-xl font-bold bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Processing...' : 'Confirm Seizure'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
