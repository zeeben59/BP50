import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  symbol: string;
  compact?: boolean;
}

const PositionCard: React.FC<Props> = ({ symbol, compact }) => {
  const { positions, prices, sellCrypto, cryptoBalances } = useAppContext();
  const position = positions.find(p => p.symbol === symbol);
  const currentPrice = prices.find(p => p.symbol === symbol);

  if (!position || !currentPrice) return null;

  const currentValue = position.amount * currentPrice.price;
  const unrealizedPnL = (currentPrice.price - position.avg_buy_price) * position.amount;
  const unrealizedPnLPct = position.avg_buy_price > 0 ? ((currentPrice.price - position.avg_buy_price) / position.avg_buy_price) * 100 : 0;
  const isProfit = unrealizedPnL >= 0;

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-xs font-bold text-white">
            {symbol.slice(0, 2)}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{symbol}</p>
            <p className="text-gray-500 text-xs">{position.amount.toFixed(6)}</p>
          </div>
        </div>
        <div className="text-right flex items-center gap-3">
          <div>
            <p className="text-white text-sm font-mono">${currentValue.toFixed(2)}</p>
            <p className={`text-xs font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isProfit ? '+' : ''}{unrealizedPnL.toFixed(2)} ({isProfit ? '+' : ''}{unrealizedPnLPct.toFixed(2)}%)
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const balance = cryptoBalances.find(b => b.symbol === symbol);
              const amountToSell = balance ? balance.amount : position.amount;
              if (window.confirm(`Close spot position for ${symbol}?`)) {
                sellCrypto(symbol, amountToSell);
              }
            }}
            className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
            title="Close Position"
          >
            <TrendingDown size={14} className="rotate-45" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-[#111738] border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-sm font-bold text-white">
            {symbol.slice(0, 2)}
          </div>
          <div>
            <h3 className="text-white font-semibold">{symbol}</h3>
            <p className="text-gray-500 text-xs">Qty: {position.amount.toFixed(6)}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${isProfit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isProfit ? '+' : ''}{unrealizedPnLPct.toFixed(2)}%
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 rounded-lg bg-white/[0.02]">
          <p className="text-gray-500 text-xs">Avg Entry</p>
          <p className="text-white font-mono text-sm">${position.avg_buy_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.02]">
          <p className="text-gray-500 text-xs">Current Price</p>
          <p className="text-white font-mono text-sm">${currentPrice.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.02]">
          <p className="text-gray-500 text-xs">Invested</p>
          <p className="text-white font-mono text-sm">${position.total_invested.toFixed(2)}</p>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.02]">
          <p className="text-gray-500 text-xs">Unrealized P&L</p>
          <p className={`font-mono text-sm ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfit ? '+' : ''}${unrealizedPnL.toFixed(2)}
          </p>
        </div>
      </div>
      <button
        onClick={() => {
          const balance = cryptoBalances.find(b => b.symbol === symbol);
          const amountToSell = balance ? balance.amount : position.amount;
          if (window.confirm(`Close your ${symbol} position and sell all holdings?`)) {
            sellCrypto(symbol, amountToSell);
          }
        }}
        className="w-full mt-4 py-2 bg-rose-500/10 text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"
      >
        CLOSE POSITION
      </button>
    </div>
  );
};

export default PositionCard;
