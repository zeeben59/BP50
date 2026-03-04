import React, { useState } from 'react';
import { useAdminUsers } from '@/hooks/useAdmin';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import UserProfileDialog from './UserProfileDialog';

const UserManagement: React.FC = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data: usersData, isLoading, error } = useAdminUsers(page, search);
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-400 mb-2">Failed to load users</h3>
        <p className="text-slate-400">{(error as Error).message}</p>
      </div>
    );
  }

  const users = usersData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">User Management</h2>
          <p className="text-slate-400 text-sm mt-1">Manage platform users, roles, and status.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
          />
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
                <th className="px-6 py-4 font-medium">Risk Score</th>
                <th className="px-6 py-4 font-medium">Joined</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.map((user: any) => (
                <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{user.username}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={
                      user.role === 'superadmin' ? 'border-purple-500 text-purple-400' :
                      user.role === 'admin' ? 'border-emerald-500 text-emerald-400' :
                      'border-slate-700 text-slate-400'
                    }>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={
                      user.status === 'active' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                      user.status === 'frozen' ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' :
                      'border-red-500/50 text-red-400 bg-red-500/10'
                    }>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 flex items-center gap-1">
                    <span className={user.risk_score > 70 ? 'text-red-400 font-medium' : 'text-slate-400'}>
                      {user.risk_score}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setIsProfileOpen(true);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-medium px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition-colors"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No users found matching your search.
            </div>
          )}
        </div>
      </div>

      <UserProfileDialog 
        userId={selectedUserId} 
        open={isProfileOpen} 
        onOpenChange={(open) => {
          setIsProfileOpen(open);
          if (!open) setSelectedUserId(null);
        }} 
      />
    </div>
  );
};

export default UserManagement;
