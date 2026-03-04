import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import {
    Bell, Send, Users, User, Info,
    CheckCircle, AlertTriangle, AlertCircle,
    Search, Loader2, History, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { useAdminMutations } from '@/hooks/useAdmin';

const API_URL = '';

const NotificationManager: React.FC = () => {
    const { allUsers, socket, user: adminUser } = useAppContext();
    const [targetType, setTargetType] = useState<'all' | 'private'>('all');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
    const [searchQuery, setSearchQuery] = useState('');
    const [sending, setSending] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const { deleteAdminNotification } = useAdminMutations();

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const resp = await fetch(`${API_URL}/api/admin/notifications`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const json = await resp.json();
            if (json.notifications) setHistory(json.notifications);
        } catch (err) {
            console.error('Failed to fetch notification history');
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (targetType === 'private' && !selectedUserId) {
            toast({ title: 'Error', description: 'Please select a user', variant: 'destructive' });
            return;
        }

        setSending(true);
        try {
            const resp = await fetch(`${API_URL}/api/admin/notifications`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    target: targetType === 'all' ? 'all' : selectedUserId,
                    title,
                    message,
                    type
                })
            });

            const json = await resp.json();
            if (json.success) {
                toast({ title: 'Sent!', description: 'Notification broadcasted successfully.' });
                setTitle('');
                setMessage('');
                fetchHistory();
            } else {
                toast({ title: 'Failed', description: json.error || 'Could not send notification', variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
        } finally {
            setSending(false);
        }
    };

    const filteredUsers = allUsers.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Notification Manager</h2>
                    <p className="text-slate-400 text-sm mt-1">Broadcast system-wide alerts or send private messages to users.</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Bell className="w-6 h-6 text-emerald-400" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Compose Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Send className="w-5 h-5 text-blue-400" />
                            Compose Notification
                        </h3>

                        <form onSubmit={handleSend} className="space-y-6">
                            {/* Target Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-400">Recipient Target</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setTargetType('all')}
                                        className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${targetType === 'all'
                                            ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                            : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'
                                            }`}
                                    >
                                        <Users className="w-5 h-5" />
                                        <div className="text-left">
                                            <p className="font-bold text-sm">Everyone</p>
                                            <p className="text-[10px] opacity-70">Global Publication</p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTargetType('private')}
                                        className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${targetType === 'private'
                                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                            : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'
                                            }`}
                                    >
                                        <User className="w-5 h-5" />
                                        <div className="text-left">
                                            <p className="font-bold text-sm">Private User</p>
                                            <p className="text-[10px] opacity-70">Specific Individual</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* User Selector for Private */}
                            {targetType === 'private' && (
                                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                                    <label className="text-sm font-medium text-slate-400">Select User</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search by username or email..."
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-colors"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="bg-slate-950 border border-slate-800 rounded-xl max-h-48 overflow-y-auto custom-scrollbar">
                                        {filteredUsers.length > 0 ? (
                                            <div className="p-1">
                                                {filteredUsers.map(u => (
                                                    <button
                                                        key={u.id}
                                                        type="button"
                                                        onClick={() => setSelectedUserId(u.id)}
                                                        className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between group transition-colors ${selectedUserId === u.id ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                                            }`}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium">{u.username}</span>
                                                            <span className="text-[10px] opacity-60 font-mono tracking-tight">{u.email}</span>
                                                        </div>
                                                        {selectedUserId === u.id && <CheckCircle className="w-4 h-4" />}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-slate-600 text-xs italic">No users found</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Notification Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-slate-400">Alert Title</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. System Update"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-slate-400">Alert Type</label>
                                    <div className="flex gap-2">
                                        {(['info', 'success', 'warning', 'error'] as const).map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setType(t)}
                                                className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${type === t
                                                    ? (t === 'info' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' :
                                                        t === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                                                            t === 'warning' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' :
                                                                'bg-red-500/20 border-red-500/50 text-red-400')
                                                    : 'bg-slate-950/50 border-slate-800 text-slate-600 hover:border-slate-700'
                                                    }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-400">Message Content</label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="What would you like to tell your users?"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors resize-none"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={sending}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                {targetType === 'all' ? 'Broadcast to All Users' : 'Send Private Notification'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* History Section */}
                <div className="space-y-6">
                    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl h-full flex flex-col">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <History className="w-5 h-5 text-purple-400" />
                            Recent Broadcasts
                        </h3>

                        <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                            {loadingHistory ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <p className="text-xs">Loading history...</p>
                                </div>
                            ) : history.length > 0 ? (
                                history.slice(0, 15).map(item => (
                                    <div key={item.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/50 space-y-2 hover:border-slate-700 transition-all group">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                {item.type === 'error' ? <AlertCircle size={14} className="text-red-400" /> :
                                                    item.type === 'warning' ? <AlertTriangle size={14} className="text-amber-400" /> :
                                                        item.type === 'success' ? <CheckCircle size={14} className="text-emerald-400" /> :
                                                            <Info size={14} className="text-blue-400" />}
                                                <span className="text-xs font-bold text-slate-200 truncate pr-2 max-w-[120px]">{item.title}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={`text-[9px] h-4 ${item.target === 'all' ? 'border-blue-500/30 text-blue-400' : 'border-emerald-500/30 text-emerald-400'}`}>
                                                    {item.target === 'all' ? 'GLOBAL' : 'PRIVATE'}
                                                </Badge>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Are you sure you want to delete this notification?')) {
                                                            deleteAdminNotification.mutate(item.id, {
                                                                onSuccess: () => fetchHistory()
                                                            });
                                                        }
                                                    }}
                                                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                                                    title="Delete Notification"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{item.message}</p>
                                        <div className="flex items-center justify-between pt-1">
                                            <p className="text-[9px] font-mono text-slate-600 italic">
                                                {format(new Date(item.timestamp), 'MMM d, HH:mm')}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-20">
                                    <Bell className="w-12 h-12" />
                                    <p className="text-sm">No notification history</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationManager;
