import React, { useEffect, useState, useMemo } from 'react';
import { useAdminTradingSummary } from '@/hooks/useAdmin';
import { useAdminContext } from '@/contexts/AdminContext';
import { 
  Loader2, Activity, TrendingUp, TrendingDown, AlertTriangle, 
  ShieldAlert, Radio, DollarSign, Crosshair, Users, Flame 
} from 'lucide-react';

export default function TradingMonitor() {
  const { data: initialData, isLoading } = useAdminTradingSummary();
  const { adminSocket, connected } = useAdminContext();

  // --- State for 4 Sections ---
  const [exposure, setExposure] = useState<any>(null);
  const [liveTrades, setLiveTrades] = useState<any[]>([]);
  const [openPositions, setOpenPositions] = useState<any[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<any[]>([]);

  // Initialize from REST API
  useEffect(() => {
    if (initialData && !exposure) {
      // Handle unwrapping if the API returned { data: { ... } } or just the raw object
      const payload = initialData.data || initialData;
      
      setExposure({
        totalOpenPositions: payload.totalOpenPositions || 0,
        totalVolume24h: payload.totalVolume24h || 0,
        longExposure: payload.longExposure || 0,
        shortExposure: payload.shortExposure || 0,
        netExposure: payload.netExposure || 0,
        marginUsed: (payload.activePositions || []).reduce((acc: number, t: any) => acc + t.amount, 0),
        pairExposure: {} 
      });
      setOpenPositions(payload.activePositions || []);
      
      const liqs = (payload.recentLiquidations || []).map((l: any) => ({
        id: l.id,
        type: 'liquidation',
        message: 'Account Liquidated',
        details: l.details,
        timestamp: l.created_at,
        level: 'critical'
      }));
      setRiskAlerts(liqs);
    }
  }, [initialData, exposure]);

  // Handle Real-time WebSocket Events
  useEffect(() => {
    if (!adminSocket) return;

    const handleExposureUpdate = (data: any) => {
      setExposure(prev => ({
        ...prev,
        totalOpenPositions: data.active_positions,
        longExposure: data.total_long,
        shortExposure: data.total_short,
        netExposure: data.net_exposure,
        marginUsed: data.margin_used,
        pairExposure: data.pair_exposure
      }));
    };

    const handleTradeExecuted = (trade: any) => {
      setLiveTrades(prev => [trade, ...prev].slice(0, 200));
    };

    const handlePositionOpened = (trade: any) => {
      setOpenPositions(prev => [trade, ...prev]);
    };

    const handlePositionClosed = (trade: any) => {
      setOpenPositions(prev => prev.filter(p => p.id !== trade.id));
      setLiveTrades(prev => [trade, ...prev].slice(0, 200)); // Log the closure in the feed too
    };

    const handleHighLeverage = (alert: any) => {
      setRiskAlerts(prev => [{ ...alert, id: Math.random().toString(), type: 'leverage', message: `High Leverage Alert: ${alert.leverage}x on ${alert.asset}`, level: 'warning' }, ...prev].slice(0, 50));
    };

    const handleLargeTrade = (alert: any) => {
      setRiskAlerts(prev => [{ ...alert, id: Math.random().toString(), type: 'large_trade', message: `Whale Trade: $${alert.amount.toLocaleString()} on ${alert.asset}`, level: 'critical' }, ...prev].slice(0, 50));
    };

    adminSocket.on('exposure_update', handleExposureUpdate);
    adminSocket.on('trade_executed', handleTradeExecuted);
    adminSocket.on('position_opened', handlePositionOpened);
    adminSocket.on('position_closed', handlePositionClosed);
    adminSocket.on('high_leverage_alert', handleHighLeverage);
    adminSocket.on('large_trade_alert', handleLargeTrade);

    return () => {
      adminSocket.off('exposure_update', handleExposureUpdate);
      adminSocket.off('trade_executed', handleTradeExecuted);
      adminSocket.off('position_opened', handlePositionOpened);
      adminSocket.off('position_closed', handlePositionClosed);
      adminSocket.off('high_leverage_alert', handleHighLeverage);
      adminSocket.off('large_trade_alert', handleLargeTrade);
    };
  }, [adminSocket]);

  if (isLoading || !exposure) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <p className="text-slate-400 font-mono animate-pulse">Initializing Surveillance Engine...</p>
      </div>
    );
  }

  const { longExposure, shortExposure, netExposure, totalOpenPositions, marginUsed } = exposure;
  const totalExposure = longExposure + shortExposure;
  const longPercent = totalExposure === 0 ? 0 : Math.round((longExposure / totalExposure) * 100);
  const shortPercent = totalExposure === 0 ? 0 : Math.round((shortExposure / totalExposure) * 100);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center">
            <Radio className="w-6 h-6 mr-3 text-red-500 animate-pulse" />
            Market Surveillance
          </h2>
          <p className="text-slate-400 text-sm mt-1">Real-time system exposure, trade feeds, and risk detection.</p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm font-mono text-slate-300">
            {connected ? 'LIVE / ADMIN_NS CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* SECTION 3: EXPOSURE DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0a0e27] border border-slate-800 p-5 rounded-xl border-t-4 border-t-blue-500 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2 text-blue-400" /> Total Long Vol
          </p>
          <div className="text-2xl font-bold text-slate-200">${longExposure.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
        </div>

        <div className="bg-[#0a0e27] border border-slate-800 p-5 rounded-xl border-t-4 border-t-red-500 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center">
            <TrendingDown className="w-4 h-4 mr-2 text-red-400" /> Total Short Vol
          </p>
          <div className="text-2xl font-bold text-slate-200">${shortExposure.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
        </div>

        <div className="bg-[#0a0e27] border border-slate-800 p-5 rounded-xl border-t-4 border-t-orange-500 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center">
            <Activity className="w-4 h-4 mr-2 text-orange-400" /> Net Exposure
          </p>
          <div className={`text-2xl font-bold ${netExposure > 0 ? 'text-emerald-400' : netExposure < 0 ? 'text-red-400' : 'text-slate-200'}`}>
            ${Math.abs(netExposure).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
            <span className="text-sm ml-2 font-normal text-slate-500">{netExposure > 0 ? 'LONG' : netExposure < 0 ? 'SHORT' : 'FLAT'}</span>
          </div>
        </div>

        <div className="bg-[#0a0e27] border border-slate-800 p-5 rounded-xl border-t-4 border-t-purple-500 shadow-lg relative overflow-hidden">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center">
            <Crosshair className="w-4 h-4 mr-2 text-purple-400" /> Margin / Positions
          </p>
          <div className="text-2xl font-bold text-slate-200">${marginUsed?.toLocaleString() || '0'}</div>
          <p className="text-xs text-slate-500 mt-1">{totalOpenPositions} active constraints</p>
        </div>
      </div>

      <div className="bg-[#0a0e27] border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">System Bias (Long vs Short)</h3>
        <div className="flex items-center justify-between mb-2 text-sm">
           <span className="font-semibold text-emerald-400">{longPercent}% Longs</span>
           <span className="font-semibold text-red-400">{shortPercent}% Shorts</span>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full flex overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${longPercent}%` }}></div>
          <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${shortPercent}%` }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SECTION 4: RISK ALERTS PANEL */}
        <div className="lg:col-span-1 bg-[#0a0e27] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm uppercase">
              <ShieldAlert className="w-4 h-4 text-orange-500" /> Live Risk Feed
            </h3>
            <span className="bg-red-500/10 text-red-500 font-mono text-xs px-2 py-1 rounded">Active</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {riskAlerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 opacity-50">
                <ShieldAlert className="w-8 h-8" />
                <span className="text-sm">No recent risks detected</span>
              </div>
            ) : (
              riskAlerts.map(alert => (
                <div key={alert.id} className={`p-3 rounded-lg border text-sm animate-in slide-in-from-left-2 ${
                  alert.level === 'critical' ? 'bg-red-500/10 border-red-500/20 text-red-100' : 
                  'bg-orange-500/10 border-orange-500/20 text-orange-100'
                }`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold flex items-center gap-1">
                      {alert.level === 'critical' ? <Flame className="w-3 h-3 text-red-500" /> : <AlertTriangle className="w-3 h-3 text-orange-500" />}
                      {alert.message}
                    </span>
                    <span className="text-[10px] opacity-60 font-mono">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs opacity-70 font-mono">UID: {alert.user_id?.substring(0,8) || alert.details}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SECTION 2: OPEN POSITIONS MONITOR */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-[#0a0e27] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[238px]">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm uppercase">
                <Crosshair className="w-4 h-4 text-emerald-500" /> Open Positions
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-900/50 text-slate-400 sticky top-0 uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">User ID</th>
                    <th className="px-4 py-3">Pair</th>
                    <th className="px-4 py-3">Margin</th>
                    <th className="px-4 py-3">Lev</th>
                    <th className="px-4 py-3">Entry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {openPositions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-500 font-mono">No active positions.</td>
                    </tr>
                  ) : (
                    openPositions.slice(0, 50).map(pos => (
                      <tr key={pos.id} className="hover:bg-slate-800/20 transition-colors group">
                        <td className="px-4 py-3 text-slate-300 font-mono text-xs">{pos.user_id.substring(0,8)}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${pos.direction === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pos.asset}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-200">${pos.amount}</td>
                        <td className="px-4 py-3">
                          <span className={`${pos.leverage >= 15 ? 'text-orange-400 font-bold bg-orange-400/10 px-1 rounded' : 'text-slate-400'}`}>
                            {pos.leverage}x
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono">${parseFloat(pos.entry_price).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 1: LIVE TRADE FEED */}
          <div className="bg-[#0a0e27] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[238px]">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm uppercase">
                <Activity className="w-4 h-4 text-blue-500" /> Live System Feed
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left font-mono text-xs whitespace-nowrap">
                <tbody className="divide-y divide-slate-800/50">
                  {liveTrades.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-500">Waiting for executions...</td>
                    </tr>
                  ) : (
                    liveTrades.map((t, idx) => (
                      <tr key={`${t.id}-${idx}`} className="hover:bg-slate-800/30 animate-in fade-in">
                        <td className="px-4 py-2 text-slate-500 w-24">
                          {new Date(t.created_at || t.closed_at).toLocaleTimeString([], {hour12: false, fractionalSecondDigits: 2} as any)}
                        </td>
                        <td className="px-4 py-2">
                          <span className={t.status === 'open' ? 'text-blue-400' : 'text-slate-400'}>
                            {t.status === 'open' ? 'EXE' : 'CLS'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-300">
                          User <span className="text-slate-500">{t.user_id.substring(0,6)}</span> {t.status === 'open' ? 'opened' : 'closed'} 
                          <span className={t.direction === 'buy' ? 'text-emerald-400 mx-2' : 'text-red-400 mx-2'}>
                            {t.direction.toUpperCase()}
                          </span>
                          {t.asset} at ${t.status === 'open' ? t.entry_price : t.close_price}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-400">
                          {t.status === 'closed' ? `P&L: $${t.profit_loss}` : `Size: $${t.amount * t.leverage}`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
