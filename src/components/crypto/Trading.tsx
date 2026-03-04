import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { TrendingUp, TrendingDown, ArrowLeftRight, Info, X, Zap, Flag, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { createChart, IChartApi, ISeriesApi, LineSeries, CandlestickSeries, BarSeries, AreaSeries, MouseEventParams } from 'lightweight-charts';
import PositionCard from './PositionCard';

// ─── TradingView Chart Component ─────────────────────────────────────────────
interface Trendline {
  id: string;
  start: { time: number; price: number };
  end: { time: number; price: number };
}

interface PriceChartProps {
  symbol: string;
  chartType: 'candlestick' | 'bar' | 'line' | 'area';
  timeframe: string;
  isDrawingMode: boolean;
  trendlines: Trendline[];
  setTrendlines: React.Dispatch<React.SetStateAction<Trendline[]>>;
}

const PriceChart: React.FC<PriceChartProps> = ({ symbol, chartType, timeframe, isDrawingMode, trendlines, setTrendlines }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const lastTimeRef = useRef<number>(0);
  const currentCandleRef = useRef<any>(null);
  const { prices, socket } = useAppContext();

  // Drawing State
  const [drawingStart, setDrawingStart] = useState<{ time: number; price: number } | null>(null);
  const previewSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const trendlineSeriesRefs = useRef<{ [id: string]: ISeriesApi<'Line'> }>({});

  // Fetch Historical Klines from Bybit
  const fetchKlines = async (sym: string, interval: string) => {
    try {
      let bybitInterval = interval;
      if (interval === '1m') bybitInterval = '1';
      else if (interval === '5m') bybitInterval = '5';
      else if (interval === '15m') bybitInterval = '15';
      else if (interval === '1h') bybitInterval = '60';
      else if (interval === '4h') bybitInterval = '240';
      else if (interval === '1D') bybitInterval = 'D';

      const resp = await fetch(`https://api.bytick.com/v5/market/kline?category=spot&symbol=${sym}USDT&interval=${bybitInterval}&limit=100`);
      if (!resp.ok) {
        throw new Error(`Market data fetch failed: ${resp.status} ${resp.statusText}`);
      }

      const text = await resp.text();
      if (!text || text.trim().length === 0) {
        console.warn('fetchKlines: Received empty response body');
        return [];
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        console.error('fetchKlines: Failed to parse JSON response', parseErr, 'Text:', text.substring(0, 100));
        return [];
      }

      if (json.retCode !== 0 || !json.result || !json.result.list) {
        console.warn('fetchKlines: API returned non-zero retCode or empty result', json.retMsg || '');
        return [];
      }

      return json.result.list.map((k: any) => ({
        time: (parseInt(k[0]) / 1000) as any,
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
      })).reverse();
    } catch (err) {
      console.error('fetchKlines error:', err);
      return [];
    }
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth || 600,
      height: 400,
      layout: { background: { color: 'transparent' }, textColor: '#9ca3af' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;

    let series: ISeriesApi<any>;
    if (chartType === 'candlestick') {
      series = chart.addSeries(CandlestickSeries, { upColor: '#10b981', downColor: '#f43f5e', borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#f43f5e' });
    } else if (chartType === 'bar') {
      series = chart.addSeries(BarSeries, { upColor: '#10b981', downColor: '#f43f5e' });
    } else if (chartType === 'area') {
      series = chart.addSeries(AreaSeries, { lineColor: '#10b981', topColor: 'rgba(16, 185, 129, 0.2)', bottomColor: 'rgba(16, 185, 129, 0)' });
    } else {
      series = chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 2 });
    }
    seriesRef.current = series;

    // Drawing interaction
    const handleClick = (param: MouseEventParams) => {
      if (!isDrawingMode || !param.time || !param.point || !seriesRef.current) return;

      const price = seriesRef.current.coordinateToPrice(param.point.y);
      if (price === null) return;

      if (!drawingStart) {
        setDrawingStart({ time: param.time as number, price });
        // Create preview series
        previewSeriesRef.current = chart.addSeries(LineSeries, {
          color: 'rgba(255, 255, 255, 0.5)',
          lineWidth: 1,
          lineStyle: 2, // Dashed
          lastValueVisible: false,
          priceLineVisible: false,
        });
      } else {
        // Finish line
        const newLine: Trendline = {
          id: Math.random().toString(36).substr(2, 9),
          start: drawingStart,
          end: { time: param.time as number, price },
        };
        setTrendlines(prev => [...prev, newLine]);
        setDrawingStart(null);
        if (previewSeriesRef.current) {
          chart.removeSeries(previewSeriesRef.current);
          previewSeriesRef.current = null;
        }
      }
    };

    const handleMouseMove = (param: MouseEventParams) => {
      if (!drawingStart || !previewSeriesRef.current || !param.time || !param.point || !seriesRef.current) return;

      const price = seriesRef.current.coordinateToPrice(param.point.y);
      if (price === null) return;

      const data = [
        { time: drawingStart.time as any, value: drawingStart.price },
        { time: param.time as any, value: price },
      ].sort((a, b) => (a.time as number) - (b.time as number));

      previewSeriesRef.current.setData(data);
    };

    chart.subscribeClick(handleClick);
    chart.subscribeCrosshairMove(handleMouseMove);

    fetchKlines(symbol, timeframe).then(data => {
      if (data.length > 0 && seriesRef.current) {
        if (chartType === 'line' || chartType === 'area') {
          seriesRef.current.setData(data.map((d: any) => ({ time: d.time, value: d.close })));
        } else {
          seriesRef.current.setData(data);
        }
        lastTimeRef.current = data[data.length - 1].time;
        chart.timeScale().fitContent();
      }
    });

    const handleResize = () => {
      if (container) chart.applyOptions({ width: container.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.unsubscribeClick(handleClick);
      chart.unsubscribeCrosshairMove(handleMouseMove);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      previewSeriesRef.current = null;
      trendlineSeriesRefs.current = {};
    };
  }, [symbol, chartType, timeframe, isDrawingMode, drawingStart]);

  // Render trendlines
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;

    // Clear old trendline series
    Object.values(trendlineSeriesRefs.current).forEach(s => chart.removeSeries(s));
    trendlineSeriesRefs.current = {};

    // Add new ones
    trendlines.forEach(line => {
      const s = chart.addSeries(LineSeries, {
        color: '#f59e0b', // Amber color for trendlines
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      const data = [
        { time: line.start.time as any, value: line.start.price },
        { time: line.end.time as any, value: line.end.price },
      ].sort((a, b) => (a.time as number) - (b.time as number));
      s.setData(data);
      trendlineSeriesRefs.current[line.id] = s;
    });
  }, [trendlines]);

  // Update chart on socket price updates
  useEffect(() => {
    if (!socket || !seriesRef.current) return;

    const handler = (data: any) => {
      if (data.symbol === symbol && seriesRef.current) {
        let duration = 60;
        if (timeframe === '5m') duration = 5 * 60;
        else if (timeframe === '15m') duration = 15 * 60;
        else if (timeframe === '1h') duration = 60 * 60;
        else if (timeframe === '4h') duration = 4 * 60 * 60;
        else if (timeframe === '1D') duration = 24 * 60 * 60;

        const now = Math.floor(Date.now() / 1000);
        const candleTime = Math.floor(now / duration) * duration;

        if (chartType === 'line' || chartType === 'area') {
          seriesRef.current.update({ time: candleTime as any, value: data.price });
          lastTimeRef.current = candleTime;
        } else {
          if (!currentCandleRef.current || candleTime > lastTimeRef.current) {
            currentCandleRef.current = {
              time: candleTime as any,
              open: data.price,
              high: data.price,
              low: data.price,
              close: data.price
            };
          } else {
            currentCandleRef.current = {
              ...currentCandleRef.current,
              high: Math.max(currentCandleRef.current.high, data.price),
              low: Math.min(currentCandleRef.current.low, data.price),
              close: data.price
            };
          }
          seriesRef.current.update(currentCandleRef.current);
          lastTimeRef.current = candleTime;
        }
      }
    };
    socket.on('price:update', handler);
    return () => { socket.off('price:update', handler); };
  }, [socket, symbol, chartType, timeframe]);

  return <div ref={chartContainerRef} className="w-full h-[400px] rounded-xl overflow-hidden" />;
};

// ─── Main Trading Component ──────────────────────────────────────────────────
const Trading: React.FC = () => {
  const {
    prices, selectedCrypto, setSelectedCrypto, demoBalance, cryptoBalances, positions,
    buyCrypto, sellCrypto, openTrades, openTrade, closeTrade, totalEquity, livePrices,
    tradingMode: mode, setTradingMode: setMode,
    tradingTab: tab, setTradingTab: setTab,
    chartType, setChartType,
    timeframe, setTimeframe,
    setReportingTargetId, setReportingRelatedEntityId, setCurrentPage,
  } = useAppContext();

  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [tpPrice, setTpPrice] = useState('');
  const [slPrice, setSlPrice] = useState('');

  // Trendline State
  const [isDrawingTrendline, setIsDrawingTrendline] = useState(false);
  const [trendlines, setTrendlines] = useState<Trendline[]>([]);

  const currentPrice = prices.find(p => p.symbol === selectedCrypto);
  const livePrice = livePrices[selectedCrypto] || currentPrice?.price || 0;

  // Flash logic using the unified live price
  const [localLivePrice, setLocalLivePrice] = useState(livePrice);
  const [prevLocalPrice, setPrevLocalPrice] = useState(livePrice);

  useEffect(() => {
    if (livePrice !== localLivePrice) {
      setPrevLocalPrice(localLivePrice);
      setLocalLivePrice(livePrice);
    }
  }, [livePrice, localLivePrice]);

  const priceFlash = prevLocalPrice !== localLivePrice;
  const priceUp = localLivePrice > prevLocalPrice;
  const asset = selectedCrypto + 'USDT';
  // Check if trade asset matches selectedCrypto OR the full asset name (e.g. BTC vs BTCUSDT)
  const myTrades = openTrades.filter(t => t.asset === asset || t.asset === selectedCrypto);

  // Animated order book
  const [tick, setTick] = useState(0);
  useEffect(() => { const interval = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(interval); }, []);

  const orderBook = useMemo(() => {
    const bp = livePrice;
    if (!bp) return { bids: [] as any[], asks: [] as any[] };
    const bids = Array.from({ length: 8 }, (_, i) => {
      const offset = (i + 1) * 0.0005 + (Math.sin(tick + i) * 0.0002);
      return {
        price: bp * (1 - offset),
        amount: Math.abs(Math.cos(tick + i) * 1.5) + 0.1
      };
    });
    const asks = Array.from({ length: 8 }, (_, i) => {
      const offset = (i + 1) * 0.0005 + (Math.sin(tick + i + 10) * 0.0002);
      return {
        price: bp * (1 + offset),
        amount: Math.abs(Math.cos(tick + i + 10) * 1.5) + 0.1
      };
    });
    return { bids, asks: asks.reverse() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePrice, selectedCrypto, tick]);

  const handleTrade = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;

    if (mode === 'futures') {
      const tp = tpPrice ? parseFloat(tpPrice) : null;
      const sl = slPrice ? parseFloat(slPrice) : null;
      await openTrade(asset, tab === 'buy' ? 'buy' : 'sell', amt, leverage, tp, sl);
      setAmount('');
      setTpPrice('');
      setSlPrice('');
    } else {
      // Spot
      if (tab === 'buy') { buyCrypto(selectedCrypto, amt); setAmount(''); }
      else {
        const bal = cryptoBalances.find(b => b.symbol === selectedCrypto);
        if (bal && amt <= bal.amount) { sellCrypto(selectedCrypto, amt); setAmount(''); }
      }
    }
  };

  // Floating P&L is now handled entirely by backend via AppContext openTrades updates
  const totalFloatingPnL = myTrades.reduce((s, t) => s + t.profit_loss, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white glow-text-emerald">Trade</h1>
          <p className="text-muted-foreground text-xs mt-1 uppercase tracking-widest font-mono">Institutional liquidity • Ultra-low latency</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-secondary/50 backdrop-blur-md rounded-xl p-1 border border-white/5">
            <button onClick={() => setMode('futures')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'futures' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-white'}`}>
              FUTURES
            </button>
            <button onClick={() => setMode('spot')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'spot' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-white'}`}>
              SPOT
            </button>
          </div>
          <div className="flex bg-secondary/50 backdrop-blur-md rounded-xl p-1 border border-white/5">
            {['1m', '5m', '15m', '1h', '4h', '1D'].map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${timeframe === tf ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}>
                {tf}
              </button>
            ))}
          </div>
          <select value={chartType} onChange={e => setChartType(e.target.value as 'candlestick' | 'bar' | 'line' | 'area')}
            className="bg-secondary/50 border border-white/5 rounded-xl px-4 py-2 text-white text-xs focus:outline-none cursor-pointer hover:bg-secondary transition-colors">
            <option value="candlestick">Candlestick</option>
            <option value="bar">OHLC Bar</option>
            <option value="line">Line Chart</option>
            <option value="area">Area Chart</option>
          </select>
          <div className="relative group">
            <select value={selectedCrypto} onChange={e => setSelectedCrypto(e.target.value)}
              className="bg-secondary/50 border border-white/5 rounded-xl pl-4 pr-10 py-2 text-white text-sm font-bold focus:outline-none appearance-none cursor-pointer hover:bg-secondary transition-colors glow-border-emerald">
              {prices.map(p => <option key={p.symbol} value={p.symbol}>{p.symbol}/USDT</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground group-hover:text-white transition-colors">
              <ArrowLeftRight size={14} />
            </div>
          </div>
          <div className="flex bg-secondary/50 backdrop-blur-md rounded-xl p-1 border border-white/5 gap-1">
            <button
              onClick={() => setIsDrawingTrendline(!isDrawingTrendline)}
              className={`p-2 rounded-lg transition-all ${isDrawingTrendline ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
              title={isDrawingTrendline ? "Stop Drawing" : "Draw Trendline"}
            >
              <Pencil size={18} />
            </button>
            {trendlines.length > 0 && (
              <button
                onClick={() => setTrendlines([])}
                className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
                title="Clear All Lines"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart + Price Info */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#111738]/80 glass border border-white/5 rounded-2xl p-5 glow-emerald">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center overflow-hidden">
                  {currentPrice?.image_url ? <img src={currentPrice.image_url} alt={selectedCrypto} className="w-8 h-8 rounded-full" /> : <span className="text-sm font-bold text-white">{selectedCrypto.slice(0, 2)}</span>}
                </div>
                <div>
                  <h2 className="text-white font-semibold">{currentPrice?.name || selectedCrypto}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs">{selectedCrypto}/USDT</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-400 text-[10px] font-medium">LIVE</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-mono font-bold text-xl transition-colors duration-500 ${priceFlash ? (priceUp ? 'text-emerald-400' : 'text-rose-400') : 'text-white'}`}>
                  ${livePrice != null ? (livePrice < 1 ? livePrice.toFixed(4) : livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : '0.00'}
                </p>
                {currentPrice && (
                  <p className={`text-sm font-mono ${currentPrice.change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {currentPrice.change_24h >= 0 ? '+' : ''}{currentPrice.change_24h.toFixed(2)}%
                  </p>
                )}
              </div>
            </div>

            {/* TradingView Chart */}
            <PriceChart
              symbol={selectedCrypto}
              chartType={chartType}
              timeframe={timeframe}
              isDrawingMode={isDrawingTrendline}
              trendlines={trendlines}
              setTrendlines={setTrendlines}
            />

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              <div className="p-2 rounded-lg bg-white/[0.03] text-center">
                <p className="text-gray-500 text-[10px]">24h High</p>
                <p className="text-emerald-400 font-mono text-xs">${currentPrice?.high_24h?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '—'}</p>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.03] text-center">
                <p className="text-gray-500 text-[10px]">24h Low</p>
                <p className="text-rose-400 font-mono text-xs">${currentPrice?.low_24h?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '—'}</p>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.03] text-center">
                <p className="text-gray-500 text-[10px]">Volume</p>
                <p className="text-white font-mono text-xs">{currentPrice ? (currentPrice.volume_24h >= 1e9 ? `$${(currentPrice.volume_24h / 1e9).toFixed(1)}B` : `$${(currentPrice.volume_24h / 1e6).toFixed(0)}M`) : '—'}</p>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.03] text-center">
                <p className="text-gray-500 text-[10px]">Mkt Cap</p>
                <p className="text-white font-mono text-xs">{currentPrice ? (currentPrice.market_cap >= 1e12 ? `$${(currentPrice.market_cap / 1e12).toFixed(1)}T` : `$${(currentPrice.market_cap / 1e9).toFixed(0)}B`) : '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Book */}
        <div className="lg:col-span-3 bg-[#111738] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Order Book</h3>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live" />
          </div>
          <div className="space-y-0.5 text-xs font-mono">
            <div className="flex justify-between text-gray-500 mb-2 px-1"><span>Price (USD)</span><span>Amount</span></div>
            {orderBook.asks.map((ask, i) => (
              <div key={`ask-${i}`} className="flex justify-between px-1 py-0.5 relative">
                <div className="absolute right-0 top-0 bottom-0 bg-rose-500/5" style={{ width: `${Math.min((ask.amount / 3) * 100, 100)}%` }} />
                <span className="text-rose-400 relative z-10">${ask.price < 1 ? ask.price.toFixed(4) : ask.price.toFixed(2)}</span>
                <span className="text-gray-400 relative z-10">{ask.amount.toFixed(4)}</span>
              </div>
            ))}
            <div className="py-2 text-center">
              <span className={`font-semibold text-sm transition-colors duration-500 ${priceFlash ? (priceUp ? 'text-emerald-400' : 'text-rose-400') : 'text-white'}`}>
                ${livePrice != null ? (livePrice < 1 ? livePrice.toFixed(4) : livePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })) : '0.00'}
              </span>
            </div>
            {orderBook.bids.map((bid, i) => (
              <div key={`bid-${i}`} className="flex justify-between px-1 py-0.5 relative">
                <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/5" style={{ width: `${Math.min((bid.amount / 3) * 100, 100)}%` }} />
                <span className="text-emerald-400 relative z-10">${bid.price < 1 ? bid.price.toFixed(4) : bid.price.toFixed(2)}</span>
                <span className="text-gray-400 relative z-10">{bid.amount.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trade Panel */}
        <div className="lg:col-span-4 glass-premium rounded-2xl p-6 border-white/10 shadow-emerald-500/5">
          <div className="flex gap-2 mb-6">
            <button onClick={() => { setTab('buy'); setAmount(''); }}
              className={`flex-1 py-4 rounded-xl font-bold text-sm tracking-widest transition-all ${tab === 'buy' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 glow-border-emerald' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
              {mode === 'futures' ? 'LONG' : 'BUY'}
            </button>
            <button onClick={() => { setTab('sell'); setAmount(''); }}
              className={`flex-1 py-4 rounded-xl font-bold text-sm tracking-widest transition-all ${tab === 'sell' ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20 glow-border-rose' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
              {mode === 'futures' ? 'SHORT' : 'SELL'}
            </button>
          </div>

          {/* Leverage (Futures only) */}
          {mode === 'futures' && (
            <div className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-white font-bold text-sm tracking-tight flex items-center gap-2">
                  <Zap size={14} className="text-emerald-400" />
                  Leverage
                </span>
                <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold text-xs ring-1 ring-emerald-500/20">{leverage}x</span>
              </div>
              <input type="range" min="1" max="100" value={leverage} onChange={e => setLeverage(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-emerald-500 mb-4" />
              <div className="grid grid-cols-5 gap-1.5">
                {[5, 10, 25, 50, 100].map(val => (
                  <button
                    key={val}
                    onClick={() => setLeverage(val)}
                    className={`py-2 rounded-lg text-[10px] font-black transition-all border ${leverage === val ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white/5 border-white/5 text-muted-foreground hover:border-white/20'}`}
                  >
                    {val}X
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest font-bold">Available</p>
              <p className="text-white font-mono font-bold text-base">${demoBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest font-bold">Equity</p>
              <p className={`font-mono font-bold text-base ${totalEquity >= demoBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="mb-6 relative group">
            <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-tight">
              {mode === 'futures' ? 'Margin Amount (USD)' : (tab === 'buy' ? 'Buy Amount (USD)' : `Sell Amount (${selectedCrypto})`)}
            </label>
            <div className="relative">
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="any"
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white font-mono placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-right text-xl font-bold transition-all group-hover:bg-white/[0.05]" />
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">{mode === 'futures' ? 'USD' : (tab === 'buy' ? 'USD' : selectedCrypto)}</span>
            </div>

            {/* Quick Percentages */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[25, 50, 75, 100].map(p => (
                <button key={p} onClick={() => setAmount(((demoBalance * p) / 100).toFixed(2))}
                  className="py-1.5 rounded-lg bg-white/5 text-muted-foreground text-[10px] font-bold hover:bg-white/10 hover:text-white transition-all border border-white/5">{p}%</button>
              ))}
            </div>
          </div>

          {mode === 'futures' && (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-0.5 flex-1 bg-white/5" />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Risk Management</span>
                <div className="h-0.5 flex-1 bg-white/5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-[10px] font-bold text-emerald-400/80 mb-1.5 uppercase tracking-wider">Take Profit</label>
                  <input type="number" value={tpPrice} onChange={e => setTpPrice(e.target.value)} placeholder="Price" step="any"
                    className="w-full px-4 py-3 bg-white/[0.02] border border-emerald-500/20 rounded-xl text-white font-mono placeholder-muted-foreground focus:outline-none focus:border-emerald-500/50 text-right text-sm font-bold transition-all" />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-bold text-rose-400/80 mb-1.5 uppercase tracking-wider">Stop Loss</label>
                  <input type="number" value={slPrice} onChange={e => setSlPrice(e.target.value)} placeholder="Price" step="any"
                    className="w-full px-4 py-3 bg-white/[0.02] border border-rose-500/20 rounded-xl text-white font-mono placeholder-muted-foreground focus:outline-none focus:border-rose-500/50 text-right text-sm font-bold transition-all" />
                </div>
              </div>
            </div>
          )}

          {/* Quick Amounts */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[100, 500, 1000, 5000].map(a => (
              <button key={a} onClick={() => setAmount(a.toString())}
                className="py-2.5 rounded-xl bg-white/5 text-white text-xs font-bold hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all shadow-lg active:scale-95 border border-white/5">
                ${a >= 1000 ? (a / 1000) + 'K' : a}
              </button>
            ))}
          </div>

          <button onClick={handleTrade}
            disabled={!parseFloat(amount) || parseFloat(amount) > demoBalance}
            className={`w-full py-5 rounded-2xl font-black text-sm tracking-widest transition-all disabled:opacity-20 disabled:scale-100 disabled:grayscale uppercase shadow-2xl active:scale-95 hover:scale-[1.02]
              ${tab === 'buy' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30 glow-border-emerald'
                : 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-rose-500/30 glow-border-rose'}`}>
            {mode === 'futures' ? (tab === 'buy' ? `Execute Long Position` : `Execute Short Position`) : (tab === 'buy' ? `Purchase ${selectedCrypto}` : `Liquidate ${selectedCrypto}`)}
          </button>

          <div className="flex items-start gap-2.5 mt-4 text-muted-foreground text-[10px] leading-relaxed p-3 bg-white/[0.02] rounded-xl border border-white/5">
            <Info size={14} className="shrink-0 text-primary" />
            <span>{mode === 'futures' ? 'Futures trading involves significant risk. Our proprietary liquidation engine protects your initial margin. All executions are final.' : 'Spot assets are held in your secure cold-storage simulated wallet.'}</span>
          </div>
        </div>
      </div>

      {/* Open Positions — Asset Specific */}
      {myTrades.length > 0 && (
        <div className="glass-premium rounded-2xl p-6 border-white/10 shadow-emerald-500/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-black tracking-tight text-xl flex items-center gap-2">
              <div className="w-2 h-6 bg-emerald-500 rounded-full" />
              Open Positions — {selectedCrypto}
            </h3>
            <div className={`px-4 py-2 rounded-xl text-sm font-black shadow-lg ${totalFloatingPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              UNREALIZED P&L: {totalFloatingPnL >= 0 ? '+' : ''}${totalFloatingPnL.toFixed(2)}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-[10px] uppercase font-black border-b border-white/5 tracking-widest">
                  <th className="text-left py-4 px-3">Direction</th>
                  <th className="text-right py-4 px-3">Margin/Size</th>
                  <th className="text-right py-4 px-3">Leverage</th>
                  <th className="text-right py-4 px-3">Entry Price</th>
                  <th className="text-right py-4 px-3">Risk Filters</th>
                  <th className="text-right py-4 px-3">PnL</th>
                  <th className="text-right py-4 px-3">Execution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {/* Spot Position (if any) */}
                {positions.find(p => p.symbol === selectedCrypto) && (() => {
                  const pos = positions.find(p => p.symbol === selectedCrypto)!;
                  const price = prices.find(p => p.symbol === selectedCrypto)?.price || 0;
                  const upnl = (price - pos.avg_buy_price) * pos.amount;
                  return (
                    <tr className="group bg-amber-500/[0.01] hover:bg-amber-500/[0.03] transition-colors">
                      <td className="py-5 px-3">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-tighter">
                          SPOT ASSET
                        </span>
                      </td>
                      <td className="py-5 px-3 text-right text-white font-mono font-bold">{pos.amount.toFixed(6)} {selectedCrypto}</td>
                      <td className="py-5 px-3 text-right text-muted-foreground font-mono">—</td>
                      <td className="py-5 px-3 text-right text-muted-foreground font-mono">${pos.avg_buy_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="py-5 px-3 text-right text-muted-foreground font-mono">—</td>
                      <td className={`py-5 px-3 text-right font-mono font-bold text-lg ${upnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {upnl >= 0 ? '+' : ''}${upnl.toFixed(2)}
                      </td>
                      <td className="py-5 px-3 text-right">
                        <button onClick={() => {
                          const balance = cryptoBalances.find(b => b.symbol === selectedCrypto);
                          if (balance) {
                            sellCrypto(selectedCrypto, balance.amount);
                          } else {
                            toast({ title: 'Error', description: 'No balance found for ' + selectedCrypto, variant: 'destructive' });
                          }
                        }}
                          className="px-6 py-2.5 bg-rose-500 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all whitespace-nowrap uppercase tracking-widest">
                          Liquidate
                        </button>
                      </td>
                    </tr>
                  );
                })()}

                {/* Futures Trades */}
                {myTrades.map((trade) => (
                  <tr key={trade.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-5 px-3">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${trade.direction === 'buy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                        {trade.direction === 'buy' ? 'PRO LONG' : 'PRO SHORT'}
                      </span>
                    </td>
                    <td className="py-5 px-3 text-right text-white font-mono font-bold">${trade.amount.toFixed(2)}</td>
                    <td className="py-5 px-3 text-right text-emerald-400 font-mono font-black text-base">{trade.leverage}x</td>
                    <td className="py-5 px-3 text-right text-muted-foreground font-mono">${trade.entry_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="py-5 px-3 text-right text-muted-foreground font-mono text-[10px]">
                      <div className="flex flex-col items-end gap-1">
                        <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-emerald-500" /> TP: <span className="text-white font-bold">{trade.tp_price ? '$' + trade.tp_price.toLocaleString() : 'OFF'}</span></span>
                        <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-rose-500" /> SL: <span className="text-white font-bold">{trade.sl_price ? '$' + trade.sl_price.toLocaleString() : 'OFF'}</span></span>
                      </div>
                    </td>
                    <td className={`py-5 px-3 text-right font-mono font-bold text-lg ${trade.profit_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}
                    </td>
                    <td className="py-5 px-3 text-right">
                      <button onClick={() => closeTrade(trade.id)}
                        className="px-6 py-2.5 bg-rose-500 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all whitespace-nowrap uppercase tracking-widest">
                        Close Trade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Other Open Positions */}
      {openTrades.length > myTrades.length && (
        <div className="bg-[#111738]/50 border border-white/5 rounded-2xl p-5 border-dashed">
          <div className="mb-4">
            <h3 className="text-white/60 font-semibold text-sm">Other Open Positions</h3>
          </div>
          <div className="overflow-x-auto opacity-70 hover:opacity-100 transition-opacity">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-600 uppercase border-b border-white/5">
                  <th className="text-left p-2">Asset</th>
                  <th className="text-left p-2">Dir</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-right p-2">P&L</th>
                  <th className="text-right p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {openTrades.filter(t => t.asset !== asset && t.asset !== selectedCrypto).map(trade => (
                  <tr key={trade.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="p-2 text-white font-medium">{trade.asset}</td>
                    <td className="p-2">
                      <span className={trade.direction === 'buy' ? 'text-emerald-400' : 'text-rose-400'}>
                        {trade.direction === 'buy' ? 'BUY' : 'SELL'}
                      </span>
                    </td>
                    <td className="p-2 text-right text-gray-400 font-mono">${trade.amount.toFixed(2)}</td>
                    <td className={`p-2 text-right font-mono font-bold ${trade.profit_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}
                    </td>
                    <td className="p-2 text-right flex items-center justify-end gap-2">
                      <button onClick={() => {
                        setReportingTargetId(trade.user_id);
                        setReportingRelatedEntityId(trade.id);
                        setCurrentPage('report');
                      }}
                        className="px-2 py-1 bg-rose-500/10 text-rose-400 text-[10px] rounded hover:bg-rose-500/20 transition-all flex items-center gap-1">
                        <Flag size={10} />
                        Report
                      </button>
                      <button onClick={() => closeTrade(trade.id)}
                        className="px-2 py-1 bg-white/5 text-white text-[10px] rounded hover:bg-white/10">
                        Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trading;
