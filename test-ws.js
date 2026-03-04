import WebSocket from 'ws';

const wsUrl = `wss://stream.bytick.com/v5/public/spot`;
console.log('[Test] Connecting to Bybit...');

try {
  const ws = new WebSocket(wsUrl);
  ws.on('open', () => {
    console.log('[Test] WebSocket connected!');
    const msg = { op: 'subscribe', args: ['tickers.BTCUSDT'] };
    ws.send(JSON.stringify(msg));
  });
  ws.on('message', (data) => {
    console.log('[Test] Received message:', data.toString().slice(0, 100));
    process.exit(0);
  });
  ws.on('error', (err) => {
    console.error('[Test] Error:', err);
    process.exit(1);
  });
  setTimeout(() => {
    console.log('[Test] Timeout');
    process.exit(1);
  }, 10000);
} catch (err) {
  console.error('[Test] Exec error:', err);
  process.exit(1);
}
