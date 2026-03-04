import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminOverview from '@/components/admin/AdminOverview';
import UserManagement from '@/components/admin/UserManagement';
import SystemControls from '@/components/admin/SystemControls';
import AuditLogs from '@/components/admin/AuditLogs';
import LiveActivityFeed from '@/components/admin/LiveActivityFeed';
import TradingMonitor from '@/components/admin/TradingMonitor';
import ActiveSessions from '@/components/admin/ActiveSessions';
import AdminSecurity from '@/components/admin/AdminSecurity';
import FinancialOversight from '@/components/admin/FinancialOversight';
import AlertsPage from '@/components/admin/AlertsPage';
import ReportsManagement from '@/components/admin/ReportsManagement';
import WithdrawalsManagement from '@/components/admin/WithdrawalsManagement';
import NotificationManager from '@/components/admin/NotificationManager';

const AdminPage: React.FC = () => {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="withdrawals" element={<WithdrawalsManagement />} />
        <Route path="system" element={<SystemControls />} />
        <Route path="audits" element={<AuditLogs />} />
        <Route path="security" element={<AuditLogs />} />
        <Route path="live-feed" element={<LiveActivityFeed />} />
        <Route path="trade-monitor" element={<TradingMonitor />} />
        <Route path="sessions" element={<ActiveSessions />} />
        <Route path="financial" element={<FinancialOversight />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="reports" element={<ReportsManagement />} />
        <Route path="notifications" element={<NotificationManager />} />
        <Route path="my-security" element={<AdminSecurity />} />
      </Route>
    </Routes>
  );
};

export default AdminPage;
