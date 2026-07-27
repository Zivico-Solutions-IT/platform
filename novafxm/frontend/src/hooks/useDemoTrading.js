import { useContext } from 'react';
import { TradingContext } from '../context/TradingContext';

export const useDemoTrading = () => useContext(TradingContext);
