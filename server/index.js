import 'dotenv/config';
import fs from 'fs';

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Low, JSONFile } from 'lowdb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import WebSocket from 'ws';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import * as OTPAuth from 'otplib';
const { authenticator } = OTPAuth;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.SERVER_PORT || 3000;
const JWT_SECRET = process.env.SERVER_JWT_SECRET || 'dev_secret_change_me';
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const FLW_SECRET = process.env.FLW_SECRET_KEY || '';
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD || '';

const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_PASS },
});

const app = express();

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ─── CORS Configuration ──────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://[::1]:8080'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
  credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  if (req.method === 'POST') console.log(`[HTTP] Payload for ${req.path}:`, JSON.stringify(req.body));
  next();
});

const httpServer = createServer(app);
const io = new SocketIO(httpServer, { cors: { origin: '*' } });

// Serve static files from the 'dist' directory (Vite build output)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db_status: db.data ? 'connected' : 'initializing'
  });
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  
  // Send immediate price snapshot on connect
  socket.emit('prices:snapshot', buildPriceList());

  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`[Socket.IO] Client ${socket.id} joined user room: ${userId}`);
    
    // Track active connection timestamp
    db.read().then(() => {
      const u = db.data.users.find(x => x.id === userId);
      if (u) {
        u.last_seen = new Date().toISOString();
        u.is_online = true;
        u.current_socket = socket.id;
        db.write();
      }
      const userTrades = db.data.trades.filter(t => t.user_id === userId);
      socket.emit('trades:snapshot', userTrades);
    });
  });

  socket.on('join_admin', (userId) => {
    // Basic check could be done here (e.g. decoding a token sent via socket payload)
    // For now, allow them to join the admin room; UI will restrict it to superadmins.
    socket.join('admin_dashboard');
    console.log(`[Socket.IO] Admin ${socket.id} joined admin_dashboard`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    db.read().then(() => {
      const user = db.data.users.find(u => u.current_socket === socket.id);
      if (user) {
        user.is_online = false;
        user.current_socket = null;
        db.write();
      }
    });
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────
const checkMaintenance = async (req, res, next) => {
  // await db.read();
  const isMaintenance = db.data.settings?.maintenanceMode || false;
  
  // Allow admins to bypass maintenance
  const token = req.headers.authorization?.split(' ')[1];
  let isAdmin = false;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      isAdmin = decoded.isAdmin === true;
    } catch (e) {}
  }

  if (isMaintenance && !isAdmin && !req.path.startsWith('/api/auth')) {
    return res.status(503).json({ error: 'System under maintenance', maintenance: true });
  }
  next();
};

app.use(checkMaintenance);

// ─── Database ─────────────────────────────────────────────────────────────────
const defaultData = { 
  users: [], 
  wallets: [], 
  crypto_balances: [], 
  transactions: [], 
  withdrawal_requests: [], 
  reports: [], 
  positions: [], 
  trades: [], 
  payments: [],
  audit_logs: [],
  security_logs: [],
  activity_stream: [],
  financial_transactions: [],
  alerts: [],
  notifications: [],
  settings: { maintenanceMode: false, trading_halt: false }
};
const file = path.join(__dirname, 'data.json');
const adapter = new JSONFile(file);
const db = new Low(adapter, defaultData);

async function initDb() {
  try {
    console.log('[DB] Loading persistence layer...');
    
    // Ensure the data file exists and is valid JSON
    if (!fs.existsSync(file)) {
      console.log('[DB] data.json missing, creating fresh database...');
      fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
    } else {
      try {
        const raw = fs.readFileSync(file, 'utf8');
        JSON.parse(raw);
        console.log('[DB] data.json signature validated');
      } catch (e) {
        console.error('[CRITICAL] data.json is malformed! Attempting recovery from latest backup...');
        // Recovery logic could go here, but for now we backup the corrupt one and start fresh or exit
        fs.copyFileSync(file, `${file}.corrupt-${Date.now()}`);
        console.warn('[DB] Corrupt file moved to .corrupt. Starting fresh to maintain availability.');
        fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
      }
    }

    await db.read();
    db.data ||= defaultData;
    
    // Ensure all collections exist
    const collections = [
      'users', 'wallets', 'crypto_balances', 'transactions', 'withdrawal_requests',
      'reports', 'positions', 'trades', 'payments', 'audit_logs', 'security_logs',
      'activity_stream', 'financial_transactions', 'alerts', 'settings', 'notifications'
    ];
    
    collections.forEach(key => {
      db.data[key] ||= defaultData[key] || [];
    });

    db.data.settings ||= { maintenanceMode: false, trading_halt: false };
    if (db.data.settings.trading_halt === undefined) db.data.settings.trading_halt = false;
    
    // Ensure at least one superadmin exists for testing.
    const hasAdmin = db.data.users.some(u => u.role === 'superadmin');
    if (!hasAdmin) {
      const password_hash = await bcrypt.hash('admin123', 10);
      db.data.users.push({
        id: uuidv4(),
        email: 'admin@B50trade.com', // Primary platform admin account
        username: 'SuperAdmin',
        password_hash,
        role: 'superadmin',
        permissions: {
          canBanUsers: true,
          canAdjustBalance: true,
          canSeizeFunds: true,
          canManageWithdrawals: true
        },
        two_factor: { enabled: false, secret: null },
        status: 'active',
        risk_score: 0,
        created_at: new Date().toISOString()
      });
      // Important to also create a wallet
      db.data.wallets.push({
        id: uuidv4(),
        user_id: db.data.users[db.data.users.length - 1].id,
        demo_balance: 1000000,
        savings_balance: 0,
        available_balance: 1000000,
        frozen_balance: 0
      });
    }

    await db.write();
    console.log('Database initialized successfully');
    
    // Initial backup on startup
    backupDatabase();
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
}

// ─── Database Backup Logic ──────────────────────────────────────────────────
async function backupDatabase() {
  try {
    const sourcePath = path.join(__dirname, 'data.json');
    const backupDir = path.join(__dirname, 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destPath = path.join(backupDir, `data-backup-${timestamp}.json`);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Keep only last 10 backups
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('data-backup-'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length >= 10) {
      files.slice(10).forEach(f => fs.unlinkSync(path.join(backupDir, f.name)));
    }

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`[STABILITY] Database backed up to: ${destPath}`);
    }
  } catch (err) {
    console.error('[STABILITY] Backup failed:', err);
  }
}

// Run backup every 24 hours
setInterval(backupDatabase, 24 * 60 * 60 * 1000);

// ─── Immutable Audit Logging Utilities ────────────────────────────────────────
async function logAdminAction(adminId, action, targetUserId, reason, beforeState, afterState) {
  try {
    // await db.read();
    const log = {
      id: uuidv4(),
      admin_id: adminId,
      action,
      target_user_id: targetUserId,
      reason: reason || 'N/A',
      before_state: beforeState ? JSON.stringify(beforeState) : null,
      after_state: afterState ? JSON.stringify(afterState) : null,
      created_at: new Date().toISOString()
    };
    db.data.audit_logs.push(log);
    await db.write();
  } catch (e) { console.error('[AUDIT] Failed to save logAdminAction', e); }
}

async function logSecurityEvent(event_type, details, ip_address, user_id = null) {
  try {
    // await db.read();
    const log = {
      id: uuidv4(),
      event_type,
      details: typeof details === 'string' ? details : JSON.stringify(details),
      ip_address: ip_address || 'unknown',
      user_id,
      created_at: new Date().toISOString()
    };
    db.data.security_logs.push(log);
    await db.write();
  } catch (e) { console.error('[AUDIT] Failed to save logSecurityEvent', e); }
}

async function emitActivity(event_type, user_id, details, ip_address = '127.0.0.1') {
  try {
    // await db.read();
    let email = 'System';
    let username = 'System';
    if (user_id) {
      const u = db.data.users.find(x => x.id === user_id);
      if (u) { email = u.email; username = u.username; }
    }

    const activity = {
      id: uuidv4(),
      event_type,
      user_id,
      email,
      username,
      details: typeof details === 'string' ? details : JSON.stringify(details),
      ip_address,
      created_at: new Date().toISOString()
    };
    
    db.data.activity_stream = db.data.activity_stream || [];
    db.data.activity_stream.unshift(activity);
    
    if (db.data.activity_stream.length > 2000) {
      db.data.activity_stream.pop();
    }
    await db.write();

    io.to('admin_dashboard').emit('admin:activity', activity);
    adminNs.emit('admin:activity', activity);
  } catch (e) { console.error('[ACTIVITY] Failed to emit activity', e); }
}

// ─── Centralized System Event Dispatcher ──────────────────────────────────────
async function emitSystemEvent({ type, userId = null, metadata = {}, ipAddress = '127.0.0.1' }) {
  const details = metadata.details || JSON.stringify(metadata);
  await emitActivity(type, userId, details, ipAddress);
}

// ─── Financial Transaction Ledger (Immutable) ─────────────────────────────────
async function recordFinancialTransaction({ type, userId, amount, beforeBalance, afterBalance, createdBy, reason }) {
  try {
    // await db.read();
    db.data.financial_transactions ||= [];
    const entry = {
      id: uuidv4(),
      type,
      user_id: userId,
      amount: parseFloat(amount),
      before_balance: parseFloat(beforeBalance),
      after_balance: parseFloat(afterBalance),
      created_by: createdBy,
      reason: reason || 'N/A',
      created_at: new Date().toISOString()
    };
    db.data.financial_transactions.push(entry);
    await db.write();
    adminNs.emit('admin:financial_tx', entry);
    return entry;
  } catch (e) { console.error('[LEDGER] Failed to record financial transaction', e); }
}

// ─── Alert System Engine ──────────────────────────────────────────────────────
const alertDeduplicationCache = new Map(); // userId_type -> timestamp

async function createAlert({ type, severity, userId, relatedTradeId = null, message, metadata = {} }) {
  try {
    const now = Date.now();
    const dedupeKey = `${userId}_${type}`;
    
    // 10s Deduplication check
    if (alertDeduplicationCache.has(dedupeKey)) {
      const lastTriggered = alertDeduplicationCache.get(dedupeKey);
      if (now - lastTriggered < 10000) {
        return null; // Skip duplicate alert
      }
    }
    alertDeduplicationCache.set(dedupeKey, now);

    // await db.read();
    db.data.alerts ||= [];
    
    const alertEntry = {
      id: uuidv4(),
      type,
      severity,
      userId,
      relatedTradeId,
      message,
      metadata,
      status: 'OPEN',
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    db.data.alerts.push(alertEntry);
    await db.write();
    
    // Broadcast real-time events to admin dashboard
    io.to('admin_dashboard').emit('admin:alert', alertEntry);
    adminNs.emit('admin:alert', alertEntry);
    adminNs.emit('new_alert', alertEntry);
    
    console.log(`[ALERT] [${severity.toUpperCase()}] ${type}: ${message}`);
    return alertEntry;
  } catch (e) { 
    console.error('[ALERT] Failed to create alert', e); 
    return null;
  }
}

async function triggerAutoFreeze(userId, reason, durationHours = 24) {
  try {
    // await db.read();
    const user = db.data.users.find(u => u.id === userId);
    if (!user) return;

    if (user.accountStatus === 'frozen' || user.status === 'frozen') return; // Already frozen

    const freezeUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    
    user.accountStatus = 'frozen';
    user.status = 'frozen';
    user.freezeUntil = freezeUntil;
    user.freezeReason = reason;

    await db.write();

    await createAlert({
      type: 'AUTO_FREEZE',
      severity: 'HIGH',
      userId: user.id,
      message: `System Auto-Freeze: ${reason}. Locked until ${new Date(freezeUntil).toLocaleString()}`,
      metadata: { reason, durationHours, freezeUntil }
    });

    await emitActivity('AUTO_FREEZE', user.id, `Account auto-frozen: ${reason}`, 'System');
    
    // Force logout
    io.to(`user:${user.id}`).emit('force_logout');
    const sockets = await io.in(`user:${user.id}`).fetchSockets();
    for (const s of sockets) s.disconnect(true);

    user.is_online = false;
    user.current_socket = null;
    await db.write();

    console.log(`[Auto-Moderation] User ${user.email} frozen for ${durationHours}h. Reason: ${reason}`);
  } catch (err) {
    console.error('[Auto-Moderation] Failed to trigger auto-freeze:', err);
  }
}

// ─── Admin WebSocket Namespace (/admin) ───────────────────────────────────────
const adminNs = io.of('/admin');

adminNs.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return next(new Error('Admin access required'));
    }
    socket.adminUser = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

adminNs.on('connection', (socket) => {
  console.log(`[Admin WS] Admin connected: ${socket.adminUser.email} (${socket.id})`);
  socket.join('admin_room');
  
  socket.on('disconnect', () => {
    console.log(`[Admin WS] Admin disconnected: ${socket.id}`);
  });
});

// ─── Binance WebSocket Price Feed ─────────────────────────────────────────────
const SYMBOLS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','AVAXUSDT','DOTUSDT','LINKUSDT','UNIUSDT','MATICUSDT'];
const SYMBOL_MAP = {
  BTCUSDT: { symbol: 'BTC', name: 'Bitcoin' },
  ETHUSDT: { symbol: 'ETH', name: 'Ethereum' },
  SOLUSDT: { symbol: 'SOL', name: 'Solana' },
  BNBUSDT: { symbol: 'BNB', name: 'BNB' },
  XRPUSDT: { symbol: 'XRP', name: 'XRP' },
  ADAUSDT: { symbol: 'ADA', name: 'Cardano' },
  DOGEUSDT: { symbol: 'DOGE', name: 'Dogecoin' },
  AVAXUSDT: { symbol: 'AVAX', name: 'Avalanche' },
  DOTUSDT: { symbol: 'DOT', name: 'Polkadot' },
  LINKUSDT: { symbol: 'LINK', name: 'Chainlink' },
  UNIUSDT: { symbol: 'UNI', name: 'Uniswap' },
  MATICUSDT: { symbol: 'MATIC', name: 'Polygon' },
};

// In-memory price store
const livePrices = new Map();
const price24hData = new Map(); // { open, high, low, volume }
const otps = new Map(); // email -> { otp, expires }

// Initialize from CoinGecko as fallback, then switch to Binance
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const COIN_IDS = 'bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,avalanche-2,polkadot,chainlink,uniswap,matic-network';
const COIN_MAP = {
  bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', binancecoin: 'BNB',
  ripple: 'XRP', cardano: 'ADA', dogecoin: 'DOGE', 'avalanche-2': 'AVAX',
  polkadot: 'DOT', chainlink: 'LINK', uniswap: 'UNI', 'matic-network': 'MATIC',
};
const SYMBOL_TO_COINGECKO = {};
for (const [cgId, sym] of Object.entries(COIN_MAP)) SYMBOL_TO_COINGECKO[sym] = cgId;

// CoinGecko fallback for initial load + REST endpoint
let coinGeckoCache = { prices: [], updatedAt: 0, imageMap: {} };
async function fetchCoinGeckoPrices() {
  try {
    const url = `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${COIN_IDS}&order=market_cap_desc&per_page=15&page=1&sparkline=false&price_change_percentage=24h`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`);
    const data = await resp.json();
    const prices = data.map(coin => {
      const sym = COIN_MAP[coin.id];
      if (!sym) return null;
      coinGeckoCache.imageMap[sym] = coin.image || '';
      // Seed livePrices if not set by Binance yet
      if (!livePrices.has(sym)) {
        livePrices.set(sym, coin.current_price || 0);
        price24hData.set(sym, {
          open: coin.current_price / (1 + (coin.price_change_percentage_24h || 0) / 100),
          high: coin.high_24h || coin.current_price,
          low: coin.low_24h || coin.current_price,
          volume: coin.total_volume || 0,
          market_cap: coin.market_cap || 0,
          change_24h: coin.price_change_percentage_24h || 0,
        });
      }
      return {
        symbol: sym,
        name: Object.values(SYMBOL_MAP).find(s => s.symbol === sym)?.name || sym,
        price: coin.current_price || 0,
        change_24h: coin.price_change_percentage_24h || 0,
        volume_24h: coin.total_volume || 0,
        market_cap: coin.market_cap || 0,
        high_24h: coin.high_24h || 0,
        low_24h: coin.low_24h || 0,
        image_url: coin.image || '',
      };
    }).filter(Boolean);
    coinGeckoCache = { prices, updatedAt: Date.now(), imageMap: coinGeckoCache.imageMap };
    return prices;
  } catch (err) {
    console.error('[CoinGecko] Fetch error:', err.message);
    return coinGeckoCache.prices;
  }
}

// Build aggregated price list from live prices
function buildPriceList() {
  const list = [];
  for (const [pair, info] of Object.entries(SYMBOL_MAP)) {
    const sym = info.symbol;
    const price = livePrices.get(sym) || 0;
    const data24 = price24hData.get(sym) || {};
    const change = data24.change_24h ?? (data24.open ? ((price - data24.open) / data24.open) * 100 : 0);
    list.push({
      symbol: sym,
      name: info.name,
      price,
      change_24h: change,
      volume_24h: data24.volume || 0,
      market_cap: data24.market_cap || 0,
      high_24h: data24.high || price,
      low_24h: data24.low || price,
      image_url: coinGeckoCache.imageMap[sym] || '',
    });
  }
  return list;
}

// ─── Bybit WebSocket ──────────────────────────────────────────────────────────
let bybitWs = null;
let bybitReconnectTimer = null;
let bybitPingInterval = null;

function connectBybit() {
  const wsUrl = `wss://stream.bytick.com/v5/public/spot`;
  console.log('[Bybit] Connecting to WebSocket...');

  try {
    bybitWs = new WebSocket(wsUrl);
  } catch (err) {
    console.error('[Bybit] WebSocket construction error:', err.message);
    scheduleReconnect();
    return;
  }

  bybitWs.on('open', () => {
    console.log('[Bybit] ✓ WebSocket connected');
    // Subscribe to tickers (Bybit V5 limit is 10 args per sub msg)
    const chunkSize = 10;
    for (let i = 0; i < SYMBOLS.length; i += chunkSize) {
      const chunk = SYMBOLS.slice(i, i + chunkSize);
      const subscribeMsg = {
        op: 'subscribe',
        args: chunk.map(s => `tickers.${s}`)
      };
      bybitWs.send(JSON.stringify(subscribeMsg));
    }

    // Keepalive ping every 20s
    if (bybitPingInterval) clearInterval(bybitPingInterval);
    bybitPingInterval = setInterval(() => {
      if (bybitWs.readyState === WebSocket.OPEN) {
        bybitWs.send(JSON.stringify({ op: 'ping' }));
      }
    }, 20000);
  });

  bybitWs.on('message', (raw) => {
    try {
      const resp = JSON.parse(raw);
      if (resp.topic && resp.topic.startsWith('tickers.') && resp.data) {
        const data = resp.data;
        const symbolStr = data.symbol;
        const info = SYMBOL_MAP[symbolStr];
        if (!info) return;

        const price = parseFloat(data.lastPrice);
        if (isNaN(price)) return;

        livePrices.set(info.symbol, price);

        // Broadcast unified price update
        io.emit('price:update', {
          symbol: info.symbol,
          price,
          timestamp: Date.now(),
          name: info.name,
          change_24h: (parseFloat(data.price24hPcnt) || 0) * 100,
          high_24h: parseFloat(data.highPrice24h) || price,
          low_24h: parseFloat(data.lowPrice24h) || price,
          volume_24h: parseFloat(data.turnover24h) || 0,
          image_url: coinGeckoCache.imageMap[info.symbol] || '',
        });

        updateFloatingPnL(info.symbol, price);
      } else if (resp.op === 'subscribe') {
        if (!resp.success) console.error('[Bybit] Subscription failed:', resp.ret_msg);
      }
    } catch (err) {
      console.error('[Bybit] Message parse error:', err.message);
    }
  });

  bybitWs.on('error', (err) => {
    console.error('[Bybit] WebSocket error:', err.message);
  });

  bybitWs.on('close', (code, reason) => {
    console.log(`[Bybit] WebSocket disconnected. Code: ${code}, Reason: ${reason}`);
    if (bybitPingInterval) clearInterval(bybitPingInterval);
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (bybitReconnectTimer) return;
  bybitReconnectTimer = setTimeout(() => {
    bybitReconnectTimer = null;
    connectBybit();
  }, 5000);
}

// ─── Real-Time P&L Engine & Liquidations ───────────────────────────────────────
function updateFloatingPnL(symbol, currentPrice) {
  if (!db.data?.trades) return;
  const asset = symbol + 'USDT';
  const openTrades = db.data.trades.filter(t => t.status === 'open' && t.asset === asset);
  if (openTrades.length === 0) return;

  // Group by user
  const userTrades = {};
  let dbNeedsWrite = false;

  for (const trade of openTrades) {
    if (!userTrades[trade.user_id]) userTrades[trade.user_id] = [];
    let pnl;
    if (trade.direction === 'buy') {
      pnl = (currentPrice - trade.entry_price) * trade.amount * trade.leverage;
    } else {
      pnl = (trade.entry_price - currentPrice) * trade.amount * trade.leverage;
    }
    trade.profit_loss = Math.round(pnl * 100) / 100;
    
    // Evaluate TP/SL
    let triggerHit = false;
    let triggerType = null;

    if (trade.tp_price) {
      if (trade.direction === 'buy' && currentPrice >= trade.tp_price) { triggerHit = true; triggerType = 'TAKE_PROFIT'; }
      else if (trade.direction === 'sell' && currentPrice <= trade.tp_price) { triggerHit = true; triggerType = 'TAKE_PROFIT'; }
    }
    if (trade.sl_price && !triggerHit) {
      if (trade.direction === 'buy' && currentPrice <= trade.sl_price) { triggerHit = true; triggerType = 'STOP_LOSS'; }
      else if (trade.direction === 'sell' && currentPrice >= trade.sl_price) { triggerHit = true; triggerType = 'STOP_LOSS'; }
    }

    // Evaluate Liquidation or TP/SL
    if (trade.profit_loss <= -trade.amount || triggerHit) {
      trade.status = 'closed';
      trade.closed_at = new Date().toISOString();
      trade.close_price = currentPrice;
      trade.exit_reason = triggerType || 'LIQUIDATION';
      dbNeedsWrite = true;
      
      const alertType = triggerType || 'LIQUIDATION';
      createAlert({ 
        type: alertType, 
        severity: alertType === 'LIQUIDATION' ? 'CRITICAL' : 'INFO', 
        userId: trade.user_id, 
        relatedTradeId: trade.id, 
        message: `${alertType.replace('_', ' ')} Hit: ${trade.direction.toUpperCase()} ${trade.amount}x${trade.leverage} on ${asset} at ${currentPrice}`, 
        metadata: { asset, direction: trade.direction, amount: trade.amount, leverage: trade.leverage, price: currentPrice, reason: alertType } 
      });

      // Update wallet balance (return margin + P&L)
      db.read().then(() => {
        const wallet = db.data.wallets.find(w => w.user_id === trade.user_id);
        if (wallet) {
          wallet.demo_balance = Math.round((wallet.demo_balance + trade.amount + trade.profit_loss) * 100) / 100;
          if (wallet.demo_balance < 0) wallet.demo_balance = 0;
          io.to(`user:${trade.user_id}`).emit('balance:update', { demo_balance: wallet.demo_balance });
        }
      });
      
      io.to(`user:${trade.user_id}`).emit('trade:closed', trade);
      adminNs.emit('position_closed', trade);
      
      // Emit generic system activity
      emitActivity(alertType, trade.user_id, `Position closed via ${alertType.replace('_', ' ')} on ${asset} at $${currentPrice}`, 'System');
    } else {
      userTrades[trade.user_id].push({
        id: trade.id,
        asset: trade.asset,
        direction: trade.direction,
        amount: trade.amount,
        leverage: trade.leverage,
        entry_price: trade.entry_price,
        profit_loss: trade.profit_loss,
        created_at: trade.created_at,
      });
    }
  }

  if (dbNeedsWrite) {
    db.write().catch(err => console.error('[Liquidations] DB write error:', err));
  }

  // Push to each user's room
  for (const [userId, trades] of Object.entries(userTrades)) {
    io.to(`user:${userId}`).emit('trades:pnl:update', { trades, price: currentPrice, symbol });
  }
}

// ─── Socket.IO ────────────────────────────────────────────────────────────────


// ─── Auth helpers ─────────────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, permissions: user.permissions || {} }, JWT_SECRET, { expiresIn: '7d' });
}

async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing authorization' });
  const token = auth.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user still exists and handle Master Moderation (Auto-Unfreeze)
    // await db.read();
    const user = db.data.users.find(u => u.id === decoded.id);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });

    // Handle Auto-Unfreeze logic
    if ((user.status === 'frozen' || user.accountStatus === 'frozen') && user.freezeUntil) {
      if (new Date() > new Date(user.freezeUntil)) {
        console.log(`[Auto-Moderation] Freeze expired for ${user.email}. Restoring access.`);
        user.status = 'active';
        user.accountStatus = 'active';
        user.freezeUntil = null;
        user.freezeReason = null;
        await db.write();
      }
    }

    if (user.status === 'banned') return res.status(403).json({ error: 'ACCOUNT_BANNED', message: 'Your account has been banned.' });
    if (user.status === 'frozen' || user.accountStatus === 'frozen') {
      const until = user.freezeUntil ? ` until ${new Date(user.freezeUntil).toLocaleString()}` : '';
      return res.status(403).json({ 
        error: 'ACCOUNT_FROZEN', 
        message: `Your account is currently frozen${until}. Reason: ${user.freezeReason || 'Administrative Review'}` 
      });
    }
    
    req.user = { ...decoded, status: user.status, accountStatus: user.accountStatus };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── Role Based Access Control (RBAC) Middleware ─────────────────────────────
function requireRole(roles) {
  return async (req, res, next) => {
    if (!req.user || !req.user.role) {
      await logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', 'No role found in token for restricted route', req.ip, req.user?.id);
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    if (!roles.includes(req.user.role)) {
      await logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', `Role ${req.user.role} attempted to access route restricted to ${roles.join(',')}`, req.ip, req.user.id);
      return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    }
    
    next();
  };
}

function requirePermission(flagStr) {
  return async (req, res, next) => {
    // Superadmins explicitly bypass specific flag checks
    if (req.user && req.user.role === 'superadmin') return next();

    const perms = req.user.permissions || {};
    if (perms[flagStr] !== true) {
      await logSecurityEvent('UNAUTHORIZED_PERMISSION_ATTEMPT', `Role ${req.user.role} attempted to access route without permission flag: ${flagStr}`, req.ip, req.user.id);
      return res.status(403).json({ error: `Forbidden. Missing permission: ${flagStr}` });
    }
    next();
  };
}

const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests to admin endpoints. Please try again later.' },
  handler: async (req, res, next, options) => {
    await logSecurityEvent('RATE_LIMIT_EXCEEDED', `Admin rate limit hit for path ${req.path}`, req.ip, req.user?.id);
    res.status(options.statusCode).send(options.message);
  }
});

// ─── Auth endpoints ───────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email: rawEmail, username, password } = req.body;
    if (!rawEmail || !username || !password) return res.status(400).json({ error: 'Missing fields' });
    const email = rawEmail.toLowerCase().trim();
    
    // await db.read();
    const existingUser = db.data.users.find(u => u.email.toLowerCase() === email);
    if (existingUser) {
      if (existingUser.status === 'unverified') {
        // Allow re-registration/requesting new OTP if unverified
        // Just update password and proceed to send new OTP
        existingUser.username = username;
        existingUser.password_hash = await bcrypt.hash(password, 10);
      } else {
        return res.status(409).json({ error: 'Email already registered' });
      }
    } else {
      const password_hash = await bcrypt.hash(password, 10);
      const id = uuidv4();
      const user = { 
        id, email, username, password_hash, 
        role: 'user', 
        permissions: {}, 
        two_factor: { enabled: false, secret: null },
        status: 'unverified', 
        accountStatus: 'unverified',
        freezeUntil: null,
        freezeReason: null,
        loginAttempts: 0,
        risk_score: 0, 
        created_at: new Date().toISOString() 
      };
      db.data.users.push(user);
      console.log(`[DEBUG] New user pushed to memory: ${email}. Total users now: ${db.data.users.length}`);
    }

    // Generate Verification OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 }); // 10 mins

    console.log(`[AUTH] Registration OTP for ${email}: ${otp}`);

    // Send Email
    if (GMAIL_USER && GMAIL_PASS) {
      try {
        await mailTransporter.sendMail({
          from: `"B50 Trade Support" <${GMAIL_USER}>`,
          to: email,
          subject: "Activate Your B50 Trade Account",
          text: `Welcome to B50 Trade! Your verification code is: ${otp}. This code expires in 10 minutes.`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #333; line-height: 1.6; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #059669; margin-bottom: 24px;">Confirm your registration</h2>
              <p>Hello,</p>
              <p>Thank you for choosing <strong>B50 Trade</strong>. To complete your account setup and start trading, please use the following verification code:</p>
              
              <div style="margin: 32px 0; padding: 24px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; text-align: center;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #065f46;">${otp}</span>
              </div>
              
              <p style="font-size: 14px; color: #666;">This security code will expire in 10 minutes. Please do not share this code with anyone.</p>
              
              <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
                <p>If you didn't request this email, you can safely ignore it.</p>
                <p>&copy; 2026 B50 Trade Security Systems. All rights reserved.</p>
              </div>
            </div>
          `,
        });
      } catch (err) {
        console.error('[AUTH] Registration email failed:', err.message);
      }
    }

    await db.write();
    console.log(`[DEBUG] Database write completed for registration of ${email}`);
    res.json({ success: true, verificationRequired: true, email });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed: ' + (err.message || 'Unknown error') });
  }
});

app.post('/api/auth/verify-registration', async (req, res) => {
  try {
    const { email: rawEmail, otp } = req.body;
    if (!rawEmail || !otp) return res.status(400).json({ error: 'Missing email or code' });
    const email = rawEmail.toLowerCase().trim();

    const stored = otps.get(email);
    if (!stored || stored.expires < Date.now() || stored.otp !== otp) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // await db.read();
    console.log(`[DEBUG] Verifying user ${email}. Total users in DB: ${db.data.users.length}`);
    const user = db.data.users.find(u => u.email.toLowerCase() === email);
    if (!user) {
      console.log(`[DEBUG] User NOT FOUND in DB: ${email}. Available emails: ${db.data.users.map(u => u.email).join(', ')}`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Activate User
    user.status = 'active';
    user.accountStatus = 'active';
    
    // Create Wallet
    const existingWallet = db.data.wallets.find(w => w.user_id === user.id);
    if (!existingWallet) {
      db.data.wallets.push({ 
        id: uuidv4(), user_id: user.id, 
        demo_balance: 500, savings_balance: 0,
        available_balance: 500, frozen_balance: 0 
      });
    }

    await db.write();
    otps.delete(email);

    const token = signToken(user);
    const safeUser = { id: user.id, email: user.email, username: user.username, role: user.role, status: user.status, risk_score: user.risk_score, created_at: user.created_at };
    
    await emitActivity('USER_REGISTERED', user.id, `Account verified: ${user.email}`, req.ip);
    
    res.json({ success: true, user: safeUser, token });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email: rawEmail, password, otp } = req.body;
  if (!rawEmail || !password) return res.status(400).json({ error: 'Missing fields' });
  const email = rawEmail.toLowerCase().trim();
  // await db.read();
  const row = db.data.users.find(u => u.email.toLowerCase() === email);
  
  if (!row) {
    await logSecurityEvent('FAILED_LOGIN', `Failed login attempt for non-existent email: ${email}`, req.ip);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  if (row.status !== 'active') {
    await logSecurityEvent('FAILED_LOGIN', `Attempted login to inactive account: ${email} (${row.status})`, req.ip, row.id);
    return res.status(401).json({ error: `Account is ${row.status}` });
  }

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    await logSecurityEvent('FAILED_LOGIN', `Invalid password for: ${email}`, req.ip, row.id);
    const recentFailures = db.data.security_logs.filter(l => l.event_type === 'FAILED_LOGIN' && l.ip_address === req.ip && (Date.now() - new Date(l.created_at).getTime() < 300000));
    if (recentFailures.length >= 3) {
      await createAlert({ type: 'SUSPICIOUS_LOGIN', severity: 'HIGH', userId: row.id, message: `3+ failed login attempts from ${req.ip}`, metadata: { ip: req.ip, count: recentFailures.length } });
      await triggerAutoFreeze(row.id, 'Account frozen due to multiple failed login attempts. Please contact support.', 24);
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // TOTP Check
  if (row.two_factor && row.two_factor.enabled) {
    if (!otp) {
      return res.status(403).json({ error: '2FA_REQUIRED', message: 'Two-factor authentication required' });
    }
    const isValid = authenticator.check(otp, row.two_factor.secret);
    if (!isValid) {
      await logSecurityEvent('FAILED_LOGIN', `Invalid 2FA code for: ${email}`, req.ip, row.id);
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }
  }

  const user = { 
    id: row.id, email: row.email, username: row.username, 
    role: row.role, permissions: row.permissions || {}, 
    two_factor_enabled: row.two_factor?.enabled,
    status: row.status, risk_score: row.risk_score, created_at: row.created_at 
  };
  const token = signToken(user);
  
  await logSecurityEvent('SUCCESSFUL_LOGIN', `User logged in: ${email}`, req.ip, row.id);
  await emitActivity('USER_LOGGED_IN', row.id, `User logged in`, req.ip);
  res.json({ user, token });
});

// ─── 2FA Setup Endpoints ──────────────────────────────────────────────────────
app.post('/api/auth/setup-2fa', authMiddleware, async (req, res) => {
  // await db.read();
  const user = db.data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  if (user.two_factor && user.two_factor.enabled) {
    return res.status(400).json({ error: '2FA is already enabled' });
  }

  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, 'CryptoSim Secure', secret);

  // We store it temporarily. It won't be completely 'enabled' until verified.
  user.two_factor = { enabled: false, secret: secret };
  await db.write();

  res.json({ secret, otpauth });
});

app.post('/api/auth/verify-setup-2fa', authMiddleware, async (req, res) => {
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ error: 'OTP is required' });

  // await db.read();
  const user = db.data.users.find(u => u.id === req.user.id);
  if (!user || !user.two_factor || !user.two_factor.secret) {
    return res.status(400).json({ error: '2FA setup not initiated' });
  }

  const isValid = authenticator.check(otp, user.two_factor.secret);
  if (!isValid) return res.status(400).json({ error: 'Invalid OTP code' });

  user.two_factor.enabled = true;
  await db.write();
  
  await logSecurityEvent('2FA_ENABLED', `User enabled 2FA`, req.ip, user.id);
  res.json({ success: true, message: '2FA successfully enabled' });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email: rawEmail } = req.body;
  if (!rawEmail) return res.status(400).json({ error: 'Email is required' });
  const email = rawEmail.toLowerCase().trim();

  // await db.read();
  const user = db.data.users.find(u => u.email.toLowerCase() === email);
  // Security best practice: don't reveal if user exists or not
  if (!user) {
    return res.json({ message: 'If an account exists with this email, an OTP has been sent.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otps.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 }); // 5 mins

  console.log(`[AUTH] OTP for ${email}: ${otp} (Expires in 5 mins)`);
  
  // Send Real Email
  if (GMAIL_USER && GMAIL_PASS) {
    try {
      await mailTransporter.sendMail({
        from: `"CryptoSim Security" <${GMAIL_USER}>`,
        to: email,
        subject: "Your OTP for Password Reset",
        html: `
          <div style="font-family: sans-serif; padding: 20px; background: #0b0e23; color: #fff; border-radius: 12px;">
            <h2 style="color: #10b981;">Password Reset</h2>
            <p style="color: #94a3b8;">You requested a password reset. Use the code below to proceed:</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #fff; margin: 30px 0; text-align: center; background: rgba(16, 185, 129, 0.1); padding: 20px; border-radius: 8px; border: 1px dashed #10b981;">
              ${otp}
            </div>
            <p style="color: #94a3b8; font-size: 14px;">This code will expire in <b>5 minutes</b>.</p>
            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;" />
            <p style="color: #64748b; font-size: 11px;">If you did not request this, please secure your account immediately.</p>
          </div>
        `,
      });
      console.log(`[AUTH] REAL OTP Email sent to ${email}`);
    } catch (err) {
      console.error('[AUTH] Email failed to send:', err.message);
    }
  } else {
    console.warn('[AUTH] GMAIL credentials missing — logged to console only.');
  }
  
  res.json({ message: 'If an account exists with this email, an OTP has been sent.' });
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { email: rawEmail, otp } = req.body;
  if (!rawEmail || !otp) return res.status(400).json({ error: 'Email and OTP are required' });
  const email = rawEmail.toLowerCase().trim();

  const stored = otps.get(email);
  if (!stored) return res.status(400).json({ error: 'OTP expired or not found' });
  if (stored.expires < Date.now()) {
    otps.delete(email);
    return res.status(400).json({ error: 'OTP expired' });
  }
  if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

  res.json({ message: 'OTP verified successfully' });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email: rawEmail, otp, newPassword } = req.body;
  if (!rawEmail || !otp || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  const email = rawEmail.toLowerCase().trim();

  const stored = otps.get(email);
  if (!stored || stored.expires < Date.now() || stored.otp !== otp) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  // await db.read();
  const userIndex = db.data.users.findIndex(u => u.email.toLowerCase() === email);
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

  const password_hash = await bcrypt.hash(newPassword, 10);
  db.data.users[userIndex].password_hash = password_hash;
  await db.write();

  otps.delete(email);
  console.log(`[AUTH] Password reset successfully for ${email}`);
  res.json({ message: 'Password reset successfully' });
});

// ─── Data endpoints ───────────────────────────────────────────────────────────
app.get('/api/users/:id', async (req, res) => {
  // await db.read();
  const row = db.data.users.find(u => u.id === req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const user = { 
    id: row.id, email: row.email, username: row.username, 
    role: row.role, permissions: row.permissions || {}, 
    two_factor_enabled: row.two_factor?.enabled,
    status: row.status, risk_score: row.risk_score, created_at: row.created_at 
  };
  res.json({ user });
});

app.get('/api/wallets/:userId', async (req, res) => {
  // await db.read();
  let wallet = db.data.wallets.find(w => w.user_id === req.params.userId);
  if (!wallet) {
    wallet = { 
      id: uuidv4(), user_id: req.params.userId, 
      demo_balance: 500, savings_balance: 0,
      available_balance: 500, frozen_balance: 0 
    };
    db.data.wallets.push(wallet);
    await db.write();
  }
  // Data migration for existing wallets
  if (wallet.available_balance === undefined) {
    wallet.available_balance = wallet.demo_balance;
    wallet.frozen_balance = 0;
    await db.write();
  }
  res.json({ wallet });
});

app.post('/api/wallets/:userId', async (req, res) => {
  const { demo_balance, savings_balance, available_balance, frozen_balance } = req.body;
  // await db.read();
  let wallet = db.data.wallets.find(w => w.user_id === req.params.userId);
  if (!wallet) {
    wallet = { 
      id: uuidv4(), user_id: req.params.userId, 
      demo_balance: demo_balance ?? 500, savings_balance: savings_balance ?? 0,
      available_balance: available_balance ?? 500, frozen_balance: frozen_balance ?? 0 
    };
    db.data.wallets.push(wallet);
  } else {
    if (demo_balance !== undefined) wallet.demo_balance = demo_balance;
    if (savings_balance !== undefined) wallet.savings_balance = savings_balance;
    if (available_balance !== undefined) wallet.available_balance = available_balance;
    if (frozen_balance !== undefined) wallet.frozen_balance = frozen_balance;
  }
  await db.write();
  res.json({ wallet });
});

app.get('/api/crypto_balances', async (req, res) => {
  // await db.read();
  const rows = db.data.crypto_balances.filter(r => r.user_id === req.query.user_id).map(r => ({ symbol: r.symbol, amount: r.amount }));
  res.json({ data: rows });
});

app.get('/api/transactions', async (req, res) => {
  // await db.read();
  const rows = db.data.transactions.filter(t => t.user_id === req.query.user_id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100);
  res.json({ data: rows });
});

app.get('/api/withdrawal_requests', async (req, res) => {
  // await db.read();
  const rows = db.data.withdrawal_requests.filter(w => w.user_id === req.query.user_id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ data: rows });
});

app.get('/api/reports', async (req, res) => {
  // await db.read();
  const rows = db.data.reports.filter(r => r.reporter_id === req.query.reporter_id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ data: rows });
});

// ─── Admin endpoints ──────────────────────────────────────────────────────────
app.get('/api/admin/users', adminRateLimiter, authMiddleware, requireRole(['superadmin', 'admin', 'moderator']), async (req, res) => {
  // await db.read();
  
  // Basic pagination and search could be implemented here based on query params
  // const { page = 1, limit = 50, search = '' } = req.query;
  
  res.json({ data: db.data.users.map(u => ({ id: u.id, email: u.email, username: u.username, role: u.role, status: u.status, risk_score: u.risk_score, created_at: u.created_at })) });
});

app.get('/api/admin/users/:id/details', adminRateLimiter, authMiddleware, requireRole(['superadmin', 'admin', 'moderator']), async (req, res) => {
  // await db.read();
  const userId = req.params.id;
  const user = db.data.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const safeUser = { 
    id: user.id, 
    email: user.email, 
    username: user.username, 
    role: user.role, 
    status: user.status, 
    accountStatus: user.accountStatus,
    freezeUntil: user.freezeUntil,
    freezeReason: user.freezeReason,
    risk_score: user.risk_score, 
    created_at: user.created_at 
  };
  const wallet = db.data.wallets.find(w => w.user_id === userId) || null;
  const crypto_balances = db.data.crypto_balances.filter(c => c.user_id === userId) || [];
  
  res.json({ user: safeUser, wallet, crypto_balances });
});

app.get('/api/admin/withdrawals', adminRateLimiter, authMiddleware, requireRole(['superadmin', 'admin', 'moderator']), async (req, res) => {
  // await db.read();
  res.json({ data: db.data.withdrawal_requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) });
});

app.get('/api/admin/reports', adminRateLimiter, authMiddleware, requireRole(['superadmin', 'admin', 'moderator']), async (req, res) => {
  // await db.read();
  res.json({ data: db.data.reports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) });
});

// ─── Transaction & balance mutations ──────────────────────────────────────────
app.post('/api/transactions', async (req, res) => {
  const { user_id, type, symbol, amount, price, total, status, realized_pnl } = req.body;
  // await db.read();
  const id = uuidv4();
  const tx = { id, user_id, type, symbol, amount, price, total, realized_pnl: realized_pnl || 0, status: status || 'completed', created_at: new Date().toISOString() };
  db.data.transactions.push(tx);
  await db.write();
  res.json({ id });
});

app.post('/api/crypto_balances/upsert', async (req, res) => {
  const { user_id, symbol, amount } = req.body;
  // await db.read();
  const existing = db.data.crypto_balances.find(c => c.user_id === user_id && c.symbol === symbol);
  if (existing) { existing.amount = amount; existing.updated_at = new Date().toISOString(); }
  else { db.data.crypto_balances.push({ id: uuidv4(), user_id, symbol, amount, updated_at: new Date().toISOString() }); }
  await db.write();
  res.json({ ok: true });
});

app.post('/api/crypto_balances/delete', async (req, res) => {
  const { user_id, symbol } = req.body;
  // await db.read();
  db.data.crypto_balances = db.data.crypto_balances.filter(c => !(c.user_id === user_id && c.symbol === symbol));
  await db.write();
  res.json({ ok: true });
});

app.post('/api/withdrawal_requests', async (req, res) => {
  const { user_id, username, amount, bank_name, account_number, account_name } = req.body;
  // await db.read();
  const id = uuidv4();
  db.data.withdrawal_requests.push({ id, user_id, username, amount, bank_name, account_number, account_name, status: 'pending', created_at: new Date().toISOString() });
  await db.write();

  // Master Moderation: Large withdrawal trigger
  if (parseFloat(amount) > 5000) {
    await triggerAutoFreeze(user_id, 'Large withdrawal request exceeds auto-review threshold (>$5,000). Account frozen for security review.', 24);
  }

  res.json({ id });
});

app.post('/api/reports', authMiddleware, async (req, res) => {
  const { targetUserId, reason, description, relatedEntityId, evidence } = req.body;
  const reporterId = req.user.id;

  if (!targetUserId || !reason || !description) {
    return res.status(400).json({ error: 'Missing required fields: targetUserId, reason, description' });
  }

  if (targetUserId === reporterId) {
    return res.status(400).json({ error: 'You cannot report yourself' });
  }

  // await db.read();
  const reporter = db.data.users.find(u => u.id === reporterId);
  const reported = db.data.users.find(u => u.id === targetUserId);

  if (!reported) {
    return res.status(404).json({ error: 'Target user not found' });
  }

  const id = uuidv4();
  const newReport = { 
    id, 
    reporter_id: reporterId, 
    reporter_name: reporter?.username || 'Unknown', 
    reported_user_id: targetUserId, 
    reported_name: reported?.username || 'Unknown', 
    reason, 
    description, 
    related_entity_id: relatedEntityId || null,
    evidence: evidence || null,
    status: 'pending', 
    created_at: new Date().toISOString() 
  };

  db.data.reports.push(newReport);
  await db.write();

  // Log audit entry
  await logAdminAction('SYSTEM', 'USER_REPORT_SUBMITTED', targetUserId, `Reported for: ${reason}`, null, { reportId: id, reporterId });

  // Master Moderation: Multiple reports trigger
  const recentReports = db.data.reports.filter(r => 
    r.reported_user_id === targetUserId && 
    (Date.now() - new Date(r.created_at).getTime() < 86400000)
  ).length;

  if (recentReports >= 5) {
    await triggerAutoFreeze(targetUserId, 'Account auto-frozen due to multiple user reports within 24 hours. Pending admin review.', 48);
  }

  res.json({ id, success: true });
});

// ─── Positions endpoints (legacy, still used) ────────────────────────────────
app.get('/api/positions', async (req, res) => {
  // await db.read();
  res.json({ data: db.data.positions.filter(p => p.user_id === req.query.user_id) });
});

app.post('/api/positions/upsert', async (req, res) => {
  const { user_id, symbol, amount, avg_buy_price, total_invested } = req.body;
  // await db.read();
  const existing = db.data.positions.find(p => p.user_id === user_id && p.symbol === symbol);
  if (existing) {
    existing.amount = amount; existing.avg_buy_price = avg_buy_price; existing.total_invested = total_invested;
    existing.updated_at = new Date().toISOString();
  } else {
    db.data.positions.push({ id: uuidv4(), user_id, symbol, amount, avg_buy_price, total_invested, updated_at: new Date().toISOString() });
  }
  await db.write();
  res.json({ ok: true });
});

app.post('/api/positions/delete', async (req, res) => {
  const { user_id, symbol } = req.body;
  // await db.read();
  db.data.positions = db.data.positions.filter(p => !(p.user_id === user_id && p.symbol === symbol));
  await db.write();
  res.json({ ok: true });
});

// ─── Admin actions ────────────────────────────────────────────────────────────
app.post('/api/admin/withdrawals/:id/approve', adminRateLimiter, authMiddleware, requireRole(['superadmin', 'admin']), requirePermission('canManageWithdrawals'), async (req, res) => {
  // await db.read();
  const wr = db.data.withdrawal_requests.find(w => w.id === req.params.id);
  if (wr && wr.status === 'pending') { 
    wr.status = 'approved'; 
    wr.processed_by = req.user.id; 
    
    // In a real system, you would deduct from the user's available balance here if it wasn't deducted at request time
    
    await db.write(); 
    await logAdminAction(req.user.id, 'APPROVE_WITHDRAWAL', wr.user_id, 'Admin approved withdrawal', { status: 'pending' }, { status: 'approved', amount: wr.amount });
    res.json({ ok: true });
  } else {
    res.status(400).json({ error: 'Withdrawal not found or already processed' });
  }
});

app.post('/api/admin/withdrawals/:id/reject', adminRateLimiter, authMiddleware, requireRole(['superadmin', 'admin']), requirePermission('canManageWithdrawals'), async (req, res) => {
  const { reason } = req.body;
  // await db.read();
  const wr = db.data.withdrawal_requests.find(w => w.id === req.params.id);
  if (wr && wr.status === 'pending') { 
    wr.status = 'rejected'; 
    wr.processed_by = req.user.id; 
    wr.rejection_reason = reason || 'No reason provided';
    await db.write(); 
    await logAdminAction(req.user.id, 'REJECT_WITHDRAWAL', wr.user_id, reason, { status: 'pending' }, { status: 'rejected' });
    res.json({ ok: true });
  } else {
    res.status(400).json({ error: 'Withdrawal not found or already processed' });
  }
});

app.post('/api/admin/users/:id/status', adminRateLimiter, authMiddleware, requireRole(['superadmin', 'admin', 'moderator']), async (req, res) => {
  const { status, reason } = req.body;
  if (!['active', 'frozen', 'banned', 'restricted'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  if (!reason) return res.status(400).json({ error: 'Reason is required for status changes' });

  // Granular permission check
  if (status === 'banned') {
    const isSuper = req.user.role === 'superadmin';
    const canBan = req.user.permissions?.canBanUsers === true;
    if (!isSuper && !canBan) {
      await logSecurityEvent('UNAUTHORIZED_ACTION', `Attempted to ban user without canBanUsers permission`, req.ip, req.user.id);
      return res.status(403).json({ error: 'Forbidden. Missing permission: canBanUsers' });
    }
  }

  // await db.read();
  const u = db.data.users.find(x => x.id === req.params.id);
  if (u) { 
    const beforeState = { status: u.status, accountStatus: u.accountStatus };
    u.status = status; 
    
    // Master Moderation: If reactivating, clear freeze fields
    if (status === 'active') {
      u.accountStatus = 'active';
      u.freezeUntil = null;
      u.freezeReason = null;
    } else if (status === 'frozen') {
      u.accountStatus = 'frozen';
    } else if (status === 'banned') {
      u.accountStatus = 'suspended'; // Or 'suspended' based on model
    }

    await db.write(); 
    await logAdminAction(req.user.id, `UPDATE_USER_STATUS`, u.id, reason, beforeState, { status, accountStatus: u.accountStatus });
    
    // Simulate sending email notification for negative account actions
    if (['banned', 'frozen', 'restricted'].includes(status)) {
      console.log(`[Email Service] Sending notification to ${u.email}: Your account status has been changed to '${status}' by CryptoSim administration. Reason: ${reason}`);
      
      // Immediately kick the user from active sessions if banned or frozen
      if (status === 'banned' || status === 'frozen') {
        io.to(`user:${u.id}`).emit('force_logout');
        
        // Also forcefully disconnect their socket connections server-side
        const sockets = await io.in(`user:${u.id}`).fetchSockets();
        for (const s of sockets) {
          s.disconnect(true);
        }
        
        u.is_online = false;
        u.current_socket = null;
        await db.write();
      }
    }
    
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Helper for double-confirmation actions
async function verifyAdminPassword(adminId, password) {
  // Use the global admin console password for high-risk actions
  return password === 'Admin123' || password === 'admin123' || password === 'ADMIN123';
}

app.post('/api/admin/users/:id/balance', adminRateLimiter, authMiddleware, requireRole(['superadmin', 'admin']), requirePermission('canAdjustBalance'), async (req, res) => {
  const { amount_change, reason, admin_password } = req.body;
  if (!reason || amount_change === undefined || !admin_password) {
    return res.status(400).json({ error: 'Missing required fields (amount_change, reason, admin_password)' });
  }

  const isVerified = await verifyAdminPassword(req.user.id, admin_password);
  if (!isVerified) {
    await logSecurityEvent('FAILED_ADMIN_REAUTH', 'Failed double-confirmation for balance adjustment', req.ip, req.user.id);
    return res.status(401).json({ error: 'Invalid admin password' });
  }

  // await db.read();
  const wallet = db.data.wallets.find(w => w.user_id === req.params.id);
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

  const beforeState = { available_balance: wallet.available_balance, total_balance: wallet.demo_balance };
  
  // Apply changes. We adjust both available and demo (total) balance for consistency in the current model.
  const numChange = parseFloat(amount_change);
  wallet.available_balance += numChange;
  wallet.demo_balance += numChange;

  if (wallet.available_balance < 0) return res.status(400).json({ error: 'Balance cannot be negative' });
  if (wallet.demo_balance < 0) wallet.demo_balance = 0;

  // Record an immutable transaction record for this manual adjustment
  db.data.transactions.push({
    id: uuidv4(),
    user_id: req.params.id,
    type: numChange >= 0 ? 'admin_deposit' : 'admin_deduction',
    symbol: 'USD',
    amount: Math.abs(numChange),
    price: 1,
    total: numChange,
    status: 'completed',
    realized_pnl: 0,
    created_at: new Date().toISOString()
  });

  await db.write();
  await logAdminAction(req.user.id, 'ADJUST_BALANCE', req.params.id, reason, beforeState, { available_balance: wallet.available_balance, total_balance: wallet.demo_balance, change: numChange });
  
  res.json({ ok: true, new_balance: wallet.available_balance });
});

app.post('/api/admin/users/:id/seize', adminRateLimiter, authMiddleware, requireRole(['superadmin', 'admin']), requirePermission('canSeizeFunds'), async (req, res) => {
  const { amount, reason, admin_password } = req.body;
  
  if (!reason || amount === undefined || !admin_password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const isVerified = await verifyAdminPassword(req.user.id, admin_password);
  if (!isVerified) {
    await logSecurityEvent('FAILED_ADMIN_REAUTH', 'Failed double-confirmation for fund seizure', req.ip, req.user.id);
    return res.status(401).json({ error: 'Invalid admin password' });
  }

  const seizeAmount = parseFloat(amount);
  if (seizeAmount <= 0) return res.status(400).json({ error: 'Seize amount must be positive' });

  // await db.read();
  const wallet = db.data.wallets.find(w => w.user_id === req.params.id);
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

  if (wallet.available_balance < seizeAmount) {
    return res.status(400).json({ error: 'Cannot seize more than available balance' });
  }

  const beforeState = { available_balance: wallet.available_balance, frozen_balance: wallet.frozen_balance };
  
  // Move funds from available to frozen
  wallet.available_balance -= seizeAmount;
  wallet.frozen_balance += seizeAmount;

  await db.write();
  await logAdminAction(req.user.id, 'SEIZE_FUNDS', req.params.id, reason, beforeState, { available_balance: wallet.available_balance, frozen_balance: wallet.frozen_balance });
  
  res.json({ ok: true, available_balance: wallet.available_balance, frozen_balance: wallet.frozen_balance });
});

// ─── System Controls ─────────────────────────────────────────────────────────

app.post('/api/admin/trading-halt', adminRateLimiter, authMiddleware, requireRole(['superadmin']), async (req, res) => {
  const { halt } = req.body;
  if (typeof halt !== 'boolean') return res.status(400).json({ error: 'halt must be boolean' });

  // await db.read();
  const beforeState = { trading_halt: db.data.settings.trading_halt };
  db.data.settings.trading_halt = halt;
  await db.write();

  await logAdminAction(req.user.id, 'TOGGLE_TRADING_HALT', null, `Trading halt set to ${halt}`, beforeState, { trading_halt: halt });
  
  // Broadcast to all connected clients
  io.emit('system:trading_halt', halt);

  res.json({ ok: true, trading_halt: halt });
});

app.get('/api/admin/system-status', adminRateLimiter, authMiddleware, requireRole(['superadmin', 'admin', 'moderator']), async (req, res) => {
  // await db.read();
  const status = {
    db_connected: db.data ? true : false,
    ws_connected: bybitWs && bybitWs.readyState === WebSocket.OPEN,
    active_users: io.engine.clientsCount,
    uptime: process.uptime(),
    maintenance_mode: db.data.settings?.maintenanceMode || false,
    trading_halt: db.data.settings?.trading_halt || false
  };
  res.json(status);
});

// ─── Reports Response (Existing) ─────────────────────────────────────────────
app.post('/api/admin/reports/:id/respond', adminRateLimiter, authMiddleware, requireRole(['superadmin', 'admin', 'moderator']), async (req, res) => {
  const { status, resolution_notes, escalation } = req.body;
  // await db.read();
  const r = db.data.reports.find(x => x.id === req.params.id);
  if (r) { 
    r.status = status || r.status; 
    if (resolution_notes) r.resolution_notes = resolution_notes;
    r.escalation_status = escalation || false;
    r.resolved_by = req.user.id;
    await db.write(); 
    
    await logAdminAction(req.user.id, 'RESPOND_REPORT', r.reported_user_id, 'Admin handled report', {}, { report_id: r.id, status: r.status, escalation: r.escalation_status });
    
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: 'Report not found' });
  }
});

app.get('/api/admin/audit-logs', adminRateLimiter, authMiddleware, requireRole(['superadmin', 'admin']), async (req, res) => {
  // await db.read();
  const logs = db.data.audit_logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ data: logs });
});

app.get('/api/admin/security-logs', adminRateLimiter, authMiddleware, requireRole(['superadmin']), async (req, res) => {
  // await db.read();
  const logs = db.data.security_logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ data: logs });
});

// ─── Live Prices (REST fallback) ──────────────────────────────────────────────
app.get('/api/crypto/prices', async (req, res) => {
  const prices = buildPriceList();
  if (prices.every(p => p.price === 0)) {
    // Binance hasn't connected yet, use CoinGecko
    const cg = await fetchCoinGeckoPrices();
    return res.json({ prices: cg });
  }
  res.json({ prices });
});

// ─── Price history (7-day) ────────────────────────────────────────────────────
const historyCache = {};
const HISTORY_CACHE_TTL = 300_000;

app.get('/api/crypto/price-history/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const cgId = SYMBOL_TO_COINGECKO[symbol];
  if (!cgId) return res.status(404).json({ error: 'Unknown symbol' });

  const cached = historyCache[symbol];
  if (cached && (Date.now() - cached.updatedAt) < HISTORY_CACHE_TTL) {
    return res.json({ data: cached.data });
  }

  try {
    const url = `${COINGECKO_API}/coins/${cgId}/market_chart?vs_currency=usd&days=7&interval=daily`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`);
    const json = await resp.json();
    const data = (json.prices || []).map(([ts, price]) => ({ timestamp: ts, price }));
    historyCache[symbol] = { data, updatedAt: Date.now() };
    res.json({ data });
  } catch (err) {
    console.error(`[CoinGecko] History error for ${symbol}:`, err.message);
    const basePrice = livePrices.get(symbol) || 100;
    const data = Array.from({ length: 7 }, (_, i) => ({
      timestamp: Date.now() - (6 - i) * 86400000,
      price: basePrice * (1 + (Math.random() - 0.5) * 0.06),
    }));
    res.json({ data });
  }
});

// ─── TRADE ENGINE (Open/Close) ────────────────────────────────────────────────

// Open a trade
app.post('/api/trades/open', authMiddleware, async (req, res) => {
  const { user_id, asset, direction, amount, leverage, tp_price, sl_price } = req.body;

  // Validation
  if (!user_id || !asset || !direction || !amount || !leverage) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const tradeAmount = parseFloat(amount);
  const lev = parseInt(leverage);
  const tp = tp_price ? parseFloat(tp_price) : null;
  const sl = sl_price ? parseFloat(sl_price) : null;

  if (isNaN(tradeAmount) || tradeAmount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  // Enforce Trading Halt
  // await db.read();
  if (db.data.settings?.trading_halt) {
    return res.status(403).json({ error: 'System trading is currently suspended.' });
  }
  
  if (!['buy', 'sell'].includes(direction)) {
    return res.status(400).json({ error: 'Direction must be buy or sell' });
  }

  if (tradeAmount < 1) return res.status(400).json({ error: 'Minimum trade is $1' });

  // Get current price
  const sym = asset.replace('USDT', '');
  const currentPrice = livePrices.get(sym);
  if (!currentPrice) return res.status(400).json({ error: 'Price not available for ' + asset });

  // Check balance (margin = amount / leverage... but for simplicity, margin = amount)
  // await db.read();
  const wallet = db.data.wallets.find(w => w.user_id === user_id);
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
  if (wallet.demo_balance < tradeAmount) return res.status(400).json({ error: 'Insufficient balance' });

  // Deduct margin from balance
  wallet.demo_balance = Math.round((wallet.demo_balance - tradeAmount) * 100) / 100;

  // Create trade
  const trade = {
    id: uuidv4(),
    user_id,
    asset,
    direction,
    amount: tradeAmount,
    leverage: lev,
    entry_price: currentPrice,
    close_price: null,
    profit_loss: 0,
    status: 'open',
    tp_price: tp,
    sl_price: sl,
    created_at: new Date().toISOString(),
    closed_at: null,
  };
  db.data.trades.push(trade);
  await db.write();

  // Push balance update
  io.to(`user:${user_id}`).emit('balance:update', { demo_balance: wallet.demo_balance });
  io.to(`user:${user_id}`).emit('trade:opened', trade);

  // --- ADMIN SURVEILLANCE HOOKS ---
  adminNs.emit('trade_executed', trade);
  adminNs.emit('position_opened', trade);
  
  // A) HIGH LEVERAGE ALERT
  if (lev >= 20) {
    await createAlert({ type: 'HIGH_LEVERAGE', severity: 'HIGH', userId: user_id, relatedTradeId: trade.id, message: `User opened a ${lev}x leveraged trade on ${asset}`, metadata: { asset, direction, leverage: lev, amount: tradeAmount } });
  }
  // B) LARGE TRADE ALERT
  if (tradeAmount >= 50000) {
    await createAlert({ type: 'LARGE_TRADE', severity: 'MEDIUM', userId: user_id, relatedTradeId: trade.id, message: `Whale Trade: $${tradeAmount.toLocaleString()} on ${asset}`, metadata: { asset, direction, leverage: lev, amount: tradeAmount } });
  }
  // C) RAPID TRADING ALERT
  const recentTrades = db.data.trades.filter(t => t.user_id === user_id && (Date.now() - new Date(t.created_at).getTime() < 60000));
  if (recentTrades.length > 10) {
    await createAlert({ type: 'RAPID_TRADING', severity: 'HIGH', userId: user_id, message: `Rapid Trade Activity: ${recentTrades.length} trades in 60s`, metadata: { count: recentTrades.length } });
    await triggerAutoFreeze(user_id, 'Account frozen due to suspicious high-frequency trading activity.', 24);
  }

  console.log(`[Trade] Opened ${direction} ${asset} $${tradeAmount} x${lev} @ $${currentPrice} for user ${user_id}`);
  await emitActivity('TRADE_OPENED', user_id, `Opened ${direction.toUpperCase()} $${tradeAmount} x${lev} ${asset}`, req.ip);
  res.json({ trade });
});

// Close a trade
app.post('/api/trades/close', authMiddleware, async (req, res) => {
  const { user_id, trade_id } = req.body;
  if (!user_id || !trade_id) return res.status(400).json({ error: 'Missing fields' });

  // await db.read();

  // Enforce Trading Halt (Usually exchanges allow closing during halts, but we'll block it for strictness or maybe allow it. Let's block it for now based on 'overall trading halt')
  if (db.data.settings?.trading_halt) {
     return res.status(403).json({ error: 'System trading is currently suspended. Cannot close trades.' });
  }

  const trade = db.data.trades.find(t => t.id === trade_id && t.user_id === user_id && t.status === 'open');
  if (!trade) return res.status(404).json({ error: 'Trade not found or already closed' });

  const sym = trade.asset.replace('USDT', '');
  const closePrice = livePrices.get(sym);
  if (!closePrice) return res.status(400).json({ error: 'Price not available' });

  // Calculate final P&L on backend
  let pnl;
  if (trade.direction === 'buy') {
    pnl = (closePrice - trade.entry_price) * trade.amount * trade.leverage;
  } else {
    pnl = (trade.entry_price - closePrice) * trade.amount * trade.leverage;
  }
  pnl = Math.round(pnl * 100) / 100;

  // Update trade
  trade.close_price = closePrice;
  trade.profit_loss = pnl;
  trade.status = 'closed';
  trade.closed_at = new Date().toISOString();

  // Update wallet balance (return margin + P&L)
  const wallet = db.data.wallets.find(w => w.user_id === user_id);
  if (wallet) {
    wallet.demo_balance = Math.round((wallet.demo_balance + trade.amount + pnl) * 100) / 100;
    if (wallet.demo_balance < 0) wallet.demo_balance = 0; // safety net
  }

  await db.write();

  // Push updates
  io.to(`user:${user_id}`).emit('trade:closed', trade);
  io.to(`user:${user_id}`).emit('balance:update', { demo_balance: wallet?.demo_balance || 0 });

  // --- ADMIN SURVEILLANCE HOOKS ---
  adminNs.emit('position_closed', trade);

  console.log(`[Trade] Closed ${trade.direction} ${trade.asset} P&L: $${pnl} for user ${user_id}`);
  await emitActivity('TRADE_CLOSED', user_id, `Closed ${trade.direction.toUpperCase()} ${trade.asset} (P&L: $${pnl})`, req.ip);
  res.json({ trade, pnl, new_balance: wallet?.demo_balance || 0 });
});

// Get user trades
app.get('/api/trades', async (req, res) => {
  const { user_id, status } = req.query;
  // await db.read();
  let trades = db.data.trades.filter(t => t.user_id === user_id);
  if (status) trades = trades.filter(t => t.status === status);
  trades.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ data: trades });
});

// ─── Payment Integration (Paystack / Flutterwave) ────────────────────────────

// Initialize payment
app.post('/api/payments/initialize', async (req, res) => {
  const { user_id, amount, email, provider } = req.body;
  if (!user_id || !amount || !email) return res.status(400).json({ error: 'Missing fields' });

  const paymentAmount = parseFloat(amount);
  if (paymentAmount < 100) return res.status(400).json({ error: 'Minimum deposit is ₦100' });

  const reference = `PAY-${uuidv4().slice(0, 8)}-${Date.now()}`;

  if (provider === 'flutterwave' && FLW_SECRET) {
    try {
      const resp = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FLW_SECRET}` },
        body: JSON.stringify({
          tx_ref: reference,
          amount: paymentAmount,
          currency: 'NGN',
          redirect_url: `http://localhost:8080`,
          customer: { email },
          customizations: { title: 'CryptoSim Pro Deposit', description: `Deposit ₦${paymentAmount}` },
        }),
      });
      const data = await resp.json();
      if (data.status === 'success') {
        // await db.read();
        db.data.payments.push({ id: uuidv4(), user_id, reference, amount: paymentAmount, provider: 'flutterwave', status: 'pending', created_at: new Date().toISOString() });
        await db.write();
        return res.json({ authorization_url: data.data.link, reference });
      }
      return res.status(400).json({ error: data.message || 'Flutterwave error' });
    } catch (err) {
      return res.status(500).json({ error: 'Flutterwave initialization failed' });
    }
  }

  // Default: Paystack
  if (!PAYSTACK_SECRET) {
    // Demo mode: no real payment keys — simulate success
    // await db.read();
    db.data.payments.push({ id: uuidv4(), user_id, reference, amount: paymentAmount, provider: 'demo', status: 'pending', created_at: new Date().toISOString() });
    await db.write();
    return res.json({ authorization_url: null, reference, demo_mode: true });
  }

  try {
    const resp = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PAYSTACK_SECRET}` },
      body: JSON.stringify({ email, amount: paymentAmount * 100, reference, currency: 'NGN' }),
    });
    const data = await resp.json();
    if (data.status) {
      // await db.read();
      db.data.payments.push({ id: uuidv4(), user_id, reference, amount: paymentAmount, provider: 'paystack', status: 'pending', created_at: new Date().toISOString() });
      await db.write();
      return res.json({ authorization_url: data.data.authorization_url, reference });
    }
    return res.status(400).json({ error: data.message || 'Paystack error' });
  } catch (err) {
    return res.status(500).json({ error: 'Paystack initialization failed' });
  }
});

// Verify payment
app.post('/api/payments/verify', async (req, res) => {
  const { reference, user_id } = req.body;
  if (!reference || !user_id) return res.status(400).json({ error: 'Missing fields' });

  // await db.read();
  const payment = db.data.payments.find(p => p.reference === reference && p.user_id === user_id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.status === 'success') return res.json({ ok: true, already_credited: true });

  // Demo mode — auto-approve
  if (payment.provider === 'demo') {
    payment.status = 'success';
    const wallet = db.data.wallets.find(w => w.user_id === user_id);
    if (wallet) {
      wallet.demo_balance = Math.round((wallet.demo_balance + payment.amount) * 100) / 100;
    }
    await db.write();
    io.to(`user:${user_id}`).emit('balance:update', { demo_balance: wallet?.demo_balance || 0 });
    return res.json({ ok: true, new_balance: wallet?.demo_balance || 0 });
  }

  // Verify with Paystack
  if (payment.provider === 'paystack') {
    try {
      const resp = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      });
      const data = await resp.json();
      if (data.status && data.data.status === 'success') {
        payment.status = 'success';
        const amountNaira = data.data.amount / 100;
        const wallet = db.data.wallets.find(w => w.user_id === user_id);
        if (wallet) {
          wallet.demo_balance = Math.round((wallet.demo_balance + amountNaira) * 100) / 100;
        }
        await db.write();
        io.to(`user:${user_id}`).emit('balance:update', { demo_balance: wallet?.demo_balance || 0 });
        return res.json({ ok: true, new_balance: wallet?.demo_balance || 0 });
      }
      return res.status(400).json({ error: 'Payment not successful' });
    } catch (err) {
      return res.status(500).json({ error: 'Verification failed' });
    }
  }

  // Verify with Flutterwave
  if (payment.provider === 'flutterwave') {
    try {
      const resp = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`, {
        headers: { Authorization: `Bearer ${FLW_SECRET}` },
      });
      const data = await resp.json();
      if (data.status === 'success' && data.data.status === 'successful') {
        payment.status = 'success';
        const wallet = db.data.wallets.find(w => w.user_id === user_id);
        if (wallet) {
          wallet.demo_balance = Math.round((wallet.demo_balance + data.data.amount) * 100) / 100;
        }
        await db.write();
        io.to(`user:${user_id}`).emit('balance:update', { demo_balance: wallet?.demo_balance || 0 });
        return res.json({ ok: true, new_balance: wallet?.demo_balance || 0 });
      }
      return res.status(400).json({ error: 'Payment not successful' });
    } catch (err) {
      return res.status(500).json({ error: 'Verification failed' });
    }
  }
  res.status(400).json({ error: 'Unknown provider' });
});

// ─── Admin Endpoints ─────────────────────────────────────────────────────────

app.post('/api/admin/2fa/setup', authMiddleware, requireRole(['superadmin']), async (req, res) => {
  const secret = authenticator.generateSecret();
  const uri = authenticator.keyuri(req.user.email, 'NovaX Admin', secret);
  
  // await db.read();
  const targetUser = db.data.users.find(u => u.id === req.user.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  
  targetUser.two_factor = targetUser.two_factor || {};
  targetUser.two_factor.secret_temp = secret;
  await db.write();

  res.json({ secret, uri });
});

app.post('/api/admin/2fa/verify', authMiddleware, requireRole(['superadmin']), async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  // await db.read();
  const targetUser = db.data.users.find(u => u.id === req.user.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  
  const secret = targetUser.two_factor?.secret_temp;
  if (!secret) return res.status(400).json({ error: '2FA setup not initiated' });

  const isValid = authenticator.verify({ token, secret });
  if (!isValid) return res.status(400).json({ error: 'Invalid 2FA token' });

  targetUser.two_factor.secret = secret;
  delete targetUser.two_factor.secret_temp;
  targetUser.two_factor.enabled = true;
  await db.write();

  await logAdminAction(req.user.id, '2FA_ENABLED', req.user.id, 'Superadmin enabled 2FA', {}, {});

  res.json({ success: true });
});
app.get('/api/admin/settings', async (req, res) => {
  // await db.read();
  res.json({ settings: db.data.settings });
});

app.post('/api/admin/maintenance', async (req, res) => {
  const { enabled } = req.body;
  // await db.read();
  db.data.settings = { ...db.data.settings, maintenanceMode: !!enabled };
  await db.write();
  console.log(`[ADMIN] Maintenance mode set to ${enabled}`);
  res.json({ success: true, maintenanceMode: db.data.settings.maintenanceMode });
});

// ─── Notification Endpoints ──────────────────────────────────────────────────
app.post('/api/admin/notifications', async (req, res) => {
  const { target, title, message, type = 'info' } = req.body;
  
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

  // await db.read();
  const notification = {
    id: uuidv4(),
    title,
    message,
    type,
    target, // 'all' or userId
    timestamp: new Date().toISOString(),
    read: false
  };

  db.data.notifications.push(notification);
  await db.write();

  // Broadcast
  if (target === 'all') {
    io.emit('notification:new', notification);
  } else {
    io.to(`user:${target}`).emit('notification:new', notification);
  }

  res.json({ success: true, notification });
});

app.get('/api/admin/notifications', async (req, res) => {
  // Simple check for admin role
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // await db.read();
    res.json({ notifications: db.data.notifications });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/api/notifications', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    // await db.read();
    const userNotifs = db.data.notifications.filter(n => {
      // Must be targeted to user or global ('all')
      if (n.target !== 'all' && n.target !== userId) return false;
      // If it's a global notification that user deleted, hide it
      if (n.deletedBy && n.deletedBy.includes(userId)) return false;
      return true;
    });
    res.json({ notifications: userNotifs });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.delete('/api/admin/notifications/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    db.data.notifications = db.data.notifications.filter(n => n.id !== id);
    await db.write();

    res.json({ success: true, message: 'Notification deleted' });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.delete('/api/notifications/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;
    const { id } = req.params;

    const idx = db.data.notifications.findIndex(n => n.id === id);
    if (idx !== -1) {
      const n = db.data.notifications[idx];
      if (n.target === userId) {
        // Safe to completely remove private notification
        db.data.notifications.splice(idx, 1);
        await db.write();
        return res.json({ success: true, message: 'Notification deleted' });
      } else if (n.target === 'all') {
        // Global notification - just hide it for this user
        if (!n.deletedBy) n.deletedBy = [];
        if (!n.deletedBy.includes(userId)) {
          n.deletedBy.push(userId);
          await db.write();
        }
        return res.json({ success: true, message: 'Notification hidden' });
      }
    }
    
    res.status(404).json({ error: 'Notification not found' });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/notifications/read', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    // await db.read();
    // In this simple implementation, 'read' state is global in the object, 
    // but for private notifications it works fine. For 'all' notifications, 
    // a real system would need a junction table. 
    // For this prototype, let's keep it simple: only private notifications track read state correctly.
    // Or we can just mark the user's view as read in frontend.
    
    // Modification: Only private notifications can be marked as read in DB.
    // Global ones will be handled by client-side logic if needed, or we just ignore for now.
    db.data.notifications.forEach(n => {
      if (n.target === userId) n.read = true;
    });
    
    await db.write();
    res.json({ success: true });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/admin/users/:uid/seize', async (req, res) => {
  const { uid } = req.params;
  const { amount, reason, target = 'demo' } = req.body; // target: 'demo' or 'savings'
  
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  // await db.read();
  const walletIndex = db.data.wallets.findIndex(w => w.user_id === uid);
  if (walletIndex === -1) return res.status(404).json({ error: 'Wallet not found' });

  const wallet = db.data.wallets[walletIndex];
  if (target === 'demo') {
    if (wallet.balance < amount) return res.status(400).json({ error: 'Insufficient demo balance' });
    wallet.balance -= amount;
  } else {
    if ((wallet.savings_balance || 0) < amount) return res.status(400).json({ error: 'Insufficient savings balance' });
    wallet.savings_balance -= amount;
  }

  // Create transaction record
  const transaction = {
    id: uuidv4(),
    user_id: uid,
    type: 'ADMIN_SEIZURE',
    amount: -amount,
    currency: 'USD',
    status: 'completed',
    timestamp: new Date().toISOString(),
    description: `Administrative Seizure: ${reason || 'N/A'}`
  };
  db.data.transactions.push(transaction);

  await db.write();
  console.log(`[ADMIN] Seized ${amount} from user ${uid} (${target}). Reason: ${reason}`);
  res.json({ success: true, newBalance: target === 'demo' ? wallet.balance : wallet.savings_balance });
});

app.post('/api/admin/users/:uid/role', adminRateLimiter, authMiddleware, requireRole(['superadmin']), async (req, res) => {
  const { uid } = req.params;
  const { role, permissions } = req.body;
  
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // await db.read();
  const targetUser = db.data.users.find(u => u.id === uid);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  
  // Prevent modifying other superadmins
  if (targetUser.role === 'superadmin') {
    return res.status(403).json({ error: 'Cannot modify a superadmin' });
  }

  const beforeState = { role: targetUser.role, permissions: targetUser.permissions };
  
  targetUser.role = role;
  if (role === 'admin') {
    targetUser.permissions = {
      canBanUsers: !!permissions?.canBanUsers,
      canAdjustBalance: !!permissions?.canAdjustBalance,
      canSeizeFunds: !!permissions?.canSeizeFunds,
      canManageWithdrawals: !!permissions?.canManageWithdrawals
    };
  } else {
    targetUser.permissions = {};
  }

  await db.write();

  const afterState = { role: targetUser.role, permissions: targetUser.permissions };
  await logAdminAction(req.user.id, 'ROLE_PERMISSION_CHANGE', targetUser.id, `Role changed to ${role}`, beforeState, afterState);
  await emitActivity('ROLE_CHANGED', targetUser.id, `User role adjusted to ${role}`, req.ip);

  res.json({ success: true, user: targetUser });
});

app.get('/api/admin/users', async (req, res) => {
  // await db.read();
  const users = db.data.users.map(u => {
    const w = db.data.wallets.find(wallet => wallet.user_id === u.id) || { balance: 0, savings_balance: 0 };
    return {
      ...u,
      balance: w.balance || 0,
      savings_balance: w.savings_balance || 0,
      password_hash: undefined // Safety
    };
  });
  res.json({ users });
});

// Get payment history
app.get('/api/payments', async (req, res) => {
  // await db.read();
  const rows = db.data.payments.filter(p => p.user_id === req.query.user_id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ data: rows });
});

// ─── Account Reset ────────────────────────────────────────────────────────────
app.post('/api/account/reset', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
  // await db.read();
  const wallet = db.data.wallets.find(w => w.user_id === user_id);
  if (wallet) { wallet.demo_balance = 500; wallet.savings_balance = 0; }
  db.data.positions = db.data.positions.filter(p => p.user_id !== user_id);
  db.data.crypto_balances = db.data.crypto_balances.filter(c => c.user_id !== user_id);
  db.data.transactions = db.data.transactions.filter(t => t.user_id !== user_id);
  db.data.trades = db.data.trades.filter(t => t.user_id !== user_id);
  db.data.withdrawal_requests = db.data.withdrawal_requests.filter(w => w.user_id !== user_id);
  await db.write();
  io.to(`user:${user_id}`).emit('balance:update', { demo_balance: 500 });
  res.json({ ok: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────
console.log('[Server] Initializing...');
await initDb();

// 1. Start Bybit immediately
connectBybit();

// 2. Fetch CoinGecko fallback in background
fetchCoinGeckoPrices().then(() => {
  console.log('[CoinGecko] Initial prices loaded/verified');
}).catch(err => {
  console.error('[CoinGecko] Initial load error:', err.message);
});

// Periodic CoinGecko refresh for market cap + images (every 5 min)
setInterval(fetchCoinGeckoPrices, 300_000);

httpServer.listen(PORT, () => {
  console.log(`✓ Server listening on http://localhost:${PORT}`);
  console.log(`✓ Socket.IO ready`);
  console.log(`✓ Bybit WebSocket streaming targeted for ${SYMBOLS.length} pairs`);
});

// ─── OPERATIONAL MONITORING ENDPOINTS ────────────────────────────────────────

app.get('/api/admin/activity-stream', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forsake' });
  // await db.read();
  const stream = db.data.activity_stream || [];
  res.json({ data: stream.slice(0, 500) }); // Return 500 most recent
});

app.get('/api/admin/active-sessions', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forsake' });
  // await db.read();
  // Filter for users who are currently online or been active in last 10 mins
  const activeUsers = db.data.users.filter(u => 
    u.is_online || (u.last_seen && new Date(u.last_seen) > new Date(Date.now() - 600000))
  ).map(u => ({
    user_id: u.id,
    email: u.email,
    username: u.username,
    role: u.role,
    is_online: u.is_online,
    last_seen: u.last_seen
  }));
  res.json({ data: activeUsers });
});

app.get('/api/admin/trading-metrics', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forsake' });
  // await db.read();
  
  const openTrades = db.data.trades.filter(t => t.status === 'open');
  const longs = openTrades.filter(t => t.direction === 'buy').length;
  const shorts = openTrades.filter(t => t.direction === 'sell').length;
  
  let totalExposure = 0;
  openTrades.forEach(t => {
    totalExposure += (t.amount * t.leverage);
  });
  
  // Calculate 1h volume
  const lastHour = Date.now() - 3600000;
  const lastHourTrades = db.data.trades.filter(t => new Date(t.created_at).getTime() > lastHour);
  let hourVolume = 0;
  lastHourTrades.forEach(t => {
    hourVolume += (t.amount * t.leverage);
  });

  res.json({ 
    total_open_positions: openTrades.length,
    longs,
    shorts,
    total_exposure_usd: totalExposure,
    volume_1h: hourVolume
  });
});

// ─── NEW: Admin Overview Stats ────────────────────────────────────────────────
app.get('/api/admin/overview-stats', authMiddleware, requireRole(['superadmin', 'admin', 'moderator']), async (req, res) => {
  // await db.read();
  const totalUsers = db.data.users.length;
  const activeUsers = db.data.users.filter(u => u.is_online).length;
  const openTrades = db.data.trades.filter(t => t.status === 'open').length;
  const pendingWithdrawals = db.data.withdrawal_requests.filter(w => w.status === 'pending').length;

  let totalExposure = 0;
  db.data.trades.filter(t => t.status === 'open').forEach(t => {
    totalExposure += (t.amount * (t.leverage || 1));
  });

  const totalBalance = db.data.wallets.reduce((sum, w) => sum + (w.demo_balance || 0) + (w.savings_balance || 0), 0);
  const totalFrozen = db.data.wallets.reduce((sum, w) => sum + (w.frozen_balance || 0), 0);
  const activeAlerts = (db.data.alerts || []).filter(a => !a.acknowledged).length;

  res.json({
    totalUsers,
    activeUsers,
    openTrades,
    pendingWithdrawals,
    totalExposure,
    totalBalance,
    totalFrozen,
    activeAlerts,
    tradingHalt: db.data.settings?.trading_halt || false,
    maintenanceMode: db.data.settings?.maintenanceMode || false,
  });
});

// ─── NEW: Financial Overview ──────────────────────────────────────────────────
app.get('/api/admin/financial/overview', authMiddleware, requireRole(['superadmin', 'admin']), async (req, res) => {
  // await db.read();
  const wallets = db.data.wallets || [];
  const totalAvailable = wallets.reduce((sum, w) => sum + (w.available_balance || w.demo_balance || 0), 0);
  const totalFrozen = wallets.reduce((sum, w) => sum + (w.frozen_balance || 0), 0);
  const totalSavings = wallets.reduce((sum, w) => sum + (w.savings_balance || 0), 0);
  const totalLiabilities = totalAvailable + totalFrozen + totalSavings;

  const pendingWithdrawals = db.data.withdrawal_requests.filter(w => w.status === 'pending');
  const pendingAmount = pendingWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);

  // Recent large transactions (>$1000)
  const recentLarge = (db.data.financial_transactions || [])
    .filter(t => Math.abs(t.amount) > 1000)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20);

  res.json({
    totalAvailable,
    totalFrozen,
    totalSavings,
    totalLiabilities,
    pendingWithdrawals: pendingWithdrawals.length,
    pendingAmount,
    recentLargeTransactions: recentLarge,
  });
});

// ─── NEW: Financial Ledger (Paginated) ────────────────────────────────────────
app.get('/api/admin/financial/ledger', authMiddleware, requireRole(['superadmin', 'admin']), async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const typeFilter = req.query.type;
  
  // await db.read();
  let ledger = db.data.financial_transactions || [];
  if (typeFilter) ledger = ledger.filter(t => t.type === typeFilter);
  
  ledger.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total = ledger.length;
  const data = ledger.slice((page - 1) * limit, page * limit);
  
  res.json({ data, total, page, pages: Math.ceil(total / limit) });
});

// ─── NEW: Alerts ──────────────────────────────────────────────────────────────
app.get('/api/admin/alerts', authMiddleware, requireRole(['superadmin', 'admin']), async (req, res) => {
  const { status, severity, type } = req.query;
  // await db.read();
  
  let alerts = (db.data.alerts || [])
    .sort((a, b) => new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime())
    .reverse();
    
  if (status) alerts = alerts.filter(a => a.status === status);
  if (severity) alerts = alerts.filter(a => a.severity === severity);
  if (type) alerts = alerts.filter(a => a.type === type);
  
  res.json({ data: alerts.slice(0, 200) });
});

app.patch('/api/admin/alerts/:id/resolve', authMiddleware, requireRole(['superadmin', 'admin']), async (req, res) => {
  // await db.read();
  const alert = (db.data.alerts || []).find(a => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  
  alert.status = 'RESOLVED';
  alert.resolvedBy = req.user.id;
  alert.resolvedAt = new Date().toISOString();
  await db.write();
  
  await logAdminAction(req.user.id, 'RESOLVED_ALERT', alert.userId, `Resolved alert: ${alert.message}`, { status: 'OPEN' }, { status: 'RESOLVED', alert_id: alert.id });
  res.json({ ok: true, alert });
});

app.post('/api/admin/alerts/:id/freeze-user', authMiddleware, requireRole(['superadmin', 'admin']), async (req, res) => {
  // await db.read();
  const alert = (db.data.alerts || []).find(a => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  
  const targetUser = db.data.users.find(u => u.id === alert.userId);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  
  const beforeState = { status: targetUser.status };
  targetUser.status = 'frozen';
  await db.write();
  
  await logAdminAction(req.user.id, 'FREEZE_USER', targetUser.id, `Frozen via alert ${alert.id}`, beforeState, { status: 'frozen' });
  
  // Enforce disconnection
  io.to(`user:${targetUser.id}`).emit('force_logout');
  const sockets = await io.in(`user:${targetUser.id}`).fetchSockets();
  for (const s of sockets) s.disconnect(true);
  
  targetUser.is_online = false;
  targetUser.current_socket = null;
  await db.write();
  
  res.json({ ok: true, message: `User has been frozen and disconnected.` });
});

// ─── NEW: Force Logout User ───────────────────────────────────────────────────
app.post('/api/admin/users/:id/force-logout', authMiddleware, requireRole(['superadmin', 'admin']), async (req, res) => {
  const targetUserId = req.params.id;
  // await db.read();
  const targetUser = db.data.users.find(u => u.id === targetUserId);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  
  // Emit force_logout alert to ALL of the user's tabs/devices
  io.to(`user:${targetUserId}`).emit('force_logout');
  
  // Disconnect their sockets on the server side
  const sockets = await io.in(`user:${targetUserId}`).fetchSockets();
  for (const s of sockets) {
    s.disconnect(true);
  }
  
  targetUser.is_online = false;
  targetUser.current_socket = null;
  await db.write();
  
  await logAdminAction(req.user.id, 'FORCE_LOGOUT', targetUserId, req.body.reason || 'Force logout by admin', {}, {});
  await emitActivity('ADMIN_FORCE_LOGOUT', targetUserId, 'User forcibly disconnected by admin', req.ip);
  
  res.json({ ok: true, disconnected: sockets.length });
});

// ─── NEW: Trading Monitor Aggregation API ──────────────────────────────────────
app.get('/api/admin/trading-summary', authMiddleware, requireRole(['superadmin', 'admin', 'moderator']), async (req, res) => {
  // await db.read();
  
  const openTrades = db.data.trades.filter(t => t.status === 'open');
  const totalOpenPositions = openTrades.length;
  
  let longExposure = 0;
  let shortExposure = 0;
  
  openTrades.forEach(t => {
    const exposure = t.amount * t.leverage;
    if (t.direction === 'buy') longExposure += exposure;
    else shortExposure += exposure;
  });
  
  const netExposure = longExposure - shortExposure;
  
  // Volume 24h
  const last24h = Date.now() - 86400000;
  const recentTrades = db.data.trades.filter(t => new Date(t.created_at).getTime() > last24h);
  let totalVolume24h = 0;
  recentTrades.forEach(t => totalVolume24h += (t.amount * t.leverage));
  
  // Risk Users
  const usersWithOpenTrades = new Set(openTrades.map(t => t.user_id));
  const riskUsersCount = Array.from(usersWithOpenTrades).filter(uid => {
    const uTrades = openTrades.filter(t => t.user_id === uid);
    const uLev = uTrades.some(t => t.leverage >= 15);
    const uSize = uTrades.reduce((sum, t) => sum + (t.amount * t.leverage), 0);
    return uLev || uSize > 50000;
  }).length;
  
  const recentLiquidations = db.data.activity_stream.filter(a => a.event_type === 'LIQUIDATION').slice(0, 5);

  res.json({
    totalOpenPositions,
    totalVolume24h,
    longExposure,
    shortExposure,
    netExposure,
    riskUsersCount,
    recentLiquidations,
    activePositions: openTrades
  });
});

// ─── 5-Second Real-Time Aggregation Loop ──────────────────────────────────────
setInterval(async () => {
  try {
    // await db.read();
    const openTrades = db.data.trades.filter(t => t.status === 'open');
    
    let total_long = 0;
    let total_short = 0;
    let margin_used = 0;
    let active_positions = openTrades.length;
    let pair_exposure = {};
    
    openTrades.forEach(t => {
      const exp = t.amount * t.leverage;
      margin_used += t.amount;
      
      if (!pair_exposure[t.asset]) pair_exposure[t.asset] = { long: 0, short: 0 };
      
      if (t.direction === 'buy') {
        total_long += exp;
        pair_exposure[t.asset].long += exp;
      } else {
        total_short += exp;
        pair_exposure[t.asset].short += exp;
      }
    });
    
    adminNs.emit('exposure_update', {
      total_long,
      total_short,
      net_exposure: total_long - total_short,
      margin_used,
      active_positions,
      pair_exposure
    });
  } catch (err) {
    console.error('Aggregation loop error:', err);
  }
}, 5000);

// SPA Catch-all: Route all non-API requests to index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});
