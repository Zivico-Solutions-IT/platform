import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  Activity,
  BarChart3,
  CandlestickChart,
  ChevronDown,
  LineChart,
  Maximize2,
  Minimize2,
  Minus,
  Mountain,
  Plus,
  ScatterChart,
  Settings,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react-native';
import ChartGraphSettingsPanel from './ChartGraphSettingsPanel';
import ChartSymbolPanel from './ChartSymbolPanel';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { marketService } from '../../services/marketService';
import { percent, quote } from '../../utils/formatters';
import { storage } from '../../utils/storage';
import { useAppTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

const TIMEFRAMES = [
  '1m', '5m', '15m', '30m',
  '1H', '4H',
  '1D', '1W', '1M',
];
const VIEW_RANGES = ['Full', 'Recent'];
const TIMEFRAME_SECONDS = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1H': 3600,
  '4H': 14400,
  '1D': 86400,
  '1W': 604800,
  '1M': 2592000,
};
const liveGapGraceSeconds = (timeframe) => Math.max((TIMEFRAME_SECONDS[timeframe] || 900) * 2, 10 * 60);
const HISTORY_LIMITS = {
  '1m': 500,
  '5m': 500,
  '15m': 500,
  '30m': 500,
  '1H': 500,
  '4H': 500,
  '1D': 365,
  '1W': 260,
  '1M': 120,
};
const HISTORY_PAGE_LIMITS = {
  '1m': 500,
  '5m': 500,
  '15m': 500,
  '30m': 500,
  '1H': 500,
  '4H': 500,
  '1D': 365,
  '1W': 260,
  '1M': 120,
};
const INITIAL_VISIBLE_BARS = {
  '1m': 80,
  '5m': 110,
  '15m': 130,
  '30m': 150,
  '1H': 180,
  '4H': 220,
  '1D': 220,
  '1W': 180,
  '1M': 140,
};
const CHART_TYPES = [
  ['combo', 'Combochart', CandlestickChart],
  ['candles', 'Candlestick', CandlestickChart],
  ['bar', 'Bar', BarChart3],
  ['line', 'Line', TrendingUp],
  ['area', 'Area', Mountain],
  ['hollow', 'Hollow', CandlestickChart],
  ['histogram', 'Histogram', BarChart3],
  ['baseline', 'Baseline', Activity],
  ['trend', 'Trend', LineChart],
  ['scatter', 'Scatter Plot', ScatterChart],
];
const INDICATOR_TOOLS = [
  ['atr', 'AVERAGE TRUE RANGE'],
  ['awesome', 'AWESOME OSCILLATOR'],
  ['bb', 'BOLLINGER BANDS'],
  ['cci', 'COMMODITY CHANNEL'],
  ['ichimoku', 'ICHIMOKU CLOUD'],
  ['macd', 'MACD'],
  ['momentum', 'MOMENTUM'],
  ['sar', 'PARABOLIC SAR'],
  ['rsi', 'RSI'],
  ['roc', 'RATE OF CHANGE'],
  ['sma20', 'MOVING AVERAGE'],
  ['wma', 'WEIGHTED MOVING AVERAGE'],
  ['williams', 'WILLIAMS'],
];
const INDICATOR_KEYS = INDICATOR_TOOLS.map(([key]) => key);
const INDICATOR_LABELS = Object.fromEntries(INDICATOR_TOOLS);
const INDICATOR_SHORT_NAMES = {
  atr: 'ATR',
  awesome: 'AO',
  bb: 'BB',
  cci: 'CCI',
  ichimoku: 'ICH',
  macd: 'MACD',
  momentum: 'MOM',
  sar: 'SAR',
  rsi: 'RSI',
  roc: 'ROC',
  sma20: 'MA',
  wma: 'WMA',
  williams: 'WPR',
};
const DRAWING_TOOLS = [
  ['horizontal', 'Horizontal Line'],
  ['trend', 'Trend Line'],
  ['fibonacci', 'Fibonacci Retracement'],
  ['clear', 'Clear All Drawings'],
];
const DRAWING_LABELS = Object.fromEntries(DRAWING_TOOLS);
const hasLivePrice = (item) => (
  ['tradingview', 'stale'].includes(item?.source) && Number(item?.price) > 0
);

const latestContinuousCandles = (candles, timeframe) => {
  if (!Array.isArray(candles) || candles.length < 2) return candles || [];

  const seconds = TIMEFRAME_SECONDS[timeframe];
  if (!seconds) return candles;

  const maxGap = Math.max(seconds * 1.5, seconds + 30);
  let startIndex = 0;

  for (let index = candles.length - 1; index > 0; index -= 1) {
    if (Number(candles[index].time) - Number(candles[index - 1].time) > maxGap) {
      startIndex = index;
      break;
    }
  }

  const recentCandles = candles.slice(startIndex);
  return recentCandles.length >= Math.min(80, candles.length) ? recentCandles : candles;
};

const normalizeCandles = (candles, timeframe, viewRange) => {
  const byTime = new Map();
  (candles || []).forEach((bar) => {
    const candle = {
      time: Number(bar.time),
      open: Number(bar.open),
      high: Number(bar.high),
      low: Number(bar.low),
      close: Number(bar.close),
    };
    if (Object.values(candle).every(Number.isFinite)) {
      byTime.set(candle.time, candle);
    }
  });

  const sorted = [...byTime.values()].sort((a, b) => a.time - b.time);
  return viewRange === 'Recent' ? latestContinuousCandles(sorted, timeframe) : sorted;
};

const applyLivePriceToCandles = (candles, currentSymbol, timeframe) => {
  if (!hasLivePrice(currentSymbol)) return candles;

  const price = Number(currentSymbol.price);
  const seconds = TIMEFRAME_SECONDS[timeframe] || 900;
  const time = Math.floor(Date.now() / 1000 / seconds) * seconds;
  if (!Number.isFinite(price) || price <= 0) return candles;

  const nextCandles = [...(candles || [])];
  const previous = nextCandles[nextCandles.length - 1];
  const previousTime = Number(previous?.time);

  if (Number.isFinite(previousTime) && previousTime === time) {
    nextCandles[nextCandles.length - 1] = {
      ...previous,
      high: Math.max(Number(previous.high), price),
      low: Math.min(Number(previous.low), price),
      close: price,
    };
    return nextCandles;
  }

  if (Number.isFinite(previousTime) && previousTime < time) {
    const gapSeconds = time - previousTime;
    const hasMissingHistory = gapSeconds > liveGapGraceSeconds(timeframe);

    if (hasMissingHistory) {
      return nextCandles;
    }

    const open = Number(previous.close);
    nextCandles.push({
      time,
      open,
      high: Math.max(open, price),
      low: Math.min(open, price),
      close: price,
    });
    return nextCandles;
  }

  if (Number.isFinite(previousTime) && previousTime > time) {
    nextCandles[nextCandles.length - 1] = {
      ...previous,
      high: Math.max(Number(previous.high), price),
      low: Math.min(Number(previous.low), price),
      close: price,
    };
    return nextCandles;
  }

  return [{ time, open: price, high: price, low: price, close: price }];
};

const loadCandlesWithRetry = async (symbol, timeframe, limit, options = {}, attempts = 5) => {
  let lastCandles = [];
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const candles = await marketService.getCandles(symbol, timeframe, limit, options);
      if (Array.isArray(candles) && candles.length > 1) return candles;
      if (Array.isArray(candles)) lastCandles = candles;
    } catch {
      lastCandles = [];
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  return lastCandles;
};

const TRADING_CHART_TEAL = '#25bdb2';
const QUICK_TRADE_BUY = '#0C9F91';

const chartUiFromTheme = (colors) => ({
  dark: colors.mode === 'dark',
  background: colors.chartBackground,
  toolbar: colors.background,
  control: colors.panel,
  controlActive: colors.mode === 'dark' ? colors.primary : '#10a5cf',
  border: colors.border,
  menu: colors.panel,
  menuBorder: colors.border,
  panel: colors.panel,
  muted: colors.muted,
  text: colors.text,
  accent: colors.mode === 'dark' ? colors.primary : '#1477b8',
  activeText: colors.mode === 'dark' ? '#0B0B0B' : '#ffffff',
  success: TRADING_CHART_TEAL,
  danger: colors.danger,
  grid: colors.chartGrid,
  soft: colors.primarySoft,
});

function IconButton({ active, bare = false, children, onPress, ui, size = 32 }) {
  const backgroundColor = bare ? 'transparent' : active ? ui.controlActive : ui.control;
  const borderColor = bare ? 'transparent' : active ? ui.controlActive : ui.border;

  return (
    <Pressable
      onPress={onPress}
      className={`items-center justify-center rounded-md ${bare ? '' : 'border'}`}
      style={{ width: size, height: size, backgroundColor, borderColor }}
    >
      {children}
    </Pressable>
  );
}

function IndicatorGlyph({ active, activeColor, ui, size = 11 }) {
  return (
    <Text className="font-medium" style={{ color: active ? (activeColor || ui.activeText) : ui.text, fontSize: size }}>
      f(x)
    </Text>
  );
}

function Stepper({ value, onDecrease, onIncrease, ui, formatter = (item) => item }) {
  return (
    <View className="h-8 flex-row overflow-hidden rounded-md border" style={{ borderColor: ui.border }}>
      <Pressable className="w-9 items-center justify-center border-r" style={{ borderColor: ui.border }} onPress={onDecrease}>
        <Minus size={13} color={ui.text} />
      </Pressable>
      <View className="flex-1 items-center justify-center">
        <Text className="text-xs font-medium" style={{ color: ui.text }}>{formatter(value)}</Text>
      </View>
      <Pressable className="w-9 items-center justify-center border-l" style={{ borderColor: ui.border }} onPress={onIncrease}>
        <Plus size={13} color={ui.text} />
      </Pressable>
    </View>
  );
}

function LineWidthSelect({ value, onPress, ui }) {
  return (
    <Pressable
      onPress={onPress}
      className="h-8 flex-1 flex-row items-center justify-between rounded-md border px-3"
      style={{ borderColor: ui.border, backgroundColor: ui.control }}
    >
      <Text className="text-xs font-medium" style={{ color: ui.text }}>{value} px</Text>
      <ChevronDown size={14} color={ui.muted} />
    </Pressable>
  );
}

function chartHtml(candles, decimals, timeframe, chartType, tools, drawings, activeDrawingTool, ui, viewRange) {
  const safeDecimals = Math.max(0, Math.min(Number(decimals) || 2, 8));
  const visibleBars = INITIAL_VISIBLE_BARS[timeframe] || 300;
  const recentView = viewRange === 'Recent';
  const chartColors = {
    background: ui.background,
    text: ui.text,
    grid: ui.grid,
    border: ui.border,
    up: ui.success,
    down: ui.danger,
  };
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
*{box-sizing:border-box}html,body,#chart-wrap{height:100%;width:100%;margin:0;background:${chartColors.background};overflow:hidden}
#chart-wrap{position:relative}
#chart{position:absolute;inset:0}
#drawing-layer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:12}
#empty{display:none;position:absolute;left:0;right:0;top:48%;text-align:center;color:${chartColors.text};font:14px Arial,sans-serif}
#empty:before{content:'';display:block;width:28px;height:28px;margin:0 auto 10px;border-radius:50%;border:3px solid ${ui.border};border-top-color:${ui.accent};animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
#ohlc-panel{position:absolute;left:10px;right:10px;top:8px;z-index:20;display:flex;align-items:center;flex-wrap:wrap;gap:4px 10px;max-width:calc(100% - 20px);overflow:visible;white-space:normal;font:12px Arial,sans-serif;line-height:1.25;color:${chartColors.text};pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,.38)}
#ohlc-panel span{flex:0 0 auto}
#ohlc-panel .symbol{font-weight:800;color:${ui.accent}}
#ohlc-panel .value{font-weight:700}
#ohlc-panel .up{color:${chartColors.up}}
#ohlc-panel .down{color:${chartColors.down}}
@media(max-width:480px){
  #ohlc-panel{left:6px;right:6px;top:6px;gap:3px 6px;max-width:calc(100% - 12px);font-size:10px;line-height:1.15}
}
@media(max-width:360px){
  #ohlc-panel{font-size:9px;gap:2px 5px}
}
</style></head>
<body>
<div id="chart-wrap"><div id="chart"></div><svg id="drawing-layer"></svg><div id="ohlc-panel"></div><div id="empty">Waiting for chart data</div></div>
<script src="https://unpkg.com/lightweight-charts@5/dist/lightweight-charts.standalone.production.js"></script>
<script>
let data = ${JSON.stringify(candles)};
const chartType = ${JSON.stringify(chartType)};
const tools = ${JSON.stringify(tools)};
const drawings = ${JSON.stringify(drawings)};
const activeDrawingTool = ${JSON.stringify(activeDrawingTool)};
const indicatorLineWidth = Math.max(1, Math.min(4, Number(tools.defaultLineWidth || 1)));
const timeframeSeconds = ${JSON.stringify(TIMEFRAME_SECONDS[timeframe] || 900)};
const priceOptions = {
  type: 'price',
  precision: ${safeDecimals},
  minMove: ${10 ** -safeDecimals}
};
const padTime = (value) => String(value).padStart(2, '0');
const localDate = (time) => new Date(Number(time) * 1000);
const formatLocalTime = (time) => {
  const date = localDate(time);
  return padTime(date.getHours()) + ':' + padTime(date.getMinutes());
};
const formatLocalDateTime = (time) => {
  const date = localDate(time);
  const day = padTime(date.getDate());
  const month = date.toLocaleString(undefined, { month: 'short' });
  const year = String(date.getFullYear()).slice(-2);
  return day + ' ' + month + ' ' + year + '   ' + padTime(date.getHours()) + ':' + padTime(date.getMinutes()) + ':' + padTime(date.getSeconds());
};
const chart = LightweightCharts.createChart(document.getElementById('chart'), {
  autoSize: true,
  layout: {
    background: { type: 'solid', color: ${JSON.stringify(chartColors.background)} },
    textColor: ${JSON.stringify(chartColors.text)},
    attributionLogo: false
  },
  grid: {
    vertLines: { color: tools.grid ? ${JSON.stringify(chartColors.grid)} : 'transparent' },
    horzLines: { color: tools.grid ? ${JSON.stringify(chartColors.grid)} : 'transparent' }
  },
  crosshair: {
    mode: tools.crosshair ? LightweightCharts.CrosshairMode.Normal : LightweightCharts.CrosshairMode.Hidden,
    vertLine: { color: ${JSON.stringify(ui.accent)} },
    horzLine: { color: ${JSON.stringify(ui.accent)} }
  },
  rightPriceScale: { borderColor: ${JSON.stringify(chartColors.border)} },
  localization: {
    timeFormatter: formatLocalDateTime
  },
  timeScale: {
    borderColor: ${JSON.stringify(chartColors.border)},
    timeVisible: true,
    secondsVisible: true,
    shiftVisibleRangeOnNewBar: false,
    tickMarkFormatter: formatLocalTime
  }
});
const closeData = (items) => items.map((item) => ({ time: Number(item.time), value: Number(item.close) })).filter((item) => Number.isFinite(item.time) && Number.isFinite(item.value));
const histogramData = (items) => items.map((item) => ({
  time: Number(item.time),
  value: Number(item.close),
  color: Number(item.close) >= Number(item.open) ? 'rgba(18, 207, 122, .68)' : 'rgba(242, 77, 88, .68)'
})).filter((item) => Number.isFinite(item.time) && Number.isFinite(item.value));
const byTime = new Map();
const rememberBar = (bar) => {
  if (!bar || !Number.isFinite(Number(bar.time))) return;
  byTime.set(Number(bar.time), bar);
};
data.forEach(rememberBar);
const formatPrice = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(${safeDecimals}) : '-';
};
const getDisplayBar = (param) => {
  if (!data.length) return null;
  if (param?.time != null && byTime.has(Number(param.time))) return byTime.get(Number(param.time));
  if (Number.isFinite(Number(param?.logical))) {
    const index = Math.max(0, Math.min(data.length - 1, Math.round(Number(param.logical))));
    return data[index];
  }
  return lastBar || data[data.length - 1];
};
const setHoverReadout = (bar) => {
  const panel = document.getElementById('ohlc-panel');
  if (!panel || !bar) return;
  const open = Number(bar.open);
  const high = Number(bar.high);
  const low = Number(bar.low);
  const close = Number(bar.close);
  const change = close - open;
  const changePercent = open ? (change / open) * 100 : 0;
  const tone = change >= 0 ? 'up' : 'down';
  panel.innerHTML =
    '<span class="symbol">OHLC</span>' +
    '<span>O <span class="value">' + formatPrice(open) + '</span></span>' +
    '<span>H <span class="value">' + formatPrice(high) + '</span></span>' +
    '<span>L <span class="value">' + formatPrice(low) + '</span></span>' +
    '<span>C <span class="value ' + tone + '">' + formatPrice(close) + '</span></span>' +
    '<span class="' + tone + '">' + (change >= 0 ? '+' : '') + formatPrice(change) + ' (' + (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%)</span>';
};
const clearHoverReadout = () => {
  setHoverReadout(lastBar || data[data.length - 1], null);
};
const mainSeriesOptions = {
  color: ${JSON.stringify(ui.accent)},
  lineColor: ${JSON.stringify(ui.accent)},
  lineWidth: chartType === 'scatter' ? 0 : 2,
  pointMarkersVisible: chartType === 'scatter',
  pointMarkersRadius: chartType === 'scatter' ? 4 : undefined,
  baseValue: { type: 'price', price: Number(data[data.length - 1]?.close || 0) },
  baseLineColor: ${JSON.stringify(ui.accent)},
  topLineColor: ${JSON.stringify(ui.success)},
  bottomLineColor: ${JSON.stringify(ui.danger)},
  topFillColor1: 'rgba(18, 207, 122, .28)',
  topFillColor2: 'rgba(18, 207, 122, .04)',
  bottomFillColor1: 'rgba(242, 77, 88, .04)',
  bottomFillColor2: 'rgba(242, 77, 88, .26)',
  topColor: 'rgba(212, 175, 55, .42)',
  bottomColor: 'rgba(212, 175, 55, 0)',
  upColor: chartType === 'hollow' ? 'rgba(0, 0, 0, 0)' : ${JSON.stringify(chartColors.up)},
  downColor: ${JSON.stringify(chartColors.down)},
  borderUpColor: ${JSON.stringify(chartColors.up)},
  borderDownColor: ${JSON.stringify(chartColors.down)},
  wickUpColor: ${JSON.stringify(chartColors.up)},
  wickDownColor: ${JSON.stringify(chartColors.down)},
  borderVisible: chartType !== 'hollow',
  lastValueVisible: tools.priceLine,
  priceLineVisible: tools.priceLine,
  priceFormat: priceOptions
};
const seriesType = (() => {
  if (chartType === 'line' || chartType === 'trend' || chartType === 'scatter') return LightweightCharts.LineSeries;
  if (chartType === 'area') return LightweightCharts.AreaSeries;
  if (chartType === 'bar') return LightweightCharts.BarSeries;
  if (chartType === 'histogram') return LightweightCharts.HistogramSeries;
  if (chartType === 'baseline') return LightweightCharts.BaselineSeries;
  return LightweightCharts.CandlestickSeries;
})();
const series = chart.addSeries(seriesType, mainSeriesOptions);
const indicatorSeries = [];
const setMainData = () => {
  if (chartType === 'candles' || chartType === 'combo' || chartType === 'bar' || chartType === 'hollow') {
    series.setData(data);
    return;
  }
  if (chartType === 'histogram') {
    series.setData(histogramData(data));
    return;
  }
  series.setData(closeData(data));
};
function movingAverage(items, period) {
  const output = [];
  for (let index = period - 1; index < items.length; index += 1) {
    const slice = items.slice(index - period + 1, index + 1);
    const value = slice.reduce((sum, item) => sum + Number(item.close), 0) / period;
    output.push({ time: Number(items[index].time), value });
  }
  return output;
}
function weightedMovingAverage(items, period) {
  const output = [];
  const denominator = (period * (period + 1)) / 2;
  for (let index = period - 1; index < items.length; index += 1) {
    const slice = items.slice(index - period + 1, index + 1);
    const value = slice.reduce((sum, item, sliceIndex) => sum + Number(item.close) * (sliceIndex + 1), 0) / denominator;
    output.push({ time: Number(items[index].time), value });
  }
  return output;
}
function exponentialAverage(items, period) {
  const output = [];
  const multiplier = 2 / (period + 1);
  let ema = Number(items[0]?.close || 0);
  items.forEach((item, index) => {
    const close = Number(item.close);
    ema = index === 0 ? close : close * multiplier + ema * (1 - multiplier);
    if (index >= period - 1) output.push({ time: Number(item.time), value: ema });
  });
  return output;
}
function bollingerBands(items, period, multiplier = 2) {
  const upper = [];
  const middle = [];
  const lower = [];
  for (let index = period - 1; index < items.length; index += 1) {
    const slice = items.slice(index - period + 1, index + 1).map((item) => Number(item.close));
    const mean = slice.reduce((sum, value) => sum + value, 0) / period;
    const variance = slice.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / period;
    const deviation = Math.sqrt(variance);
    const time = Number(items[index].time);
    middle.push({ time, value: mean });
    upper.push({ time, value: mean + deviation * multiplier });
    lower.push({ time, value: mean - deviation * multiplier });
  }
  return { upper, middle, lower };
}
function averageTrueRange(items, period) {
  const output = [];
  const ranges = items.map((item, index) => {
    const high = Number(item.high);
    const low = Number(item.low);
    const previousClose = Number(items[index - 1]?.close ?? item.close);
    return Math.max(high - low, Math.abs(high - previousClose), Math.abs(low - previousClose));
  });
  for (let index = period - 1; index < ranges.length; index += 1) {
    const slice = ranges.slice(index - period + 1, index + 1);
    output.push({
      time: Number(items[index].time),
      value: slice.reduce((sum, value) => sum + value, 0) / period
    });
  }
  return output;
}
function rateOfChange(items, period) {
  const output = [];
  for (let index = period; index < items.length; index += 1) {
    const previous = Number(items[index - period].close);
    const current = Number(items[index].close);
    if (previous) output.push({ time: Number(items[index].time), value: current + ((current - previous) / previous) * current * .05 });
  }
  return output;
}
function momentumLine(items, period) {
  const output = [];
  for (let index = period; index < items.length; index += 1) {
    const current = Number(items[index].close);
    const previous = Number(items[index - period].close);
    output.push({ time: Number(items[index].time), value: current + (current - previous) * .35 });
  }
  return output;
}
function addLine(dataSet, color, width = 1, lineStyle = LightweightCharts.LineStyle.Solid) {
  const line = chart.addSeries(LightweightCharts.LineSeries, {
    color,
    lineWidth: width,
    lineStyle,
    priceLineVisible: false,
    lastValueVisible: false,
    priceFormat: priceOptions
  });
  line.setData(dataSet
    .filter((item) => Number.isFinite(Number(item.time)) && Number.isFinite(Number(item.value)))
    .sort((a, b) => Number(a.time) - Number(b.time)));
  indicatorSeries.push({ line, dataSet });
}
function renderIndicators() {
  if (!data.length) return;
  if (chartType === 'combo') addLine(closeData(data), ${JSON.stringify(ui.accent)}, indicatorLineWidth);
  if (tools.atr) addLine(averageTrueRange(data, Number(tools.atrPeriod || 14)), ${JSON.stringify(ui.accent)}, indicatorLineWidth);
  if (tools.awesome) {
    addLine(momentumLine(data, Number(tools.awesomeShort || 5)), '#4fc3f7', indicatorLineWidth);
    addLine(momentumLine(data, Number(tools.awesomeLong || 34)), '#f24d58', indicatorLineWidth);
  }
  if (tools.sma20) addLine(movingAverage(data, Number(tools.smaPeriod || 9)), ${JSON.stringify(ui.accent)}, indicatorLineWidth);
  if (tools.wma) addLine(weightedMovingAverage(data, Number(tools.wmaPeriod || 9)), '#8aa8ff', indicatorLineWidth);
  if (tools.ema50) addLine(exponentialAverage(data, 50), '#4fc3f7', indicatorLineWidth);
  if (tools.bollinger || tools.bb) {
    const bands = bollingerBands(data, Number(tools.bbPeriod || 20), Number(tools.bbDeviation || 2));
    addLine(bands.upper, 'rgba(212, 175, 55, .78)', indicatorLineWidth);
    addLine(bands.middle, 'rgba(255, 255, 255, .42)', indicatorLineWidth);
    addLine(bands.lower, 'rgba(212, 175, 55, .78)', indicatorLineWidth);
  }
  if (tools.cci) addLine(momentumLine(data, Number(tools.cciPeriod || 20)), '#ffb84d', indicatorLineWidth);
  if (tools.ichimoku) {
    addLine(movingAverage(data, Number(tools.ichimokuConversion || 9)), '#4fc3f7', indicatorLineWidth);
    addLine(movingAverage(data, Number(tools.ichimokuBase || 26)), '#f24d58', indicatorLineWidth);
  }
  if (tools.macd) {
    addLine(exponentialAverage(data, Number(tools.macdFast || 12)), '#4fc3f7', indicatorLineWidth);
    addLine(exponentialAverage(data, Number(tools.macdSlow || 26)), '#f24d58', indicatorLineWidth);
    addLine(exponentialAverage(data, Number(tools.macdSignal || 9)), '#8aa8ff', indicatorLineWidth);
  }
  if (tools.momentum) addLine(momentumLine(data, Number(tools.momentumPeriod || 10)), '#0C9F91', indicatorLineWidth);
  if (tools.sar) addLine(movingAverage(data, Math.max(2, Math.round(Number(tools.sarMax || .2) * 25))), '#ffffff', indicatorLineWidth);
  if (tools.rsi) addLine(rateOfChange(data, Number(tools.rsiPeriod || 14)), '#b58cff', indicatorLineWidth);
  if (tools.roc) addLine(rateOfChange(data, Number(tools.rocPeriod || 12)), '#ffb84d', indicatorLineWidth);
  if (tools.williams) addLine(rateOfChange(data, Number(tools.williamsPeriod || 14)), '#8aa8ff', indicatorLineWidth);
  if (tools.volume && data.some((item) => Number(item.volume) > 0)) {
    const volume = chart.addSeries(LightweightCharts.HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      color: 'rgba(212, 175, 55, .35)',
      lastValueVisible: false,
      priceLineVisible: false
    });
    volume.priceScale().applyOptions({ scaleMargins: { top: .78, bottom: 0 } });
    volume.setData(data.map((item) => ({
      time: Number(item.time),
      value: Number(item.volume || 0),
      color: Number(item.close) >= Number(item.open) ? 'rgba(18, 207, 122, .35)' : 'rgba(242, 77, 88, .35)'
    })));
  }
}
function renderDrawings() {
  const layer = document.getElementById('drawing-layer');
  const chartElement = document.getElementById('chart');
  if (!layer || !chartElement) return;
  const width = chartElement.clientWidth || 1;
  const height = chartElement.clientHeight || 1;
  layer.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  layer.replaceChildren();
  if (!data.length || !drawings.length) return;
  const normalizePoints = (points) => {
    const start = {
      time: Number(points?.[0]?.time),
      price: Number(points?.[0]?.price)
    };
    const end = {
      time: Number(points?.[1]?.time),
      price: Number(points?.[1]?.price)
    };
    if (![start.time, start.price, end.time, end.price].every(Number.isFinite)) return null;
    if (start.time === end.time) end.time += timeframeSeconds;
    return start.time <= end.time ? [start, end] : [end, start];
  };
  const toPoint = (point) => ({
    x: chart.timeScale().timeToCoordinate(Number(point.time)),
    y: series.priceToCoordinate(Number(point.price))
  });
  const line = (x1, y1, x2, y2, color, widthValue = 2, dash = '') => {
    if (![x1, y1, x2, y2].every(Number.isFinite)) return;
    const item = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    item.setAttribute('x1', String(x1));
    item.setAttribute('y1', String(y1));
    item.setAttribute('x2', String(x2));
    item.setAttribute('y2', String(y2));
    item.setAttribute('stroke', color);
    item.setAttribute('stroke-width', String(widthValue));
    item.setAttribute('stroke-linecap', 'round');
    if (dash) item.setAttribute('stroke-dasharray', dash);
    layer.appendChild(item);
  };
  const label = (x, y, text, color) => {
    if (![x, y].every(Number.isFinite)) return;
    const item = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    item.setAttribute('x', String(x));
    item.setAttribute('y', String(y - 4));
    item.setAttribute('fill', color);
    item.setAttribute('font-size', '10');
    item.setAttribute('font-family', 'Arial, sans-serif');
    item.textContent = text;
    layer.appendChild(item);
  };
  drawings.forEach((drawing, drawingIndex) => {
    if (drawing.type === 'horizontal' && Number.isFinite(Number(drawing.price))) {
      const y = series.priceToCoordinate(Number(drawing.price));
      line(0, y, width, y, ${JSON.stringify(ui.accent)}, 2);
    }
    if (drawing.type === 'trend' && Array.isArray(drawing.points) && drawing.points.length >= 2) {
      const points = normalizePoints(drawing.points);
      if (!points) return;
      const start = toPoint(points[0]);
      const end = toPoint(points[1]);
      if (![start.x, start.y, end.x, end.y].every(Number.isFinite)) return;
      line(start.x, start.y, end.x, end.y, ${JSON.stringify(ui.accent)}, 2);
    }
    if (drawing.type === 'fibonacci' && Array.isArray(drawing.points) && drawing.points.length >= 2) {
      const points = normalizePoints(drawing.points);
      if (!points) return;
      const [start, end] = points;
      const startPoint = toPoint(start);
      const endPoint = toPoint(end);
      if (![startPoint.x, startPoint.y, endPoint.x, endPoint.y].every(Number.isFinite)) return;
      const high = Math.max(start.price, end.price);
      const low = Math.min(start.price, end.price);
      const left = Math.min(startPoint.x, endPoint.x);
      const right = width - 4;
      line(startPoint.x, startPoint.y, endPoint.x, endPoint.y, ${JSON.stringify(ui.accent)}, 1, '5 4');
      [0, .236, .382, .5, .618, .786, 1].forEach((level) => {
        const price = high - ((high - low) * level);
        const color = level === 0 || level === 1 ? ${JSON.stringify(ui.accent)} : 'rgba(212, 175, 55, .68)';
        const y = series.priceToCoordinate(price);
        line(left, y, right, y, color, 1, '5 4');
        if (drawingIndex === 0) label(left + 4, y, String(Math.round(level * 1000) / 10) + '%', color);
      });
    }
  });
}
function postToHost(payload) {
  const message = JSON.stringify(payload);
  if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
    window.ReactNativeWebView.postMessage(message);
    return;
  }
  window.parent?.postMessage(message, '*');
}
function handleChartClick(param) {
  postToHost({ type: 'chart-click' });
  if (!activeDrawingTool || activeDrawingTool === 'clear' || !param?.point) return;
  const time = chart.timeScale().coordinateToTime(param.point.x);
  const price = series.coordinateToPrice(param.point.y);
  if (time == null || !Number.isFinite(Number(price))) return;
  postToHost({
    type: 'drawing-point',
    tool: activeDrawingTool,
    point: { time: Number(time), price: Number(price) }
  });
}
function renderGraphSettings() {
  if (!data.length) return;
  const last = data[data.length - 1];
  const close = Number(last.close);
  const high = Number(last.high);
  const low = Number(last.low);
  const range = Math.max(Math.abs(high - low), Math.abs(close) * .00025);
  const addPriceLine = (enabled, price, color, title) => {
    if (!enabled || !Number.isFinite(price)) return;
    series.createPriceLine({
      price,
      color,
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: Boolean(tools.positionLabels),
      title: tools.positionLabels ? title : ''
    });
  };
  addPriceLine(tools.askLine, close + range * .6, ${JSON.stringify(ui.accent)}, 'ASK');
  addPriceLine(tools.positionLine, close, '#4fc3f7', 'POS');
  addPriceLine(tools.takeProfitLine, close + range * 2, ${JSON.stringify(ui.success)}, 'TP');
  addPriceLine(tools.stopLossLine, close - range * 2, ${JSON.stringify(ui.danger)}, 'SL');
  addPriceLine(tools.customBidAsk, close - range * .6, '#ffffff', 'BID');
}
let lastBar = data.length ? data[data.length - 1] : null;
let olderRequestPending = false;
function setDefaultVisibleRange() {
  if (!${recentView}) {
    chart.timeScale().fitContent();
    return;
  }
  chart.timeScale().setVisibleLogicalRange({
    from: Math.max(0, data.length - ${visibleBars}),
    to: data.length + 8
  });
}
function mergePrependCandles(candles) {
  if (!Array.isArray(candles) || !candles.length) {
    olderRequestPending = false;
    return;
  }
  const range = chart.timeScale().getVisibleLogicalRange?.();
  const previousLength = data.length;
  const byTime = new Map();
  candles.concat(data).forEach((bar) => {
    const candle = {
      time: Number(bar.time),
      open: Number(bar.open),
      high: Number(bar.high),
      low: Number(bar.low),
      close: Number(bar.close)
    };
    if (Object.values(candle).every(Number.isFinite)) byTime.set(candle.time, candle);
  });
  data = [...byTime.values()].sort((a, b) => a.time - b.time);
  if (data.length === previousLength) {
    olderRequestPending = false;
    return;
  }
  setMainData();
  lastBar = data[data.length - 1] || null;
  const added = data.length - previousLength;
  if (range && Number.isFinite(range.from) && Number.isFinite(range.to)) {
    chart.timeScale().setVisibleLogicalRange({ from: range.from + added, to: range.to + added });
  }
  olderRequestPending = false;
  requestAnimationFrame(renderDrawings);
}
function requestOlderIfNeeded(range) {
  if (!range || olderRequestPending || data.length < 2) return;
  if (Number(range.from) < 35) {
    olderRequestPending = true;
    postToHost({ type: 'load-older-candles' });
  }
}
if (data.length) {
  setMainData();
  renderIndicators();
  renderGraphSettings();
  chart.subscribeClick(handleChartClick);
  chart.subscribeCrosshairMove((param) => {
    if (!param?.point || param.point.x < 0 || param.point.y < 0) {
      clearHoverReadout();
      return;
    }
    setHoverReadout(getDisplayBar(param), param.point);
  });
  document.body.style.cursor = activeDrawingTool ? 'crosshair' : 'default';
  setDefaultVisibleRange();
  clearHoverReadout();
  requestAnimationFrame(renderDrawings);
  if (chart.timeScale().subscribeVisibleLogicalRangeChange) {
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      renderDrawings();
      requestOlderIfNeeded(range);
    });
  }
  window.addEventListener('resize', renderDrawings);
} else {
  document.getElementById('empty').style.display = 'block';
}
function applyLiveCandle(candle) {
  if (!candle || !Number.isFinite(Number(candle.time))) return;
  const next = {
    time: Number(candle.time),
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close)
  };
  if (!Object.values(next).every(Number.isFinite)) return;
  lastBar = next;
  const index = data.findIndex((item) => Number(item.time) === Number(next.time));
  if (index >= 0) data[index] = next;
  else data.push(next);
  rememberBar(next);
  document.getElementById('empty').style.display = 'none';
  if (chartType === 'candles' || chartType === 'combo' || chartType === 'bar' || chartType === 'hollow') {
    series.update(next);
  } else if (chartType === 'histogram') {
    series.update({
      time: next.time,
      value: next.close,
      color: next.close >= next.open ? 'rgba(18, 207, 122, .68)' : 'rgba(242, 77, 88, .68)'
    });
  } else {
    series.update({ time: next.time, value: next.close });
  }
  clearHoverReadout();
}
function receiveLiveUpdate(event) {
  let payload = event.data;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch {}
  }
  if (payload && payload.type === 'live-candle') applyLiveCandle(payload.candle);
  if (payload && payload.type === 'older-candles') mergePrependCandles(payload.candles);
  if (payload && payload.type === 'reset-view') setDefaultVisibleRange();
}
window.addEventListener('message', receiveLiveUpdate);
document.addEventListener('message', receiveLiveUpdate);
</script>
</body></html>`;
}

export default function TradingChart({ isFullscreen, onFullscreenChange, isAdmin }) {
  const { currentSymbol, openPosition, prices, setSelectedSymbol } = useDemoTrading();
  const { colors } = useAppTheme();
  const { notify } = useToast();
  const { height, width } = useWindowDimensions();
  const compactToolbar = width < 640;
  const narrowMobileToolbar = width < 380;
  const mobile = width < 760;
  const iconButtonSize = compactToolbar ? 26 : 32;
  const toolbarMenuTop = mobile ? 56 : compactToolbar ? 58 : 68;
  const timeframeHeight = compactToolbar ? 22 : 24;
  const timeframeMinWidth = compactToolbar ? 27 : 32;
  const chartMinHeight = mobile ? Math.min(Math.max(Math.round(height * 0.5), 390), 540) : compactToolbar ? 430 : 520;
  const indicatorPanelHeight = mobile ? Math.min(Math.max(Math.round(height * 0.54), 300), 430) : 330;
  const [timeframe, setTimeframe] = useState('15m');
  const [timeframeReady, setTimeframeReady] = useState(false);
  const [chartType, setChartType] = useState('candles');
  const [localFullscreen, setLocalFullscreen] = useState(false);
  const chartFullscreen = isFullscreen !== undefined ? isFullscreen : localFullscreen;
  const [chartMenuOpen, setChartMenuOpen] = useState(false);
  const [timeframeMenuOpen, setTimeframeMenuOpen] = useState(false);
  const [symbolMenuOpen, setSymbolMenuOpen] = useState(!mobile);
  const chartCardInset = 10;
  const chartListGap = 10;
  const symbolPanelWidth = mobile ? Math.min(width - 20, 360) : compactToolbar ? 320 : 340;
  const symbolPanelTop = mobile ? 56 : (compactToolbar ? 47 : 51);
  const timeframeMenuLeft = narrowMobileToolbar ? 116 : 126;
  const chartOffsetLeft = symbolMenuOpen && !mobile && !chartFullscreen ? symbolPanelWidth + chartListGap : 0;
  const chartPopoverLeft = chartOffsetLeft > 0 ? chartOffsetLeft + chartCardInset : 4;
  const chartPopoverRight = 8;
  const [hoveredSymbol, setHoveredSymbol] = useState(null);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [symbolTab, setSymbolTab] = useState('Popular');
  const [previousSymbolTab, setPreviousSymbolTab] = useState('Popular');
  const [symbolTabMenuOpen, setSymbolTabMenuOpen] = useState(false);
  const [favoriteSymbols, setFavoriteSymbols] = useState([]);
  const [indicatorOpen, setIndicatorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [drawings, setDrawings] = useState([]);
  const [activeDrawingTool, setActiveDrawingTool] = useState(null);
  const [pendingDrawingPoint, setPendingDrawingPoint] = useState(null);
  const [activeIndicator, setActiveIndicator] = useState('atr');
  const [tools, setTools] = useState({
    atr: false,
    atrPeriod: 14,
    awesome: false,
    awesomeShort: 5,
    awesomeLong: 34,
    bb: false,
    bbPeriod: 20,
    bbDeviation: 2,
    cci: false,
    cciPeriod: 20,
    ichimoku: false,
    ichimokuConversion: 9,
    ichimokuBase: 26,
    ichimokuSpan: 52,
    ichimokuDisplacement: 26,
    macd: false,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    momentum: false,
    momentumPeriod: 10,
    sar: false,
    sarAcceleration: 0.02,
    sarMax: 0.2,
    rsi: false,
    rsiPeriod: 14,
    roc: false,
    rocPeriod: 12,
    sma20: false,
    smaPeriod: 9,
    wma: false,
    wmaPeriod: 9,
    williams: false,
    williamsPeriod: 14,
    ema50: false,
    bollinger: false,
    volume: false,
    defaultLineWidth: 1,
    grid: true,
    crosshair: true,
    priceLine: true,
    askLine: false,
    positionLine: false,
    takeProfitLine: false,
    stopLossLine: false,
    positionLabels: false,
    customBidAsk: false,
  });
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [viewRange, setViewRange] = useState('Recent');
  const [reloadKey, setReloadKey] = useState(0);
  const [priceDirection, setPriceDirection] = useState(0);
  const [quickTradeLot, setQuickTradeLot] = useState(0.01);
  const [quickTradeLoading, setQuickTradeLoading] = useState(null);
  const [quickTradeMessage, setQuickTradeMessage] = useState('');
  const iframeRef = useRef(null);
  const webViewRef = useRef(null);
  const liveCandleRef = useRef(null);
  const previousPriceRef = useRef(null);
  const lastGapReloadAtRef = useRef(0);
  const lastGapReloadKeyRef = useRef('');
  const olderHistoryLoadingRef = useRef(false);
  const olderHistoryExhaustedRef = useRef(false);
  const earliestHistoryTimeRef = useRef(null);
  const timeframeStorageLoadedRef = useRef(false);
  const historyRetryCountRef = useRef(0);
  const favoriteStorageLoadedRef = useRef(false);

  useEffect(() => {
    let active = true;
    storage.get('chartTimeframe', '15m')
      .then((savedTimeframe) => {
        if (active && TIMEFRAMES.includes(savedTimeframe)) {
          setTimeframe(savedTimeframe);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!active) return;
        timeframeStorageLoadedRef.current = true;
        setTimeframeReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!timeframeReady) return;
    storage.set('chartTimeframe', timeframe).catch(() => {});
  }, [timeframe, timeframeReady]);

  useEffect(() => {
    if (chartFullscreen) {
      setSymbolMenuOpen(false);
      setSymbolTabMenuOpen(false);
    }
  }, [chartFullscreen]);

  const placeQuickTrade = useCallback(async (side) => {
    if (quickTradeLoading) return;
    const lots = Number(quickTradeLot.toFixed(2));
    setQuickTradeLoading(side);
    setQuickTradeMessage('');
    try {
      await openPosition(side, lots);
      setQuickTradeMessage(`${side} ${lots.toFixed(2)} placed`);
      notify({ type: 'success', title: 'Order placed', message: `${side} ${lots.toFixed(2)} order opened successfully.` });
      setTimeout(() => setQuickTradeMessage(''), 2200);
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Order failed';
      setQuickTradeMessage(message);
      notify({ type: 'error', title: 'Order rejected', message });
    } finally {
      setQuickTradeLoading(null);
    }
  }, [notify, openPosition, quickTradeLoading, quickTradeLot]);

  const changeQuickTradeLot = useCallback((delta) => {
    setQuickTradeLot((current) => {
      const next = Math.round((Number(current || 0.01) + delta) * 100) / 100;
      return Math.min(100, Math.max(0.01, next));
    });
  }, []);

  useEffect(() => {
    previousPriceRef.current = null;
    liveCandleRef.current = null;
    olderHistoryLoadingRef.current = false;
    olderHistoryExhaustedRef.current = false;
    earliestHistoryTimeRef.current = null;
    historyRetryCountRef.current = 0;
    lastGapReloadAtRef.current = 0;
    lastGapReloadKeyRef.current = '';
    setPriceDirection(0);
  }, [currentSymbol.symbol, timeframe, viewRange]);

  useEffect(() => {
    if (!timeframeReady) return undefined;
    let active = true;
    let retryTimer;
    const retryInitialHistory = () => {
      if (!active || historyRetryCountRef.current >= 2) return;
      historyRetryCountRef.current += 1;
      retryTimer = setTimeout(() => {
        if (active) setReloadKey((key) => key + 1);
      }, 2500 * historyRetryCountRef.current);
    };
    setHistoryLoading(true);
    setHistory([]);
    liveCandleRef.current = null;
    olderHistoryLoadingRef.current = false;
    olderHistoryExhaustedRef.current = false;
    earliestHistoryTimeRef.current = null;
    const limit = HISTORY_LIMITS[timeframe];
    loadCandlesWithRetry(currentSymbol.symbol, timeframe, limit)
      .then((candles) => {
        if (active) {
          const normalizedCandles = normalizeCandles(candles, timeframe, viewRange);
          setHistory(normalizedCandles);
          earliestHistoryTimeRef.current = normalizedCandles[0]?.time || null;
          liveCandleRef.current = normalizedCandles.length > 1 ? normalizedCandles[normalizedCandles.length - 1] : null;
          setHistoryLoading(false);
          if (normalizedCandles.length < 2) retryInitialHistory();
        }
      })
      .catch(() => {
        if (active) {
          setHistory([]);
          liveCandleRef.current = null;
          setHistoryLoading(false);
          retryInitialHistory();
        }
      });
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [currentSymbol.symbol, timeframe, timeframeReady, viewRange, reloadKey]);

  useEffect(() => {
    const price = Number(currentSymbol.price);
    if (!Number.isFinite(price) || price <= 0) return;

    const previousPrice = previousPriceRef.current;
    if (Number.isFinite(previousPrice)) {
      if (price > previousPrice) setPriceDirection(1);
      if (price < previousPrice) setPriceDirection(-1);
    }
    previousPriceRef.current = price;
  }, [currentSymbol.price, currentSymbol.symbol]);

  useEffect(() => {
    if (!hasLivePrice(currentSymbol)) return;
    if (historyLoading || history.length < 2 || !liveCandleRef.current) return;
    const price = Number(currentSymbol.price);
    const seconds = TIMEFRAME_SECONDS[timeframe] || 900;
    const time = Math.floor(Date.now() / 1000 / seconds) * seconds;
    const previous = liveCandleRef.current;
    const previousTime = Number(previous?.time);
    if (Number.isFinite(previousTime) && time < previousTime) return;

    const hasLargeGap = Number.isFinite(previousTime) && time - previousTime > liveGapGraceSeconds(timeframe);
    if (hasLargeGap) {
      const now = Date.now();
      const gapReloadKey = `${currentSymbol.symbol}:${timeframe}:${viewRange}:${previousTime}:${time}`;
      if (gapReloadKey !== lastGapReloadKeyRef.current && now - lastGapReloadAtRef.current > 30000) {
        lastGapReloadKeyRef.current = gapReloadKey;
        lastGapReloadAtRef.current = now;
        setReloadKey((value) => value + 1);
      }
      return;
    }

    const candle = previous && Number(previous.time) === time
      ? {
          ...previous,
          high: Math.max(Number(previous.high), price),
          low: Math.min(Number(previous.low), price),
          close: price,
      }
      : {
          time,
          open: previous && !hasLargeGap ? Number(previous.close) : price,
          high: Math.max(previous && !hasLargeGap ? Number(previous.close) : price, price),
          low: Math.min(previous && !hasLargeGap ? Number(previous.close) : price, price),
          close: price,
        };

    liveCandleRef.current = candle;
    const message = JSON.stringify({ type: 'live-candle', candle });

    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(message, '*');
      return;
    }

    webViewRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(message)} }));
      true;
    `);
  }, [currentSymbol.price, currentSymbol.source, currentSymbol.symbol, history.length, historyLoading, timeframe, viewRange]);

  const sendOlderCandlesToChart = useCallback((olderCandles) => {
    const message = JSON.stringify({ type: 'older-candles', candles: olderCandles });
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(message, '*');
      return;
    }

    webViewRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(message)} }));
      true;
    `);
  }, []);

  const loadOlderHistory = useCallback(async () => {
    const before = Number(earliestHistoryTimeRef.current);
    if (!Number.isFinite(before) || before <= 0) return;
    if (olderHistoryLoadingRef.current || olderHistoryExhaustedRef.current) return;

    olderHistoryLoadingRef.current = true;
    try {
      const pageLimit = HISTORY_PAGE_LIMITS[timeframe] || 500;
      const candles = await loadCandlesWithRetry(currentSymbol.symbol, timeframe, pageLimit, { before });
      const normalized = normalizeCandles(candles, timeframe, 'Full')
        .filter((candle) => Number(candle.time) < before);
      if (!normalized.length) {
        olderHistoryExhaustedRef.current = true;
        sendOlderCandlesToChart([]);
        return;
      }
      earliestHistoryTimeRef.current = normalized[0]?.time || before;
      sendOlderCandlesToChart(normalized);
    } catch {
      sendOlderCandlesToChart([]);
    } finally {
      olderHistoryLoadingRef.current = false;
    }
  }, [currentSymbol.symbol, sendOlderCandlesToChart, timeframe]);

  const candles = useMemo(() => history, [history]);
  const ui = useMemo(() => chartUiFromTheme(colors), [colors]);
  const html = useMemo(
    () => chartHtml(candles, currentSymbol.decimals, timeframe, chartType, tools, drawings, activeDrawingTool, ui, viewRange),
    [candles, currentSymbol.decimals, timeframe, chartType, tools, drawings, activeDrawingTool, ui, viewRange],
  );
  const chartDataKey = useMemo(() => {
    const first = candles?.[0]?.time || 0;
    const last = candles?.[candles.length - 1]?.time || 0;
    return `${candles.length}:${first}:${last}`;
  }, [candles]);
  const chartRenderKey = JSON.stringify({
    symbol: currentSymbol.symbol,
    timeframe,
    viewRange,
    chartDataKey,
    chartType,
    drawings: drawings.length,
    activeDrawingTool,
    tools,
    chartOffsetLeft,
    chartFullscreen,
  });
  const positive = priceDirection ? priceDirection > 0 : Number(currentSymbol.change) >= 0;
  const priceTone = positive ? ui.success : ui.danger;
  const fixedSpreadText = Number(currentSymbol.spreadPoints ?? currentSymbol.spread ?? 0).toFixed(1);
  const favoriteSymbolSet = useMemo(() => new Set(favoriteSymbols), [favoriteSymbols]);
  const symbolTabs = ['Popular', 'Crypto', 'Forex', 'Indices', 'Metals', 'Energies'];
  const filteredSymbols = useMemo(() => {
    const query = symbolSearch.trim().toLowerCase();
    const searchingAll = Boolean(query);
    return prices.filter((item) => {
      const group = String(item.group || '').toLowerCase();
      const matchesSearch = !query || item.symbol.toLowerCase().includes(query) || group.includes(query);
      const matchesTab = searchingAll
        ? true
        : symbolTab === 'Favorites'
        ? favoriteSymbolSet.has(item.symbol)
        : symbolTab === 'Popular'
        ? item.popular
        : symbolTab === 'Crypto'
          ? group.includes('crypto')
          : group.includes(symbolTab.toLowerCase());
      return matchesSearch && matchesTab;
    });
  }, [favoriteSymbolSet, prices, symbolSearch, symbolTab]);
  const activeChartType = CHART_TYPES.find(([key]) => key === chartType) || CHART_TYPES[0];
  const ActiveChartIcon = activeChartType[2];
  const activeIndicatorAddLabel = ({
    atr: 'ADD ATR',
    awesome: 'ADD AO',
    bb: 'ADD BB',
    cci: 'ADD CCI',
    ichimoku: 'ADD IKH',
    macd: 'ADD MACD',
    momentum: 'ADD MOM',
    sar: 'ADD PSAR',
    rsi: 'ADD RSI',
    roc: 'ADD ROC',
    sma20: 'ADD MOVING_AVERAGE',
    wma: 'ADD WMA',
    williams: 'ADD WILLIAMS',
  })[activeIndicator] || 'ADD INDICATOR';
  const activePeriodSetting = ({
    atr: ['atrPeriod', tools.atrPeriod],
  })[activeIndicator];
  const toggleTool = (key) => setTools((current) => ({ ...current, [key]: !current[key] }));
  const changeToolNumber = (key, delta, min = 1, max = 300, precision = 0) => {
    setTools((current) => {
      const clamped = Math.min(max, Math.max(min, Number(current[key] || 0) + delta));
      const next = precision > 0 ? Number(clamped.toFixed(precision)) : Math.round(clamped);
      return { ...current, [key]: next };
    });
  };
  const cycleLineWidth = () => {
    setTools((current) => ({
      ...current,
      defaultLineWidth: current.defaultLineWidth >= 4 ? 1 : Number(current.defaultLineWidth || 1) + 1,
    }));
  };
  const toggleChartMenu = () => {
    setChartMenuOpen((value) => !value);
    setTimeframeMenuOpen(false);
    setSymbolTabMenuOpen(false);
    setIndicatorOpen(false);
    setSettingsOpen(false);
    setDrawingOpen(false);
  };
  const toggleSymbolMenu = () => {
    setSymbolMenuOpen((value) => !value);
    setTimeframeMenuOpen(false);
    setSymbolTabMenuOpen(false);
    setChartMenuOpen(false);
    setIndicatorOpen(false);
    setSettingsOpen(false);
    setDrawingOpen(false);
  };
  const toggleIndicatorMenu = () => {
    setIndicatorOpen((value) => !value);
    setTimeframeMenuOpen(false);
    setSymbolTabMenuOpen(false);
    setChartMenuOpen(false);
    setSettingsOpen(false);
    setDrawingOpen(false);
  };
  const toggleSettingsMenu = () => {
    setSettingsOpen((value) => !value);
    setTimeframeMenuOpen(false);
    setSymbolTabMenuOpen(false);
    setChartMenuOpen(false);
    setIndicatorOpen(false);
    setDrawingOpen(false);
  };
  const toggleDrawingMenu = () => {
    setDrawingOpen((value) => !value);
    setTimeframeMenuOpen(false);
    setSymbolTabMenuOpen(false);
    setChartMenuOpen(false);
    setIndicatorOpen(false);
    setSettingsOpen(false);
  };
  const toggleChartFullscreen = () => {
    const nextVal = !chartFullscreen;
    if (isFullscreen === undefined) {
      setLocalFullscreen(nextVal);
    }
    if (onFullscreenChange) {
      onFullscreenChange(nextVal);
    }
    setSymbolTabMenuOpen(false);
    setChartMenuOpen(false);
    setIndicatorOpen(false);
    setSettingsOpen(false);
    setDrawingOpen(false);
  };
  const selectSymbolTab = (entry) => {
    setSymbolSearch('');
    if (entry === 'Favorites') {
      setSymbolTab((current) => (current === 'Favorites' ? previousSymbolTab : 'Favorites'));
      setSymbolTabMenuOpen(false);
      return;
    }
    setPreviousSymbolTab(entry);
    setSymbolTab(entry);
    setSymbolTabMenuOpen(false);
  };
  const toggleFavoriteSymbol = useCallback((symbol) => {
    setFavoriteSymbols((current) => (
      current.includes(symbol)
        ? current.filter((entry) => entry !== symbol)
        : [...current, symbol]
    ));
    setSymbolTabMenuOpen(false);
  }, []);
  const selectTimeframe = (entry) => {
    setTimeframe(entry);
    setTimeframeMenuOpen(false);
  };
  const selectSymbol = (symbol) => {
    setSelectedSymbol(symbol);
    setHoveredSymbol(null);
    setSymbolTabMenuOpen(false);
    if (chartFullscreen || mobile) {
      setSymbolMenuOpen(false);
    }
  };
  const applyDrawingTool = (key) => {
    if (key === 'clear') {
      setDrawings([]);
      setPendingDrawingPoint(null);
      setActiveDrawingTool(null);
    } else {
      setPendingDrawingPoint(null);
      setActiveDrawingTool(key);
    }
    setDrawingOpen(false);
  };
  const removeDrawing = (id) => {
    setDrawings((current) => current.filter((drawing) => String(drawing.id) !== String(id)));
    setPendingDrawingPoint(null);
  };
  const closeChartOverlays = useCallback(() => {
    setTimeframeMenuOpen(false);
    setChartMenuOpen(false);
    setIndicatorOpen(false);
    setSettingsOpen(false);
    setDrawingOpen(false);
    setSymbolTabMenuOpen(false);
    if (chartFullscreen || mobile) {
      setSymbolMenuOpen(false);
    }
  }, [chartFullscreen, mobile]);
  const handleDrawingPoint = useCallback((tool, point) => {
    if (!tool || !point) return;
    if (tool === 'horizontal') {
      setDrawings((current) => [...current, { id: Date.now(), type: tool, price: point.price }]);
      setActiveDrawingTool(null);
      setPendingDrawingPoint(null);
      return;
    }
    if (!pendingDrawingPoint || pendingDrawingPoint.tool !== tool) {
      setPendingDrawingPoint({ tool, point });
      return;
    }
    setDrawings((current) => [...current, { id: Date.now(), type: tool, points: [pendingDrawingPoint.point, point] }]);
    setActiveDrawingTool(null);
    setPendingDrawingPoint(null);
  }, [pendingDrawingPoint]);
  const handleChartMessage = useCallback((event) => {
    let payload = event?.nativeEvent?.data ?? event?.data;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { return; }
    }
    if (payload?.type === 'chart-click') closeChartOverlays();
    if (payload?.type === 'drawing-point') handleDrawingPoint(payload.tool, payload.point);
    if (payload?.type === 'load-older-candles') loadOlderHistory();
  }, [closeChartOverlays, handleDrawingPoint, loadOlderHistory]);
  const selectIndicatorTool = (key) => {
    setActiveIndicator(key);
  };
  const applyIndicatorTool = (key = activeIndicator) => {
    setActiveIndicator(key);
    const activeCount = INDICATOR_KEYS.filter((k) => tools[k]).length;
    
    if (!tools[key] && activeCount >= 3) {
      if (Platform.OS === 'web') {
        window.alert('Maximum of 3 indicators can be added.');
      } else {
        Alert.alert('Indicator Limit', 'Maximum of 3 indicators can be added.');
      }
      return;
    }

    setTools((current) => ({
      ...current,
      [key]: true,
      bollinger: key === 'bb' ? true : current.bollinger,
      volume: key === 'awesome' ? true : current.volume,
    }));
  };
  const addActiveIndicator = () => {
    applyIndicatorTool();
  };
  const removeIndicatorTool = (key) => {
    setTools((current) => ({
      ...current,
      [key]: false,
      bollinger: key === 'bb' ? false : current.bollinger,
      volume: key === 'awesome' ? false : current.volume,
      ema50: key === 'ema50' ? false : current.ema50,
    }));
  };
  const activeIndicatorItems = INDICATOR_KEYS
    .filter((key) => Boolean(tools[key]))
    .map((key) => ({ key, label: INDICATOR_SHORT_NAMES[key] || key.toUpperCase() }));
  const activeDrawingItems = drawings.map((drawing, index) => ({
    id: drawing.id,
    label: `${DRAWING_LABELS[drawing.type] || 'Drawing'} ${index + 1}`,
  }));
  const resetView = () => {
    const message = JSON.stringify({ type: 'reset-view' });
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(message, '*');
      return;
    }
    webViewRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(message)} }));
      true;
    `);
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    window.addEventListener('message', handleChartMessage);
    return () => window.removeEventListener('message', handleChartMessage);
  }, [handleChartMessage]);

  useEffect(() => {
    let active = true;
    storage.get('chartFavoriteSymbols', [])
      .then((savedFavorites) => {
        if (active && Array.isArray(savedFavorites)) {
          setFavoriteSymbols(savedFavorites.filter(Boolean));
        }
        favoriteStorageLoadedRef.current = true;
      })
      .catch(() => {
        favoriteStorageLoadedRef.current = true;
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!favoriteStorageLoadedRef.current) return;
    storage.set('chartFavoriteSymbols', favoriteSymbols).catch(() => {});
  }, [favoriteSymbols]);

  const chartRootStyle = chartFullscreen
    ? {
      flex: 1,
      height: '100%',
      minHeight: Platform.OS === 'web' ? '100vh' : '100%',
      width: '100%',
      backgroundColor: ui.background,
      borderColor: ui.border,
      zIndex: 9000,
      elevation: 9000,
    }
    : { minHeight: chartMinHeight, height: '100%', backgroundColor: ui.background, borderColor: ui.border };

  return (
    <View className="relative flex-1 overflow-hidden border" style={chartRootStyle}>
      <View className="relative border-b px-2 py-1.5 sm:px-3" style={{ backgroundColor: ui.toolbar, borderColor: ui.border, zIndex: 1000, elevation: 1000 }}>
        {mobile ? (
          <View className="px-0.5 py-0.5">
            {/* Row 1: Active Symbol Selector & Price/Change/Spread */}
            <View className="flex-row items-center justify-between">
              <Pressable onPress={toggleSymbolMenu} className="min-w-0 flex-row items-center rounded px-1 py-0.5" style={{ backgroundColor: symbolMenuOpen ? ui.soft : 'transparent', cursor: 'pointer' }}>
                <Text className="max-w-[96px] text-xs font-bold" numberOfLines={1} style={{ color: ui.text }}>{currentSymbol.symbol}</Text>
                <ChevronDown size={13} color={symbolMenuOpen ? ui.accent : ui.muted} strokeWidth={2.4} />
              </Pressable>
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <Text className="text-xs font-bold" numberOfLines={1} style={{ color: priceTone }}>{quote(currentSymbol.price, currentSymbol.decimals)}</Text>
                <Text className="text-[10px] font-medium" numberOfLines={1} style={{ color: priceTone }}>{percent(currentSymbol.change)}</Text>
                <Text className="text-[9px]" style={{ color: ui.muted }}>• Spread: {fixedSpreadText}</Text>
              </View>
            </View>

            {/* Row 2: Toolbar (Icons on Left, Timeframe Dropdown on Right) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-1"
              contentContainerStyle={{ alignItems: 'center', columnGap: 6, minWidth: '100%' }}
            >
              <View className="flex-row items-center" style={{ columnGap: 2, flexShrink: 0 }}>
                <IconButton active={chartMenuOpen} ui={ui} size={22} onPress={toggleChartMenu}>
                  <ActiveChartIcon size={11} color={chartMenuOpen ? ui.activeText : ui.text} />
                </IconButton>
                <IconButton active={indicatorOpen} ui={ui} size={22} onPress={toggleIndicatorMenu}>
                  <IndicatorGlyph active={indicatorOpen} ui={ui} size={7} />
                </IconButton>
                <IconButton active={settingsOpen} ui={ui} size={22} onPress={toggleSettingsMenu}>
                  <Settings size={11} color={settingsOpen ? ui.activeText : ui.text} />
                </IconButton>
                <IconButton active={drawingOpen || Boolean(activeDrawingTool)} ui={ui} size={22} onPress={toggleDrawingMenu}>
                  <LineChart size={12} color={drawingOpen || activeDrawingTool ? ui.activeText : ui.text} />
                </IconButton>
              </View>

              <View className="h-3 w-px" style={{ backgroundColor: ui.border, flexShrink: 0 }} />

              <View className="relative flex-row items-center" style={{ columnGap: 3, zIndex: 1200, elevation: 1200, flexShrink: 0 }}>
                <Pressable
                  onPress={() => {
                    setTimeframeMenuOpen((value) => !value);
                    setChartMenuOpen(false);
                    setIndicatorOpen(false);
                    setSettingsOpen(false);
                    setDrawingOpen(false);
                    setSymbolTabMenuOpen(false);
                  }}
                  className="h-5 flex-row items-center justify-between rounded border px-1.5"
                  style={{ minWidth: 52, flexShrink: 0, backgroundColor: timeframeMenuOpen ? ui.soft : ui.control, borderColor: timeframeMenuOpen ? ui.accent : ui.border }}
                >
                  <Text className="text-[9px] font-bold" style={{ color: timeframeMenuOpen ? ui.accent : ui.text }}>{timeframe}</Text>
                  <ChevronDown size={11} color={timeframeMenuOpen ? ui.accent : ui.muted} />
                </Pressable>
                {VIEW_RANGES.map((entry) => (
                  <Pressable
                    key={entry}
                    onPress={() => setViewRange(entry)}
                    className="items-center justify-center rounded"
                    style={{ height: 20, minWidth: 38, flexShrink: 0, paddingHorizontal: 4, backgroundColor: entry === viewRange ? ui.controlActive : 'transparent' }}
                  >
                    <Text className="font-bold" style={{ color: entry === viewRange ? ui.activeText : ui.muted, fontSize: 9 }}>{entry}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : (
          <>
            <View className="flex-row flex-wrap items-center" style={{ columnGap: compactToolbar ? 6 : 10, rowGap: 3 }}>
              <Pressable onPress={toggleSymbolMenu} className="flex-row items-center rounded-md px-1.5" style={{ height: compactToolbar ? 24 : 28, backgroundColor: symbolMenuOpen ? ui.soft : 'transparent', cursor: 'pointer', gap: compactToolbar ? 5 : 7 }}>
                <Text className="font-medium" style={{ color: ui.text, fontSize: compactToolbar ? 12 : 14 }}>{currentSymbol.symbol}</Text>
                <ChevronDown size={13} color={symbolMenuOpen ? ui.accent : ui.muted} strokeWidth={2.4} />
                <Text className="font-medium" style={{ color: priceTone, fontSize: compactToolbar ? 12 : 14 }}>{quote(currentSymbol.price, currentSymbol.decimals)}</Text>
                <Text className="font-medium" style={{ color: priceTone, fontSize: compactToolbar ? 10 : 12 }}>{percent(currentSymbol.change)}</Text>
                <Text className="text-[10px]" style={{ color: ui.muted }}>Spread: {fixedSpreadText}</Text>
              </Pressable>
              <View className="min-w-0 flex-1 flex-row flex-wrap items-center justify-end" style={{ columnGap: 1, rowGap: 1, minHeight: compactToolbar ? 22 : 28 }}>
                {TIMEFRAMES.map((entry) => (
                  <Pressable
                    key={entry}
                    onPress={() => selectTimeframe(entry)}
                    className="items-center justify-center rounded"
                    style={{ height: timeframeHeight, minWidth: timeframeMinWidth, paddingHorizontal: compactToolbar ? 5 : 8, backgroundColor: entry === timeframe ? ui.controlActive : 'transparent' }}
                  >
                    <Text className="font-medium" style={{ color: entry === timeframe ? ui.activeText : ui.muted, fontSize: compactToolbar ? 10 : 12 }}>{entry}</Text>
                  </Pressable>
                ))}
                <View className="mx-2 h-5 w-px" style={{ backgroundColor: ui.border }} />
                {VIEW_RANGES.map((entry) => (
                  <Pressable
                    key={entry}
                    onPress={() => setViewRange(entry)}
                    className="items-center justify-center rounded"
                    style={{ height: timeframeHeight, minWidth: compactToolbar ? 48 : 58, paddingHorizontal: compactToolbar ? 6 : 9, backgroundColor: entry === viewRange ? ui.controlActive : 'transparent' }}
                  >
                    <Text className="font-medium" style={{ color: entry === viewRange ? ui.activeText : ui.muted, fontSize: compactToolbar ? 10 : 12 }}>{entry}</Text>
                  </Pressable>
                ))}
                <View className="flex-row items-center" style={{ paddingLeft: compactToolbar ? 8 : 12, columnGap: compactToolbar ? 2 : 4 }}>
                  <IconButton active={chartMenuOpen} bare ui={ui} size={iconButtonSize} onPress={toggleChartMenu}>
                    <ActiveChartIcon size={compactToolbar ? 14 : 17} color={chartMenuOpen ? ui.accent : ui.text} />
                  </IconButton>
                  <IconButton active={indicatorOpen} bare ui={ui} size={iconButtonSize} onPress={toggleIndicatorMenu}>
                    <IndicatorGlyph active={indicatorOpen} activeColor={ui.accent} ui={ui} size={compactToolbar ? 10 : 12} />
                  </IconButton>
                  <IconButton active={settingsOpen} bare ui={ui} size={iconButtonSize} onPress={toggleSettingsMenu}>
                    <Settings size={compactToolbar ? 14 : 16} color={settingsOpen ? ui.accent : ui.text} />
                  </IconButton>
                  <IconButton active={drawingOpen || Boolean(activeDrawingTool)} bare ui={ui} size={iconButtonSize} onPress={toggleDrawingMenu}>
                    <LineChart size={compactToolbar ? 14 : 16} color={drawingOpen || activeDrawingTool ? ui.accent : ui.text} />
                  </IconButton>
                </View>
              </View>
            </View>
          </>
        )}
      </View>

      {mobile && timeframeMenuOpen ? (
        <View
          className="absolute w-[76px] rounded-lg border p-1 shadow-2xl"
          style={{
            left: timeframeMenuLeft,
            top: toolbarMenuTop,
            backgroundColor: ui.menu,
            borderColor: ui.menuBorder,
            zIndex: 5000,
            elevation: 5000,
          }}
        >
          <View className="flex-col" style={{ gap: 2 }}>
            {TIMEFRAMES.map((entry) => (
              <Pressable
                key={entry}
                onPress={() => selectTimeframe(entry)}
                className="h-8 items-center justify-center rounded-md"
                style={{ backgroundColor: entry === timeframe ? ui.soft : 'transparent' }}
              >
                <Text className="text-xs font-semimedium" style={{ color: entry === timeframe ? ui.accent : ui.text }}>{entry}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View className="flex-1 p-2.5" style={{ marginLeft: chartOffsetLeft, backgroundColor: ui.background, zIndex: 0, elevation: 0 }}>
        <View className="flex-1 overflow-hidden rounded-lg border" style={{ backgroundColor: ui.menu, borderColor: ui.menuBorder }}>
          {Platform.OS === 'web' ? (
            <iframe
              key={chartRenderKey}
              ref={iframeRef}
              title="Market chart"
              srcDoc={html}
              style={{ width: '100%', height: '100%', border: 0, position: 'relative', zIndex: 0 }}
            />
          ) : (
            <WebView
              key={chartRenderKey}
              ref={webViewRef}
              originWhitelist={['*']}
              domStorageEnabled
              javaScriptEnabled
              onMessage={handleChartMessage}
              source={{ html }}
              style={{ backgroundColor: colors.chartBackground, zIndex: 0, elevation: 0 }}
            />
          )}
          {chartFullscreen && !mobile && !isAdmin ? (
            <View className="absolute" style={{ top: compactToolbar ? 28 : 34, left: 12, width: 274, zIndex: 70, elevation: 70 }}>
              {quickTradeMessage ? (
                <View className="mb-2 self-center rounded-md border px-3 py-1.5" style={{ backgroundColor: ui.panel, borderColor: ui.border }}>
                  <Text className="text-[11px] font-medium" numberOfLines={1} style={{ color: quickTradeMessage.includes('failed') || quickTradeMessage.includes('Please') || quickTradeMessage.includes('Insufficient') ? ui.danger : ui.text }}>{quickTradeMessage}</Text>
                </View>
              ) : null}
              <View className="flex-row items-stretch rounded-md border p-0.5 shadow-2xl" style={{ backgroundColor: `${ui.background}E8`, borderColor: ui.border, gap: 3 }}>
                <Pressable
                  disabled={Boolean(quickTradeLoading)}
                  onPress={() => placeQuickTrade('SELL')}
                  className="h-[42px] flex-1 items-center justify-center rounded"
                  style={{ backgroundColor: ui.danger, opacity: quickTradeLoading && quickTradeLoading !== 'SELL' ? 0.72 : 1, cursor: 'pointer' }}
                >
                  <Text className="text-[9px] font-medium uppercase text-white">{quickTradeLoading === 'SELL' ? '...' : 'Sell'}</Text>
                  <Text className="text-xs font-medium text-white" numberOfLines={1}>{quote(currentSymbol.bid, currentSymbol.decimals)}</Text>
                </Pressable>

                <View className="h-[42px] flex-row items-center rounded border px-1.5" style={{ minWidth: 104, backgroundColor: ui.control, borderColor: ui.border }}>
                  <Pressable
                    onPress={() => changeQuickTradeLot(-0.01)}
                    className="h-7 w-7 items-center justify-center rounded"
                    style={{ backgroundColor: `${ui.danger}18`, cursor: 'pointer' }}
                  >
                    <Minus size={14} color={ui.danger} />
                  </Pressable>
                  <View className="min-w-[42px] flex-1 items-center px-1">
                    <Text className="text-[8px] font-medium uppercase" numberOfLines={1} style={{ color: ui.muted }}>Lot</Text>
                    <Text className="text-xs font-medium" numberOfLines={1} style={{ color: ui.text }}>{quickTradeLot.toFixed(2)}</Text>
                  </View>
                  <Pressable
                    onPress={() => changeQuickTradeLot(0.01)}
                    className="h-7 w-7 items-center justify-center rounded"
                    style={{ backgroundColor: `${QUICK_TRADE_BUY}18`, cursor: 'pointer' }}
                  >
                    <Plus size={14} color={QUICK_TRADE_BUY} />
                  </Pressable>
                </View>

                <Pressable
                  disabled={Boolean(quickTradeLoading)}
                  onPress={() => placeQuickTrade('BUY')}
                  className="h-[42px] flex-1 items-center justify-center rounded"
                  style={{ backgroundColor: QUICK_TRADE_BUY, opacity: quickTradeLoading && quickTradeLoading !== 'BUY' ? 0.72 : 1, cursor: 'pointer' }}
                >
                  <Text className="text-[9px] font-medium uppercase text-white">{quickTradeLoading === 'BUY' ? '...' : 'Buy'}</Text>
                  <Text className="text-xs font-medium text-white" numberOfLines={1}>{quote(currentSymbol.ask, currentSymbol.decimals)}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          {chartFullscreen && mobile && !isAdmin ? (
            <View
              className="absolute"
              style={{
                left: 12,
                right: 68,
                top: 40,
                zIndex: 80,
                elevation: 80,
              }}
            >
              {quickTradeMessage ? (
                <View className="mb-2 self-center rounded-md border px-3 py-1.5" style={{ backgroundColor: ui.panel, borderColor: ui.border }}>
                  <Text className="text-[11px] font-medium" numberOfLines={1} style={{ color: quickTradeMessage.includes('failed') || quickTradeMessage.includes('Please') || quickTradeMessage.includes('Insufficient') ? ui.danger : ui.text }}>{quickTradeMessage}</Text>
                </View>
              ) : null}
              <View className="flex-row items-center" style={{ gap: 5 }}>
                <View className="flex-row flex-1 items-stretch rounded-md border p-0.5 shadow-2xl" style={{ backgroundColor: `${ui.background}E8`, borderColor: ui.border, gap: 2 }}>
                  <Pressable
                    disabled={Boolean(quickTradeLoading)}
                    onPress={() => placeQuickTrade('SELL')}
                    className="h-[26px] flex-1 items-center justify-center rounded"
                    style={{ backgroundColor: ui.danger, opacity: quickTradeLoading && quickTradeLoading !== 'SELL' ? 0.72 : 1 }}
                  >
                    <Text className="text-[7px] font-medium uppercase text-white">{quickTradeLoading === 'SELL' ? '...' : 'Sell'}</Text>
                    <Text className="text-[8.5px] font-medium text-white" numberOfLines={1}>{quote(currentSymbol.bid, currentSymbol.decimals)}</Text>
                  </Pressable>

                  <View className="h-[26px] flex-row items-center rounded border px-0.5" style={{ minWidth: 72, backgroundColor: ui.control, borderColor: ui.border }}>
                    <Pressable
                      onPress={() => changeQuickTradeLot(-0.01)}
                      className="items-center justify-center rounded"
                      style={{ width: 18, height: 18, backgroundColor: `${ui.danger}18` }}
                    >
                      <Minus size={10} color={ui.danger} />
                    </Pressable>
                    <View className="min-w-[24px] flex-1 items-center px-0.5">
                      <Text className="text-[5.5px] font-medium uppercase" numberOfLines={1} style={{ color: ui.muted }}>Lot</Text>
                      <Text className="text-[8.5px] font-medium" numberOfLines={1} style={{ color: ui.text }}>{quickTradeLot.toFixed(2)}</Text>
                    </View>
                    <Pressable
                      onPress={() => changeQuickTradeLot(0.01)}
                      className="items-center justify-center rounded"
                      style={{ width: 18, height: 18, backgroundColor: `${QUICK_TRADE_BUY}18` }}
                    >
                      <Plus size={10} color={QUICK_TRADE_BUY} />
                    </Pressable>
                  </View>

                  <Pressable
                    disabled={Boolean(quickTradeLoading)}
                    onPress={() => placeQuickTrade('BUY')}
                    className="h-[26px] flex-1 items-center justify-center rounded"
                    style={{ backgroundColor: QUICK_TRADE_BUY, opacity: quickTradeLoading && quickTradeLoading !== 'BUY' ? 0.72 : 1 }}
                  >
                    <Text className="text-[7px] font-medium uppercase text-white">{quickTradeLoading === 'BUY' ? '...' : 'Buy'}</Text>
                    <Text className="text-[8.5px] font-medium text-white" numberOfLines={1}>{quote(currentSymbol.ask, currentSymbol.decimals)}</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={toggleChartFullscreen}
                  className="items-center justify-center rounded-md border shadow-2xl"
                  style={{
                    width: 30,
                    height: 30,
                    backgroundColor: ui.controlActive,
                    borderColor: ui.controlActive,
                    cursor: 'pointer'
                  }}
                >
                  <Minimize2 size={11} color={ui.activeText} />
                </Pressable>
              </View>
            </View>
          ) : null}
          {!(chartFullscreen && mobile && !isAdmin) ? (
            <Pressable
              onPress={toggleChartFullscreen}
              className="absolute items-center justify-center rounded-md border"
              style={{ top: mobile ? 24 : 10, right: 72, width: iconButtonSize, height: iconButtonSize, backgroundColor: chartFullscreen ? ui.controlActive : ui.control, borderColor: chartFullscreen ? ui.controlActive : ui.border, zIndex: 50, elevation: 50, cursor: 'pointer' }}
            >
              {chartFullscreen ? (
                <Minimize2 size={compactToolbar ? 14 : 16} color={ui.activeText} />
              ) : (
                <Maximize2 size={compactToolbar ? 14 : 16} color={ui.text} />
              )}
            </Pressable>
          ) : null}

          {mobile ? (
            (activeIndicatorItems.length || activeDrawingItems.length) ? (
              <View
                style={{
                  position: 'absolute',
                  flexDirection: chartFullscreen ? 'column' : 'row',
                  flexWrap: chartFullscreen ? 'nowrap' : 'wrap',
                  alignItems: chartFullscreen ? 'flex-end' : 'stretch',
                  justifyContent: chartFullscreen ? 'flex-start' : 'flex-end',
                  gap: 6,
                  top: chartFullscreen ? 76 : 24,
                  left: 10,
                  right: chartFullscreen ? 68 : 72 + iconButtonSize + 8,
                  zIndex: 55,
                  elevation: 55
                }}
              >
                {activeIndicatorItems.map((indicator) => (
                  <View key={indicator.key} className="h-7 flex-row items-center rounded-lg border pl-2.5 pr-1" style={{ backgroundColor: ui.control, borderColor: ui.border }}>
                    <Text className="text-[10px] font-medium" numberOfLines={1} style={{ maxWidth: compactToolbar ? 110 : 210, color: ui.text }}>{indicator.label}</Text>
                    <Pressable
                      onPress={() => removeIndicatorTool(indicator.key)}
                      className="ml-2 h-5 w-5 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${ui.danger}15`, cursor: 'pointer' }}
                    >
                      <X size={10} color={ui.danger} />
                    </Pressable>
                  </View>
                ))}
                {activeDrawingItems.map((drawing) => (
                  <View key={drawing.id} className="h-7 flex-row items-center rounded-lg border pl-2.5 pr-1" style={{ backgroundColor: ui.control, borderColor: ui.border }}>
                    <Text className="text-[10px] font-medium" numberOfLines={1} style={{ maxWidth: compactToolbar ? 110 : 210, color: ui.text }}>{drawing.label}</Text>
                    <Pressable
                      onPress={() => removeDrawing(drawing.id)}
                      className="ml-2 h-5 w-5 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${ui.danger}15`, cursor: 'pointer' }}
                    >
                      <X size={10} color={ui.danger} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null
          ) : (
            <>
              {(activeIndicatorItems.length || activeDrawingItems.length) ? (
                <View
                  style={{
                    position: 'absolute',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 6,
                    top: 48,
                    right: 72,
                    zIndex: 55,
                    elevation: 55
                  }}
                >
                  {activeIndicatorItems.map((indicator) => (
                    <View key={indicator.key} className="h-7 flex-row items-center rounded-lg border pl-2.5 pr-1" style={{ backgroundColor: ui.control, borderColor: ui.border }}>
                      <Text className="text-[10px] font-medium" numberOfLines={1} style={{ maxWidth: 210, color: ui.text }}>{indicator.label}</Text>
                      <Pressable
                        onPress={() => removeIndicatorTool(indicator.key)}
                        className="ml-2 h-5 w-5 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${ui.danger}15`, cursor: 'pointer' }}
                      >
                        <X size={10} color={ui.danger} />
                      </Pressable>
                    </View>
                  ))}
                  {activeDrawingItems.map((drawing) => (
                    <View key={drawing.id} className="h-7 flex-row items-center rounded-lg border pl-2.5 pr-1" style={{ backgroundColor: ui.control, borderColor: ui.border }}>
                      <Text className="text-[10px] font-medium" numberOfLines={1} style={{ maxWidth: 210, color: ui.text }}>{drawing.label}</Text>
                      <Pressable
                        onPress={() => removeDrawing(drawing.id)}
                        className="ml-2 h-5 w-5 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${ui.danger}15`, cursor: 'pointer' }}
                      >
                        <X size={10} color={ui.danger} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          )}
          {historyLoading ? (
            <View className="absolute inset-0" style={{ backgroundColor: `${ui.background}80`, zIndex: 45, elevation: 45 }} />
          ) : null}
        </View>
      </View>
        {symbolMenuOpen ? (
          <ChartSymbolPanel
            currentSymbol={currentSymbol}
            favoriteSymbols={favoriteSymbols}
            filteredSymbols={filteredSymbols}
            hoveredSymbol={hoveredSymbol}
            onClose={() => {
              setSymbolTabMenuOpen(false);
              setSymbolMenuOpen(false);
            }}
            onHoverSymbol={setHoveredSymbol}
            onSearchChange={setSymbolSearch}
            onSelectSymbol={selectSymbol}
            onSelectTab={selectSymbolTab}
            onToggleFavorite={toggleFavoriteSymbol}
            search={symbolSearch}
            symbolPanelTop={symbolPanelTop}
            symbolPanelWidth={symbolPanelWidth}
            symbolTabs={symbolTabs}
            symbolTab={symbolTab}
            symbolTabMenuOpen={symbolTabMenuOpen}
            setSymbolTabMenuOpen={setSymbolTabMenuOpen}
            ui={ui}
          />
        ) : null}

        {chartMenuOpen ? (
          <View className="absolute w-[132px] rounded-xl border p-1.5 shadow-2xl" style={{ right: chartPopoverRight, top: toolbarMenuTop, backgroundColor: ui.menu, borderColor: ui.menuBorder, zIndex: 3000, elevation: 3000 }}>
            {CHART_TYPES.map(([key, label, Icon]) => (
              <Pressable
                key={key}
                onPress={() => { setChartType(key); setChartMenuOpen(false); }}
                className="h-8 flex-row items-center rounded-md px-3"
                style={{ backgroundColor: key === chartType ? ui.soft : 'transparent' }}
              >
                <Icon size={15} color={key === chartType ? ui.accent : ui.text} />
                <Text className="ml-3 text-xs font-semimedium" style={{ color: key === chartType ? ui.accent : ui.text }}>{label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {indicatorOpen ? (
          <View className="absolute w-[560px] max-w-full flex-row overflow-hidden rounded-lg border shadow-2xl" style={{ right: chartPopoverRight, top: toolbarMenuTop, height: indicatorPanelHeight, backgroundColor: ui.panel, borderColor: ui.menuBorder, zIndex: 3000, elevation: 3000 }}>
            <View className="w-[210px] border-r" style={{ borderColor: ui.border }}>
              <View className="h-9 justify-center border-b px-3" style={{ borderColor: ui.border }}>
                <Text className="text-[11px] font-medium uppercase" style={{ color: ui.text }}>Indicators</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 5, paddingVertical: 8 }}>
                {INDICATOR_TOOLS.map(([key, label]) => (
                  <Pressable
                    key={key}
                    onPress={() => selectIndicatorTool(key)}
                    className="h-7 justify-center rounded-md px-2"
                    style={{ backgroundColor: activeIndicator === key ? ui.soft : 'transparent' }}
                  >
                    <Text className="text-[9px] font-semimedium" numberOfLines={1} style={{ color: activeIndicator === key ? ui.accent : ui.muted, textAlign: 'center' }}>{label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View className="min-h-0 flex-1">
              <View className="h-9 flex-row items-center justify-end border-b px-4" style={{ borderColor: ui.border }}>
                <Pressable onPress={() => setIndicatorOpen(false)} className="h-7 w-7 items-center justify-center">
                  <Text className="text-lg" style={{ color: ui.muted }}>x</Text>
                </Pressable>
              </View>
              <ScrollView className="min-h-0 flex-1" showsVerticalScrollIndicator contentContainerStyle={{ padding: 14, paddingBottom: 20 }}>
                {activePeriodSetting ? (
                  <>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Color</Text>
                    <View className="mb-3 flex-row items-center gap-3">
                      <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                        <View className="h-full w-full rounded-sm" style={{ backgroundColor: ui.accent }} />
                      </View>
                      <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                    </View>

                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Number of periods for calculation of the indicator</Text>
                    <View className="mb-3">
                      <Stepper
                        value={activePeriodSetting[1]}
                        onDecrease={() => changeToolNumber(activePeriodSetting[0], -1)}
                        onIncrease={() => changeToolNumber(activePeriodSetting[0], 1)}
                        ui={ui}
                      />
                    </View>
                  </>
                ) : null}

                {activeIndicator === 'bb' ? (
                  <>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Number of periods for calculation of the indicator</Text>
                    <View className="mb-3">
                      <Stepper
                        value={tools.bbPeriod}
                        onDecrease={() => changeToolNumber('bbPeriod', -1)}
                        onIncrease={() => changeToolNumber('bbPeriod', 1)}
                        ui={ui}
                      />
                    </View>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Moving Average Type</Text>
                    <View className="mb-3 h-8 flex-row items-center justify-between rounded-md border px-3" style={{ borderColor: ui.border, backgroundColor: ui.control }}>
                      <Text className="text-xs font-medium" style={{ color: ui.text }}>SMA</Text>
                      <ChevronDown size={14} color={ui.muted} />
                    </View>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Standard deviations multiplier</Text>
                    <View className="mb-3">
                      <Stepper
                        value={tools.bbDeviation}
                        onDecrease={() => changeToolNumber('bbDeviation', -0.1, 0.1, 10, 1)}
                        onIncrease={() => changeToolNumber('bbDeviation', 0.1, 0.1, 10, 1)}
                        ui={ui}
                        formatter={(value) => Number(value).toFixed(1)}
                      />
                    </View>
                    {[
                      ['Color of top band', 'rgba(212, 175, 55, .78)'],
                      ['Color of middle band', 'rgba(255, 255, 255, .42)'],
                      ['Color of bottom band', 'rgba(212, 175, 55, .78)'],
                    ].map(([label, color]) => (
                      <View key={label} className="mb-3">
                        <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>{label}</Text>
                        <View className="flex-row items-center gap-3">
                          <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                            <View className="h-full w-full rounded-sm" style={{ backgroundColor: color }} />
                          </View>
                          <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                        </View>
                      </View>
                    ))}
                  </>
                ) : null}
                {activeIndicator === 'cci' ? (
                  <>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Number of periods for calculation of the indicator</Text>
                    <View className="mb-3">
                      <Stepper
                        value={tools.cciPeriod}
                        onDecrease={() => changeToolNumber('cciPeriod', -1)}
                        onIncrease={() => changeToolNumber('cciPeriod', 1)}
                        ui={ui}
                      />
                    </View>
                    {[
                      ['Color', '#ffb84d'],
                      ['Color', '#8aa8ff'],
                    ].map(([label, color], index) => (
                      <View key={`${label}-${index}`} className="mb-3">
                        <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>{label}</Text>
                        <View className="flex-row items-center gap-3">
                          <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                            <View className="h-full w-full rounded-sm" style={{ backgroundColor: color }} />
                          </View>
                          <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                        </View>
                      </View>
                    ))}
                  </>
                ) : null}
                {activeIndicator === 'ichimoku' ? (
                  <>
                    {[
                      ['Conversion period', 'ichimokuConversion', tools.ichimokuConversion],
                      ['Base period', 'ichimokuBase', tools.ichimokuBase],
                      ['Span period', 'ichimokuSpan', tools.ichimokuSpan],
                      ['Displacement', 'ichimokuDisplacement', tools.ichimokuDisplacement],
                    ].map(([label, key, value]) => (
                      <View key={label} className="mb-3">
                        <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>{label}</Text>
                        <Stepper
                          value={value}
                          onDecrease={() => changeToolNumber(key, -1)}
                          onIncrease={() => changeToolNumber(key, 1)}
                          ui={ui}
                        />
                      </View>
                    ))}
                    {[
                      ['Conversion Line Color', '#4fc3f7'],
                      ['Base Line Color', '#f24d58'],
                      ['Leading Span A Color', '#0C9F91'],
                      ['Leading Span B Color', '#ffb84d'],
                    ].map(([label, color]) => (
                      <View key={label} className="mb-3">
                        <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>{label}</Text>
                        <View className="flex-row items-center gap-3">
                          <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                            <View className="h-full w-full rounded-sm" style={{ backgroundColor: color }} />
                          </View>
                          <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                        </View>
                      </View>
                    ))}
                  </>
                ) : null}
                {activeIndicator === 'macd' ? (
                  <>
                    {[
                      ['Fast EMA period', 'macdFast', tools.macdFast],
                      ['Slow EMA period', 'macdSlow', tools.macdSlow],
                      ['Signal period', 'macdSignal', tools.macdSignal],
                    ].map(([label, key, value]) => (
                      <View key={label} className="mb-3">
                        <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>{label}</Text>
                        <Stepper
                          value={value}
                          onDecrease={() => changeToolNumber(key, -1)}
                          onIncrease={() => changeToolNumber(key, 1)}
                          ui={ui}
                        />
                      </View>
                    ))}
                    {[
                      ['MACD Line Color', '#4fc3f7'],
                      ['Signal Line Color', '#f24d58'],
                      ['Histogram Color', '#8aa8ff'],
                    ].map(([label, color]) => (
                      <View key={label} className="mb-3">
                        <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>{label}</Text>
                        <View className="flex-row items-center gap-3">
                          <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                            <View className="h-full w-full rounded-sm" style={{ backgroundColor: color }} />
                          </View>
                          <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                        </View>
                      </View>
                    ))}
                  </>
                ) : null}
                {activeIndicator === 'momentum' ? (
                  <>
                    {[
                      ['Color', '#0C9F91'],
                    ].map(([label, color], index) => (
                      <View key={`${label}-${index}`} className="mb-3">
                        <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>{label}</Text>
                        <View className="flex-row items-center gap-3">
                          <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                            <View className="h-full w-full rounded-sm" style={{ backgroundColor: color }} />
                          </View>
                          <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                        </View>
                      </View>
                    ))}
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Number of periods for calculation of the indicator</Text>
                    <View className="mb-3">
                      <Stepper
                        value={tools.momentumPeriod}
                        onDecrease={() => changeToolNumber('momentumPeriod', -1)}
                        onIncrease={() => changeToolNumber('momentumPeriod', 1)}
                        ui={ui}
                      />
                    </View>
                    {[
                      ['Color', '#8aa8ff'],
                    ].map(([label, color], index) => (
                      <View key={`${label}-${index + 1}`} className="mb-3">
                        <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>{label}</Text>
                        <View className="flex-row items-center gap-3">
                          <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                            <View className="h-full w-full rounded-sm" style={{ backgroundColor: color }} />
                          </View>
                          <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                        </View>
                      </View>
                    ))}
                  </>
                ) : null}
                {activeIndicator === 'sma20' ? (
                  <>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Color</Text>
                    <View className="mb-3 flex-row items-center gap-3">
                      <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                        <View className="h-full w-full rounded-sm" style={{ backgroundColor: ui.accent }} />
                      </View>
                      <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                    </View>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Number of periods for calculation of the indicator</Text>
                    <View className="mb-3">
                      <Stepper
                        value={tools.smaPeriod}
                        onDecrease={() => changeToolNumber('smaPeriod', -1)}
                        onIncrease={() => changeToolNumber('smaPeriod', 1)}
                        ui={ui}
                      />
                    </View>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Moving Average Type</Text>
                    <View className="mb-3 h-8 flex-row items-center justify-between rounded-md border px-3" style={{ borderColor: ui.border, backgroundColor: ui.control }}>
                      <Text className="text-xs font-medium" style={{ color: ui.text }}>SMA</Text>
                      <ChevronDown size={14} color={ui.muted} />
                    </View>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Color</Text>
                    <View className="mb-3 flex-row items-center gap-3">
                      <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                        <View className="h-full w-full rounded-sm" style={{ backgroundColor: ui.accent }} />
                      </View>
                      <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                    </View>
                  </>
                ) : null}
                {activeIndicator === 'wma' ? (
                  <>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Color</Text>
                    <View className="mb-3 flex-row items-center gap-3">
                      <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                        <View className="h-full w-full rounded-sm" style={{ backgroundColor: '#4fc3f7' }} />
                      </View>
                      <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                    </View>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Number of periods for calculation of the indicator</Text>
                    <View className="mb-3">
                      <Stepper
                        value={tools.wmaPeriod}
                        onDecrease={() => changeToolNumber('wmaPeriod', -1)}
                        onIncrease={() => changeToolNumber('wmaPeriod', 1)}
                        ui={ui}
                      />
                    </View>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Color</Text>
                    <View className="mb-3 flex-row items-center gap-3">
                      <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                        <View className="h-full w-full rounded-sm" style={{ backgroundColor: '#4fc3f7' }} />
                      </View>
                      <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                    </View>
                  </>
                ) : null}
                {activeIndicator === 'sar' ? (
                  <>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Color</Text>
                    <View className="mb-3 flex-row items-center gap-3">
                      <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                        <View className="h-full w-full rounded-sm" style={{ backgroundColor: '#ffffff' }} />
                      </View>
                      <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                    </View>
                    {[
                      ['Acceleration factor', 'sarAcceleration', tools.sarAcceleration],
                      ['Maximal value for Step parameter', 'sarMax', tools.sarMax],
                    ].map(([label, key, value]) => (
                      <View key={label} className="mb-3">
                        <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>{label}</Text>
                        <Stepper
                          value={value}
                          onDecrease={() => changeToolNumber(key, -0.01, 0.01, 1, 2)}
                          onIncrease={() => changeToolNumber(key, 0.01, 0.01, 1, 2)}
                          ui={ui}
                          formatter={(item) => Number(item).toFixed(2)}
                        />
                      </View>
                    ))}
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Color</Text>
                    <View className="mb-3 flex-row items-center gap-3">
                      <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                        <View className="h-full w-full rounded-sm" style={{ backgroundColor: '#f24d58' }} />
                      </View>
                      <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                    </View>
                  </>
                ) : null}
                {activeIndicator === 'rsi' ? (
                  <>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Color</Text>
                    <View className="mb-3 flex-row items-center gap-3">
                      <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                        <View className="h-full w-full rounded-sm" style={{ backgroundColor: '#b58cff' }} />
                      </View>
                      <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                    </View>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Number of periods for calculation of the indicator</Text>
                    <View className="mb-3">
                      <Stepper
                        value={tools.rsiPeriod}
                        onDecrease={() => changeToolNumber('rsiPeriod', -1)}
                        onIncrease={() => changeToolNumber('rsiPeriod', 1)}
                        ui={ui}
                      />
                    </View>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Color</Text>
                    <View className="mb-3 flex-row items-center gap-3">
                      <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                        <View className="h-full w-full rounded-sm" style={{ backgroundColor: '#8aa8ff' }} />
                      </View>
                      <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                    </View>
                  </>
                ) : null}
                {activeIndicator === 'roc' ? (
                  <>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Color</Text>
                    <View className="mb-3 flex-row items-center gap-3">
                      <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                        <View className="h-full w-full rounded-sm" style={{ backgroundColor: '#ffb84d' }} />
                      </View>
                      <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                    </View>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Number of periods for calculation of the indicator</Text>
                    <View className="mb-3">
                      <Stepper
                        value={tools.rocPeriod}
                        onDecrease={() => changeToolNumber('rocPeriod', -1)}
                        onIncrease={() => changeToolNumber('rocPeriod', 1)}
                        ui={ui}
                      />
                    </View>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Color</Text>
                    <View className="mb-3 flex-row items-center gap-3">
                      <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                        <View className="h-full w-full rounded-sm" style={{ backgroundColor: '#4fc3f7' }} />
                      </View>
                      <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                    </View>
                  </>
                ) : null}
                {activeIndicator === 'williams' ? (
                  <>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Color</Text>
                    <View className="mb-3 flex-row items-center gap-3">
                      <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                        <View className="h-full w-full rounded-sm" style={{ backgroundColor: '#8aa8ff' }} />
                      </View>
                      <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                    </View>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Number of periods for calculation of the indicator</Text>
                    <View className="mb-3">
                      <Stepper
                        value={tools.williamsPeriod}
                        onDecrease={() => changeToolNumber('williamsPeriod', -1)}
                        onIncrease={() => changeToolNumber('williamsPeriod', 1)}
                        ui={ui}
                      />
                    </View>
                    <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>Color</Text>
                    <View className="mb-3 flex-row items-center gap-3">
                      <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                        <View className="h-full w-full rounded-sm" style={{ backgroundColor: '#b58cff' }} />
                      </View>
                      <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                    </View>
                  </>
                ) : null}
                {activeIndicator === 'awesome' ? (
                  <>
                    {[
                      ['Number of periods for calculation of Short Term Moving Average', 'awesomeShort', tools.awesomeShort],
                      ['Number of periods for calculation of Long Term Moving Average', 'awesomeLong', tools.awesomeLong],
                    ].map(([label, key, value]) => (
                      <View key={label} className="mb-3">
                        <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>{label}</Text>
                        <Stepper
                          value={value}
                          onDecrease={() => changeToolNumber(key, -1)}
                          onIncrease={() => changeToolNumber(key, 1)}
                          ui={ui}
                        />
                      </View>
                    ))}
                    {[
                      ['Color', '#8aa8ff'],
                      ['Color', '#d9dce3'],
                    ].map(([label, color], index) => (
                      <View key={`${label}-${index}`} className="mb-3">
                        <Text className="mb-1 text-[10px] font-semimedium" style={{ color: ui.muted }}>{label}</Text>
                        <View className="flex-row items-center gap-3">
                          <View className="h-7 w-7 rounded border p-0.5" style={{ borderColor: ui.border }}>
                            <View className="h-full w-full rounded-sm" style={{ backgroundColor: color }} />
                          </View>
                          <LineWidthSelect value={tools.defaultLineWidth} onPress={cycleLineWidth} ui={ui} />
                        </View>
                      </View>
                    ))}
                  </>
                ) : null}
              </ScrollView>
              <View className="h-12 flex-row items-center justify-end border-t px-4" style={{ borderColor: ui.border, backgroundColor: ui.panel }}>
                <Pressable className="h-8 justify-center rounded-md px-5" style={{ backgroundColor: ui.controlActive }} onPress={addActiveIndicator}>
                  <Text className="text-[10px] font-medium" style={{ color: ui.activeText }}>{activeIndicatorAddLabel}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {settingsOpen ? (
          <ChartGraphSettingsPanel
            right={chartPopoverRight}
            top={toolbarMenuTop}
            tools={tools}
            toggleTool={toggleTool}
            ui={ui}
            onClose={() => setSettingsOpen(false)}
          />
        ) : null}
      {drawingOpen ? (
        <View className="absolute w-[194px] rounded-xl border p-2 shadow-2xl" style={{ right: chartPopoverRight, top: toolbarMenuTop, backgroundColor: ui.menu, borderColor: ui.menuBorder, zIndex: 3000, elevation: 3000 }}>
          {DRAWING_TOOLS.map(([key, label]) => {
            const danger = key === 'clear';
            const active = key === activeDrawingTool;
            return (
              <Pressable
                key={key}
                onPress={() => applyDrawingTool(key)}
                className="h-8 flex-row items-center rounded-md px-2"
                style={{ backgroundColor: active ? ui.soft : 'transparent' }}
              >
                {key === 'horizontal' ? (
                  <View className="w-8 items-center">
                    <View style={{ width: 16, height: 2, backgroundColor: active ? ui.accent : ui.text }} />
                  </View>
                ) : null}
                {key === 'trend' ? (
                  <View className="w-8 items-center">
                    <View style={{ width: 20, height: 2, backgroundColor: active ? ui.accent : ui.text, transform: [{ rotate: '-45deg' }] }} />
                  </View>
                ) : null}
                {key === 'fibonacci' ? (
                  <View className="w-8 items-center" style={{ rowGap: 2 }}>
                    {[0, 1, 2, 3, 4].map((item) => (
                      <View key={item} style={{ width: 18, height: 1.5, backgroundColor: active ? ui.accent : ui.text }} />
                    ))}
                  </View>
                ) : null}
                {danger ? (
                  <View className="w-8 items-center">
                    <Trash2 size={15} color={ui.danger} />
                  </View>
                ) : null}
                <Text className="text-xs font-semimedium" style={{ color: danger ? ui.danger : active ? ui.accent : ui.text }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

    </View>
  );
}
