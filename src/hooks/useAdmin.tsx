import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { User } from '@/contexts/AppContext';

const API_URL = ((import.meta as any).env?.VITE_API_URL as string) || '';

const fetchWithToken = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useAdminSystemStatus = () => {
  return useQuery({
    queryKey: ['adminSystemStatus'],
    queryFn: () => fetchWithToken('/api/admin/system-status'),
    refetchInterval: 30000,
  });
};

export const useAdminUsers = (page = 1, search = '') => {
  return useQuery({
    queryKey: ['adminUsers', page, search],
    queryFn: () => fetchWithToken(`/api/admin/users?page=${page}&search=${search}`),
  });
};

export const useAdminUserDetails = (userId: string | null) => {
  return useQuery({
    queryKey: ['adminUserDetails', userId],
    queryFn: () => fetchWithToken(`/api/admin/users/${userId}/details`),
    enabled: !!userId,
  });
};

export const useAdminWithdrawals = () => {
  return useQuery({
    queryKey: ['adminWithdrawals'],
    queryFn: () => fetchWithToken('/api/admin/withdrawals'),
  });
};

export const useAdminReports = () => {
  return useQuery({
    queryKey: ['adminReports'],
    queryFn: () => fetchWithToken('/api/admin/reports'),
  });
};

export const useAdminAuditLogs = () => {
  return useQuery({
    queryKey: ['adminAuditLogs'],
    queryFn: () => fetchWithToken('/api/admin/audit-logs'),
  });
};

export const useAdminSecurityLogs = () => {
  return useQuery({
    queryKey: ['adminSecurityLogs'],
    queryFn: () => fetchWithToken('/api/admin/security-logs'),
  });
};

export const useAdminActivityStream = () => {
  return useQuery({
    queryKey: ['adminActivityStream'],
    queryFn: () => fetchWithToken('/api/admin/activity-stream'),
  });
};

export const useAdminActiveSessions = () => {
  return useQuery({
    queryKey: ['adminActiveSessions'],
    queryFn: () => fetchWithToken('/api/admin/active-sessions'),
    refetchInterval: 10000,
  });
};

export const useAdminTradingMetrics = () => {
  return useQuery({
    queryKey: ['adminTradingMetrics'],
    queryFn: () => fetchWithToken('/api/admin/trading-metrics'),
    refetchInterval: 10000,
  });
};

export const useAdminTradingSummary = () => {
  return useQuery({
    queryKey: ['adminTradingSummary'],
    queryFn: () => fetchWithToken('/api/admin/trading-summary'),
    refetchInterval: 10000,
  });
};

export const useAdminOverviewStats = () => {
  return useQuery({
    queryKey: ['adminOverviewStats'],
    queryFn: () => fetchWithToken('/api/admin/overview-stats'),
    refetchInterval: 15000,
  });
};

export const useAdminFinancialOverview = () => {
  return useQuery({
    queryKey: ['adminFinancialOverview'],
    queryFn: () => fetchWithToken('/api/admin/financial/overview'),
    refetchInterval: 30000,
  });
};

export const useAdminFinancialLedger = (page = 1, typeFilter = '') => {
  return useQuery({
    queryKey: ['adminFinancialLedger', page, typeFilter],
    queryFn: () => fetchWithToken(`/api/admin/financial/ledger?page=${page}${typeFilter ? `&type=${typeFilter}` : ''}`),
  });
};

export const useAdminAlerts = () => {
  return useQuery({
    queryKey: ['adminAlerts'],
    queryFn: () => fetchWithToken('/api/admin/alerts'),
    refetchInterval: 15000,
  });
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useAdminMutations = () => {
  const queryClient = useQueryClient();

  const toggleTradingHaltMutation = useMutation({
    mutationFn: (halt: boolean) => fetchWithToken('/api/admin/trading-halt', {
      method: 'POST',
      body: JSON.stringify({ halt })
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminSystemStatus'] });
      toast({ title: 'Success', description: `Trading halt set to ${data.trading_halt}` });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: ({ userId, status, reason }: { userId: string, status: string, reason: string }) =>
      fetchWithToken(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, reason })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminUserDetails'] });
      toast({ title: 'Success', description: 'User status updated successfully.' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const adjustUserBalanceMutation = useMutation({
    mutationFn: ({ userId, amount_change, reason, admin_password }: any) =>
      fetchWithToken(`/api/admin/users/${userId}/balance`, {
        method: 'POST',
        body: JSON.stringify({ amount_change, reason, admin_password })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUserDetails'] });
      toast({ title: 'Success', description: 'Balance adjusted successfully.' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const seizeFundsMutation = useMutation({
    mutationFn: ({ userId, amount, reason, admin_password }: any) =>
      fetchWithToken(`/api/admin/users/${userId}/seize`, {
        method: 'POST',
        body: JSON.stringify({ amount, reason, admin_password })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUserDetails'] });
      toast({ title: 'Success', description: 'Funds seized successfully.' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const processWithdrawalMutation = useMutation({
    mutationFn: ({ withdrawalId, action, reason }: { withdrawalId: string, action: 'approve' | 'reject', reason?: string }) =>
      fetchWithToken(`/api/admin/withdrawals/${withdrawalId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminWithdrawals'] });
      toast({ title: 'Success', description: 'Withdrawal processed successfully.' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const respondToReportMutation = useMutation({
    mutationFn: ({ reportId, status, resolution_notes, escalation }: any) =>
      fetchWithToken(`/api/admin/reports/${reportId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ status, resolution_notes, escalation })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      toast({ title: 'Success', description: 'Report updated successfully.' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role, permissions }: { userId: string, role: string, permissions: any }) =>
      fetchWithToken(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        body: JSON.stringify({ role, permissions })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminUserDetails'] });
      toast({ title: 'Success', description: 'User role updated successfully.' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const setup2FAMutation = useMutation({
    mutationFn: () => fetchWithToken('/api/admin/2fa/setup', { method: 'POST' }),
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const verify2FAMutation = useMutation({
    mutationFn: ({ token }: { token: string }) =>
      fetchWithToken('/api/admin/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ token })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast({ title: 'Success', description: '2FA has been successfully enabled.' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const toggleMaintenanceModeMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      fetchWithToken('/api/admin/maintenance', {
        method: 'POST',
        body: JSON.stringify({ enabled })
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminSystemStatus'] });
      toast({ title: 'Success', description: `Maintenance mode ${data.maintenanceMode ? 'enabled' : 'disabled'}` });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const resolveAlertMutation = useMutation({
    mutationFn: (alertId: string) =>
      fetchWithToken(`/api/admin/alerts/${alertId}/resolve`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['adminOverviewStats'] });
      toast({ title: 'Alert Resolved', description: 'Alert has been marked as resolved.' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const freezeUserMutation = useMutation({
    mutationFn: (alertId: string) =>
      fetchWithToken(`/api/admin/alerts/${alertId}/freeze-user`, { method: 'POST' }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminActiveSessions'] });
      queryClient.invalidateQueries({ queryKey: ['adminAlerts'] });
      toast({ title: 'User Frozen', description: data.message });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const forceLogoutUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string, reason?: string }) =>
      fetchWithToken(`/api/admin/users/${userId}/force-logout`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminActiveSessions'] });
      toast({ title: 'Success', description: 'User forcibly disconnected.' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const deleteAdminNotificationMutation = useMutation({
    mutationFn: (id: string) => fetchWithToken(`/api/admin/notifications/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] }); // Ensure query key matches
      toast({ title: 'Success', description: 'Notification deleted.' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  return {
    toggleTradingHalt: toggleTradingHaltMutation,
    updateUserStatus: updateUserStatusMutation,
    adjustUserBalance: adjustUserBalanceMutation,
    seizeFunds: seizeFundsMutation,
    processWithdrawal: processWithdrawalMutation,
    respondToReport: respondToReportMutation,
    updateUserRole: updateUserRoleMutation,
    setup2FA: setup2FAMutation,
    verify2FA: verify2FAMutation,
    resolveAlert: resolveAlertMutation,
    toggleMaintenanceMode: toggleMaintenanceModeMutation,
    freezeUserViaAlert: freezeUserMutation,
    forceLogoutUser: forceLogoutUserMutation,
    deleteAdminNotification: deleteAdminNotificationMutation,
  };
};
