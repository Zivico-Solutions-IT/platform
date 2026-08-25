import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowDown, ArrowUp, Minus, Plus, Settings2, Shield, TrendingDown, TrendingUp, X } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { useAuth } from '../../hooks/useAuth';
import { money, quote } from '../../utils/formatters';
import { calculateRequiredMargin } from '../../utils/calculations';
import SymbolFlagIcon from '../market/SymbolFlagIcon';

const ORDER_TYPES = [
  { value: 'spot', label: 'Market' },
  { value: 'limit', label: 'Limit' },
  { value: 'stop', label: 'Stop' },
];

const QUICK_LOTS = ['0.01', '0.05', '0.10', '0.50', '1.00', '5.00'];

export default function OrderPanel({ showAvailableMargin = true }) {
  const { width, height } = useWindowDimensions();
  const { currentSymbol, openPosition, createPendingOrder, summary } = useDemoTrading();
  const { user } = useAuth();
  const { darkMode, colors } = useAppTheme();
  const { notify } = useToast();

  const [orderType, setOrderType] = useState('spot');
  const [lots, setLots] = useState('0.01');
  const [entryPrice, setEntryPrice] = useState('');
  const [entryPriceTouched, setEntryPriceTouched] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderModal, setOrderModal] = useState(false);
  const [orderSide, setOrderSide] = useState('BUY');
  const [lastNotifyTime, setLastNotifyTime] = useState(0);
  const [tpSlOn, setTpSlOn] = useState(false);
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  const mobile = width < 760;
  const panelBackground = colors.panel;
  const controlBackground = darkMode ? '#0a1410' : colors.surface;
  const orderSuccess = colors.success || '#10B981';
  const orderDanger = colors.danger || '#EF4444';

  const lotSize = Number(lots) || 0;
  const orderPrice = Number(orderSide === 'BUY' ? currentSymbol.ask : currentSymbol.bid) || currentSymbol.price || 0;
  const requiredMargin = calculateRequiredMargin(currentSymbol.symbol, lotSize, orderType === 'spot' ? orderPrice : entryPrice, user?.leverage);
  const freeAfterTrade = Math.max(0, Number(summary.freeFunds || 0) - requiredMargin);
  const fixedSpread = Number(currentSymbol.spreadPoints ?? currentSymbol.spread ?? 0);
  const spreadText = Number.isFinite(fixedSpread) ? fixedSpread.toFixed(1) : '0.0';

  const handleTakeProfitFocus = () => {
    if (!takeProfit && currentSymbol) {
      if (orderType === 'limit' || orderType === 'stop') {
        if (entryPrice) setTakeProfit(String(entryPrice));
      } else {
        setTakeProfit(String(orderSide === 'BUY' ? currentSymbol.ask : currentSymbol.bid));
      }
    }
  };

  const handleStopLossFocus = () => {
    if (!stopLoss && currentSymbol) {
      if (orderType === 'limit' || orderType === 'stop') {
        if (entryPrice) setStopLoss(String(entryPrice));
      } else {
        setStopLoss(String(orderSide === 'BUY' ? currentSymbol.ask : currentSymbol.bid));
      }
    }
  };

  const showMessage = (text, type = 'error', title = type === 'success' ? 'Order update' : 'Order rejected') => {
    setMessage(text);
    notify({ type, title, message: text });
  };

  const validateRiskLevels = () => {
    const livePrice = Number(orderSide === 'BUY' ? currentSymbol.ask : currentSymbol.bid);
    const stop = Number(stopLoss);
    const profit = Number(takeProfit);
    if (!Number.isFinite(livePrice) || livePrice <= 0) return 'Live price is not available.';
    if (tpSlOn && stopLoss && (!Number.isFinite(stop) || stop <= 0)) return 'Enter a valid Stop Loss price.';
    if (tpSlOn && takeProfit && (!Number.isFinite(profit) || profit <= 0)) return 'Enter a valid Take Profit price.';
    if (orderSide === 'BUY') {
      if (tpSlOn && takeProfit && profit <= livePrice) return 'BUY Take Profit must be above the live price.';
      if (tpSlOn && stopLoss && stop >= livePrice) return 'BUY Stop Loss must be below the live price.';
    } else {
      if (tpSlOn && takeProfit && profit >= livePrice) return 'SELL Take Profit must be below the live price.';
      if (tpSlOn && stopLoss && stop <= livePrice) return 'SELL Stop Loss must be above the live price.';
    }
    return '';
  };

  const getPendingOrderError = () => {
    if (orderType === 'spot') return '';
    const price = Number(entryPrice);
    if (!entryPrice || !Number.isFinite(price) || price <= 0) return '';

    const ask = Number(currentSymbol.ask) || Number(currentSymbol.price) || 0;
    const bid = Number(currentSymbol.bid) || Number(currentSymbol.price) || 0;

    if (orderType === 'limit') {
      if (orderSide === 'BUY') {
        if (price >= ask) return 'Buy Limit price must be below the current Ask price.';
      } else if (orderSide === 'SELL') {
        if (price <= bid) return 'Sell Limit price must be above the current Bid price.';
      }
    } else if (orderType === 'stop') {
      if (orderSide === 'BUY') {
        if (price <= ask) return 'Buy Stop price must be above the current Ask price.';
      } else if (orderSide === 'SELL') {
        if (price >= bid) return 'Sell Stop price must be below the current Bid price.';
      }
    }
    return '';
  };

  const pendingOrderError = getPendingOrderError();
  const showPendingOrderError = entryPriceTouched && pendingOrderError;

  useEffect(() => {
    const marketEntry = orderSide === 'BUY' ? currentSymbol.ask : currentSymbol.bid;
    setEntryPrice(quote(marketEntry || currentSymbol.price || 0, currentSymbol.decimals));
    setEntryPriceTouched(false);
  }, [currentSymbol.decimals, currentSymbol.symbol, orderSide, orderType]);

  const selectOrderType = (type) => {
    setEntryPriceTouched(false);
    setOrderType(type);
  };

  const adjustLots = (delta) => {
    const current = Number(lots) || 0.01;
    const next = Math.max(0.01, Math.min(100, current + delta));
    setLots(next.toFixed(2));
  };

  const openTrade = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.tradingStatus === 'frozen') {
      const now = Date.now();
      if (now - lastNotifyTime > 3000) {
        notify({ type: 'error', title: 'Trading Frozen', message: 'Your trading access is frozen. Please contact support.' });
        setLastNotifyTime(now);
      }
      return;
    }
    if (orderType !== 'spot' && !(Number(entryPrice) > 0)) {
      setEntryPriceTouched(true);
      showMessage('Enter a valid Entry Price.');
      return;
    }
    if (pendingOrderError) {
      setEntryPriceTouched(true);
      showMessage(pendingOrderError);
      return;
    }
    const riskError = validateRiskLevels();
    if (riskError) {
      showMessage(riskError);
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      if (orderType === 'spot') {
        await openPosition(orderSide, lots, {
          stopLoss: tpSlOn && stopLoss ? stopLoss : null,
          takeProfit: tpSlOn && takeProfit ? takeProfit : null,
        });
        showMessage(`${orderSide} order executed successfully.`, 'success', 'Order placed');
        setOrderModal(false);
      } else {
        await createPendingOrder({
          side: orderSide,
          lots,
          orderType,
          entryPrice,
          stopLoss: tpSlOn && stopLoss ? stopLoss : null,
          takeProfit: tpSlOn && takeProfit ? takeProfit : null,
        });
        showMessage(`${orderType === 'limit' ? 'Limit' : 'Stop'} order placed successfully.`, 'success', 'Order placed');
        setOrderModal(false);
      }
    } catch (error) {
      showMessage(error.response?.data?.message || error.message || 'Order failed.');
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = loading
    ? 'Placing Order...'
    : orderType === 'spot'
      ? `Place ${orderSide === 'BUY' ? 'Buy' : 'Sell'} Market Order`
      : `Place ${orderSide === 'BUY' ? 'Buy' : 'Sell'} ${orderType === 'limit' ? 'Limit' : 'Stop'} Order`;

  const actionBg = orderSide === 'BUY' ? orderSuccess : orderDanger;

  // Render Inner Form
  const renderOrderForm = () => (
    <View className="gap-3">
      {/* Symbol Title & Spread */}
      <View className="flex-row items-center justify-between pb-2 border-b" style={{ borderColor: colors.border }}>
        <View className="flex-row items-center gap-2">
          <SymbolFlagIcon symbol={currentSymbol.symbol} size={24} />
          <View>
            <Text className="text-sm font-bold" style={{ color: colors.text }}>
              {currentSymbol.symbol}
            </Text>
            <Text className="text-[10px] font-medium" style={{ color: colors.muted }}>
              {currentSymbol.group || 'Forex'}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-[10px] font-bold uppercase" style={{ color: colors.muted }}>
            Spread
          </Text>
          <Text className="text-xs font-bold" style={{ color: colors.text }}>
            {spreadText} pips
          </Text>
        </View>
      </View>

      {/* Order Type Tabs: Market | Limit | Stop */}
      <View
        className="flex-row items-center p-1 rounded-xl border"
        style={{
          backgroundColor: darkMode ? '#08100d' : colors.surface,
          borderColor: colors.border,
        }}
      >
        {ORDER_TYPES.map((type) => {
          const active = orderType === type.value;
          return (
            <Pressable
              key={type.value}
              onPress={() => selectOrderType(type.value)}
              className="flex-1 py-1.5 items-center justify-center rounded-lg transition-all"
              style={{
                backgroundColor: active ? colors.primary : 'transparent',
              }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: active ? '#FFFFFF' : colors.muted }}
              >
                {type.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Dual Sell / Buy Price Cards */}
      <View className="flex-row gap-2.5">
        {/* SELL CARD (Light Red) */}
        <Pressable
          onPress={() => setOrderSide('SELL')}
          className="flex-1 p-2.5 rounded-xl border transition-all"
          style={{
            backgroundColor: orderSide === 'SELL' ? (darkMode ? 'rgba(239, 68, 68, 0.22)' : '#FEE2E2') : (darkMode ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2'),
            borderColor: orderSide === 'SELL' ? orderDanger : (darkMode ? 'rgba(239, 68, 68, 0.25)' : '#FECACA'),
            borderWidth: orderSide === 'SELL' ? 2 : 1,
            cursor: 'pointer',
          }}
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: orderDanger }}>
              Sell / Bid
            </Text>
            <ArrowDown size={12} color={orderDanger} />
          </View>
          <Text className="text-base font-bold" numberOfLines={1} style={{ color: orderDanger }}>
            {quote(currentSymbol.bid, currentSymbol.decimals)}
          </Text>
          {orderSide === 'SELL' ? (
            <View className="flex-row items-center gap-1 mt-1">
              <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: orderDanger }} />
              <Text className="text-[9px] font-bold" style={{ color: orderDanger }}>
                Active Side
              </Text>
            </View>
          ) : null}
        </Pressable>

        {/* BUY CARD (Light Green) */}
        <Pressable
          onPress={() => setOrderSide('BUY')}
          className="flex-1 p-2.5 rounded-xl border transition-all"
          style={{
            backgroundColor: orderSide === 'BUY' ? (darkMode ? 'rgba(16, 185, 129, 0.22)' : '#DCFCE7') : (darkMode ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4'),
            borderColor: orderSide === 'BUY' ? orderSuccess : (darkMode ? 'rgba(16, 185, 129, 0.25)' : '#BBF7D0'),
            borderWidth: orderSide === 'BUY' ? 2 : 1,
            cursor: 'pointer',
          }}
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: orderSuccess }}>
              Buy / Ask
            </Text>
            <ArrowUp size={12} color={orderSuccess} />
          </View>
          <Text className="text-base font-bold" numberOfLines={1} style={{ color: orderSuccess }}>
            {quote(currentSymbol.ask, currentSymbol.decimals)}
          </Text>
          {orderSide === 'BUY' ? (
            <View className="flex-row items-center gap-1 mt-1">
              <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: orderSuccess }} />
              <Text className="text-[9px] font-bold" style={{ color: orderSuccess }}>
                Active Side
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Entry Price Input (if Limit / Stop) */}
      {orderType !== 'spot' ? (
        <View>
          <Text className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: colors.muted }}>
            Target Entry Price
          </Text>
          <View
            className="flex-row items-center h-10 px-3 border rounded-xl"
            style={{
              backgroundColor: controlBackground,
              borderColor: showPendingOrderError ? orderDanger : colors.border,
            }}
          >
            <TextInput
              value={entryPrice}
              onChangeText={(val) => {
                setEntryPrice(val);
                setEntryPriceTouched(true);
              }}
              keyboardType="decimal-pad"
              className="flex-1 text-sm font-bold"
              style={{ color: colors.text }}
              placeholder="0.0000"
              placeholderTextColor={colors.muted}
            />
          </View>
          {showPendingOrderError ? (
            <Text className="text-[10px] font-semibold mt-1" style={{ color: orderDanger }}>
              {showPendingOrderError}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Volume / Lot Size with Stepper */}
      <View>
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
            Volume (Lots)
          </Text>
          <Text className="text-[10px] font-medium" style={{ color: colors.muted }}>
            Max: 100.00
          </Text>
        </View>

        {/* Stepper Input */}
        <View
          className="flex-row items-center h-10 rounded-xl border overflow-hidden"
          style={{
            backgroundColor: controlBackground,
            borderColor: colors.border,
          }}
        >
          <Pressable
            onPress={() => adjustLots(-0.01)}
            className="w-10 h-full items-center justify-center border-r"
            style={{ borderColor: colors.border }}
          >
            <Minus size={14} color={colors.text} />
          </Pressable>

          <TextInput
            value={lots}
            onChangeText={setLots}
            keyboardType="decimal-pad"
            className="flex-1 text-center text-sm font-bold"
            style={{ color: colors.text }}
          />

          <Pressable
            onPress={() => adjustLots(0.01)}
            className="w-10 h-full items-center justify-center border-l"
            style={{ borderColor: colors.border }}
          >
            <Plus size={14} color={colors.text} />
          </Pressable>
        </View>

        {/* Quick Lot Chips */}
        <View className="flex-row gap-1.5 mt-2">
          {QUICK_LOTS.map((chip) => {
            const isSelected = lots === chip;
            return (
              <Pressable
                key={chip}
                onPress={() => setLots(chip)}
                className="flex-1 py-1 items-center justify-center rounded-lg border"
                style={{
                  backgroundColor: isSelected ? `${colors.primary}20` : controlBackground,
                  borderColor: isSelected ? colors.primary : colors.border,
                }}
              >
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: isSelected ? colors.primary : colors.muted }}
                >
                  {chip}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Advanced Options (TP / SL) */}
      <View
        className="p-3 rounded-xl border"
        style={{
          backgroundColor: controlBackground,
          borderColor: colors.border,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Shield size={13} color={colors.primary} />
            <Text className="text-xs font-bold" style={{ color: colors.text }}>
              Take Profit & Stop Loss
            </Text>
          </View>
        </View>

        <View className="mt-3 gap-2.5 pt-2 border-t" style={{ borderColor: colors.border }}>
            {/* TP/SL Toggle switch */}
            <Pressable
              onPress={() => setTpSlOn((v) => !v)}
              className="flex-row items-center justify-between py-1"
            >
              <Text className="text-xs font-medium" style={{ color: colors.text }}>
                Enable Protection (TP/SL)
              </Text>
              <View
                className="h-5 w-9 justify-center rounded-full px-0.5"
                style={{ backgroundColor: tpSlOn ? orderSuccess : colors.border }}
              >
                <View
                  className="h-4 w-4 rounded-full bg-white"
                  style={{ alignSelf: tpSlOn ? 'flex-end' : 'flex-start' }}
                />
              </View>
            </Pressable>

            {tpSlOn ? (
              <View className="flex-row gap-2 mt-1">
                {/* Take Profit Input */}
                <View className="flex-1">
                  <Text className="text-[10px] font-bold uppercase mb-1" style={{ color: orderSuccess }}>
                    Take Profit
                  </Text>
                  <TextInput
                    value={takeProfit}
                    onChangeText={setTakeProfit}
                    onFocus={handleTakeProfitFocus}
                    placeholder="TP Price"
                    placeholderTextColor={colors.muted}
                    keyboardType="numbers-and-punctuation"
                    className="h-9 px-2.5 text-xs font-bold rounded-lg border"
                    style={{
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: panelBackground,
                    }}
                  />
                </View>

                {/* Stop Loss Input */}
                <View className="flex-1">
                  <Text className="text-[10px] font-bold uppercase mb-1" style={{ color: orderDanger }}>
                    Stop Loss
                  </Text>
                  <TextInput
                    value={stopLoss}
                    onChangeText={setStopLoss}
                    onFocus={handleStopLossFocus}
                    placeholder="SL Price"
                    placeholderTextColor={colors.muted}
                    keyboardType="numbers-and-punctuation"
                    className="h-9 px-2.5 text-xs font-bold rounded-lg border"
                    style={{
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: panelBackground,
                    }}
                  />
                </View>
              </View>
            ) : null}
        </View>
      </View>

      {/* Trade Snapshot Summary */}
      <View
        className="p-3 rounded-xl border"
        style={{
          backgroundColor: controlBackground,
          borderColor: colors.border,
        }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
            Order Summary
          </Text>
          <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: orderSuccess }} />
        </View>

        <View className="gap-1.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-[11px]" style={{ color: colors.muted }}>
              Required Margin
            </Text>
            <Text className="text-[11px] font-bold" style={{ color: colors.text }}>
              {quote(requiredMargin, 2)} USD
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-[11px]" style={{ color: colors.muted }}>
              Free Margin Available
            </Text>
            <Text className="text-[11px] font-bold" style={{ color: colors.text }}>
              {money(summary.freeFunds || 0)} USD
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-[11px]" style={{ color: colors.muted }}>
              Margin After Trade
            </Text>
            <Text
              className="text-[11px] font-bold"
              style={{ color: freeAfterTrade > 0 ? colors.text : orderDanger }}
            >
              {money(freeAfterTrade)} USD
            </Text>
          </View>
        </View>
      </View>

      {/* Error Message */}
      {message ? (
        <Text className="text-xs text-center font-medium" style={{ color: orderDanger }}>
          {message}
        </Text>
      ) : null}

      {/* Primary Action Button */}
      <Pressable
        disabled={loading || Boolean(pendingOrderError)}
        onPress={openTrade}
        className="h-11 rounded-xl items-center justify-center shadow-lg transition-all"
        style={{
          backgroundColor: actionBg,
          opacity: loading || pendingOrderError ? 0.6 : 1,
          shadowColor: actionBg,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
          cursor: 'pointer',
        }}
      >
        <View className="flex-row items-center gap-2">
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              {orderSide === 'BUY' ? (
                <ArrowUp size={16} color="#FFFFFF" strokeWidth={2.5} />
              ) : (
                <ArrowDown size={16} color="#FFFFFF" strokeWidth={2.5} />
              )}
              <Text className="text-xs font-bold uppercase tracking-wider text-white">
                {buttonLabel}
              </Text>
            </>
          )}
        </View>
      </Pressable>
    </View>
  );

  // Mobile Bottom Modal
  if (mobile) {
    if (orderModal) {
      return (
        <Modal visible={orderModal} transparent animationType="slide" onRequestClose={() => setOrderModal(false)}>
          <Pressable
            onPress={() => setOrderModal(false)}
            className="flex-1 justify-end"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="w-full max-w-[500px] self-center rounded-t-3xl p-4 border-t shadow-2xl"
              style={{
                backgroundColor: panelBackground,
                borderColor: colors.border,
                maxHeight: Math.min(height * 0.85, 600),
              }}
            >
              <View className="flex-row items-center justify-between pb-3 border-b mb-3" style={{ borderColor: colors.border }}>
                <Text className="text-base font-bold" style={{ color: colors.text }}>
                  Create Order
                </Text>
                <Pressable
                  onPress={() => setOrderModal(false)}
                  className="w-7 h-7 rounded-full items-center justify-center"
                  style={{ backgroundColor: controlBackground }}
                >
                  <X size={15} color={colors.text} />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                {renderOrderForm()}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      );
    }

    return (
      <View
        className="flex-row items-center gap-2 p-2 border-t"
        style={{
          backgroundColor: colors.panel,
          borderColor: colors.border,
          position: 'fixed',
          bottom: 48,
          left: 0,
          right: 0,
          zIndex: 3500,
          elevation: 3500,
        }}
      >
        {/* Mobile Sell Button */}
        <Pressable
          onPress={() => {
            setOrderSide('SELL');
            setOrderModal(true);
          }}
          className="flex-1 h-10 rounded-lg flex-row items-center justify-center gap-1.5"
          style={{ backgroundColor: orderDanger }}
        >
          <ArrowDown size={14} color="#FFFFFF" strokeWidth={2.5} />
          <Text className="text-xs font-bold uppercase text-white">
            Sell {quote(currentSymbol.bid, currentSymbol.decimals)}
          </Text>
        </Pressable>

        {/* Mobile Buy Button */}
        <Pressable
          onPress={() => {
            setOrderSide('BUY');
            setOrderModal(true);
          }}
          className="flex-1 h-10 rounded-lg flex-row items-center justify-center gap-1.5"
          style={{ backgroundColor: orderSuccess }}
        >
          <ArrowUp size={14} color="#FFFFFF" strokeWidth={2.5} />
          <Text className="text-xs font-bold uppercase text-white">
            Buy {quote(currentSymbol.ask, currentSymbol.decimals)}
          </Text>
        </Pressable>
      </View>
    );
  }

  // Desktop / Tablet Order Panel
  return (
    <View
      className="flex-col h-full rounded-xl border p-3.5"
      style={{
        backgroundColor: panelBackground,
        borderColor: colors.border,
        height: '100%',
        minWidth: 280,
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 12 }}
      >
        {renderOrderForm()}
      </ScrollView>
    </View>
  );
}
