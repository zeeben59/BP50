import React, { useState } from 'react';
import { useAdminAuditLogs, useAdminSecurityLogs } from '@/hooks/useAdmin';
import { format } from 'date-fns';
import { Loader2, ShieldCheck, FileText, AlertCircle, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const AuditLogs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audit' | 'security'>('audit');
  
  const [auditSearch, setAuditSearch] = useState('');
  const [securitySearch, setSecuritySearch] = useState('');
  
  const { data: auditData, isLoading: auditLoading } = useAdminAuditLogs();
  const { data: securityData, isLoading: securityLoading } = useAdminSecurityLogs();

  const renderAuditTab = () => {
    if (auditLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
    const logs = (auditData?.data || []).filter((l: any) => 
      l.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.admin_id?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.target_user_id?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.reason?.toLowerCase().includes(auditSearch.toLowerCase())
    );
    
    return (
      <div className="space-y-4 shadow-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4" />
          <input
            type="text"
            placeholder="Search audits by action, ID, or reason..."
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Timestamp</th>
                  <th className="px-6 py-4 font-medium">Admin ID</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                  <th className="px-6 py-4 font-medium">Target User</th>
                  <th className="px-6 py-4 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-mono text-xs">
                      {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 group relative">
                      {log.admin_id.substring(0,8)}...
                      <span className="absolute hidden group-hover:block bg-slate-800 border border-slate-700 p-1 rounded z-20 top-8 left-0 text-[10px] min-w-max">
                        {log.admin_id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-mono text-[10px]">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {log.target_user_id ? log.target_user_id.substring(0,8) + '...' : <span className="text-slate-700 italic">SYSTEM</span>}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-slate-400" title={log.reason}>
                      {log.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <div className="p-8 text-center text-slate-500">No matching audit logs found.</div>}
          </div>
        </div>
      </div>
    );
  };

  const renderSecurityTab = () => {
    if (securityLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
    const logs = (securityData?.data || []).filter((l: any) => 
      l.event_type?.toLowerCase().includes(securitySearch.toLowerCase()) ||
      l.ip_address?.toLowerCase().includes(securitySearch.toLowerCase()) ||
      l.details?.toLowerCase().includes(securitySearch.toLowerCase())
    );
    
    return (
      <div className="space-y-4 shadow-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4" />
          <input
            type="text"
            placeholder="Search security events by type, IP, or details..."
            value={securitySearch}
            onChange={(e) => setSecuritySearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Timestamp</th>
                  <th className="px-6 py-4 font-medium">Event Type</th>
                  <th className="px-6 py-4 font-medium">IP Address</th>
                  <th className="px-6 py-4 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-mono text-xs">
                      {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`
                        font-mono text-[10px]
                        ${log.event_type.includes('FAILED') || log.event_type.includes('UNAUTHORIZED') 
                          ? 'border-red-500/30 text-red-400 bg-red-500/10' 
                          : 'border-purple-500/30 text-purple-400 bg-purple-500/10'}
                      `}>
                        {log.event_type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{log.ip_address}</td>
                    <td className="px-6 py-4 text-slate-400 max-w-sm overflow-hidden text-ellipsis">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <div className="p-8 text-center text-slate-500">No matching security events found.</div>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center">
            <ShieldCheck className="w-6 h-6 mr-3 text-emerald-500" />
            Immutable Logs
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Cryptographically secure read-only feed of all administrative and security actions.
          </p>
        </div>

        <div className="flex space-x-2 bg-slate-900/50 border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-md transition-all ${
              activeTab === 'audit' 
              ? 'bg-emerald-500/20 text-emerald-400 font-bold' 
              : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Audit</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-md transition-all ${
              activeTab === 'security' 
              ? 'bg-purple-500/20 text-purple-400 font-bold' 
              : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Security</span>
          </button>
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'audit' ? renderAuditTab() : renderSecurityTab()}
      </div>
    </div>
  );
};

export default AuditLogs;
