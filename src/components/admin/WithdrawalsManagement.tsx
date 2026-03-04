import React, { useState } from 'react';
import { useAdminWithdrawals, useAdminMutations } from '@/hooks/useAdmin';
import { 
  Loader2, Search, Filter, ArrowUpRight, 
  CheckCircle2, XCircle, Clock, Banknote,
  MoreVertical, Eye, Download
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from '@/components/ui/use-toast';

const WithdrawalsManagement: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: withdrawalsData, isLoading, error } = useAdminWithdrawals();
  const { processWithdrawal } = useAdminMutations();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const withdrawals = (withdrawalsData?.data || []).filter((w: any) => {
    const matchesSearch = w.username?.toLowerCase().includes(search.toLowerCase()) || 
                         w.bank_name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || w.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedWithdrawal) return;
    
    if (action === 'reject' && !rejectionReason.trim()) {
      toast({ title: "Error", description: "Please provide a reason for rejection", variant: "destructive" });
      return;
    }

    processWithdrawal.mutate({
      withdrawalId: selectedWithdrawal.id,
      action,
      reason: action === 'reject' ? rejectionReason : undefined
    }, {
      onSuccess: () => {
        setIsDetailsOpen(false);
        setRejectionReason('');
        setSelectedWithdrawal(null);
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Banknote className="w-6 h-6 text-emerald-500" />
            Withdrawal Management
          </h2>
          <p className="text-slate-400 text-sm mt-1">Review and process platform withdrawal requests.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4" />
            <input
              type="text"
              placeholder="Search user or bank..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900/50 border border-slate-800 text-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 w-64"
            />
          </div>
          
          <div className="flex bg-slate-900/50 border border-slate-800 rounded-lg p-1">
            {['all', 'pending', 'approved', 'rejected'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all capitalize ${
                  filter === f 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-slate-950/50">
            <TableRow className="border-slate-800/50 hover:bg-transparent">
              <TableHead className="text-slate-400 font-medium">Recipient</TableHead>
              <TableHead className="text-slate-400 font-medium">Method</TableHead>
              <TableHead className="text-slate-400 font-medium">Amount</TableHead>
              <TableHead className="text-slate-400 font-medium text-center">Status</TableHead>
              <TableHead className="text-slate-400 font-medium">Date</TableHead>
              <TableHead className="text-slate-400 font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withdrawals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                  No withdrawal requests found.
                </TableCell>
              </TableRow>
            ) : (
              withdrawals.map((w: any) => (
                <TableRow key={w.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <TableCell>
                    <div className="font-medium text-slate-200">{w.username || 'Unknown User'}</div>
                    <div className="text-xs text-slate-500">{w.email || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-slate-300 text-sm">{w.bank_name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{w.account_number}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-emerald-400 font-mono font-bold">
                      ${w.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(w.status)}
                  </TableCell>
                  <TableCell className="text-slate-400 text-xs">
                    {format(new Date(w.created_at), 'MMM d, yyyy')}<br/>
                    <span className="opacity-50">{format(new Date(w.created_at), 'HH:mm')}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <button 
                      onClick={() => {
                        setSelectedWithdrawal(w);
                        setIsDetailsOpen(true);
                      }}
                      className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Withdrawal Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ArrowUpRight className="text-orange-500" />
              Withdrawal Details
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Review transaction details and bank information for approval.
            </DialogDescription>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Requested Amount</p>
                  <p className="text-lg font-bold text-emerald-400 font-mono">${selectedWithdrawal.amount.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedWithdrawal.status)}</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1">Bank Information</h4>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs text-[10px]">Bank Name</p>
                    <p className="text-slate-200">{selectedWithdrawal.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs text-[10px]">Account Holder</p>
                    <p className="text-slate-200">{selectedWithdrawal.account_name}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500 text-xs text-[10px]">Account Number / SWIFT</p>
                    <p className="text-slate-200 font-mono">{selectedWithdrawal.account_number}</p>
                  </div>
                </div>
              </div>

              {selectedWithdrawal.status === 'pending' && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1">Internal Review</h4>
                  <textarea
                    placeholder="Reason for rejection (required if rejecting)..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 placeholder-slate-600 focus:ring-1 focus:ring-emerald-500 outline-none resize-none h-24"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedWithdrawal?.status === 'pending' ? (
              <>
                <button
                  onClick={() => handleAction('reject')}
                  disabled={processWithdrawal.isPending}
                  className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
                >
                  {processWithdrawal.isPending ? 'Processing...' : 'Reject Request'}
                </button>
                <button
                  onClick={() => handleAction('approve')}
                  disabled={processWithdrawal.isPending}
                  className="flex-1 bg-emerald-500 text-slate-950 hover:bg-emerald-400 px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
                >
                  {processWithdrawal.isPending ? 'Processing...' : 'Approve & Release'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="w-full bg-slate-800 text-slate-200 hover:bg-slate-700 px-4 py-2 rounded-lg font-bold transition-all"
              >
                Close
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WithdrawalsManagement;
