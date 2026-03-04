import { io } from 'socket.io-client';

const socket = io('http://127.0.0.1:3000', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('[Test] Connected to Socket.io directly on port 3000');
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('[Test] Connection error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('[Test] Timeout after 10s');
  process.exit(1);
}, 10000);
