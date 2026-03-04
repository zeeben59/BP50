import React from 'react';
import { useAdminSystemStatus, useAdminMutations } from '@/hooks/useAdmin';
import { Shield, Activity, Database, Users, Power, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SystemControls: React.FC = () => {
  const { data: status, isLoading } = useAdminSystemStatus();
  const { toggleTradingHalt } = useAdminMutations();

  if (isLoading) return <div className="p-8 text-slate-400">Loading system status...</div>;

  const handleToggleHalt = () => {
    if (!status) return;
    const isHalted = status.trading_halt;
    if (confirm(`Are you sure you want to ${isHalted ? 'RESUME' : 'HALT'} global trading?`)) {
      toggleTradingHalt.mutate(!isHalted);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-100">System Controls</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Telemetry Cards */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${status?.db_connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            <Database className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Database</p>
            <p className="font-semibold text-slate-200">{status?.db_connected ? 'Connected' : 'Disconnected'}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Active Sockets</p>
            <p className="font-semibold text-slate-200">{status?.active_users || 0}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
            <Activity className="h-6 w-6" />
          </div>
          <div>
             <p className="text-sm text-slate-400">Uptime</p>
             <p className="font-semibold text-slate-200">
               {status?.uptime ? formatDistanceToNow(Date.now() - status.uptime * 1000) : 'Unknown'}
             </p>
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-100 mt-8 mb-4">Critical Operations</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Trading Halt Toggle */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <h4 className="font-bold text-slate-200 text-lg">Global Trading Halt</h4>
              </div>
              <p className="text-sm text-slate-400 mt-2 max-w-sm">
                Immediately prevents all users from opening or closing trades. Active orders remain pending. 
              </p>
            </div>
            
            <button 
              onClick={handleToggleHalt}
              disabled={toggleTradingHalt.isPending}
              className={`px-6 py-3 rounded-lg font-bold shadow-lg transition-all ${
                status?.trading_halt 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 neon-border-emerald' 
                : 'bg-red-500 hover:bg-red-400 text-white neon-border-red'
              }`}
            >
              {toggleTradingHalt.isPending ? 'Processing...' : status?.trading_halt ? 'RESUME TRADING' : 'HALT TRADING'}
            </button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Current Status: 
              {status?.trading_halt 
                ? <span className="ml-2 px-2 py-1 rounded bg-red-500/10 text-red-400 font-bold border border-red-500/30 font-mono text-xs">HALTED</span> 
                : <span className="ml-2 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30 font-mono text-xs">OPERATIONAL</span>
              }
            </span>
          </div>
        </div>
        
         {/* Maintenance Mode (Placeholder for future hook) */}
         <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6 relative opacity-50 cursor-not-allowed">
           <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
           <div className="flex items-start justify-between">
             <div>
               <div className="flex items-center space-x-2">
                 <Power className="h-5 w-5 text-orange-400" />
                 <h4 className="font-bold text-slate-200 text-lg">Maintenance Mode</h4>
               </div>
               <p className="text-sm text-slate-400 mt-2 max-w-sm">
                 Displays a maintenance banner and prevents non-admin login. Coming soon.
               </p>
             </div>
             
             <button disabled className="px-6 py-3 rounded-lg font-bold shadow-lg bg-orange-500 text-slate-900 opacity-50">
               TOGGLE
             </button>
           </div>
         </div>

      </div>
    </div>
  );
};

export default SystemControls;
