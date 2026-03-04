# B50 Trade - Institutional Grade Simulated Exchange

Join thousands of professional traders on an institutional-grade simulated crypto trading platform.

## Features

- **Real-time Trading**: Live Bybit WebSocket integration for accurate price data.
- **Advanced Admin Dashboard**: Full oversight of users, notifications, alerts, and platform finances.
- **Risk Monitoring**: Automated alert system for high-leverage trades and suspicious activity.
- **Security**: JWT authentication with optional 2FA and immutable audit logging.

## Getting Started

### Prerequisites

- Node.js (v18+)
- Gmail account (for verification emails - see .env)

### Installation

1. Install dependencies for the whole project:
```bash
npm install
```

2. Create a `.env` file from the provided variables (ensure Gmail and Supabase keys are set).

### Running the Platform

To run both the frontend and the backend concurrently:

```bash
npm start
```

- **Frontend**: http://localhost:8080
- **Admin API**: http://localhost:3000

## Security Note

- **Environment Variables**: Never commit the `.env` file to GitHub.
- **Data Persistence**: Account and trade data is stored in `server/data.json`.
