import React, { useState } from 'react';
import { useAdminReports, useAdminMutations, useAdminUsers } from '@/hooks/useAdmin';
import { Flag, Loader2, Search, AlertTriangle, Shield, Ban, XCircle, ChevronDown, ChevronUp, User, History, ExternalLink, ShieldAlert, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface AdminReport {
  id: string;
  reporter_id: string;
  reporter_name?: string;
  reported_user_id: string;
  reported_name?: string;
  reason: string;
  description: string;
  related_entity_id?: string;
  evidence?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  resolution_notes?: string;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  status: 'active' | 'frozen' | 'banned' | 'under_review';
}

const ReportsManagement: React.FC = () => {
  const { data: reportsData, isLoading: reportsLoading } = useAdminReports();
  const { data: usersData, isLoading: usersLoading } = useAdminUsers();
  const { respondToReport, updateUserStatus } = useAdminMutations();
  const [search, setSearch] = useState('');
  const [expandedTargetId, setExpandedTargetId] = useState<string | null>(null);
  const [internalNote, setInternalNote] = useState('');

  if (reportsLoading || usersLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>;
  }

  const allReports: AdminReport[] = reportsData?.data || [];
  const allUsers: AdminUser[] = usersData?.users || [];

  const filteredReports = allReports.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const target = allUsers.find((u) => u.id === r.reported_user_id);
    return r.reason?.toLowerCase().includes(s) ||
      r.reported_user_id?.toLowerCase().includes(s) ||
      target?.username?.toLowerCase().includes(s) ||
      r.reporter_id?.toLowerCase().includes(s);
  });

  // Grouping logic
  const groups = filteredReports.reduce((acc: Record<string, { reports: AdminReport[], target: AdminUser | undefined }>, r) => {
    const tid = r.reported_user_id || 'unknown';
    if (!acc[tid]) acc[tid] = { reports: [], target: allUsers.find((u) => u.id === tid) };
    acc[tid].reports.push(r);
    return acc;
  }, {});

  const groupList = Object.keys(groups).map(id => ({
    id,
    ...groups[id]
  })).sort((a, b) => b.reports.length - a.reports.length);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return 'border-orange-500/30 text-orange-400 bg-orange-500/10';
      case 'reviewing': return 'border-blue-500/30 text-blue-400 bg-blue-500/10';
      case 'resolved': return 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10';
      case 'dismissed': return 'border-slate-700 text-slate-400 bg-slate-800/50';
      default: return 'border-slate-700 text-slate-400';
    }
  };

  const getUserStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>;
      case 'frozen': return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Frozen</Badge>;
      case 'banned': return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20">Banned</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleGroupAction = async (targetUserId: string, action: string) => {
    try {
      if (action === 'freeze') {
        await updateUserStatus.mutateAsync({ userId: targetUserId, status: 'frozen', reason: internalNote || 'Automated freeze via report review' });
      } else if (action === 'ban') {
        await updateUserStatus.mutateAsync({ userId: targetUserId, status: 'banned', reason: internalNote || 'Banned for multiple violations' });
      } else if (action === 'activate') {
        await updateUserStatus.mutateAsync({ userId: targetUserId, status: 'active', reason: 'Restored by Admin' });
      }

      // Automatically resolve all pending reports for this user
      const pendingReports = groups[targetUserId].reports.filter((r) => r.status === 'pending');
      for (const report of pendingReports) {
        await respondToReport.mutateAsync({
          reportId: report.id,
          status: 'resolved',
          resolution_notes: `Universal resolution: ${action.toUpperCase()} action taken on user.`
        });
      }

      toast({ title: 'Success', description: `Action ${action} applied to user and reports resolved.` });
      setInternalNote('');
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to apply group action.', variant: 'destructive' });
    }
  };

  const handleSingleReportAction = async (reportId: string, status: 'resolved' | 'dismissed' | 'reviewing') => {
    await respondToReport.mutateAsync({
      reportId,
      status,
      resolution_notes: internalNote || `Report marked as ${status}`
    });
    setInternalNote('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 px-2 lg:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
            Intelligence & Reports
          </h2>
          <p className="text-slate-400 text-sm mt-1">Grouped by target user for rapid enforcement.</p>
        </div>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="Search Target/Reporter/Reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-full md:w-80 transition-all shadow-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {groupList.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl py-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500/30" />
            </div>
            <p className="text-slate-400 font-medium text-lg">Platform is Secure</p>
            <p className="text-slate-500 max-w-xs text-sm mt-1">No outstanding reports require investigation at this time.</p>
          </div>
        ) : (
          groupList.map(group => {
            const isExpanded = expandedTargetId === group.id;
            const pendingCount = group.reports.filter((r) => r.status === 'pending').length;

            return (
              <div key={group.id} className={`bg-slate-900 border ${pendingCount > 0 ? 'border-orange-500/20 shadow-orange-500/5' : 'border-slate-800'} rounded-2xl overflow-hidden transition-all duration-300 shadow-xl ${isExpanded ? 'ring-2 ring-emerald-500/20' : ''}`}>
                <div
                  className={`p-4 lg:p-6 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${isExpanded ? 'bg-slate-800/40' : 'hover:bg-slate-800/20'}`}
                  onClick={() => setExpandedTargetId(isExpanded ? null : group.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${pendingCount > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-800 text-slate-400'}`}>
                        <User className="w-6 h-6" />
                      </div>
                      {pendingCount > 0 && (
                        <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center shadow-lg border-2 border-[#111738]">
                          {pendingCount}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-bold text-lg">{group.target?.username || 'Unknown User'}</h3>
                        {getUserStatusBadge(group.target?.status || 'active')}
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{group.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="hidden lg:block">
                      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Total Reports</p>
                      <p className="text-white font-mono">{group.reports.length}</p>
                    </div>
                    <div className="hidden lg:block">
                      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Last Activity</p>
                      <p className="text-white">
                        {format(new Date(group.reports[0].created_at), 'MMM d, HH:mm')}
                      </p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${isExpanded ? 'bg-white/10 text-white' : 'text-slate-400'}`}>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      <span className="font-bold uppercase text-[10px] tracking-widest">{isExpanded ? 'Close' : 'Review'}</span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 border-t border-slate-800 bg-slate-950/50 space-y-6">
                    {/* Bulk Actions */}
                    <div className="flex flex-col lg:flex-row gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Final Enforcement Selection</label>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => handleGroupAction(group.id, 'freeze')} variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500 hover:text-white">
                            <Shield className="w-4 h-4 mr-2" /> Freeze User & Resolve
                          </Button>
                          <Button size="sm" onClick={() => handleGroupAction(group.id, 'ban')} variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white">
                            <Ban className="w-4 h-4 mr-2" /> Ban User & Resolve
                          </Button>
                          <Button size="sm" onClick={() => setExpandedTargetId(null)} variant="ghost" className="text-slate-400 hover:bg-slate-800">
                            <XCircle className="w-4 h-4 mr-2" /> No Action Required
                          </Button>
                        </div>
                      </div>
                      <div className="w-full lg:w-1/3">
                        <textarea
                          value={internalNote}
                          onChange={(e) => setInternalNote(e.target.value)}
                          placeholder="Internal notes/reasoning..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none h-20 resize-none"
                        />
                      </div>
                    </div>

                    {/* Detailed Reports Table */}
                    <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
                      <Table>
                        <TableHeader className="bg-slate-950/40">
                          <TableRow className="border-slate-800">
                            <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Reporter</TableHead>
                            <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Reason</TableHead>
                            <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Entity/Evidence</TableHead>
                            <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Date</TableHead>
                            <TableHead className="text-right text-[10px] text-slate-500 font-bold uppercase tracking-widest">Operations</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.reports.map((report) => (
                            <TableRow key={report.id} className="border-slate-800 hover:bg-slate-800/30">
                              <TableCell className="font-mono text-[10px] text-slate-300">
                                {report.reporter_name || report.reporter_id?.substring(0, 8)}
                              </TableCell>
                              <TableCell>
                                <p className="text-xs text-white font-medium">{report.reason}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5 max-w-[200px] truncate">{report.description}</p>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  {report.related_entity_id && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-mono">
                                      <History className="w-3 h-3" /> {report.related_entity_id}
                                    </div>
                                  )}
                                  {report.evidence && (
                                    <a href={report.evidence} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-blue-400 hover:underline">
                                      <ExternalLink className="w-3 h-3" /> View Artifact
                                    </a>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-[10px] text-slate-400">
                                {format(new Date(report.created_at), 'MMM d, HH:mm')}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Badge variant="outline" className={`text-[9px] uppercase tracking-tighter ${getStatusStyle(report.status)}`}>
                                    {report.status}
                                  </Badge>
                                  {report.status === 'pending' && (
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-500 hover:text-emerald-500" onClick={() => handleSingleReportAction(report.id, 'resolved')}>
                                      <CheckCircle className="w-3 h-3" />
                                    </Button>
                                  )}
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-500 hover:text-rose-500" onClick={() => handleSingleReportAction(report.id, 'dismissed')}>
                                    <XCircle className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ReportsManagement;
