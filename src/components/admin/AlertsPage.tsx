import React, { useState } from 'react';
import { useAdminAlerts, useAdminMutations } from '@/hooks/useAdmin';
import { useAdminContext } from '@/contexts/AdminContext';
import { Bell, AlertTriangle, ShieldAlert, Activity, Check, Loader2, Filter, ShieldBan, User as UserIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const AlertsPage: React.FC = () => {
  const { data: alertsData, isLoading } = useAdminAlerts();
  const { alerts: liveAlerts } = useAdminContext();
  const { resolveAlert, freezeUserViaAlert } = useAdminMutations();
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>;
  }

  // Merge live alerts with fetched data, dedup by id
  const allAlerts = [...(liveAlerts || []), ...(alertsData?.data || [])];
  const seenIds = new Set<string>();
  const dedupedAlerts = allAlerts.filter(a => {
    if (seenIds.has(a.id)) return false;
    seenIds.add(a.id);
    return true;
  }).sort((a, b) => new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime());

  // Apply Filters
  const filteredAlerts = dedupedAlerts.filter(a => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter && a.severity !== severityFilter.toLowerCase()) return false;
    if (statusFilter !== 'ALL' && a.status !== statusFilter && (a.status === 'OPEN' && a.acknowledged)) return false; 
    // ^ mapping old 'acknowledged' to new 'status' logic gracefully
    const currentStatus = a.status || (a.acknowledged ? 'RESOLVED' : 'OPEN');
    if (statusFilter !== 'ALL' && currentStatus !== statusFilter) return false;
    if (typeFilter !== 'ALL' && a.type !== typeFilter) return false;
    return true;
  });

  // Top Metrics
  const openCount = dedupedAlerts.filter(a => (a.status || (a.acknowledged ? 'RESOLVED' : 'OPEN')) === 'OPEN').length;
  const criticalCount = dedupedAlerts.filter(a => (a.severity === 'CRITICAL' || a.severity === 'critical') && (a.status || (a.acknowledged ? 'RESOLVED' : 'OPEN')) === 'OPEN').length;
  const todayCount = dedupedAlerts.filter(a => {
    const d = new Date(a.created_at || a.createdAt);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const getSeverityStyle = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'HIGH': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'LOW': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'HIGH': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'MEDIUM': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bell className="w-6 h-6 text-red-400" />
            Risk Monitoring System
          </h2>
          <p className="text-slate-400 text-sm mt-1">Real-time surveillance and automated risk alerts.</p>
        </div>
      </div>

      {/* Top Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-center items-center text-center">
          <p className="text-3xl font-black text-white">{openCount}</p>
          <p className="text-sm font-semibold text-slate-400 mt-1 uppercase tracking-wider">Open Alerts</p>
        </div>
        <div className="bg-slate-900 border border-red-500/30 rounded-xl p-5 flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
          <p className="text-3xl font-black text-red-500 relative z-10">{criticalCount}</p>
          <p className="text-sm font-semibold text-red-400 mt-1 uppercase tracking-wider relative z-10">Critical Alerts</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-center items-center text-center">
          <p className="text-3xl font-black text-slate-200">{todayCount}</p>
          <p className="text-sm font-semibold text-slate-400 mt-1 uppercase tracking-wider">Alerts Today</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-300">Filters:</span>
        </div>
        
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        <select 
          value={severityFilter} 
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <select 
          value={typeFilter} 
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 max-w-xs focus:ring-emerald-500 focus:border-emerald-500 outline-none"
        >
          <option value="ALL">All Triggers</option>
          <option value="HIGH_LEVERAGE">High Leverage</option>
          <option value="LARGE_TRADE">Large Trade</option>
          <option value="RAPID_TRADING">Rapid Trading</option>
          <option value="LIQUIDATION">Liquidation</option>
          <option value="SUSPICIOUS_LOGIN">Suspicious Login</option>
          <option value="MULTIPLE_FAILED_LOGINS">Failed Logins (Legacy)</option>
        </select>
      </div>

      {/* Alerts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/50 text-xs uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="px-5 py-4 font-bold border-b border-slate-800">Time</th>
                <th className="px-5 py-4 font-bold border-b border-slate-800">Trigger Type</th>
                <th className="px-5 py-4 font-bold border-b border-slate-800">Severity</th>
                <th className="px-5 py-4 font-bold border-b border-slate-800">User ID</th>
                <th className="px-5 py-4 font-bold border-b border-slate-800">Message</th>
                <th className="px-5 py-4 font-bold border-b border-slate-800">Status</th>
                <th className="px-5 py-4 font-bold border-b border-slate-800 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 hover:divide-slate-800 transition-colors">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                    <p className="text-base font-semibold">No alerts found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or checking back later.</p>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert: any) => {
                  const resolved = alert.status === 'RESOLVED' || alert.acknowledged;
                  
                  return (
                  <tr key={alert.id} className={`group hover:bg-slate-800/20 transition-colors ${resolved ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-4 whitespace-nowrap text-xs font-mono text-slate-400">
                      {format(new Date(alert.created_at || alert.createdAt), 'MM/dd • HH:mm:ss')}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-bold text-slate-200 text-xs">
                      {alert.type || alert.rule || 'UNKNOWN'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge variant="outline" className={`flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-md ${getSeverityStyle(alert.severity)}`}>
                        {getSeverityIcon(alert.severity)}
                        <span className="font-bold tracking-wide uppercase text-[10px]">{alert.severity?.toUpperCase()}</span>
                      </Badge>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-300">
                          {alert.userId?.substring(0, 8) || 'System'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-300 leading-snug">{alert.message || alert.title}</p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${resolved ? 'bg-slate-800 text-slate-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {resolved ? 'RESOLVED' : 'OPEN'}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      {!resolved ? (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {alert.userId && (
                            <button
                              onClick={() => freezeUserViaAlert.mutate(alert.id)}
                              disabled={freezeUserViaAlert.isPending}
                              title="Freeze User Account & Kick Tokens"
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            >
                              <ShieldBan className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => resolveAlert.mutate(alert.id)}
                            disabled={resolveAlert.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/20"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Resolve
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600 font-mono">
                          {alert.resolvedAt ? format(new Date(alert.resolvedAt), 'HH:mm:ss') : 'Dismissed'}
                        </span>
                      )}
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;
