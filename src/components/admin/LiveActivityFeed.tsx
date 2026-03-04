import React, { useEffect, useState } from 'react';
import { useAdminActivityStream } from '@/hooks/useAdmin';
import { format } from 'date-fns';
import { Loader2, Activity, Filter, LogIn, ArrowRightLeft, UploadCloud, DownloadCloud } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const API_URL = ((import.meta as any).env?.VITE_API_URL as string) || '';

const LiveActivityFeed: React.FC = () => {
  const { data, isLoading } = useAdminActivityStream();
  const [stream, setStream] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    if (data?.data) {
      setStream(data.data);
    }
  }, [data]);

  useEffect(() => {
    // Connect to Admin WebSocket namespace
    const socket: Socket = io(API_URL);

    socket.emit('join_admin');

    socket.on('admin:activity', (activity: any) => {
      setStream(prev => [activity, ...prev].slice(0, 500));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const getEventIcon = (type: string) => {
    if (type.includes('LOGIN')) return <LogIn className="w-4 h-4 text-emerald-400" />;
    if (type.includes('TRADE')) return <ArrowRightLeft className="w-4 h-4 text-blue-400" />;
    if (type.includes('DEPOSIT')) return <DownloadCloud className="w-4 h-4 text-purple-400" />;
    if (type.includes('WITHDRAW')) return <UploadCloud className="w-4 h-4 text-orange-400" />;
    return <Activity className="w-4 h-4 text-slate-400" />;
  };

  const filteredStream = stream.filter(s => filter === 'ALL' || s.event_type.includes(filter));

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center">
            <Activity className="w-6 h-6 mr-3 text-emerald-500" />
            Live Activity Feed
          </h2>
          <p className="text-slate-400 text-sm mt-1">Real-time stream of all platform events.</p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <Filter className="w-4 h-4 text-slate-500 ml-2 mr-1" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-transparent text-sm text-slate-300 outline-none border-none focus:ring-0 [&>option]:bg-slate-900"
          >
            <option value="ALL">All Events</option>
            <option value="LOGIN">Logins</option>
            <option value="REGISTER">Registrations</option>
            <option value="TRADE">Trades</option>
            <option value="DEPOSIT">Deposits</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-3 z-10 bg-slate-900/80 backdrop-blur-sm rounded-bl-lg">
          <span className="flex items-center text-xs text-emerald-500 font-mono font-bold">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
            LIVE DATA
          </span>
        </div>
        <div className="max-h-[700px] overflow-y-auto w-full p-4 custom-scrollbar">
          {filteredStream.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-sm border border-dashed border-slate-800 rounded-lg">Awaiting events...</div>
          ) : (
            <div className="space-y-3">
              {filteredStream.map((event, idx) => (
                <div key={event.id || idx} className="flex items-start bg-slate-950 p-4 rounded-lg hover:bg-slate-800/80 transition-colors border border-slate-800/80">
                  <div className="mt-1 mr-4 bg-slate-900 p-2.5 rounded-lg shadow-inner border border-slate-800/50">
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="flex-1 w-full relative">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm text-slate-200 tracking-wide">{event.event_type}</span>
                      <span className="text-xs text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded">{format(new Date(event.created_at), 'MMM d, HH:mm:ss')}</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-2">{event.details}</p>
                    <div className="flex flex-wrap items-center mt-3 gap-2">
                      {event.email !== 'System' && (
                        <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">{event.email}</span>
                      )}
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full font-mono">{event.ip_address}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveActivityFeed;
