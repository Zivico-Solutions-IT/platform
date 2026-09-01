import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SYMBOL, SYMBOLS } from '../constants/symbols';
import { useMarketPrices } from '../hooks/useMarketPrices';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ToastContext';
import { storage } from '../utils/storage';
import { calculateProfit, calculateRequiredMargin, calculateSummary } from '../utils/calculations';
import { tradeService } from '../services/tradeService';
import { walletService } from '../services/walletService';

export const TradingContext = createContext(null);
const INITIAL_BALANCE = 5000;

export function TradingProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const { notify } = useToast();
  const { prices, connected } = useMarketPrices();
  const [selectedSymbol, setSelectedSymbol] = useState(DEFAULT_SYMBOL);
  const [positions, setPositions] = useState([]);
  const [closedPositions, setClosedPositions] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [wallet, setWallet] = useState({ balance: INITIAL_BALANCE });
  const [transactions, setTransactions] = useState([]);
  const [selectedTradingAccount, setSelectedTradingAccount] = useState(null);
  const [ready, setReady] = useState(false);
  const [sidePanel, setSidePanel] = useState(null);
  const [insufficientFundsVisible, setInsufficientFundsVisible] = useState(false);
  const protectionToastIdsRef = useRef(new Set());
  const locallyClosedIdsRef = useRef(new Set());
  const syncInFlightRef = useRef(false);

  useEffect(() => {
    async function restore() {
      const stored = await Promise.all([
        storage.get('positions', []),
        storage.get('closed', []),
        storage.get('pendingOrders', []),
        storage.get('wallet', { balance: INITIAL_BALANCE }),
        storage.get('transactions', []),
        storage.get('selectedSymbol', DEFAULT_SYMBOL),
      ]);
      setPositions(stored[0]);
      setClosedPositions(stored[1]);
      setPendingOrders(stored[2]);
      setWallet(stored[3]);
      setTransactions(stored[4]);
      setSelectedSymbol(stored[5]);
      setReady(true);
    }
    restore();
  }, []);

  const selectedAccountId = useMemo(() => {
    const id = selectedTradingAccount?.id;
    return id && /^\d+$/.test(String(id)) ? id : undefined;
  }, [selectedTradingAccount?.id]);
  const serverAccount = user && selectedAccountId;

  const syncAccount = useCallback(async () => {
    if (!user || !serverAccount) return;
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    try {
      const [open, pending, closed, account, history] = await Promise.all([
        tradeService.openTrades(selectedAccountId), tradeService.pendingTrades(selectedAccountId), tradeService.closedTrades(selectedAccountId), walletService.getWallet(selectedAccountId), walletService.getTransactions(),
      ]);
      const serverOpenIds = new Set((open.trades || []).map((t) => String(t.id)));
      locallyClosedIdsRef.current.forEach((id) => {
        if (!serverOpenIds.has(id)) {
          locallyClosedIdsRef.current.delete(id);
        }
      });
      const activeTrades = (open.trades || []).filter((t) => !locallyClosedIdsRef.current.has(String(t.id)));
      setPositions(activeTrades);
      setPendingOrders(pending.trades || []);
      setClosedPositions(closed.trades || []);
      const bonusVal = account.summary.bonus !== undefined && account.summary.bonus !== null ? Number(account.summary.bonus) : Number(account.wallet?.bonus || 0);
      setWallet({ balance: Number(account.summary.balance), bonus: bonusVal });
      if (account.tradingAccount) {
        setSelectedTradingAccount((current) => (
          current && String(current.id) === String(account.tradingAccount.id)
            ? { ...current, ...account.tradingAccount }
            : current
        ));
      }
      setTransactions(history.transactions || []);
    } finally {
      syncInFlightRef.current = false;
    }
  }, [selectedAccountId, serverAccount, user]);

  useEffect(() => {
    syncAccount().catch(() => {});
  }, [syncAccount]);

  useEffect(() => {
    if (!user || !serverAccount) return;
    const interval = setInterval(() => {
      syncAccount().catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [syncAccount, user, serverAccount]);

  useEffect(() => {
    if (authLoading || user) return;
    setPositions([]);
    setClosedPositions([]);
    setPendingOrders([]);
    setWallet({ balance: INITIAL_BALANCE });
    setTransactions([]);
    setSelectedTradingAccount(null);
  }, [authLoading, user]);

  const livePositions = useMemo(
    () =>
      positions.map((position) => {
        const quote = prices.find((item) => item.symbol === position.symbol);
        const currentPrice = Number(position.side === 'BUY' ? quote?.bid : quote?.ask) || quote?.price || position.openPrice;
        return { ...position, currentPrice, profit: calculateProfit(position, currentPrice) };
      }),
    [positions, prices],
  );

  useEffect(() => {
    if (!user || !serverAccount || !livePositions.length) return;
    let triggered = false;
    const closedIds = [];
    livePositions.forEach((position) => {
      const currentPrice = Number(position.currentPrice);
      const stopLoss = Number(position.stopLoss || 0);
      const takeProfit = Number(position.takeProfit || 0);
      if (!Number.isFinite(currentPrice) || currentPrice <= 0) return;
      let hitType = '';
      let triggerPrice = currentPrice;
      if (position.side === 'BUY') {
        if (takeProfit > 0 && currentPrice >= takeProfit) {
          hitType = 'Take Profit';
          triggerPrice = takeProfit;
        }
        if (!hitType && stopLoss > 0 && currentPrice <= stopLoss) {
          hitType = 'Stop Loss';
          triggerPrice = stopLoss;
        }
      } else {
        if (takeProfit > 0 && currentPrice <= takeProfit) {
          hitType = 'Take Profit';
          triggerPrice = takeProfit;
        }
        if (!hitType && stopLoss > 0 && currentPrice >= stopLoss) {
          hitType = 'Stop Loss';
          triggerPrice = stopLoss;
        }
      }
      if (!hitType) return;
      triggered = true;
      closedIds.push(String(position.id));
      const toastKey = `${position.id}:${hitType}`;
      if (protectionToastIdsRef.current.has(toastKey)) return;
      protectionToastIdsRef.current.add(toastKey);
      notify({
        type: hitType === 'Take Profit' ? 'success' : 'warning',
        title: `${hitType} hit`,
        message: `${position.side} ${position.symbol} #${position.id} reached ${triggerPrice.toFixed(5)}.`,
      });
    });
    if (!triggered) return;
    closedIds.forEach((id) => locallyClosedIdsRef.current.add(id));
    setPositions((existing) => existing.filter((pos) => !locallyClosedIdsRef.current.has(String(pos.id))));
    const timer = setTimeout(() => {
      syncAccount().catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [livePositions, notify, serverAccount, syncAccount, user]);

  const depositTotals = useMemo(
    () =>
      transactions.reduce(
        (values, item) => {
          if (item.type !== 'deposit') return values;
          const amount = Number(item.amount || 0);
          values.totalDeposits += amount;
          if (item.status === 'pending') values.pendingDeposits += amount;
          return values;
        },
        { totalDeposits: 0, pendingDeposits: 0 },
      ),
    [transactions],
  );
  const summaryBalance = Number.isFinite(Number(selectedTradingAccount?.balance))
    ? Number(selectedTradingAccount.balance)
    : wallet.balance;
  const summary = useMemo(
    () => ({
      ...calculateSummary(summaryBalance, livePositions),
      ...depositTotals,
      bonus: selectedTradingAccount?.type === 'Demo' ? 0 : Number(wallet.bonus || 0),
    }),
    [summaryBalance, livePositions, depositTotals, wallet.bonus, selectedTradingAccount?.type],
  );
  const currentSymbol =
    prices.find((item) => item.symbol === selectedSymbol) ||
    prices.find((item) => item.symbol === DEFAULT_SYMBOL) ||
    SYMBOLS.find((item) => item.symbol === DEFAULT_SYMBOL) ||
    prices[0] ||
    SYMBOLS[0];

  useEffect(() => {
    if (ready) storage.set('positions', positions);
  }, [positions, ready]);
  useEffect(() => {
    if (ready) storage.set('closed', closedPositions);
  }, [closedPositions, ready]);
  useEffect(() => {
    if (ready) storage.set('pendingOrders', pendingOrders);
  }, [pendingOrders, ready]);
  useEffect(() => {
    if (ready) storage.set('wallet', wallet);
  }, [wallet, ready]);
  useEffect(() => {
    if (ready) storage.set('transactions', transactions);
  }, [transactions, ready]);
  useEffect(() => {
    if (ready) storage.set('selectedSymbol', selectedSymbol);
  }, [selectedSymbol, ready]);

  const openPosition = useCallback(
    async (side, lots, options = {}) => {
      if (!user) throw new Error('Please log in to place trades.');
      if (user.tradingStatus === 'frozen') {
        throw new Error('Your trading access is frozen. Please contact support.');
      }
      const quantity = Number(lots);
      if (!quantity || quantity <= 0) throw new Error('Enter a valid lot size.');
      const orderSymbol = options.symbol || selectedSymbol;
      const orderMarket = prices.find((item) => item.symbol === orderSymbol) || currentSymbol;
      const orderPrice = Number(side === 'BUY' ? orderMarket.ask : orderMarket.bid) || orderMarket.price || 0;
      const requiredMargin = calculateRequiredMargin(orderSymbol, quantity, orderPrice, user.leverage);
      if (summary.freeFunds < requiredMargin) {
        setInsufficientFundsVisible(true);
        throw new Error('Insufficient free funds.');
      }
      const price = side === 'BUY' ? orderMarket.ask : orderMarket.bid;
      let position = {
        id: String(Date.now()),
        symbol: orderSymbol,
        side,
        lots: quantity,
        openPrice: price,
        openedAt: new Date().toISOString(),
      };
      const result = await tradeService.open({
        symbol: orderSymbol,
        side,
        lots: quantity,
        tradingAccountId: selectedAccountId,
        orderType: 'market',
        stopLoss: options.stopLoss || null,
        takeProfit: options.takeProfit || null,
      });
      position = result.trade;
      setPositions((existing) => [position, ...existing]);
    },
    [currentSymbol, prices, selectedAccountId, selectedSymbol, summary.freeFunds, user],
  );

  const createPendingOrder = useCallback(
    async (values) => {
      if (!user) throw new Error('Please log in to place trades.');
      if (user.tradingStatus === 'frozen') {
        throw new Error('Your trading access is frozen. Please contact support.');
      }
      const quantity = Number(values.lots);
      if (!quantity || quantity <= 0) throw new Error('Enter a valid lot size.');
      const result = await tradeService.open({
        symbol: selectedSymbol,
        side: values.side,
        lots: quantity,
        orderType: String(values.orderType || '').toLowerCase(),
        entryPrice: Number(values.entryPrice),
        stopLoss: values.stopLoss ? Number(values.stopLoss) : null,
        takeProfit: values.takeProfit ? Number(values.takeProfit) : null,
        tradingAccountId: selectedAccountId,
      });
      const order = result.trade;
      setPendingOrders((existing) => [order, ...existing]);
      return order;
    },
    [selectedAccountId, selectedSymbol, user],
  );

  const closePosition = useCallback(
    async (id) => {
      if (!user) throw new Error('Please log in to manage trades.');
      const position = livePositions.find((item) => String(item.id) === String(id));
      if (!position) return;
      const response = await tradeService.close(id, position.currentPrice);
      const closed = response?.trade || { ...position, status: 'closed', closedAt: new Date().toISOString(), closePrice: position.currentPrice };
      closed.profit = Number(closed.profit ?? position.profit);
      setPositions((existing) => existing.filter((item) => String(item.id) !== String(id)));
      setClosedPositions((existing) => [closed, ...existing]);
      const nextBalance = response?.tradingAccount?.balance ?? (wallet.balance + closed.profit);
      setWallet((existing) => ({ ...existing, balance: Number(nextBalance) }));
      if (response?.tradingAccount) {
        setSelectedTradingAccount((current) => (
          current && String(current.id) === String(response.tradingAccount.id)
            ? { ...current, ...response.tradingAccount }
            : current
        ));
      }
    },
    [livePositions, selectedAccountId, user, wallet.balance],
  );

  const cancelPendingOrder = useCallback(
    async (id) => {
      if (!user) throw new Error('Please log in to manage trades.');
      const order = pendingOrders.find((item) => String(item.id) === String(id));
      if (!order) throw new Error('Pending order not found.');
      await tradeService.cancel(id);
      setPendingOrders((existing) => existing.filter((item) => String(item.id) !== String(id)));
      return order;
    },
    [pendingOrders, user],
  );

  const updatePositionRisk = useCallback(
    async (id, values) => {
      if (!user) throw new Error('Please log in to manage trades.');
      const response = await tradeService.updateRisk(id, values);
      const updated = response?.trade;
      if (updated) {
        setPositions((existing) => existing.map((item) => (String(item.id) === String(id) ? { ...item, ...updated } : item)));
      }
      return updated;
    },
    [user],
  );

  const submitDeposit = useCallback((values) => {
    const transaction = { id: String(Date.now()), type: 'deposit', status: 'pending', createdAt: new Date().toISOString(), ...values };
    setTransactions((existing) => [transaction, ...existing]);
    return transaction;
  }, []);

  const submitWithdrawal = useCallback(
    (values) => {
      if (Number(values.amount) > summary.freeFunds) throw new Error('Withdrawal exceeds available free funds.');
      const transaction = { id: String(Date.now()), type: 'withdrawal', status: 'pending', createdAt: new Date().toISOString(), ...values };
      setTransactions((existing) => [transaction, ...existing]);
      return transaction;
    },
    [summary.freeFunds],
  );

  const value = useMemo(
    () => ({
      prices,
      connected,
      selectedSymbol,
      setSelectedSymbol,
      currentSymbol,
      positions: livePositions,
      closedPositions,
      pendingOrders,
      summary,
      selectedTradingAccount,
      setSelectedTradingAccount,
      transactions,
      openPosition,
      closePosition,
      cancelPendingOrder,
      updatePositionRisk,
      createPendingOrder,
      submitDeposit,
      submitWithdrawal,
      syncAccount,
      ready,
      sidePanel,
      setSidePanel,
      insufficientFundsVisible,
      setInsufficientFundsVisible,
    }),
    [prices, connected, selectedSymbol, currentSymbol, livePositions, closedPositions, pendingOrders, summary, selectedTradingAccount, transactions, openPosition, closePosition, cancelPendingOrder, updatePositionRisk, createPendingOrder, submitDeposit, submitWithdrawal, syncAccount, ready, sidePanel, insufficientFundsVisible],
  );

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
}
