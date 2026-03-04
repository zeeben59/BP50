import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { io as socketIOClient, Socket } from 'socket.io-client';
const API_URL = ''; // Relative path for Vite proxy
import { toast } from '@/components/ui/use-toast';

export interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change_24h: number;
  volume_24h: number;
  market_cap: number;
  high_24h?: number;
  low_24h?: number;
  image_url?: string;
}

export interface CryptoBalance {
  symbol: string;
  amount: number;
}

export interface Position {
  symbol: string;
  amount: number;
  avg_buy_price: number;
  total_invested: number;
}

export interface Trade {
  id: string;
  user_id: string;
  asset: string;
  direction: 'buy' | 'sell';
  amount: number;
  leverage: number;
  entry_price: number;
  close_price: number | null;
  profit_loss: number;
  tp_price?: number | null;
  sl_price?: number | null;
  status: 'open' | 'closed';
  created_at: string;
  closed_at: string | null;
}

export interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'deposit' | 'withdrawal';
  symbol?: string;
  amount: number;
  price?: number;
  total: number;
  realized_pnl?: number;
  status: string;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  username?: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reporter_name?: string;
  reported_user_id: string;
  reported_name?: string;
  reason: string;
  description: string;
  related_entity_id?: string | null;
  evidence?: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  reference: string;
  amount: number;
  provider: string;
  status: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin' | 'superadmin';
  status: 'active' | 'frozen' | 'banned' | 'under_review';
  risk_score: number;
  two_factor_enabled?: boolean;
  created_at: string;
}

export type Page = 'dashboard' | 'markets' | 'trade' | 'wallet' | 'history' | 'withdraw' | 'report' | 'admin' | 'deposit';

interface AppContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  user: User | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  authLoading: boolean;
  login: (email: string, password: string, otp?: string) => Promise<true | string>;
  register: (email: string, username: string, password: string) => Promise<true | string>;
  logout: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authMode: 'login' | 'register' | 'forgot_password';
  setAuthMode: (mode: 'login' | 'register' | 'forgot_password') => void;
  prices: CryptoPrice[];
  previousPrices: CryptoPrice[];
  loadingPrices: boolean;
  fetchPrices: () => Promise<void>;
  demoBalance: number;
  savingsBalance: number;
  cryptoBalances: CryptoBalance[];
  positions: Position[];
  buyCrypto: (symbol: string, usdAmount: number) => boolean;
  sellCrypto: (symbol: string, cryptoAmount: number) => boolean;
  depositSavings: (amount: number) => void;
  transactions: Transaction[];
  withdrawalRequests: WithdrawalRequest[];
  submitWithdrawal: (bankName: string, accountNumber: string, accountName: string, amount: number) => boolean;
  reports: Report[];
  submitReport: (targetUserId: string, reason: string, description: string, relatedEntityId?: string, evidence?: string) => Promise<boolean>;
  selectedCrypto: string;
  setSelectedCrypto: (symbol: string) => void;
  allUsers: User[];
  allWithdrawals: WithdrawalRequest[];
  allReports: Report[];
  approveWithdrawal: (id: string) => void;
  rejectWithdrawal: (id: string) => void;
  freezeUser: (id: string) => void;
  banUser: (id: string) => void;
  activateUser: (id: string) => void;
  portfolioValue: number;
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
  totalPnL: number;
  totalEquity: number;
  resetAccount: () => Promise<void>;
  // New trade engine
  openTrades: Trade[];
  closedTrades: Trade[];
  openTrade: (asset: string, direction: 'buy' | 'sell', amount: number, leverage: number, tp_price?: number | null, sl_price?: number | null) => Promise<boolean>;
  closeTrade: (tradeId: string) => Promise<boolean>;
  socket: Socket | null;
  // Payments
  payments: Payment[];
  initializePayment: (amount: number, provider: string) => Promise<{ authorization_url: string | null; reference: string; demo_mode?: boolean } | null>;
  verifyPayment: (reference: string) => Promise<boolean>;
  // Forgot Password
  requestOTP: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyOTP: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string, otp: string, newP: string) => Promise<{ success: boolean; message: string }>;
  verifyRegistration: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  livePrices: Record<string, number>;
  tradingMode: 'spot' | 'futures';
  setTradingMode: (m: 'spot' | 'futures') => void;
  tradingTab: 'buy' | 'sell';
  setTradingTab: (t: 'buy' | 'sell') => void;
  chartType: 'candlestick' | 'bar' | 'line' | 'area';
  setChartType: (c: 'candlestick' | 'bar' | 'line' | 'area') => void;
  timeframe: string;
  setTimeframe: (t: string) => void;
  isMaintenanceMode: boolean;
  toggleMaintenance: (enabled: boolean) => Promise<boolean>;
  seizeFunds: (uid: string, amount: number, reason: string, target?: 'demo' | 'savings') => Promise<boolean>;
  refreshAdminData: () => Promise<void>;
  refreshUser: () => Promise<void>;
  reportingTargetId: string | null;
  setReportingTargetId: (id: string | null) => void;
  reportingRelatedEntityId: string | null;
  setReportingRelatedEntityId: (id: string | null) => void;
  notifications: Notification[];
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  markNotificationsAsRead: () => void;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

const AppContext = createContext<AppContextType>({} as AppContextType);
export const useAppContext = () => useContext(AppContext);

// ─── helpers ───────────────────────────────────────────────────────────────────

async function fetchUserRow(uid: string): Promise<User | null> {
  try {
    const resp = await fetch(`${API_URL}/api/users/${uid}`);
    if (!resp.ok) return null;
    const text = await resp.text();
    if (!text) return null;
    try {
      const json = JSON.parse(text);
      return json.user ?? null;
    } catch (e) {
      console.error('fetchUserRow: Failed to parse JSON', e);
      return null;
    }
  } catch (err) {
    console.error('fetchUserRow error', err);
    return null;
  }
}

async function ensureWallet(uid: string) {
  try {
    const resp = await fetch(`${API_URL}/api/wallets/${uid}`);
    if (!resp.ok) return null;
    const text = await resp.text();
    if (!text) return null;
    try {
      const json = JSON.parse(text);
      return json.wallet ?? null;
    } catch (e) {
      console.error('ensureWallet: Failed to parse JSON', e);
      return null;
    }
  } catch (err) {
    console.error('ensureWallet error', err);
    return null;
  }
}

// ─── provider ──────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    // 1. Check URL parameters first
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p') as Page;
    if (p && ['dashboard', 'markets', 'trade', 'wallet', 'deposit', 'history', 'withdraw', 'report', 'admin'].includes(p)) {
      return p;
    }
    // 2. Fallback to localStorage
    const saved = localStorage.getItem('currentPage') as Page;
    if (saved && ['dashboard', 'markets', 'trade', 'wallet', 'deposit', 'history', 'withdraw', 'report', 'admin'].includes(saved)) {
      return saved;
    }
    return 'dashboard';
  });
  const [user, setUser] = useState<User | null>(null);
  const isLoggedIn = !!user;
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [previousPrices, setPreviousPrices] = useState<CryptoPrice[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [demoBalance, setDemoBalance] = useState(500);
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [cryptoBalances, setCryptoBalances] = useState<CryptoBalance[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [reportingTargetId, setReportingTargetId] = useState<string | null>(null);
  const [reportingRelatedEntityId, setReportingRelatedEntityId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const resp = await fetch(`${API_URL}/api/notifications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await resp.json();
        if (json.notifications) setNotifications(json.notifications);
      } catch (err) { }
    };
    if (user) fetchNotifications();
  }, [user]);

  const addNotification = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newNotif: Notification = {
      id: uuidv4(),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // Keep last 50
  }, []);

  const markNotificationsAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/notifications/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) { }
  }, []);

  // Trading UI States (Deep Persistence)
  const [tradingMode, setTradingMode] = useState<'spot' | 'futures'>(() => {
    const p = new URLSearchParams(window.location.search).get('m');
    return (p === 'spot' || p === 'futures') ? p : (localStorage.getItem('tradingMode') as 'spot' | 'futures' || 'futures');
  });
  const [tradingTab, setTradingTab] = useState<'buy' | 'sell'>(() => {
    const p = new URLSearchParams(window.location.search).get('tab');
    return (p === 'buy' || p === 'sell') ? p : 'buy';
  });
  const [chartType, setChartType] = useState<'candlestick' | 'bar' | 'line' | 'area'>(() => {
    const p = new URLSearchParams(window.location.search).get('c');
    const valid: Array<'candlestick' | 'bar' | 'line' | 'area'> = ['candlestick', 'bar', 'line', 'area'];
    return valid.includes(p as any) ? (p as any) : (localStorage.getItem('chartType') as 'candlestick' | 'bar' | 'line' | 'area' || 'candlestick');
  });
  const [timeframe, setTimeframe] = useState<string>(() => {
    const p = new URLSearchParams(window.location.search).get('t');
    const valid = ['1m', '5m', '15m', '1h', '4h', '1D'];
    return valid.includes(p as string) ? (p as string) : (localStorage.getItem('timeframe') || '1m');
  });
  const [selectedCrypto, setSelectedCrypto] = useState(() => {
    const p = new URLSearchParams(window.location.search).get('s');
    return p || localStorage.getItem('selectedCrypto') || 'BTC';
  });
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  const loadingUserPromiseRef = useRef<Promise<void> | null>(null);

  // ─── Perspective Persistence ───────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
    localStorage.setItem('selectedCrypto', selectedCrypto);
    localStorage.setItem('tradingMode', tradingMode);
    localStorage.setItem('chartType', chartType);
    localStorage.setItem('timeframe', timeframe);

    // Don't overwrite URL on admin pages — query-param sync is for user trading UI only
    if (window.location.pathname.startsWith('/admin')) return;

    // Sync URL without triggering a full page reload or router conflict
    const url = new URL(window.location.href);
    const syncParam = (key: string, val: string) => {
      if (url.searchParams.get(key) !== val) url.searchParams.set(key, val);
    };

    syncParam('p', currentPage);
    syncParam('s', selectedCrypto);
    syncParam('m', tradingMode);
    syncParam('t', timeframe);
    syncParam('c', chartType);
    if (currentPage === 'trade') syncParam('tab', tradingTab);
    else url.searchParams.delete('tab');

    window.history.replaceState({}, '', url.toString());
  }, [currentPage, selectedCrypto, tradingMode, tradingTab, chartType, timeframe]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const resp = await fetch(`${API_URL}/api/admin/settings`);
        const json = await resp.json();
        if (json.settings) setIsMaintenanceMode(!!json.settings.maintenanceMode);
      } catch (err) { }
    };
    fetchSettings();
  }, []);

  const toggleMaintenance = useCallback(async (enabled: boolean) => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ enabled })
      });
      const json = await resp.json();
      if (json.success) {
        setIsMaintenanceMode(json.maintenanceMode);
        return true;
      }
    } catch (err) {
      console.error('toggleMaintenance error', err);
    }
    return false;
  }, []);

  const seizeFunds = useCallback(async (uid: string, amount: number, reason: string, target: 'demo' | 'savings' = 'demo') => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/users/${uid}/seize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount, reason, target })
      });
      const json = await resp.json();
      if (json.success) {
        await refreshAdminData();
        return true;
      }
    } catch (err) {
      console.error('seizeFunds error', err);
    }
    return false;
  }, []);

  const refreshAdminData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const resp = await fetch(`${API_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const json = await resp.json();
      if (json.users) setAllUsers(json.users);
      // Also refresh withdrawals and reports if needed
    } catch (err) {
      console.error('refreshAdminData error', err);
    }
  }, [isAdmin]);
  // ─── load user data from DB ────────────────────────────────────────────────
  const loadUserData = useCallback((uid: string): Promise<void> => {
    if (loadingUserPromiseRef.current) return loadingUserPromiseRef.current;

    const promise = (async () => {
      try {
        const profile = await fetchUserRow(uid);

        if (profile?.status === 'banned' || profile?.status === 'frozen') {
          console.warn(`[Security] Attempted session load for ${profile.status} user. Purging session.`);
          localStorage.removeItem('token');
          localStorage.removeItem('user_id');
          setUser(null);
          toast({
            title: 'Access Denied',
            description: `Your account is ${profile.status}. You have been logged out.`,
            variant: 'destructive'
          });
          window.location.href = '/';
          return;
        }

        if (profile) setUser(profile);

        const wallet = await ensureWallet(uid);
        if (wallet) {
          setDemoBalance(parseFloat(wallet.demo_balance) || 500);
          setSavingsBalance(parseFloat(wallet.savings_balance) || 0);
        }

        // Crypto balances
        try {
          const cbResp = await fetch(`${API_URL}/api/crypto_balances?user_id=${uid}`);
          if (cbResp.ok) {
            const cbJson = await cbResp.json();
            if (cbJson.data) setCryptoBalances(cbJson.data.map((r: any) => ({ symbol: r.symbol, amount: parseFloat(r.amount) })));
          }
        } catch (err) { console.error('crypto balances fetch error', err); }

        // Positions
        try {
          const posResp = await fetch(`${API_URL}/api/positions?user_id=${uid}`);
          if (posResp.ok) {
            const posJson = await posResp.json();
            if (posJson.data) setPositions(posJson.data.map((r: any) => ({
              symbol: r.symbol, amount: parseFloat(r.amount),
              avg_buy_price: parseFloat(r.avg_buy_price), total_invested: parseFloat(r.total_invested),
            })));
          }
        } catch (err) { console.error('positions fetch error', err); }

        // Transactions
        try {
          const txResp = await fetch(`${API_URL}/api/transactions?user_id=${uid}`);
          if (txResp.ok) {
            const txJson = await txResp.json();
            if (txJson.data) setTransactions(txJson.data.map((r: any) => ({
              id: r.id, type: r.type, symbol: r.symbol,
              amount: parseFloat(r.amount), price: r.price ? parseFloat(r.price) : undefined,
              total: parseFloat(r.total), realized_pnl: r.realized_pnl ? parseFloat(r.realized_pnl) : 0,
              status: r.status, created_at: r.created_at,
            })));
          }
        } catch (err) { console.error('transactions fetch error', err); }

        // Open + Closed Trades
        try {
          const trResp = await fetch(`${API_URL}/api/trades?user_id=${uid}`);
          if (trResp.ok) {
            const trJson = await trResp.json();
            if (trJson.data) {
              setOpenTrades(trJson.data.filter((t: Trade) => t.status === 'open'));
              setClosedTrades(trJson.data.filter((t: Trade) => t.status === 'closed'));
            }
          }
        } catch (err) { console.error('trades fetch error', err); }

        // Payments
        try {
          const payResp = await fetch(`${API_URL}/api/payments?user_id=${uid}`);
          if (payResp.ok) {
            const payJson = await payResp.json();
            if (payJson.data) setPayments(payJson.data);
          }
        } catch (err) { console.error('payments fetch error', err); }

        // Withdrawal requests
        try {
          const wrResp = await fetch(`${API_URL}/api/withdrawal_requests?user_id=${uid}`);
          if (wrResp.ok) {
            const wrJson = await wrResp.json();
            if (wrJson.data) setWithdrawalRequests(wrJson.data);
          }
        } catch (err) { console.error('withdrawal_requests fetch error', err); }

        // Reports
        try {
          const repResp = await fetch(`${API_URL}/api/reports?reporter_id=${uid}`);
          if (repResp.ok) {
            const repJson = await repResp.json();
            if (repJson.data) setReports(repJson.data);
          }
        } catch (err) { console.error('reports fetch error', err); }

        // Admin data
        if (profile?.role === 'admin' || profile?.role === 'superadmin') {
          try {
            const auResp = await fetch(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            if (auResp.ok) { const auJson = await auResp.json(); if (auJson.data) setAllUsers(auJson.data); }
          } catch (err) { console.error('admin users fetch error', err); }
          try {
            const awResp = await fetch(`${API_URL}/api/admin/withdrawals`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            if (awResp.ok) { const awJson = await awResp.json(); if (awJson.data) setAllWithdrawals(awJson.data); }
          } catch (err) { console.error('admin withdrawals fetch error', err); }
          try {
            const arResp = await fetch(`${API_URL}/api/admin/reports`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            if (arResp.ok) { const arJson = await arResp.json(); if (arJson.data) setAllReports(arJson.data); }
          } catch (err) { console.error('admin reports fetch error', err); }
        }
      } catch (err) {
        console.error('loadUserData error:', err);
      } finally {
        loadingUserPromiseRef.current = null;
      }
    })();

    loadingUserPromiseRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    (async () => {
      const uid = localStorage.getItem('user_id');
      if (uid) await loadUserData(uid);
      setAuthLoading(false);
    })();
  }, [loadUserData]);

  // ─── crypto prices (REST fallback when Socket.IO hasn't pushed yet) ───────
  const fetchPrices = useCallback(async () => {
    try {
      setLoadingPrices(true);
      const resp = await fetch(`${API_URL}/api/crypto/prices`);
      if (!resp.ok) return;
      const json = await resp.json();
      if (json.prices && json.prices.length > 0) {
        setPreviousPrices(prev => prev.length > 0 ? prev : json.prices);
        setPrices(current => {
          if (current.length > 0) setPreviousPrices(current);
          return json.prices;
        });
      }
    } catch (err) {
      console.error('Failed to fetch prices:', err);
    } finally {
      setLoadingPrices(false);
    }
  }, []);

  // Initial price fetch + slower fallback polling (Socket.IO does the heavy lifting)
  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // 30s fallback only
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // ─── persist wallet to DB ─────────────────────────────────────────────────
  const persistWallet = useCallback(async (demo: number, savings: number) => {
    if (!user) return;
    try {
      await fetch(`${API_URL}/api/wallets/${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demo_balance: demo, savings_balance: savings }),
      });
    } catch (err) { console.error('persistWallet error', err); }
  }, [user]);

  const persistPosition = useCallback(async (symbol: string, amount: number, avg_buy_price: number, total_invested: number) => {
    if (!user) return;
    if (amount <= 0.00000001) {
      fetch(`${API_URL}/api/positions/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, symbol }) }).catch(e => console.error('position delete error', e));
    } else {
      fetch(`${API_URL}/api/positions/upsert`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, symbol, amount, avg_buy_price, total_invested }) }).catch(e => console.error('position upsert error', e));
    }
  }, [user]);

  // ─── auth ─────────────────────────────────────────────────────────────────
  const register = useCallback(async (email: string, username: string, password: string): Promise<true | string | { verificationRequired: boolean }> => {
    if (!email || !username || !password) return 'Missing fields';
    const cleanEmail = email.trim().toLowerCase();
    try {
      const resp = await fetch(`${API_URL}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: cleanEmail, username, password }) });
      const json = await resp.json();
      if (!resp.ok) { toast({ title: 'Registration Failed', description: json.error || 'Registration failed', variant: 'destructive' }); return json.error || 'Registration failed'; }

      if (json.verificationRequired) {
        return { verificationRequired: true };
      }

      const { user, token } = json;
      if (!user) return 'Registration failed';
      localStorage.setItem('token', token); localStorage.setItem('user_id', user.id);
      setUser(user); setDemoBalance(500); setSavingsBalance(0); setCryptoBalances([]); setPositions([]); setTransactions([]); setOpenTrades([]); setClosedTrades([]); setShowAuthModal(false);
      toast({ title: 'Account Created!', description: 'Welcome! You have $500 demo balance to practice trading.' });
      await loadUserData(user.id);
      return true;
    } catch (err: any) {
      toast({ title: 'Registration Failed', description: err?.message || 'Unknown error', variant: 'destructive' });
      return err?.message || 'Registration failed';
    }
  }, [loadUserData]);

  const verifyRegistration = useCallback(async (email: string, otp: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const resp = await fetch(`${API_URL}/api/auth/verify-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp })
      });
      const json = await resp.json();
      if (!resp.ok) return { success: false, message: json.error || 'Verification failed' };

      const { user, token } = json;
      localStorage.setItem('token', token);
      localStorage.setItem('user_id', user.id);
      setUser(user);
      setDemoBalance(500);
      setSavingsBalance(0);
      setCryptoBalances([]);
      setPositions([]);
      setTransactions([]);
      setOpenTrades([]);
      setClosedTrades([]);
      setShowAuthModal(false);

      toast({ title: 'Account Verified!', description: 'Welcome to B50 Trade! Your $500 demo balance is ready.' });
      await loadUserData(user.id);
      return { success: true, message: 'Verified' };
    } catch (err: any) {
      return { success: false, message: 'Network error' };
    }
  }, [loadUserData]);

  const login = useCallback(async (email: string, password: string, otp?: string): Promise<true | string> => {
    if (!email || !password) return 'Missing fields';
    try {
      const resp = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, otp })
      });
      const json = await resp.json();
      if (!resp.ok) {
        if (json.error === '2FA_REQUIRED') return '2FA_REQUIRED';
        toast({ title: 'Login Failed', description: json.error || 'Login failed', variant: 'destructive' });
        return json.error || 'Login failed';
      }
      const { user, token } = json;
      if (!user) return 'No user returned';
      localStorage.setItem('token', token); localStorage.setItem('user_id', user.id);
      await loadUserData(user.id);
      setShowAuthModal(false);
      toast({ title: 'Welcome back!', description: 'You are now signed in.' });
      return true;
    } catch (err: any) {
      toast({ title: 'Login Failed', description: err?.message || 'Unknown error', variant: 'destructive' });
      return err?.message || 'Login failed';
    }
  }, [loadUserData]);

  const logout = useCallback(() => {
    localStorage.removeItem('token'); localStorage.removeItem('user_id');
    setUser(null); setDemoBalance(500); setSavingsBalance(0); setCryptoBalances([]); setPositions([]); setTransactions([]);
    setWithdrawalRequests([]); setReports([]); setOpenTrades([]); setClosedTrades([]); setPayments([]); setCurrentPage('dashboard');
    toast({ title: 'Logged Out', description: 'See you next time!' });
  }, []);

  // ─── trading: buy (legacy spot) ───────────────────────────────────────────
  const buyCrypto = useCallback((symbol: string, usdAmount: number): boolean => {
    const price = prices.find(p => p.symbol === symbol);
    if (!price || usdAmount <= 0 || usdAmount > demoBalance || !user) {
      toast({ title: 'Trade Failed', description: 'Insufficient demo balance or invalid amount.', variant: 'destructive' }); return false;
    }
    const cryptoAmt = usdAmount / price.price;
    const newDemo = Math.round((demoBalance - usdAmount) * 100) / 100;
    const existingPos = positions.find(p => p.symbol === symbol);
    let newAvgPrice: number, newTotalInvested: number, newPosAmount: number;
    if (existingPos) { newPosAmount = existingPos.amount + cryptoAmt; newTotalInvested = existingPos.total_invested + usdAmount; newAvgPrice = newTotalInvested / newPosAmount; }
    else { newPosAmount = cryptoAmt; newTotalInvested = usdAmount; newAvgPrice = price.price; }
    setDemoBalance(newDemo);
    setCryptoBalances(prev => { const existing = prev.find(b => b.symbol === symbol); if (existing) return prev.map(b => b.symbol === symbol ? { ...b, amount: b.amount + cryptoAmt } : b); return [...prev, { symbol, amount: cryptoAmt }]; });
    setPositions(prev => { const existing = prev.find(p => p.symbol === symbol); if (existing) return prev.map(p => p.symbol === symbol ? { ...p, amount: newPosAmount, avg_buy_price: newAvgPrice, total_invested: newTotalInvested } : p); return [...prev, { symbol, amount: newPosAmount, avg_buy_price: newAvgPrice, total_invested: newTotalInvested }]; });
    const tx: Transaction = { id: Date.now().toString(), type: 'buy', symbol, amount: cryptoAmt, price: price.price, total: usdAmount, realized_pnl: 0, status: 'completed', created_at: new Date().toISOString() };
    setTransactions(prev => [tx, ...prev]);
    persistWallet(newDemo, savingsBalance);
    persistPosition(symbol, newPosAmount, newAvgPrice, newTotalInvested);
    fetch(`${API_URL}/api/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, type: 'buy', symbol, amount: cryptoAmt, price: price.price, total: usdAmount, status: 'completed' }) }).catch(e => console.error('tx insert error', e));
    fetch(`${API_URL}/api/crypto_balances/upsert`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, symbol, amount: newPosAmount }) }).catch(e => console.error('crypto upsert error', e));
    toast({ title: 'Trade Executed!', description: `Bought ${cryptoAmt.toFixed(6)} ${symbol} for $${usdAmount.toFixed(2)}` });
    return true;
  }, [user, demoBalance, positions, prices, persistWallet, persistPosition, savingsBalance]);

  const sellCrypto = useCallback((symbol: string, cryptoAmount: number): boolean => {
    const price = prices.find(p => p.symbol === symbol);
    const balance = cryptoBalances.find(b => b.symbol === symbol);
    const position = positions.find(p => p.symbol === symbol);
    if (!price || !balance || cryptoAmount <= 0 || cryptoAmount > balance.amount || !user) {
      toast({ title: 'Trade Failed', description: 'Insufficient balance.', variant: 'destructive' }); return false;
    }
    const usdAmount = cryptoAmount * price.price;
    const newDemo = Math.round((demoBalance + usdAmount) * 100) / 100;
    const newCryptoAmt = balance.amount - cryptoAmount;
    const avgCost = position?.avg_buy_price || price.price;
    const realizedPnl = (price.price - avgCost) * cryptoAmount;
    let newPosAmount = (position?.amount || 0) - cryptoAmount;
    let newTotalInvested = (position?.total_invested || 0) - (avgCost * cryptoAmount);
    if (newPosAmount < 0.00000001) { newPosAmount = 0; newTotalInvested = 0; }
    setDemoBalance(newDemo);
    setCryptoBalances(prev => prev.map(b => b.symbol === symbol ? { ...b, amount: newCryptoAmt } : b).filter(b => b.amount > 0.00000001));
    setPositions(prev => { if (newPosAmount <= 0.00000001) return prev.filter(p => p.symbol !== symbol); return prev.map(p => p.symbol === symbol ? { ...p, amount: newPosAmount, total_invested: newTotalInvested } : p); });
    const tx: Transaction = { id: Date.now().toString(), type: 'sell', symbol, amount: cryptoAmount, price: price.price, total: usdAmount, realized_pnl: realizedPnl, status: 'completed', created_at: new Date().toISOString() };
    setTransactions(prev => [tx, ...prev]);
    persistWallet(newDemo, savingsBalance);
    persistPosition(symbol, newPosAmount, avgCost, newTotalInvested);
    fetch(`${API_URL}/api/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, type: 'sell', symbol, amount: cryptoAmount, price: price.price, total: usdAmount, realized_pnl: realizedPnl, status: 'completed' }) }).catch(e => console.error('tx insert error', e));
    if (newCryptoAmt > 0.00000001) {
      fetch(`${API_URL}/api/crypto_balances/upsert`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, symbol, amount: newCryptoAmt }) }).catch(e => console.error('crypto upsert error', e));
    } else {
      fetch(`${API_URL}/api/crypto_balances/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, symbol }) }).catch(e => console.error('crypto delete error', e));
    }
    const pnlText = realizedPnl >= 0 ? `Profit: +$${realizedPnl.toFixed(2)}` : `Loss: -$${Math.abs(realizedPnl).toFixed(2)}`;
    toast({ title: 'Trade Executed!', description: `Sold ${cryptoAmount.toFixed(6)} ${symbol}. ${pnlText}` });
    return true;
  }, [user, prices, cryptoBalances, positions, demoBalance, persistWallet, persistPosition, savingsBalance]);

  // ─── TRADE ENGINE: open/close ─────────────────────────────────────────────
  const openTrade = useCallback(async (asset: string, direction: 'buy' | 'sell', amount: number, leverage: number, tp_price?: number | null, sl_price?: number | null): Promise<boolean> => {
    if (!user) { toast({ title: 'Error', description: 'Please log in.', variant: 'destructive' }); return false; }
    try {
      const resp = await fetch(`${API_URL}/api/trades/open`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ user_id: user.id, asset, direction, amount, leverage, tp_price, sl_price }),
      });
      const json = await resp.json();
      if (!resp.ok) { toast({ title: 'Trade Failed', description: json.error || 'Could not open trade', variant: 'destructive' }); return false; }
      toast({ title: '🚀 Trade Opened!', description: `${direction.toUpperCase()} ${asset} $${amount} x${leverage} @ $${json.trade.entry_price.toLocaleString()}` });
      return true;
    } catch (err: any) { toast({ title: 'Trade Failed', description: err?.message || 'Network error', variant: 'destructive' }); return false; }
  }, [user]);

  const closeTrade = useCallback(async (tradeId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const resp = await fetch(`${API_URL}/api/trades/close`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ user_id: user.id, trade_id: tradeId }),
      });
      const json = await resp.json();
      if (!resp.ok) { toast({ title: 'Close Failed', description: json.error || 'Could not close trade', variant: 'destructive' }); return false; }
      const pnl = json.pnl;
      const pnlText = pnl >= 0 ? `Profit: +$${pnl.toFixed(2)}` : `Loss: -$${Math.abs(pnl).toFixed(2)}`;
      toast({ title: 'Trade Closed!', description: `${pnlText}. New balance: $${json.new_balance.toFixed(2)}` });
      return true;
    } catch (err: any) { toast({ title: 'Close Failed', description: err?.message || 'Network error', variant: 'destructive' }); return false; }
  }, [user]);

  // ─── payments ─────────────────────────────────────────────────────────────
  const initializePayment = useCallback(async (amount: number, provider: string) => {
    if (!user) return null;
    try {
      const resp = await fetch(`${API_URL}/api/payments/initialize`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, amount, email: user.email, provider }),
      });
      const json = await resp.json();
      if (!resp.ok) { toast({ title: 'Payment Failed', description: json.error || 'Could not initialize payment', variant: 'destructive' }); return null; }
      return json;
    } catch (err: any) { toast({ title: 'Payment Error', description: err?.message || 'Network error', variant: 'destructive' }); return null; }
  }, [user]);

  const verifyPayment = useCallback(async (reference: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const resp = await fetch(`${API_URL}/api/payments/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, reference }),
      });
      const json = await resp.json();
      if (!resp.ok) { toast({ title: 'Verification Failed', description: json.error || 'Payment verification failed', variant: 'destructive' }); return false; }
      toast({ title: '✅ Deposit Successful!', description: 'Funds have been added to your balance.' });
      // Reload wallet
      const wallet = await ensureWallet(user.id);
      if (wallet) { setDemoBalance(parseFloat(wallet.demo_balance) || demoBalance); }
      return true;
    } catch (err: any) { toast({ title: 'Verification Error', description: err?.message || 'Network error', variant: 'destructive' }); return false; }
  }, [user, demoBalance]);

  const requestOTP = useCallback(async (email: string) => {
    try {
      const resp = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await resp.json();
      return { success: resp.ok, message: json.message || json.error };
    } catch (err: any) { return { success: false, message: 'Network error' }; }
  }, []);

  const verifyOTP = useCallback(async (email: string, otp: string) => {
    try {
      const resp = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const json = await resp.json();
      return { success: resp.ok, message: json.message || json.error };
    } catch (err: any) { return { success: false, message: 'Network error' }; }
  }, []);

  const resetPassword = useCallback(async (email: string, otp: string, newPassword: string) => {
    try {
      const resp = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const json = await resp.json();
      return { success: resp.ok, message: json.message || json.error };
    } catch (err: any) { return { success: false, message: 'Network error' }; }
  }, []);

  // ─── other actions ────────────────────────────────────────────────────────
  const depositSavings = useCallback((amount: number) => {
    if (amount <= 0 || !user) return;
    const newSavings = savingsBalance + amount;
    setSavingsBalance(newSavings);
    const tx: Transaction = { id: Date.now().toString(), type: 'deposit', amount: 0, total: amount, realized_pnl: 0, status: 'completed', created_at: new Date().toISOString() };
    setTransactions(prev => [tx, ...prev]);
    persistWallet(demoBalance, newSavings);
    fetch(`${API_URL}/api/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, type: 'deposit', amount: 0, total: amount, status: 'completed' }) }).catch(e => console.error('tx insert error', e));
    toast({ title: 'Deposit Successful!', description: `$${amount.toFixed(2)} added to savings.` });
  }, [user, demoBalance, savingsBalance, persistWallet]);

  const submitWithdrawal = useCallback((bankName: string, accountNumber: string, accountName: string, amount: number): boolean => {
    if (amount <= 0 || amount > savingsBalance || !user) { toast({ title: 'Withdrawal Failed', description: 'Insufficient savings.', variant: 'destructive' }); return false; }
    const newSavings = savingsBalance - amount;
    setSavingsBalance(newSavings);
    const wr: WithdrawalRequest = { id: Date.now().toString(), user_id: user.id, username: user.username, amount, bank_name: bankName, account_number: accountNumber, account_name: accountName, status: 'pending', created_at: new Date().toISOString() };
    setWithdrawalRequests(prev => [wr, ...prev]); setAllWithdrawals(prev => [wr, ...prev]);
    persistWallet(demoBalance, newSavings);
    fetch(`${API_URL}/api/withdrawal_requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, username: user.username, amount, bank_name: bankName, account_number: accountNumber, account_name: accountName }) }).catch(e => console.error('withdrawal error', e));
    toast({ title: 'Withdrawal Submitted!', description: 'Pending admin approval.' }); return true;
  }, [user, demoBalance, savingsBalance, persistWallet]);

  const submitReport = useCallback(async (targetUserId: string, reason: string, description: string, relatedEntityId?: string, evidence?: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const resp = await fetch(`${API_URL}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ targetUserId, reason, description, relatedEntityId, evidence })
      });
      const json = await resp.json();
      if (!resp.ok) {
        toast({ title: 'Report Failed', description: json.error || 'Unknown error', variant: 'destructive' });
        return false;
      }

      const newReport: Report = {
        id: json.id,
        reporter_id: user.id,
        reported_user_id: targetUserId,
        reason,
        description,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      setReports(prev => [newReport, ...prev]);
      toast({ title: 'Report Submitted', description: 'Thank you for helping keep the platform safe.' });
      return true;
    } catch (err) {
      console.error('submitReport error', err);
      return false;
    }
  }, [user]);

  // ─── admin actions ────────────────────────────────────────────────────────
  const approveWithdrawal = useCallback((id: string) => { setAllWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: 'approved' as const } : w)); fetch(`${API_URL}/api/admin/withdrawals/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).catch(e => console.error('approve error', e)); toast({ title: 'Withdrawal Approved' }); }, []);
  const rejectWithdrawal = useCallback((id: string) => { setAllWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: 'rejected' as const } : w)); fetch(`${API_URL}/api/admin/withdrawals/${id}/reject`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).catch(e => console.error('reject error', e)); toast({ title: 'Withdrawal Rejected' }); }, []);
  const freezeUser = useCallback((id: string) => { setAllUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'frozen' as const } : u)); fetch(`${API_URL}/api/admin/users/${id}/freeze`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).catch(e => console.error('freeze error', e)); toast({ title: 'Account Frozen' }); }, []);
  const banUser = useCallback((id: string) => { setAllUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'banned' as const } : u)); fetch(`${API_URL}/api/admin/users/${id}/ban`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).catch(e => console.error('ban error', e)); toast({ title: 'Account Banned' }); }, []);
  const activateUser = useCallback((id: string) => { setAllUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'active' as const } : u)); fetch(`${API_URL}/api/admin/users/${id}/activate`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).catch(e => console.error('activate error', e)); toast({ title: 'Account Activated' }); }, []);

  // ─── account reset ────────────────────────────────────────────────────────
  const resetAccount = useCallback(async () => {
    if (!user) return;
    try {
      await fetch(`${API_URL}/api/account/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id }) });
      setDemoBalance(500); setSavingsBalance(0); setCryptoBalances([]); setPositions([]); setTransactions([]); setWithdrawalRequests([]); setOpenTrades([]); setClosedTrades([]);
      toast({ title: 'Account Reset!', description: 'Balance reset to $500. All data cleared.' });
    } catch (err) { console.error('resetAccount error', err); toast({ title: 'Reset Failed', variant: 'destructive' }); }
  }, [user]);

  // ─── computed P&L ─────────────────────────────────────────────────────────
  const portfolioValue = cryptoBalances.reduce((total, bal) => {
    const price = prices.find(p => p.symbol === bal.symbol);
    return total + (price ? bal.amount * price.price : 0);
  }, 0);

  const totalRealizedPnL = transactions.filter(t => t.type === 'sell' && t.realized_pnl).reduce((sum, t) => sum + (t.realized_pnl || 0), 0)
    + closedTrades.reduce((sum, t) => sum + t.profit_loss, 0);

  const totalUnrealizedPnL = positions.reduce((sum, pos) => {
    const currentPrice = prices.find(p => p.symbol === pos.symbol);
    if (!currentPrice) return sum;
    return sum + (currentPrice.price - pos.avg_buy_price) * pos.amount;
  }, 0) + openTrades.reduce((sum, t) => sum + t.profit_loss, 0);

  const totalPnL = totalRealizedPnL + totalUnrealizedPnL;
  const totalEquity = demoBalance + openTrades.reduce((sum, t) => sum + t.profit_loss, 0);

  // isLoggedIn and isAdmin are now declared at top of Provider

  useEffect(() => {
    const s = socketIOClient(API_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    setSocket(s);

    const handleJoin = () => {
      if (user?.id) {
        console.log('[Socket] Joining user room:', user.id);
        s.emit('join', user.id);
      }
      if (isAdmin) {
        console.log('[Socket] Joining admin dashboard');
        s.emit('join_admin', user?.id);
      }
    };

    s.on('connect', () => {
      console.log('[Socket] Connected to server');
      handleJoin();
    });

    s.on('reconnect', () => {
      console.log('[Socket] Reconnected to server');
      handleJoin();
    });

    // Listen for unified real-time price updates
    s.on('price:update', (data: any) => {
      // 1. Update the global livePrices mapping (Single Source of Truth)
      setLivePrices(prev => ({ ...prev, [data.symbol]: data.price }));

      // 2. Update the full prices list (for tables/discovery)
      setPrices(prev => {
        const existingIdx = prev.findIndex(p => p.symbol === data.symbol);
        if (existingIdx >= 0) {
          const existing = prev[existingIdx];

          if (existing.price !== data.price) {
            setPreviousPrices(currentPrev => {
              const newPrev = [...currentPrev];
              const pIdx = newPrev.findIndex(p => p.symbol === data.symbol);
              if (pIdx >= 0) {
                if (newPrev[pIdx].price === existing.price) return currentPrev;
                newPrev[pIdx] = { ...existing };
              } else {
                newPrev.push({ ...existing });
              }
              return newPrev;
            });
          }

          const updated = [...prev];
          updated[existingIdx] = {
            ...existing,
            price: data.price,
            change_24h: data.change_24h,
            high_24h: data.high_24h,
            low_24h: data.low_24h,
            volume_24h: data.volume_24h,
            image_url: data.image_url || existing.image_url,
          };
          return updated;
        }

        const newPrice = {
          symbol: data.symbol,
          name: data.name,
          price: data.price,
          change_24h: data.change_24h,
          volume_24h: data.volume_24h || 0,
          market_cap: data.market_cap || 0,
          high_24h: data.high_24h,
          low_24h: data.low_24h,
          image_url: data.image_url || '',
        };
        return [...prev, newPrice];
      });
    });

    // Price snapshot (initial load)
    s.on('prices:snapshot', (data: CryptoPrice[]) => {
      if (data && data.length > 0) {
        setPrices(data);
        setLoadingPrices(false);
      }
    });

    // Balance update
    s.on('balance:update', (data: { demo_balance: number }) => {
      setDemoBalance(data.demo_balance);
    });

    // Unified Trade P&L updates from backend
    s.on('trades:pnl:update', (data: { trades: Trade[] }) => {
      setOpenTrades(prev => {
        const updated = [...prev];
        for (const t of data.trades) {
          const idx = updated.findIndex(ot => ot.id === t.id);
          if (idx >= 0) updated[idx] = { ...updated[idx], profit_loss: t.profit_loss };
        }
        return updated;
      });
    });

    // Trade opened
    s.on('trade:opened', (trade: Trade) => {
      setOpenTrades(prev => [trade, ...prev]);
    });

    // Trade closed
    s.on('trade:closed', (trade: Trade) => {
      setOpenTrades(prev => prev.filter(t => t.id !== trade.id));
      setClosedTrades(prev => [trade, ...prev]);
    });

    // Trades snapshot (on room join)
    s.on('trades:snapshot', (trades: Trade[]) => {
      setOpenTrades(trades.filter(t => t.status === 'open'));
    });

    // Listen for admin force logouts (e.g., bans, manual kicks)
    s.on('force_logout', () => {
      console.warn('Received force_logout signal from server');
      logout();
      window.location.href = '/';
    });

    // Real-time notifications
    s.on('notification:new', (notif: Notification) => {
      setNotifications(prev => [notif, ...prev].slice(0, 50));
      toast({
        title: notif.title,
        description: notif.message,
      });
    });

    return () => { s.disconnect(); };
  }, [user?.id, isAdmin, logout]);

  const refreshUser = useCallback(async () => {
    const uid = localStorage.getItem('user_id');
    if (uid) await loadUserData(uid);
  }, [loadUserData]);

  const contextValue = useMemo(() => ({
    sidebarOpen, toggleSidebar: () => setSidebarOpen(p => !p),
    currentPage, setCurrentPage,
    user, isLoggedIn, isAdmin, authLoading,
    login, register, logout,
    showAuthModal, setShowAuthModal,
    authMode, setAuthMode,
    prices, previousPrices, loadingPrices, fetchPrices,
    demoBalance, savingsBalance, cryptoBalances, positions,
    buyCrypto, sellCrypto, depositSavings,
    transactions, withdrawalRequests,
    submitWithdrawal,
    reports, submitReport,
    selectedCrypto, setSelectedCrypto,
    allUsers, allWithdrawals, allReports,
    approveWithdrawal, rejectWithdrawal,
    freezeUser, banUser, activateUser,
    portfolioValue, totalRealizedPnL, totalUnrealizedPnL, totalPnL, totalEquity,
    resetAccount,
    openTrades, closedTrades, openTrade, closeTrade,
    socket,
    payments, initializePayment, verifyPayment,
    requestOTP, verifyOTP, resetPassword,
    verifyRegistration,
    livePrices,
    tradingMode, setTradingMode,
    tradingTab, setTradingTab,
    chartType, setChartType,
    timeframe, setTimeframe,
    isMaintenanceMode, toggleMaintenance,
    seizeFunds, refreshAdminData,
    refreshUser,
    reportingTargetId, setReportingTargetId,
    reportingRelatedEntityId, setReportingRelatedEntityId,
    notifications, addNotification, markNotificationsAsRead
  }), [
    sidebarOpen, currentPage, user, isLoggedIn, isAdmin, authLoading,
    login, register, logout, showAuthModal, authMode, prices, previousPrices,
    loadingPrices, fetchPrices, demoBalance, savingsBalance, cryptoBalances,
    positions, buyCrypto, sellCrypto, depositSavings, transactions,
    withdrawalRequests, submitWithdrawal, reports, submitReport,
    selectedCrypto, allUsers, allWithdrawals, allReports, approveWithdrawal,
    rejectWithdrawal, freezeUser, banUser, activateUser, portfolioValue,
    totalRealizedPnL, totalUnrealizedPnL, totalPnL, totalEquity, resetAccount,
    openTrades, closedTrades, openTrade, closeTrade, socket, payments,
    initializePayment, verifyPayment, requestOTP, verifyOTP, resetPassword,
    verifyRegistration,
    livePrices, tradingMode, tradingTab, chartType, timeframe,
    isMaintenanceMode, toggleMaintenance, seizeFunds, refreshAdminData,
    refreshUser,
    reportingTargetId, setReportingTargetId,
    reportingRelatedEntityId, setReportingRelatedEntityId,
    notifications, addNotification, markNotificationsAsRead
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
