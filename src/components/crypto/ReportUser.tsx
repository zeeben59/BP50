import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { AlertTriangle, ShieldAlert, FileText, Send, UserCheck, Search, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

interface ReportUserProps {
  propTargetUserId?: string;
  relatedEntityId?: string;
}

const ReportUser: React.FC<ReportUserProps> = ({ propTargetUserId, relatedEntityId }) => {
  const { allUsers, submitReport, setCurrentPage } = useAppContext();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetUser = allUsers.find(u => u.id === propTargetUserId);

  useEffect(() => {
    if (!propTargetUserId) {
      toast({
        title: 'Invalid Context',
        description: 'No target user specified for this report.',
        variant: 'destructive'
      });
      setCurrentPage('markets');
    }
  }, [propTargetUserId, setCurrentPage]);

  const handleSubmit = async () => {
    if (!propTargetUserId || !reason || !description) return;

    setIsSubmitting(true);
    const success = await submitReport(propTargetUserId, reason, description, relatedEntityId, evidence);
    setIsSubmitting(false);

    if (success) {
      setCurrentPage('markets');
    }
  };

  if (!propTargetUserId) return null;

  return (
    <div className="flex flex-col items-center justify-start min-h-[80vh] w-full max-w-2xl mx-auto space-y-6 pt-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className="w-full bg-[#0b0e23] border-[#1e293b] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#10b981]/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[#10b981]/10 transition-all duration-500" />
        <CardHeader className="space-y-1 relative z-10 border-b border-[#1e293b] pb-6">
          <div className="flex items-center gap-2 text-[#10b981] mb-2 px-1">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">Security Protocol Alpha</span>
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Submit Intelligence Report
            <Badge variant="outline" className="text-[10px] border-[#334155] text-[#94a3b8] px-2 py-0">v2.0 Automated</Badge>
          </CardTitle>
          <CardDescription className="text-[#94a3b8] text-sm">
            Report suspicious behavior or contract violations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-8 px-8 relative z-10">
          <div className="p-4 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center gap-4 group/user hover:border-[#334155] transition-all">
            <div className="w-12 h-12 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center text-[#10b981] group-hover/user:scale-110 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider mb-0.5">Reporting Target</p>
              <h3 className="text-lg font-bold text-white capitalize">{targetUser?.username || 'Unknown Operator'}</h3>
              <p className="text-xs text-[#64748b] font-mono select-all">ID: {propTargetUserId}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="reason" className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest flex items-center gap-2">
                <Search className="w-3 h-3 text-[#10b981]" />
                Primary Violation
              </Label>
              <select
                id="reason"
                className="w-full h-11 bg-[#0f172a] border-[#1e293b] rounded-lg text-white text-sm focus:ring-2 focus:ring-[#10b981] focus:border-transparent outline-none px-3 transition-all cursor-pointer appearance-none"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="" disabled className="bg-[#0b0e23]">Select Violation Type...</option>
                <option value="fraud" className="bg-[#0b0e23]">Fraudulent Activity</option>
                <option value="spam" className="bg-[#0b0e23]">Spam or Manipulation</option>
                <option value="harassment" className="bg-[#0b0e23]">Harassment</option>
                <option value="suspicious_trade" className="bg-[#0b0e23]">Suspicious Trade Execution</option>
                <option value="wallet_theft" className="bg-[#0b0e23]">Wallet Access Compromise</option>
                <option value="other" className="bg-[#0b0e23]">Other Violation</option>
              </select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="relatedEntity" className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest flex items-center gap-2">
                <Info className="w-3 h-3 text-[#10b981]" />
                Related Transaction
              </Label>
              <Input
                id="relatedEntity"
                placeholder="Trade/TX ID (Optional)"
                className="bg-[#0f172a] border-[#1e293b] text-white placeholder:text-[#334155] focus:ring-[#10b981] focus:border-transparent h-11"
                value={relatedEntityId || ''}
                readOnly={!!relatedEntityId}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="description" className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-3 h-3 text-[#10b981]" />
              Detailed Briefing
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the incident. Minimum 10 characters."
              className="bg-[#0f172a] border-[#1e293b] text-white placeholder:text-[#334155] focus:ring-[#10b981] min-h-[120px] rounded-xl resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              minLength={10}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="evidence" className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest flex items-center gap-2">
              <Send className="w-3 h-3 text-[#10b981]" />
              External Evidence Link
            </Label>
            <Input
              id="evidence"
              placeholder="Evidence URL / Screenshot Link (Optional)"
              className="bg-[#0f172a] border-[#1e293b] text-white placeholder:text-[#334155] focus:ring-[#10b981] h-11"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="bg-[#0f172a]/50 border-t border-[#1e293b] p-8 mt-4">
          <Button
            onClick={handleSubmit}
            disabled={!reason || !description || description.length < 10 || isSubmitting}
            className={`w-full h-14 text-sm font-bold tracking-widest uppercase transition-all duration-300 relative overflow-hidden group/btn ${reason && description && description.length >= 10
              ? 'bg-[#10b981] hover:bg-[#059669] text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
              : 'bg-[#1e293b] text-[#475569] cursor-not-allowed border border-[#334155]'
              }`}
          >
            <div className="absolute inset-0 w-1/2 h-full bg-white/10 -skew-x-12 -translate-x-full group-hover/btn:translate-x-[250%] transition-transform duration-1000" />
            <div className="flex items-center gap-3 relative z-10">
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing Intelligence...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                  Submit Official Report
                </>
              )}
            </div>
          </Button>
        </CardFooter>
      </Card>

      <div className="flex items-center gap-2 py-4 text-[#64748b] text-[10px] font-bold tracking-[0.2em] uppercase">
        <ShieldAlert className="w-3 h-3 animate-pulse text-[#10b981]" />
        B50 Trade Compliance Protocol Active
      </div>
    </div>
  );
};

export default ReportUser;
