import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Check, ChevronDown, Minus, Plus, X } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { useToast } from '../../context/ToastContext';
import { quote } from '../../utils/formatters';

const blue = '#1f78bd';
const lightBlue = '#dcecf7';
const green = '#28c45a';
const red = '#ff5258';
const ink = '#171a20';
const muted = '#8a94a3';
const border = '#e1e6eb';

export default function A5MarketOrderModal({ visible, onClose }) {
  const { width, height } = useWindowDimensions();
  const { user } = useAuth();
  const { notify } = useToast();
  const { prices, currentSymbol, selectedSymbol, setSelectedSymbol, openPosition, createPendingOrder } = useDemoTrading();
  const [orderType, setOrderType] = useState('spot');
  const [side, setSide] = useState('BUY');
  const [lots, setLots] = useState('0.01');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLossEnabled, setStopLossEnabled] = useState(false);
  const [takeProfitEnabled, setTakeProfitEnabled] = useState(false);
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [symbolMenu, setSymbolMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const compact = width < 680;
  const decimals = Number(currentSymbol?.decimals ?? 5);
  const bid = Number(currentSymbol?.bid ?? currentSymbol?.price ?? 0);
  const ask = Number(currentSymbol?.ask ?? currentSymbol?.price ?? 0);
  const spread = Number(currentSymbol?.spreadPoints ?? currentSymbol?.spread ?? 0);
  const symbolName = currentSymbol?.name || currentSymbol?.description || selectedSymbol;
  const step = Math.max(0.01, decimals <= 2 ? 0.01 : 0.0001);

  useEffect(() => {
    const market = side === 'BUY' ? ask : bid;
    setEntryPrice(quote(market, decimals));
  }, [ask, bid, decimals, selectedSymbol, side, orderType]);

  const riskRows = useMemo(() => {
    const base = Number(entryPrice) || (side === 'BUY' ? ask : bid);
    const sl = Number(stopLoss) || (side === 'BUY' ? base - step * 2 : base + step * 2);
    const tp = Number(takeProfit) || (side === 'BUY' ? base + step * 2 : base - step * 2);
    return { sl, tp };
  }, [ask, bid, entryPrice, side, step, stopLoss, takeProfit]);

  const changeLots = (delta) => {
    const next = Math.max(0.01, Math.round(((Number(lots) || 0.01) + delta) * 100) / 100);
    setLots(next.toFixed(2));
  };

  const submit = async () => {
    try {
      setLoading(true);
      if (!user) throw new Error('Please log in to place trades.');
      if (!(Number(lots) > 0)) throw new Error('Enter a valid quantity.');
      const risk = {
        ...(stopLossEnabled ? { stopLoss: riskRows.sl } : {}),
        ...(takeProfitEnabled ? { takeProfit: riskRows.tp } : {}),
      };
      if (orderType === 'spot') await openPosition(side, lots, risk);
      else await createPendingOrder({ side, lots, orderType, entryPrice, ...risk });
      notify({ type: 'success', title: 'Order placed', message: `${side} order placed successfully.` });
      onClose();
    } catch (error) {
      notify({ type: 'error', title: 'Order rejected', message: error?.response?.data?.message || error.message || 'Order failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(16, 22, 29, 0.62)', alignItems: 'center', justifyContent: 'center', padding: compact ? 10 : 24 }}>
        <Pressable onPress={(event) => event.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: Math.min(height - 28, 760), borderRadius: compact ? 18 : 14, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 30, elevation: 18 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: compact ? 16 : 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: ink, fontSize: compact ? 20 : 22, fontWeight: '500' }}>Create New Market Order</Text>
              <Pressable onPress={onClose} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}><X size={21} color="#747b85" /></Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: compact ? 16 : 28, marginTop: 18, marginBottom: 14 }}>
              {[['spot', 'Spot Order'], ['limit', 'Limit Order'], ['stop', 'Stop Order']].map(([value, label]) => (
                <Pressable key={value} onPress={() => setOrderType(value)} style={{ paddingHorizontal: value === orderType ? 12 : 0, paddingVertical: 7, borderRadius: 18, backgroundColor: value === orderType ? lightBlue : 'transparent' }}>
                  <Text style={{ color: value === orderType ? blue : ink, fontWeight: value === orderType ? '700' : '500' }}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ borderWidth: 1, borderColor: border, borderRadius: 14, padding: compact ? 14 : 20 }}>
              <View style={{ position: 'relative', zIndex: 20 }}>
                <Pressable onPress={() => setSymbolMenu((open) => !open)} style={{ minHeight: 52, borderWidth: 1, borderColor: border, borderRadius: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text numberOfLines={1} style={{ color: ink, fontWeight: '700', flex: 1 }}>{selectedSymbol} <Text style={{ color: '#9aa3b1', fontWeight: '500' }}> ({symbolName})</Text></Text>
                  <ChevronDown size={19} color="#7c8590" />
                </Pressable>
                {symbolMenu ? <View style={{ position: 'absolute', top: 58, left: 0, right: 0, maxHeight: 220, backgroundColor: '#fff', borderWidth: 1, borderColor: border, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 18, elevation: 12 }}>
                  <ScrollView nestedScrollEnabled>{prices.slice(0, 80).map((item) => <Pressable key={item.symbol} onPress={() => { setSelectedSymbol(item.symbol); setSymbolMenu(false); }} style={{ paddingHorizontal: 16, paddingVertical: 11, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f0f2f4' }}><Text style={{ color: ink, fontWeight: '600' }}>{item.symbol}</Text>{item.symbol === selectedSymbol ? <Check size={17} color={blue} /> : null}</Pressable>)}</ScrollView>
                </View> : null}
              </View>

              <View style={{ flexDirection: compact ? 'column' : 'row', gap: 16, marginTop: 28 }}>
                <Pressable onPress={() => setSide('SELL')} style={{ flex: 1, minHeight: 62, borderRadius: 14, borderWidth: 1.5, borderColor: red, alignItems: 'center', justifyContent: 'center', backgroundColor: side === 'SELL' ? '#fff3f3' : '#fff' }}><Text style={{ color: red }}>SELL</Text><Text style={{ color: red, fontSize: 16, fontWeight: '800', marginTop: 2 }}>{quote(bid, decimals)}</Text></Pressable>
                <Pressable onPress={() => setSide('BUY')} style={{ flex: 1, minHeight: 62, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: green }}><Text style={{ color: '#fff' }}>BUY</Text><Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 2 }}>{quote(ask, decimals)}</Text></Pressable>
              </View>

              <View style={{ flexDirection: compact ? 'column' : 'row', gap: 14, marginTop: 26 }}>
                {orderType !== 'spot' ? <View style={{ flex: 1 }}><Text style={{ color: ink, textAlign: 'center', fontSize: 16, marginBottom: 10 }}>Entry Price</Text><TextInput value={entryPrice} onChangeText={setEntryPrice} keyboardType="decimal-pad" style={{ height: 52, borderWidth: 1, borderColor: border, borderRadius: 14, paddingHorizontal: 14, color: ink, fontSize: 16 }} /></View> : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: ink, textAlign: 'center', fontSize: 16, marginBottom: 10 }}>Quantity</Text>
                  <View style={{ height: 52, borderWidth: 1, borderColor: border, borderRadius: 14, flexDirection: 'row', overflow: 'hidden' }}>
                    <TextInput value={lots} onChangeText={setLots} keyboardType="decimal-pad" style={{ flex: 1, paddingHorizontal: 14, color: ink, fontSize: 18 }} />
                    <Pressable onPress={() => changeLots(-0.01)} style={{ width: 46, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderColor: border }}><Minus size={17} color={muted} /></Pressable>
                    <Pressable onPress={() => changeLots(0.01)} style={{ width: 46, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderColor: border }}><Plus size={17} color={muted} /></Pressable>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: compact ? 6 : 14, marginTop: 28 }}>
                <View style={{ flex: 1 }}><Pressable onPress={() => setStopLossEnabled((active) => !active)} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 }}><View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: '#8c96a3', alignItems: 'center', justifyContent: 'center', backgroundColor: stopLossEnabled ? blue : '#fff' }}>{stopLossEnabled ? <Check size={14} color="#fff" /> : null}</View><Text style={{ color: ink, fontSize: compact ? 14 : 16 }}>Stop Loss</Text></Pressable><View style={{ borderWidth: 1, borderColor: border, borderRadius: 14, overflow: 'hidden', opacity: stopLossEnabled ? 1 : 0.45 }}><Text style={{ minHeight: 40, padding: 10, color: ink }}>-0.2</Text><TextInput editable={stopLossEnabled} value={stopLoss} onChangeText={setStopLoss} placeholder={quote(riskRows.sl, decimals)} keyboardType="decimal-pad" style={{ minHeight: 40, paddingHorizontal: 10, color: ink, borderTopWidth: 1, borderColor: border }} /><Text style={{ minHeight: 40, padding: 10, color: ink, borderTopWidth: 1, borderColor: border }}>0</Text></View></View>
                <View style={{ width: compact ? 48 : 70, paddingBottom: 2 }}><Text style={{ height: 41, textAlign: 'center', color: muted }}>Pips</Text><Text style={{ height: 41, textAlign: 'center', color: muted }}>Price</Text><Text style={{ height: 41, textAlign: 'center', color: muted }}>Profit</Text></View>
                <View style={{ flex: 1 }}><Pressable onPress={() => setTakeProfitEnabled((active) => !active)} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 }}><View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: '#8c96a3', alignItems: 'center', justifyContent: 'center', backgroundColor: takeProfitEnabled ? blue : '#fff' }}>{takeProfitEnabled ? <Check size={14} color="#fff" /> : null}</View><Text style={{ color: ink, fontSize: compact ? 14 : 16 }}>Take Profit</Text></Pressable><View style={{ borderWidth: 1, borderColor: border, borderRadius: 14, overflow: 'hidden', opacity: takeProfitEnabled ? 1 : 0.45 }}><Text style={{ minHeight: 40, padding: 10, color: ink }}>0.2</Text><TextInput editable={takeProfitEnabled} value={takeProfit} onChangeText={setTakeProfit} placeholder={quote(riskRows.tp, decimals)} keyboardType="decimal-pad" style={{ minHeight: 40, paddingHorizontal: 10, color: ink, borderTopWidth: 1, borderColor: border }} /><Text style={{ minHeight: 40, padding: 10, color: ink, borderTopWidth: 1, borderColor: border }}>0</Text></View></View>
              </View>

              <Pressable disabled={loading} onPress={submit} style={{ marginTop: 18, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: green, opacity: loading ? 0.65 : 1 }}><Text style={{ color: '#fff', fontWeight: '800' }}>{loading ? 'PLACING ORDER...' : 'PLACE ORDER'}</Text></Pressable>
              <Text style={{ color: ink, textAlign: 'center', marginTop: 16 }}>Spread: {Number.isFinite(spread) ? spread.toFixed(1) : '0.0'}   High: {quote(ask, decimals)}   Low: {quote(bid, decimals)}</Text>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
