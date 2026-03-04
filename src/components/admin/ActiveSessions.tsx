import React from 'react';
import { useAdminActiveSessions, useAdminMutations } from '@/hooks/useAdmin';
import { useAppContext } from '@/contexts/AppContext';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, MonitorPlay, Wifi, WifiOff, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ActiveSessions: React.FC = () => {
  const { data, isLoading, error } = useAdminActiveSessions();
  const { forceLogoutUser } = useAdminMutations();
  const { user: currentUser } = useAppContext();

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  if (error) return <div className="p-8 text-center text-red-500">Failed to load active sessions</div>;

  const sessions = data?.data || [];
  const onlineCount = sessions.filter((s: any) => s.is_online).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center">
            <MonitorPlay className="w-6 h-6 mr-3 text-emerald-500" />
            Active Sessions
          </h2>
          <p className="text-slate-400 text-sm mt-1">Live tracking of connected users. Force disconnect suspicious sessions.</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 flex items-center">
          <span className="text-sm text-slate-400 mr-2">Online:</span>
          <span className="text-lg font-bold text-emerald-400">{onlineCount}</span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Last Activity</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sessions.map((session: any) => (
                <tr key={session.user_id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{session.username}</div>
                    <div className="text-xs text-slate-500">{session.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={
                      session.role === 'superadmin' ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' :
                      session.role === 'admin' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
                      'border-slate-700 text-slate-400 bg-slate-800/50'
                    }>
                      {session.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {session.is_online ? (
                      <div className="flex items-center text-emerald-400">
                        <Wifi className="w-4 h-4 mr-2" />
                        <span className="font-semibold text-xs uppercase tracking-wide">Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-slate-500">
                        <WifiOff className="w-4 h-4 mr-2" />
                        <span className="font-semibold text-xs uppercase tracking-wide">Offline</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {session.last_seen ? (
                      session.is_online ? (
                        <span className="text-emerald-500/80 font-mono text-xs">Active Now</span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">
                          {formatDistanceToNow(new Date(session.last_seen))} ago
                        </span>
                      )
                    ) : (
                      <span className="text-slate-600 italic">Unknown</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {session.is_online && session.user_id !== currentUser?.id && (
                      <button
                        onClick={() => forceLogoutUser.mutate({ userId: session.user_id, reason: 'Admin force logout' })}
                        disabled={forceLogoutUser.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition opacity-0 group-hover:opacity-100"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Force Logout
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sessions.length === 0 && (
            <div className="p-8 text-center text-slate-500">No active sessions found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveSessions;
