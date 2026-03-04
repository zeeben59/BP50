import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { useAdminContext } from '@/contexts/AdminContext';
import {
  LayoutDashboard, Activity, Users, Flag, BarChart2, DollarSign,
  MonitorPlay, FileText, Bell, Shield, LogOut, ChevronLeft, Settings
} from 'lucide-react';

const navItems = [
  { path: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { path: '/admin/live-feed', label: 'Live Activity', icon: Activity },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/withdrawals', label: 'Withdrawals', icon: DollarSign },
  { path: '/admin/reports', label: 'Reports', icon: Flag },
  { path: '/admin/trade-monitor', label: 'Trading Monitor', icon: BarChart2 },
  { path: '/admin/financial', label: 'Financial', icon: DollarSign },
  { path: '/admin/sessions', label: 'Sessions', icon: MonitorPlay },
  { path: '/admin/audits', label: 'Audit Logs', icon: FileText },
  { path: '/admin/alerts', label: 'Alerts', icon: Bell, badge: true },
  { path: '/admin/notifications', label: 'Notifications', icon: Bell },
  { path: '/admin/system', label: 'System Controls', icon: Settings },
  { path: '/admin/my-security', label: 'Security', icon: Shield },
];

const AdminLayout: React.FC = () => {
  const { user, logout } = useAppContext();
  const { activeAlertCount, connected } = useAdminContext();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#060a1e] flex">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 flex flex-col
        ${collapsed ? 'w-[72px]' : 'w-64'}
        bg-[#0a0e27] border-r border-white/5`}>

        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {!collapsed && <span className="text-white font-bold text-lg tracking-tight">Admin Console</span>}
          </div>
          <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-white">
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Connection Status */}
        {!collapsed && (
          <div className="px-4 py-2 border-b border-white/5">
            <div className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {connected ? 'CONNECTED' : 'DISCONNECTED'}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-red-500/15 to-orange-500/10 text-red-400 shadow-lg shadow-red-500/5'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
                ${collapsed ? 'justify-center px-2' : ''}`
              }
              title={item.label}
            >
              <span className="relative">
                <item.icon className="w-5 h-5" />
                {item.badge && activeAlertCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center animate-pulse">
                    {activeAlertCount > 9 ? '9+' : activeAlertCount}
                  </span>
                )}
              </span>
              {!collapsed && (
                <span className="flex-1">{item.label}</span>
              )}
              {!collapsed && item.badge && activeAlertCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-md border border-red-500/30">
                  {activeAlertCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 space-y-2">
          {!collapsed && user && (
            <div className="px-3 py-2">
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mt-0.5">{user.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all
              ${collapsed ? 'justify-center px-2' : ''}`}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-[72px]' : 'ml-64'}`}>
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
