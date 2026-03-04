import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppContext } from './AppContext';

const API_URL = ((import.meta as any).env?.VITE_API_URL as string) || '';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  rule: string;
  title: string;
  message: string;
  userId: string | null;
  acknowledged: boolean;
  created_at: string;
}

interface AdminContextType {
  adminSocket: Socket | null;
  connected: boolean;
  alerts: Alert[];
  activeAlertCount: number;
  liveActivities: any[];
  addActivity: (activity: any) => void;
}

const AdminContext = createContext<AdminContextType>({
  adminSocket: null,
  connected: false,
  alerts: [],
  activeAlertCount: 0,
  liveActivities: [],
  addActivity: () => { },
});

export const useAdminContext = () => useContext(AdminContext);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAppContext();
  const [adminSocket, setAdminSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [liveActivities, setLiveActivities] = useState<any[]>([]);

  // Connect to admin WebSocket namespace when user is admin
  useEffect(() => {
    if (!user || !isAdmin) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(`${API_URL}/admin`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[Admin WS] Connected to admin namespace');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Real-time alerts
    socket.on('admin:alert', (alert: Alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 200));
    });

    // Real-time activity
    socket.on('admin:activity', (activity: any) => {
      setLiveActivities(prev => [activity, ...prev].slice(0, 500));
    });

    // Financial transaction notifications
    socket.on('admin:financial_tx', (tx: any) => {
      // Could be used by financial oversight page
      console.log('[Admin WS] Financial TX:', tx.type, tx.amount);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Admin WS] Connection error:', err.message);
    });

    setAdminSocket(socket);

    return () => {
      socket.disconnect();
      setAdminSocket(null);
      setConnected(false);
    };
  }, [user, isAdmin]);

  const addActivity = useCallback((activity: any) => {
    setLiveActivities(prev => [activity, ...prev].slice(0, 500));
  }, []);

  const activeAlertCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <AdminContext.Provider value={{
      adminSocket,
      connected,
      alerts,
      activeAlertCount,
      liveActivities,
      addActivity,
    }}>
      {children}
    </AdminContext.Provider>
  );
};
