import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { SYMBOLS } from '../constants/symbols';
import { socketBaseUrl } from '../services/apiConfig';
import { createDemoTick, marketService } from '../services/marketService';
import { storage } from '../utils/storage';

const hasTradingViewPrices = (symbols) => symbols?.some((item) => item.source === 'tradingview');

const hasValue = (value, allowZero = false) => {
  const number = Number(value);
  return Number.isFinite(number) && (allowZero || number !== 0);
};

const withPreviousValue = (item, previousItem, key, allowZero = false) => (
  hasValue(item?.[key], allowZero) || !hasValue(previousItem?.[key], allowZero)
    ? item?.[key]
    : previousItem[key]
);

const keepPreviousPrices = (previous, next) => {
  const previousBySymbol = new Map(previous.map((item) => [item.symbol, item]));
  const nextBySymbol = new Map(next.map((item) => [item.symbol, item]));
  const nextSymbols = new Set();

  if (previous.length && next.length < previous.length) {
    const merged = previous.map((previousItem) => {
      const item = nextBySymbol.get(previousItem.symbol);
      if (!item) return previousItem;
      nextSymbols.add(item.symbol);

      return {
        ...previousItem,
        ...item,
        price: withPreviousValue(item, previousItem, 'price'),
        bid: withPreviousValue(item, previousItem, 'bid'),
        ask: withPreviousValue(item, previousItem, 'ask'),
        spread: withPreviousValue(item, previousItem, 'spread', true),
        spreadPoints: withPreviousValue(item, previousItem, 'spreadPoints', true),
        change: withPreviousValue(item, previousItem, 'change', true),
        decimals: item.decimals ?? previousItem.decimals,
        previousPrice: hasValue(previousItem.price) ? previousItem.price : previousItem.previousPrice,
        previousBid: hasValue(previousItem.bid) ? previousItem.bid : previousItem.previousBid,
        previousAsk: hasValue(previousItem.ask) ? previousItem.ask : previousItem.previousAsk,
      };
    });

    next.forEach((item) => {
      if (!nextSymbols.has(item.symbol) && !previousBySymbol.has(item.symbol)) merged.push(item);
    });

    return merged;
  }

  const merged = next.map((item) => {
    const previousItem = previousBySymbol.get(item.symbol);
    nextSymbols.add(item.symbol);
    if (!previousItem) return item;

    return {
      ...previousItem,
      ...item,
      price: withPreviousValue(item, previousItem, 'price'),
      bid: withPreviousValue(item, previousItem, 'bid'),
      ask: withPreviousValue(item, previousItem, 'ask'),
      spread: withPreviousValue(item, previousItem, 'spread', true),
      spreadPoints: withPreviousValue(item, previousItem, 'spreadPoints', true),
      change: withPreviousValue(item, previousItem, 'change', true),
      decimals: item.decimals ?? previousItem.decimals,
      previousPrice: hasValue(previousItem.price) ? previousItem.price : previousItem.previousPrice,
      previousBid: hasValue(previousItem.bid) ? previousItem.bid : previousItem.previousBid,
      previousAsk: hasValue(previousItem.ask) ? previousItem.ask : previousItem.previousAsk,
    };
  });

  previous.forEach((item) => {
    if (!nextSymbols.has(item.symbol)) merged.push(item);
  });

  return merged;
};

export function useMarketPrices() {
  const [prices, setPrices] = useState(() => createDemoTick(SYMBOLS));
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;
    let receivingSocketPrices = false;
    let allowedSymbols = null;
    const socket = io(socketBaseUrl(), { transports: ['websocket'], timeout: 4000, reconnection: true });

    const loadAllowedSymbols = async () => {
      try {
        const list = await marketService.getSymbols();
        if (active && list?.length) {
          const allowedSet = new Set(list.map((s) => s.symbol));
          allowedSymbols = allowedSet;
          setPrices((current) => current.filter((p) => allowedSet.has(p.symbol)));
        }
      } catch (err) {
        console.error('Failed to load allowed symbols:', err);
      }
    };

    loadAllowedSymbols();

    socket.on('market:prices', (next) => {
      if (active && next?.length) {
        receivingSocketPrices = true;
        setPrices((current) => {
          const filteredNext = allowedSymbols ? next.filter(item => allowedSymbols.has(item.symbol)) : next;
          const merged = keepPreviousPrices(current, filteredNext);
          const finalPrices = allowedSymbols ? merged.filter(item => allowedSymbols.has(item.symbol)) : merged;
          setConnected(hasTradingViewPrices(finalPrices));
          return finalPrices;
        });
      }
    });

    socket.on('market:prices:delta', (next) => {
      if (active && next?.length) {
        receivingSocketPrices = true;
        setPrices((current) => {
          const filteredNext = allowedSymbols ? next.filter(item => allowedSymbols.has(item.symbol)) : next;
          const merged = keepPreviousPrices(current, filteredNext);
          const finalPrices = allowedSymbols ? merged.filter(item => allowedSymbols.has(item.symbol)) : merged;
          setConnected(hasTradingViewPrices(finalPrices));
          return finalPrices;
        });
      }
    });

    socket.on('disconnect', () => {
      receivingSocketPrices = false;
      if (active) setConnected(false);
    });

    const load = async () => {
      try {
        const next = await marketService.getPrices();
        if (active) {
          const filteredNext = allowedSymbols ? next.filter(item => allowedSymbols.has(item.symbol)) : next;
          setPrices((current) => {
            const merged = keepPreviousPrices(current, filteredNext);
            const finalPrices = allowedSymbols ? merged.filter(item => allowedSymbols.has(item.symbol)) : merged;
            setConnected(hasTradingViewPrices(finalPrices));
            return finalPrices;
          });
        }
      } catch {
        if (active) {
          setPrices((current) => {
            const initialTicks = createDemoTick(current);
            const finalPrices = allowedSymbols ? initialTicks.filter(item => allowedSymbols.has(item.symbol)) : initialTicks;
            setConnected(false);
            return finalPrices;
          });
        }
      }
    };

    load();
    const timer = setInterval(() => {
      if (!receivingSocketPrices) load();
    }, 2000);

    return () => {
      active = false;
      clearInterval(timer);
      socket.disconnect();
    };
  }, []);

  return { prices, connected };
}
