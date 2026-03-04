import React from 'react';
import { useAdminOverviewStats, useAdminMutations, useAdminAlerts, useAdminTradingSummary } from '@/hooks/useAdmin';
import { useAdminContext } from '@/contexts/AdminContext';
import {
  Users, Activity, TrendingUp, Clock, DollarSign, Shield, AlertTriangle,
  Power, Loader2, Bell, BarChart2, Wallet, Lock, ShieldAlert, ArrowRightLeft, LogIn
} from 'lucide-react';
import { useAdminActivityStream } from '@/hooks/useAdmin';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const AdminOverview: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useAdminOverviewStats();
  const { data: alertsData } = useAdminAlerts();
  const { data: tradingData } = useAdminTradingSummary();
  const { data: activityData, isLoading: activityLoading } = useAdminActivityStream();

  const { activeAlertCount, connected } = useAdminContext();
  const { toggleTradingHalt } = useAdminMutations();
  const navigate = useNavigate();

  if (statsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const metrics = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'blue', bg: 'blue' },
    { label: 'Active Now', value: stats?.activeUsers ?? 0, icon: Activity, color: 'emerald', bg: 'emerald' },
    { label: 'Open Trades', value: stats?.openTrades ?? 0, icon: TrendingUp, color: 'purple', bg: 'purple' },
    { label: 'Pending Withdrawals', value: stats?.pendingWithdrawals ?? 0, icon: Clock, color: 'orange', bg: 'orange' },
  ];

  const financials = [
    { label: 'Platform Balance', value: `$${(stats?.totalBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'emerald' },
    { label: 'Frozen Funds', value: `$${(stats?.totalFrozen ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: Lock, color: 'blue' },
    { label: 'Total Exposure', value: `$${(stats?.totalExposure ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: BarChart2, color: 'orange' },
    { label: 'Active Alerts', value: activeAlertCount || stats?.activeAlerts || 0, icon: Bell, color: 'red', action: () => navigate('/admin/alerts') },
  ];

  // Additional Risk Metrics
  const openAlerts = alertsData?.data?.filter((a: { status: string; acknowledged: boolean }) => a.status === 'OPEN' || !a.acknowledged).length || 0;
  const criticalAlerts = alertsData?.data?.filter((a: { status: string; acknowledged: boolean; severity: string }) => (a.status === 'OPEN' || !a.acknowledged) && a.severity === 'CRITICAL').length || 0;
  const last24hAlerts = alertsData?.data?.filter((a: { created_at?: string; createdAt?: string }) => {
    const time = new Date(a.created_at || a.createdAt || 0).getTime();
    return (Date.now() - time < 86400000);
  }).length || 0;
  const riskUsersCount = tradingData?.riskUsersCount || 0;

  const riskMetrics = [
    { label: 'Open Alerts', value: openAlerts, icon: Bell, color: 'blue', action: () => navigate('/admin/alerts') },
    { label: 'Critical Alerts', value: criticalAlerts, icon: ShieldAlert, color: 'red', action: () => navigate('/admin/alerts') },
    { label: 'Alerts (24h)', value: last24hAlerts, icon: Activity, color: 'orange' },
    { label: 'High Risk Users', value: riskUsersCount, icon: AlertTriangle, color: 'yellow', action: () => navigate('/admin/trading-monitor') },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Operations Control</h2>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
            Exchange monitoring dashboard
            <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-full ${connected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </p>
        </div>
      </div>

      {/* Status Banners */}
      {stats?.tradingHalt && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="font-bold text-red-400">TRADING HALTED</p>
              <p className="text-sm text-red-400/70">All trading operations are currently suspended.</p>
            </div>
          </div>
          <button onClick={() => toggleTradingHalt.mutate(false)} className="px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-lg hover:bg-emerald-400 transition-colors">
            RESUME
          </button>
        </div>
      )}

      {stats?.maintenanceMode && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-300">
          <Power className="w-5 h-5 text-orange-400" />
          <div>
            <p className="font-bold text-orange-400">MAINTENANCE MODE</p>
            <p className="text-sm text-orange-400/70">Non-admin users cannot access the platform.</p>
          </div>
        </div>
      )}

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className={`absolute top-0 right-0 w-20 h-20 bg-${m.bg}-500/5 rounded-bl-full -z-0`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-${m.bg}-500/10 flex items-center justify-center`}>
                  <m.icon className={`w-5 h-5 text-${m.color}-400`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{m.value.toLocaleString()}</p>
              <p className="text-sm text-slate-400 mt-1 font-medium">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Financial Metrics */}
      <div>
        <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-400" />
          Financial Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {financials.map((f) => (
            <button
              key={f.label}
              onClick={f.action}
              className={`bg-slate-900 border border-slate-800 rounded-xl p-5 text-left hover:border-slate-700 transition-all ${f.action ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <f.icon className={`w-4 h-4 text-${f.color}-400`} />
                <span className="text-sm text-slate-400 font-medium">{f.label}</span>
              </div>
              <p className={`text-2xl font-bold text-${f.color}-400`}>{typeof f.value === 'number' ? f.value : f.value}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Risk Metrics & Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            Risk Monitoring
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {riskMetrics.map((r, i) => (
              <div
                key={i}
                onClick={r.action}
                className={`bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5 text-left transition-all ${r.action ? 'cursor-pointer hover:border-slate-700 hover:bg-slate-800/30' : ''} ${r.color === 'red' && r.value > 0 ? 'border-red-500/30 bg-red-500/5' : ''}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <r.icon className={`w-4 h-4 text-${r.color}-400 ${r.color === 'red' && r.value > 0 ? 'animate-pulse' : ''}`} />
                  <span className="text-sm text-slate-400 font-medium">{r.label}</span>
                </div>
                <p className={`text-2xl font-bold ${r.color === 'red' && r.value > 0 ? 'text-red-500' : 'text-slate-200'}`}>
                  {r.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Recent Activity
            </h3>
            <button onClick={() => navigate('/admin/live-feed')} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">View Full Feed →</button>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden h-[400px]">
            {activityLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            ) : (
              <div className="divide-y divide-slate-800 overflow-y-auto h-full scrollbar-hide">
                {activityData?.data?.slice(0, 10)?.map((event: { event_type: string; created_at: string; details: string; email: string }, idx: number) => (
                  <div key={idx} className="p-4 hover:bg-white/[0.02] transition-colors flex items-start gap-3">
                    <div className="mt-1 p-2 rounded-lg bg-slate-950 border border-slate-800 shadow-inner">
                      {event.event_type.includes('LOGIN') ? <LogIn size={14} className="text-emerald-400" /> : <ArrowRightLeft size={14} className="text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-xs font-bold text-slate-200 truncate">{event.event_type}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{format(new Date(event.created_at), 'HH:mm:ss')}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{event.details}</p>
                      <p className="text-[10px] text-slate-600 font-mono mt-1">{event.email}</p>
                    </div>
                  </div>
                ))}
                {(!activityData?.data || activityData.data.length === 0) && (
                  <div className="flex items-center justify-center h-full text-slate-600 font-mono text-xs">
                    No recent activity available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6 text-left hover:bg-slate-800/80 hover:border-slate-600 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -z-0 translate-x-4 -translate-y-4" />
            <Users className="w-8 h-8 text-blue-400 mb-4 group-hover:scale-110 transition-transform relative z-10" />
            <p className="font-bold text-slate-200 relative z-10">User Management</p>
            <p className="text-sm text-slate-500 mt-1 relative z-10">View and manage all platform users</p>
          </button>
          <button
            onClick={() => navigate('/admin/live-feed')}
            className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6 text-left hover:bg-slate-800/80 hover:border-slate-600 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -z-0 translate-x-4 -translate-y-4" />
            <Activity className="w-8 h-8 text-emerald-400 mb-4 group-hover:scale-110 transition-transform relative z-10" />
            <p className="font-bold text-slate-200 relative z-10">Live Activity</p>
            <p className="text-sm text-slate-500 mt-1 relative z-10">Real-time platform event monitoring</p>
          </button>
          <button
            onClick={() => navigate('/admin/financial')}
            className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6 text-left hover:bg-slate-800/80 hover:border-slate-600 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-bl-full -z-0 translate-x-4 -translate-y-4" />
            <DollarSign className="w-8 h-8 text-orange-400 mb-4 group-hover:scale-110 transition-transform relative z-10" />
            <p className="font-bold text-slate-200 relative z-10">Financial Oversight</p>
            <p className="text-sm text-slate-500 mt-1 relative z-10">Platform liabilities and ledger</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
