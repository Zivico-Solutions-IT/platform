import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { useAuth } from '../../hooks/useAuth';
import { money, quote } from '../../utils/formatters';
import { calculateRequiredMargin } from '../../utils/calculations';

const ORDER_TYPES = [
  { value: 'spot', label: 'Spot Order' },
  { value: 'limit', label: 'Limit Order' },
  { value: 'stop', label: 'Stop Order' },
];

function SwitchRow({ active, label, onPress, colors }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-between rounded-lg border px-3 py-2" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <Text className="text-xs font-medium" style={{ color: colors.text }}>{label}</Text>
      <View
        className="h-6 w-11 justify-center rounded-full px-1"
        style={{ backgroundColor: active ? colors.success : colors.border }}
      >
        <View
          className="h-4 w-4 rounded-full bg-white"
          style={{ alignSelf: active ? 'flex-end' : 'flex-start' }}
        />
      </View>
    </Pressable>
  );
}

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
  const panelBackground = darkMode ? '#171b21' : '#ffffff';
  const controlBackground = darkMode ? '#20262d' : colors.surface;
  const orderSuccess = '#0C9F91';
  const orderDanger = '#f24d58';
  const mobileActionWidth = Math.max(280, Math.min(width - 24, 460));
  const lotSize = Number(lots) || 0;
  const orderPrice = Number(orderSide === 'BUY' ? currentSymbol.ask : currentSymbol.bid) || currentSymbol.price || 0;
  const requiredMargin = calculateRequiredMargin(currentSymbol.symbol, lotSize, orderType === 'spot' ? orderPrice : entryPrice, user?.leverage);
  const freeAfterTrade = Math.max(0, Number(summary.freeFunds || 0) - requiredMargin);
  const fixedSpread = Number(currentSymbol.spreadPoints ?? currentSymbol.spread ?? 0);
  const spreadText = Number.isFinite(fixedSpread) ? fixedSpread.toFixed(1) : '0.0';
  const activeTabBackground = colors.primarySoft || `${colors.primary}22`;
  const mobileTicketTopOffset = width < 380 ? 18 : 24;
  const mobileTicketHeight = Math.max(500, height - mobileTicketTopOffset - 6);
  const mobilePalette = darkMode
    ? {
      background: '#171b21',
      panel: '#171b21',
      control: '#20262d',
      border: colors.border,
      text: colors.text,
      muted: colors.muted,
      activeTab: colors.primarySoft || `${colors.primary}22`,
      activeTabText: colors.primary,
      switchOff: colors.border,
      snapshot: '#20262d',
    }
    : {
      background: '#fffdf7',
      panel: '#fffdf7',
      control: '#f3eddd',
      border: '#dec889',
      text: '#232323',
      muted: '#66645e',
      activeTab: '#f8dc7d',
      activeTabText: '#b88a12',
      switchOff: '#d7c890',
      snapshot: '#f6f0df',
    };
  const snapshotRows = [
    ['Spread', spreadText],
    ['Volume', `${money(lotSize)} lots`],
    ['Required margin', `${quote(requiredMargin, 2)} USD`],
    ['Free margin', `${quote(summary.freeFunds, 2)} USD`],
    ['After trade', `${quote(freeAfterTrade, 2)} USD`],
  ];

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
        if (price >= ask) {
          return 'Buy Limit price must be below the current Ask price.';
        }
      } else if (orderSide === 'SELL') {
        if (price <= bid) {
          return 'Sell Limit price must be above the current Bid price.';
        }
      }
    } else if (orderType === 'stop') {
      if (orderSide === 'BUY') {
        if (price <= ask) {
          return 'Buy Stop price must be above the current Ask price.';
        }
      } else if (orderSide === 'SELL') {
        if (price >= bid) {
          return 'Sell Stop price must be below the current Bid price.';
        }
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

  const open = async () => {
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
        showMessage(`${orderSide} order opened successfully.`, 'success', 'Order placed');
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

  const openOrderModal = (side) => {
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
    setOrderSide(side);
    setOrderModal(true);
  };

  if (mobile) {
    if (orderModal) {
      return (
        <Modal visible={orderModal} transparent animationType="fade" onRequestClose={() => setOrderModal(false)}>
          <Pressable
            onPress={() => setOrderModal(false)}
            className="flex-1 items-center px-4 pb-5 justify-center"
            style={{ backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.5)' }}
          >
            <Pressable
              onPress={(event) => event.stopPropagation()}
              className="w-full max-w-[390px] overflow-hidden rounded-2xl border px-4 py-4 shadow-2xl"
              style={{ 
                backgroundColor: panelBackground, 
                borderColor: colors.border, 
                maxHeight: mobileTicketHeight,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 16 },
                shadowOpacity: darkMode ? 0.5 : 0.15,
                shadowRadius: 32,
                elevation: 24,
              }}
            >
            <View>
              <View className="flex-row items-start justify-between mb-2">
                <View>
                  <Text className="text-base font-bold" style={{ color: colors.text }}>New Trade</Text>
                  <Text className="text-xs font-bold uppercase tracking-wider mt-0.5" style={{ color: colors.muted }}>{currentSymbol.symbol}</Text>
                </View>
                <Pressable onPress={() => setOrderModal(false)} className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: controlBackground }}>
                  <Text className="text-lg font-light leading-5" style={{ color: colors.text }}>×</Text>
                </Pressable>
              </View>

              <View className="mt-3 flex-row items-center justify-between gap-1.5">
                {ORDER_TYPES.map((type) => (
                  <Pressable
                    key={type.value}
                    onPress={() => selectOrderType(type.value)}
                    className="rounded-full px-2.5 py-1.5"
                    style={{ backgroundColor: orderType === type.value ? activeTabBackground : 'transparent' }}
                  >
                    <Text
                      className="text-[10px] font-medium"
                      style={{ color: orderType === type.value ? colors.primary : colors.text }}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View className="mt-2.5 flex-row justify-between rounded-xl px-3 py-2" style={{ backgroundColor: controlBackground }}>
                <View>
                  <Text className="text-[10px] font-bold tracking-wider uppercase" style={{ color: colors.muted }}>Bid</Text>
                  <Text className="mt-0.5 text-sm font-bold" style={{ color: colors.danger }}>{quote(currentSymbol.bid, currentSymbol.decimals)}</Text>
                </View>
                <View>
                  <Text className="text-right text-[10px] font-bold tracking-wider uppercase" style={{ color: colors.muted }}>Ask</Text>
                  <Text className="mt-0.5 text-sm font-bold" style={{ color: colors.success }}>{quote(currentSymbol.ask, currentSymbol.decimals)}</Text>
                </View>
              </View>

              <View className={`mt-2.5 ${orderType === 'spot' ? '' : 'flex-row gap-2'}`}>
                {orderType !== 'spot' ? (
                  <View className="flex-1">
                    <Text className="mb-1.5 text-[10px] font-bold tracking-wider uppercase" style={{ color: colors.muted }}>Entry Price</Text>
                    <TextInput
                      value={entryPrice}
                      onChangeText={(value) => { setEntryPrice(value); setEntryPriceTouched(true); }}
                      keyboardType="decimal-pad"
                      className="h-9 rounded-lg border px-3 text-xs font-bold"
                      style={{ 
                        backgroundColor: controlBackground, 
                        borderColor: showPendingOrderError ? colors.danger : colors.border,
                        color: colors.text 
                      }}
                    />
                    {showPendingOrderError ? (
                      <Text className="mt-1 text-[10px] font-medium" style={{ color: colors.danger }}>
                        {showPendingOrderError}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                <View className={orderType === 'spot' ? '' : 'flex-1'}>
                  <Text className="mb-1.5 text-[10px] font-bold tracking-wider uppercase" style={{ color: colors.muted }}>Volume (lots)</Text>
                  <TextInput
                    value={lots}
                    onChangeText={setLots}
                    keyboardType="decimal-pad"
                    className="h-9 rounded-lg border px-3 text-xs font-bold"
                    style={{ backgroundColor: controlBackground, borderColor: colors.border, color: colors.text }}
                  />
                </View>
              </View>

              <View className="mt-3 flex-row gap-2">
                <Pressable
                  disabled={loading}
                  onPress={() => setOrderSide('SELL')}
                  className={`h-9 flex-1 items-center justify-center rounded-lg border ${loading ? 'opacity-60' : ''}`}
                  style={{
                    backgroundColor: orderSide === 'SELL' ? orderDanger : 'transparent',
                    borderColor: orderDanger,
                  }}
                >
                  <Text className="text-[11px] font-bold tracking-wider uppercase" style={{ color: orderSide === 'SELL' ? '#FFFFFF' : orderDanger }}>SELL</Text>
                </Pressable>
                <Pressable
                  disabled={loading}
                  onPress={() => setOrderSide('BUY')}
                  className={`h-9 flex-1 items-center justify-center rounded-lg border ${loading ? 'opacity-60' : ''}`}
                  style={{
                    backgroundColor: orderSide === 'BUY' ? orderSuccess : 'transparent',
                    borderColor: orderSuccess,
                  }}
                >
                  <Text className="text-[11px] font-bold tracking-wider uppercase" style={{ color: orderSide === 'BUY' ? '#FFFFFF' : orderSuccess }}>BUY</Text>
                </Pressable>
              </View>

              <View className="mt-3">
                <Pressable onPress={() => setTpSlOn((value) => !value)} className="flex-row items-center justify-between rounded-lg border px-3 py-1.5" style={{ backgroundColor: controlBackground, borderColor: colors.border }}>
                  <Text className="text-xs font-medium" style={{ color: colors.text }}>TP/SL</Text>
                  <View className="h-6 w-11 justify-center rounded-full px-1" style={{ backgroundColor: tpSlOn ? colors.success : colors.border }}>
                    <View className="h-4 w-4 rounded-full bg-white" style={{ alignSelf: tpSlOn ? 'flex-end' : 'flex-start' }} />
                  </View>
                </Pressable>
                {tpSlOn ? (
                  <View className="mt-2 flex-row gap-2">
                    <View className="flex-1">
                      <TextInput
                        value={takeProfit}
                        onChangeText={setTakeProfit}
                        onFocus={handleTakeProfitFocus}
                        placeholder="Take Profit"
                        placeholderTextColor={colors.muted}
                        keyboardType="numbers-and-punctuation"
                        className="h-9 rounded-lg border px-3 text-xs font-bold"
                        style={{ color: colors.text, borderColor: colors.border, backgroundColor: controlBackground }}
                      />
                    </View>
                    <View className="flex-1">
                      <TextInput
                        value={stopLoss}
                        onChangeText={setStopLoss}
                        onFocus={handleStopLossFocus}
                        placeholder="Stop Loss"
                        placeholderTextColor={colors.muted}
                        keyboardType="numbers-and-punctuation"
                        className="h-9 rounded-lg border px-3 text-xs font-bold"
                        style={{ color: colors.text, borderColor: colors.border, backgroundColor: controlBackground }}
                      />
                    </View>
                  </View>
                ) : null}
              </View>

              <View className="mt-3 rounded-xl border p-2" style={{ backgroundColor: controlBackground, borderColor: colors.border }}>
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className="text-[10px] font-bold tracking-wider uppercase" style={{ color: colors.muted }}>Trade snapshot</Text>
                  <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.success }} />
                </View>
                {snapshotRows.map(([label, value]) => (
                  <View key={label} className="mb-1 flex-row items-center justify-between">
                    <Text className="text-[10px]" style={{ color: colors.muted }}>{label}</Text>
                    <Text className="text-[10px] font-bold" style={{ color: colors.text }}>{value}</Text>
                  </View>
                ))}
              </View>

              {message || !user ? <Text className="mt-1.5 text-[9px]" style={{ color: colors.muted }}>{message || 'Log in to place trades.'}</Text> : null}
              <Pressable
                disabled={loading || Boolean(pendingOrderError)}
                onPress={open}
                className={`mt-2.5 h-10 items-center justify-center rounded-lg ${loading || pendingOrderError ? 'opacity-60' : ''}`}
                style={{ backgroundColor: orderSide === 'SELL' ? orderDanger : orderSuccess }}
              >
                <Text className="text-[11px] font-bold tracking-wider uppercase text-white">{loading ? 'Placing Order...' : 'Place Order'}</Text>
              </Pressable>
            </View>
            </Pressable>
          </Pressable>
        </Modal>
      );
    }

    return (
      <View className="border-t px-2 py-1" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
        <View className="flex-row gap-2" style={{ width: mobileActionWidth, alignSelf: 'center' }}>
          <Pressable
            onPress={() => openOrderModal('SELL')}
            className="h-[36px] flex-1 flex-row items-center justify-center gap-1.5 rounded-md"
            style={{ backgroundColor: orderDanger }}
          >
            <Text className="text-[10px] font-bold uppercase text-white">Sell</Text>
            <Text className="text-xs font-bold text-white">{quote(currentSymbol.bid, currentSymbol.decimals)}</Text>
          </Pressable>
          <Pressable
            onPress={() => openOrderModal('BUY')}
            className="h-[36px] flex-1 flex-row items-center justify-center gap-1.5 rounded-md"
            style={{ backgroundColor: orderSuccess }}
          >
            <Text className="text-[10px] font-bold uppercase text-white">Buy</Text>
            <Text className="text-xs font-bold text-white">{quote(currentSymbol.ask, currentSymbol.decimals)}</Text>
          </Pressable>
        </View>
        {message ? <Text className="mt-1 text-center text-xs" style={{ color: colors.muted }}>{message}</Text> : null}
      </View>
    );
  }

  return (
    <View className="h-full rounded-xl border lg:w-[300px]" style={{ backgroundColor: panelBackground, borderColor: colors.border, height: '100%' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10 }}>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-base font-bold" style={{ color: colors.text }}>New Trade</Text>
            <Text className="text-xs font-bold uppercase tracking-wider mt-0.5" style={{ color: colors.muted }}>{currentSymbol.symbol}</Text>
          </View>
        </View>

        <View className="mt-3 flex-row items-center justify-between gap-1.5">
          {ORDER_TYPES.map((type) => (
            <Pressable
              key={type.value}
              onPress={() => selectOrderType(type.value)}
              className="rounded-full px-2.5 py-1.5"
              style={{ backgroundColor: orderType === type.value ? activeTabBackground : 'transparent' }}
            >
              <Text
                className="text-[10px] font-medium"
                style={{ color: orderType === type.value ? colors.primary : colors.text }}
              >
                {type.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-2.5 flex-row justify-between rounded-xl px-3 py-2" style={{ backgroundColor: controlBackground }}>
          <View>
            <Text className="text-[10px] font-bold tracking-wider uppercase" style={{ color: colors.muted }}>Bid</Text>
            <Text className="mt-0.5 text-sm font-bold" style={{ color: colors.danger }}>{quote(currentSymbol.bid, currentSymbol.decimals)}</Text>
          </View>
          <View>
            <Text className="text-right text-[10px] font-bold tracking-wider uppercase" style={{ color: colors.muted }}>Ask</Text>
            <Text className="mt-0.5 text-sm font-bold" style={{ color: colors.success }}>{quote(currentSymbol.ask, currentSymbol.decimals)}</Text>
          </View>
        </View>

        <View className={`mt-2.5 ${orderType === 'spot' ? '' : 'flex-row gap-2'}`}>
          {orderType !== 'spot' ? (
            <View className="flex-1">
              <Text className="mb-1.5 text-[10px] font-bold tracking-wider uppercase" style={{ color: colors.muted }}>Entry Price</Text>
              <TextInput
                value={entryPrice}
                onChangeText={(value) => { setEntryPrice(value); setEntryPriceTouched(true); }}
                keyboardType="decimal-pad"
                className="h-9 rounded-lg border px-3 text-xs font-bold"
                style={{ 
                  backgroundColor: controlBackground, 
                  borderColor: showPendingOrderError ? colors.danger : colors.border,
                  color: colors.text 
                }}
              />
              {showPendingOrderError ? (
                <Text className="mt-1 text-[10px] font-medium" style={{ color: colors.danger }}>
                {showPendingOrderError}
                </Text>
              ) : null}
            </View>
          ) : null}
          <View className={orderType === 'spot' ? '' : 'flex-1'}>
          <Text className="mb-1.5 text-[10px] font-bold tracking-wider uppercase" style={{ color: colors.muted }}>Volume (lots)</Text>
          <TextInput
            value={lots}
            onChangeText={setLots}
            keyboardType="decimal-pad"
            className="h-9 rounded-lg border px-3 text-xs font-bold"
            style={{ backgroundColor: controlBackground, borderColor: colors.border, color: colors.text }}
          />
          </View>
          </View>

        <View className="mt-3 flex-row gap-2">
          <Pressable
            disabled={loading}
            onPress={() => setOrderSide('SELL')}
            className={`h-9 flex-1 items-center justify-center rounded-lg border ${loading ? 'opacity-60' : ''}`}
            style={{
              backgroundColor: orderSide === 'SELL' ? orderDanger : 'transparent',
              borderColor: orderDanger,
            }}
          >
            <Text className="text-[11px] font-bold tracking-wider uppercase" style={{ color: orderSide === 'SELL' ? '#FFFFFF' : orderDanger }}>SELL</Text>
          </Pressable>
          <Pressable
            disabled={loading}
            onPress={() => setOrderSide('BUY')}
            className={`h-9 flex-1 items-center justify-center rounded-lg border ${loading ? 'opacity-60' : ''}`}
            style={{
              backgroundColor: orderSide === 'BUY' ? orderSuccess : 'transparent',
              borderColor: orderSuccess,
            }}
          >
            <Text className="text-[11px] font-bold tracking-wider uppercase" style={{ color: orderSide === 'BUY' ? '#FFFFFF' : orderSuccess }}>BUY</Text>
          </Pressable>
        </View>

        <View className="mt-3">
          <SwitchRow active={tpSlOn} onPress={() => setTpSlOn((value) => !value)} label="TP/SL" colors={colors} />
          {tpSlOn ? (
            <View className="mt-2 flex-row gap-2">
              <View className="flex-1">
                <TextInput
                  value={takeProfit}
                  onChangeText={setTakeProfit}
                  onFocus={handleTakeProfitFocus}
                  placeholder="Take Profit"
                  placeholderTextColor={colors.muted}
                  keyboardType="numbers-and-punctuation"
                  className="h-9 rounded-lg border px-3 text-xs font-bold"
                  style={{ color: colors.text, borderColor: colors.border, backgroundColor: controlBackground }}
                />
              </View>
              <View className="flex-1">
                <TextInput
                  value={stopLoss}
                  onChangeText={setStopLoss}
                  onFocus={handleStopLossFocus}
                  placeholder="Stop Loss"
                  placeholderTextColor={colors.muted}
                  keyboardType="numbers-and-punctuation"
                  className="h-9 rounded-lg border px-3 text-xs font-bold"
                  style={{ color: colors.text, borderColor: colors.border, backgroundColor: controlBackground }}
                />
              </View>
            </View>
          ) : null}
        </View>
        <View className="mt-3 rounded-xl border p-2" style={{ backgroundColor: controlBackground, borderColor: colors.border }}>
          <View className="mb-1.5 flex-row items-center justify-between">
            <Text className="text-[10px] font-bold tracking-wider uppercase" style={{ color: colors.muted }}>Trade snapshot</Text>
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.success }} />
          </View>
          {snapshotRows.map(([label, value]) => (
            <View key={label} className="mb-1 flex-row items-center justify-between">
              <Text className="text-[10px]" style={{ color: colors.muted }}>{label}</Text>
              <Text className="text-[10px] font-bold" style={{ color: colors.text }}>{value}</Text>
            </View>
          ))}
        </View>
        {message || !user ? <Text className="mt-1.5 text-[9px]" style={{ color: colors.muted }}>{message || 'Log in to place trades.'}</Text> : null}
        <Pressable
          disabled={loading || Boolean(pendingOrderError)}
          onPress={open}
          className={`mt-2.5 h-10 items-center justify-center rounded-lg ${loading || pendingOrderError ? 'opacity-60' : ''}`}
          style={{ backgroundColor: orderSide === 'SELL' ? orderDanger : orderSuccess }}
        >
          <Text className="text-[11px] font-bold tracking-wider uppercase text-white">{loading ? 'Placing Order...' : 'Place Order'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
