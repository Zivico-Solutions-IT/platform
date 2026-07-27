# MyProject - NOVA FXM Trading Platform

MyProject is an Expo Router application and Express/MySQL API for a dark trading terminal experience. It contains a responsive watchlist, Lightweight Charts candlestick terminal, demo order execution with live profit calculations, profile and wallet workflows, and an administrator review panel.

## Project Layout

```text
MyProject/
  app/                 Expo Router routes
  src/                 UI, contexts, hooks and API services
  backend/             Express and Sequelize API
    src/
    database.sql
```

All application source is JavaScript.

## Frontend Setup

```bash
npm install
npx expo start
```

Press `w` for the browser, `a` for Android, or use the Expo Go QR code for a supported device. For a physical phone accessing a backend on your computer, set `EXPO_PUBLIC_API_URL` to your computer's LAN address, for example:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.50:5000/api npx expo start
```

The terminal starts in demo mode with `5000.00 USD`. Positions, closed trades, and demo wallet requests persist in AsyncStorage.

## Backend Setup

```bash
cd backend
npm install
```

1. Open MySQL Workbench.
2. Run `backend/database.sql`, which creates and selects `novafxm_db`.
3. Copy `backend/.env.example` to `backend/.env`.
4. Configure MySQL credentials and replace `JWT_SECRET` with a long random secret.
5. Start the API:

```bash
npm run dev
```

The server runs on `http://localhost:5000` and seeds this administrator login on startup:

```text
admin@novafxm.com
Admin@123
```

Change that initial password before any deployed use.

## API Routes

```text
POST /api/auth/register        POST /api/auth/login        GET /api/auth/me
GET  /api/users/profile        PUT  /api/users/profile
GET  /api/wallet               GET  /api/wallet/transactions
POST /api/wallet/deposit       POST /api/wallet/withdraw
POST /api/trades/open          POST /api/trades/close/:id
GET  /api/trades/open          GET  /api/trades/closed
GET  /api/market/symbols       GET  /api/market/prices
GET  /api/market/candles/:symbol
GET  /api/admin/users          GET  /api/admin/deposits
PUT  /api/admin/deposits/:id/approve|reject
GET  /api/admin/withdrawals    PUT  /api/admin/withdrawals/:id/approve|reject
GET  /api/admin/trades
```

## Market Data and Charting

The backend posts scanner requests to `https://scanner.tradingview.com/${group}/scan` and normalizes symbol, bid, ask, spread, price, change, and group values. If an upstream request fails, it supplies demo prices so the trading terminal remains usable.

The chart is loaded through `react-native-webview` on mobile and an embedded document on web. It uses Lightweight Charts and displays TradingView attribution as required by its license.

## Live Money Readiness

This repository provides a trading UI, demo execution logic, and manual deposit/withdrawal approval workflow. Before accepting customer funds or offering live trading, the company must complete applicable financial licensing and compliance review, KYC/AML controls, payment reconciliation, immutable audit logging, secrets management, rate limiting, monitoring, penetration testing, market data licensing review, and an independently reviewed ledger/order execution design.
