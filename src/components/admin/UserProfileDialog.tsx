import React, { useState } from 'react';
import { useAdminUserDetails, useAdminMutations } from '@/hooks/useAdmin';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Ban, Lock, Wallet, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/contexts/AppContext';

interface UserProfileDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserProfileDialog: React.FC<UserProfileDialogProps> = ({ userId, open, onOpenChange }) => {
  const { data, isLoading } = useAdminUserDetails(userId);
  const { updateUserStatus, adjustUserBalance, seizeFunds, updateUserRole } = useAdminMutations();

  const { user: currentUser } = useAppContext();

  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'actions'>('overview');

  // Action State
  const [adjustPassword, setAdjustPassword] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const [seizePassword, setSeizePassword] = useState('');
  const [seizeAmount, setSeizeAmount] = useState('');
  const [seizeReason, setSeizeReason] = useState('');

  const [reason, setReason] = useState('');

  // RBAC State
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editPerms, setEditPerms] = useState({ canBanUsers: false, canAdjustBalance: false, canSeizeFunds: false, canManageWithdrawals: false });

  React.useEffect(() => {
    if (data?.user) {
      setEditRole(data.user.role === 'superadmin' ? 'admin' : (data.user.role as 'user' | 'admin'));
      setEditPerms(data.user.permissions || { canBanUsers: false, canAdjustBalance: false, canSeizeFunds: false, canManageWithdrawals: false });
    }
  }, [data]);

  if (!open || !userId) return null;

  const handleStatusChange = (newStatus: string) => {
    if (!reason) return toast({ title: 'Reason Required', description: 'Please provide a reason for this status change.', variant: 'destructive' });
    if (confirm(`Are you sure you want to change user status to ${newStatus.toUpperCase()}?`)) {
      updateUserStatus.mutate({ userId, status: newStatus, reason });
      setReason('');
    }
  };

  const handleAdjustBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustPassword || !adjustAmount || !adjustReason) return toast({ title: 'Error', description: 'All fields are required.', variant: 'destructive' });
    adjustUserBalance.mutate({ userId, amount_change: parseFloat(adjustAmount), reason: adjustReason, admin_password: adjustPassword }, {
      onSuccess: () => { setAdjustPassword(''); setAdjustAmount(''); setAdjustReason(''); }
    });
  };

  const handleSeizeFunds = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seizePassword || !seizeAmount || !seizeReason) return toast({ title: 'Error', description: 'All fields are required.', variant: 'destructive' });
    if (confirm(`WARNING: You are about to seize $${seizeAmount}. This will freeze the funds. Proceed?`)) {
      seizeFunds.mutate({ userId, amount: parseFloat(seizeAmount), reason: seizeReason, admin_password: seizePassword }, {
        onSuccess: () => { setSeizePassword(''); setSeizeAmount(''); setSeizeReason(''); }
      });
    }
  };

  const handleUpdateRole = () => {
    if (confirm(`Change user role to ${editRole.toUpperCase()}?`)) {
      updateUserRole.mutate({ userId, role: editRole, permissions: editPerms });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-slate-950 border-slate-800 text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center space-x-3">
            <span>User Profile Inspection</span>
            {data?.user && (
              <Badge variant="outline" className={
                data.user.status === 'active' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                  data.user.status === 'frozen' ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' :
                    'border-red-500/50 text-red-400 bg-red-500/10'
              }>
                {data.user.status.toUpperCase()}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
        ) : !data?.user ? (
          <div className="p-12 text-center text-slate-500">User data could not be loaded.</div>
        ) : (
          <div className="mt-4">
            {/* Tabs */}
            <div className="flex space-x-1 border-b border-slate-800 pb-px mb-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'overview' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('financial')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'financial' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
              >
                Financial Ledgers
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'actions' ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
              >
                Admin Actions
              </button>
            </div>

            {/* Content: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Username</p>
                    <p className="font-medium text-lg text-slate-200">{data.user.username}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Email Address</p>
                    <p className="font-medium text-lg text-slate-200">{data.user.email}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Role & Permissions</p>
                    <p className="font-medium text-slate-200 capitalize">{data.user.role}</p>
                    {data.user.role !== 'user' && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(data.user.permissions || {}).map(([key, val]) => val ? (
                          <Badge key={key} variant="secondary" className="text-[10px] bg-slate-800 text-slate-300 border-none">{key}</Badge>
                        ) : null)}
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Security Settings</p>
                    <div className="mt-1 flex items-center space-x-2">
                      <ShieldAlert className={`w-4 h-4 ${data.user.two_factor_enabled ? 'text-emerald-400' : 'text-slate-600'}`} />
                      <span className="text-sm font-medium text-slate-300">2FA {data.user.two_factor_enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </div>
                </div>

                {data.user.accountStatus === 'frozen' && (
                  <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-lg border-l-4 border-l-blue-500 animate-in fade-in duration-500">
                    <h4 className="text-blue-400 font-bold flex items-center mb-2"><Lock className="w-4 h-4 mr-2" /> Freeze Details</h4>
                    <p className="text-sm text-slate-300 mb-4">{data.user.freezeReason || 'Automated security containment.'}</p>
                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-md border border-slate-800">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Scheduled Re-activation</p>
                        <p className="text-sm font-mono text-slate-200">
                          {data.user.freezeUntil ? format(new Date(data.user.freezeUntil), 'MMM d, yyyy HH:mm:ss') : 'Indefinite'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Time Remaining</p>
                        <p className="text-sm font-mono text-blue-400">
                          {data.user.freezeUntil && new Date(data.user.freezeUntil) > new Date()
                            ? Math.ceil((new Date(data.user.freezeUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60)) + ' Hours'
                            : 'Expired'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content: Financial Ledgers */}
            {activeTab === 'financial' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-center">
                    <p className="text-xs text-emerald-500/70 font-semibold mb-1 uppercase tracking-wider">Available Balance</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      ${data.wallet?.available_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-center opacity-80">
                    <p className="text-xs text-blue-500/70 font-semibold mb-1 uppercase tracking-wider">Frozen Balance</p>
                    <p className="text-2xl font-bold text-blue-400">
                      ${data.wallet?.frozen_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-center">
                    <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider">Total Demo Equity</p>
                    <p className="text-2xl font-bold text-slate-200">
                      ${data.wallet?.demo_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <h4 className="font-medium text-slate-300 mb-3 flex items-center"><Activity className="w-4 h-4 mr-2 text-indigo-400" /> Crypto Assets</h4>
                  {data.crypto_balances?.length > 0 ? (
                    <div className="space-y-2">
                      {data.crypto_balances.map((c: any) => (
                        <div key={c.symbol} className="flex justify-between items-center text-sm bg-slate-950 p-2 rounded">
                          <span className="font-bold text-slate-300">{c.symbol}</span>
                          <span className="font-mono text-slate-400">{c.amount}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">No crypto assets held.</p>
                  )}
                </div>
              </div>
            )}

            {/* Content: Admin Actions */}
            {activeTab === 'actions' && (
              <div className="space-y-6">

                {currentUser?.role === 'superadmin' && data?.user?.role !== 'superadmin' && (
                  <div className="bg-slate-900 border border-purple-900/30 p-5 rounded-lg border-l-4 border-l-purple-500">
                    <h4 className="text-purple-400 font-bold flex items-center mb-4"><ShieldAlert className="w-5 h-5 mr-2" /> Role & Permissions</h4>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">Platform Role</label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as 'user' | 'admin')}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm focus:ring-1 focus:ring-purple-500 outline-none text-slate-200"
                        >
                          <option value="user">Standard User</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </div>

                      {editRole === 'admin' && (
                        <div className="pt-2 border-t border-slate-800 space-y-2">
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">Admin Permissions</label>
                          <label className="flex items-center space-x-3 text-sm text-slate-300">
                            <input type="checkbox" className="rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-purple-500" checked={editPerms?.canBanUsers || false} onChange={e => setEditPerms(p => ({ ...p, canBanUsers: e.target.checked }))} />
                            <span>Can Freeze & Ban Users</span>
                          </label>
                          <label className="flex items-center space-x-3 text-sm text-slate-300">
                            <input type="checkbox" className="rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-purple-500" checked={editPerms?.canAdjustBalance || false} onChange={e => setEditPerms(p => ({ ...p, canAdjustBalance: e.target.checked }))} />
                            <span>Can Adjust User Balances</span>
                          </label>
                          <label className="flex items-center space-x-3 text-sm text-slate-300">
                            <input type="checkbox" className="rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-purple-500" checked={editPerms?.canSeizeFunds || false} onChange={e => setEditPerms(p => ({ ...p, canSeizeFunds: e.target.checked }))} />
                            <span>Can Seize & Freeze Funds</span>
                          </label>
                          <label className="flex items-center space-x-3 text-sm text-slate-300">
                            <input type="checkbox" className="rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-purple-500" checked={editPerms?.canManageWithdrawals || false} onChange={e => setEditPerms(p => ({ ...p, canManageWithdrawals: e.target.checked }))} />
                            <span>Can Approve/Reject Withdrawals</span>
                          </label>
                        </div>
                      )}

                      <button onClick={handleUpdateRole} disabled={updateUserRole.isPending} className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-sm transition-colors mt-2">
                        {updateUserRole.isPending ? 'Updating...' : 'Save Role & Permissions'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-slate-900 border border-red-900/30 p-5 rounded-lg border-l-4 border-l-red-500">
                  <h4 className="text-red-400 font-bold flex items-center mb-4"><Ban className="w-5 h-5 mr-2" /> Danger Zone: Status Controls</h4>

                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Reason for status change (Required for audit log)"
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                      value={reason} onChange={e => setReason(e.target.value)}
                    />
                    <div className="flex space-x-3">
                      <button onClick={() => handleStatusChange('frozen')} disabled={updateUserStatus.isPending || !reason} className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium py-2 rounded text-sm transition-colors border border-blue-500/30 disabled:opacity-50">
                        Freeze Account
                      </button>
                      <button onClick={() => handleStatusChange('banned')} disabled={updateUserStatus.isPending || !reason} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium py-2 rounded text-sm transition-colors border border-red-500/30 disabled:opacity-50">
                        Ban User
                      </button>
                      <button onClick={() => handleStatusChange('active')} disabled={updateUserStatus.isPending || !reason} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium py-2 rounded text-sm transition-colors border border-emerald-500/30 disabled:opacity-50">
                        Re-Activate
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-orange-900/30 p-5 rounded-lg border-l-4 border-l-orange-500">
                  <h4 className="text-orange-400 font-bold flex items-center mb-4"><Wallet className="w-5 h-5 mr-2" /> Financial Override Controls</h4>

                  <form onSubmit={handleAdjustBalance} className="space-y-3 mb-6 pt-4 border-t border-slate-800">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Manual Balance Adjustment</p>
                      <p className="text-[10px] text-slate-500 mb-2">Type a negative number to deduct funds (e.g. -500).</p>
                    </div>
                    <div className="flex space-x-2">
                      <input type="number" step="0.01" placeholder="Amount (e.g. 500 or -100)" className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-sm focus:ring-1 focus:ring-orange-500 outline-none" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} />
                      <input type="text" placeholder="Audit Reason" className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-sm focus:ring-1 focus:ring-orange-500 outline-none" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} />
                    </div>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Lock className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input type="password" placeholder="Your Admin Password" className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2 py-2 text-sm focus:ring-1 focus:ring-orange-500 outline-none" value={adjustPassword} onChange={e => setAdjustPassword(e.target.value)} />
                      </div>
                      <button type="submit" disabled={adjustUserBalance.isPending} className="px-4 py-2 bg-orange-500 text-slate-950 font-bold rounded text-sm hover:bg-orange-400 disabled:opacity-50">
                        Adjust
                      </button>
                    </div>
                  </form>

                  <form onSubmit={handleSeizeFunds} className="space-y-3 pt-4 border-t border-slate-800">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Seize / Freeze Funds</p>
                    <div className="flex space-x-2">
                      <input type="number" step="0.01" min="0" placeholder="Amount to Scrape/Freeze" className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={seizeAmount} onChange={e => setSeizeAmount(e.target.value)} />
                      <input type="text" placeholder="Audit Reason" className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={seizeReason} onChange={e => setSeizeReason(e.target.value)} />
                    </div>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Lock className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input type="password" placeholder="Your Admin Password" className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={seizePassword} onChange={e => setSeizePassword(e.target.value)} />
                      </div>
                      <button type="submit" disabled={seizeFunds.isPending} className="px-4 py-2 bg-blue-500 text-white font-bold rounded text-sm hover:bg-blue-400 disabled:opacity-50 shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                        Seize
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Simple icon lookup
const ShieldAlert = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);

export default UserProfileDialog;
