import React, { useEffect, useRef, useState, useMemo } from "react";
import { usePortal } from "../../context/PortalContext";
import { getCompanyApiUrl } from "../../services/api";

export function getTradingViewSymbol(symbol: string, category?: string): string {
  const clean = symbol.replace("/", "").trim().toUpperCase();

  const overrides: Record<string, string> = {
    BCHEUR: "COINBASE:BCHEUR",
    BCHGBP: "COINBASE:BCHGBP",
    BTCEUR: "COINBASE:BTCEUR",
    BTCGBP: "COINBASE:BTCGBP",
    ETHEUR: "COINBASE:ETHEUR",
    ETHGBP: "COINBASE:ETHGBP",
    LTCEUR: "COINBASE:LTCEUR",
    LTCGBP: "COINBASE:LTCGBP",
    ASXAUD: "OANDA:AU200AUD",
    DAXEUR: "OANDA:DE30EUR",
    DJIUSD: "OANDA:US30USD",
    US30: "OANDA:US30USD",
    ESXEUR: "OANDA:EU50EUR",
    F40EUR: "OANDA:FR40EUR",
    FTSGBP: "OANDA:UK100GBP",
    HSIHKD: "OANDA:HK33HKD",
    IBXEUR: "OANDA:ESPIXEUR",
    NDXUSD: "OANDA:NAS100USD",
    NAS100: "OANDA:NAS100USD",
    NIKJPY: "OANDA:JP225USD",
    SPXUSD: "OANDA:SPX500USD",
    BRNUSD: "OANDA:BCOUSD",
    NGCUSD: "OANDA:NATGASUSD",
    WTIUSD: "OANDA:WTICOUSD",
    XAUUSD: "OANDA:XAUUSD",
    XAGUSD: "OANDA:XAGUSD",
    XPDUSD: "OANDA:XPDUSD",
    XPTUSD: "OANDA:XPTUSD",
  };

  if (overrides[clean]) return overrides[clean];

  if (
    category === "Crypto CFD" ||
    category === "Crypto" ||
    (clean.endsWith("USD") &&
      !clean.startsWith("EUR") &&
      !clean.startsWith("GBP") &&
      !clean.startsWith("AUD") &&
      !clean.startsWith("NZD") &&
      !clean.startsWith("CAD") &&
      !clean.startsWith("CHF") &&
      !clean.startsWith("USD"))
  ) {
    return `BINANCE:${clean.replace(/USD$/, "USDT")}`;
  }

  if (category === "Metals" || clean.startsWith("XAU") || clean.startsWith("XAG")) {
    return `OANDA:${clean}`;
  }

  if (category === "Indices") {
    return `OANDA:${clean}`;
  }

  return `FX:${clean}`;
}

const TIMEFRAME_MAP: Record<string, string> = {
  "1": "1m",
  "5": "5m",
  "15": "15m",
  "30": "30m",
  "60": "1H",
  "240": "4H",
  D: "1D",
  W: "1W",
  M: "1M",
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1H",
  "4h": "4H",
  "1D": "1D",
  "1W": "1W",
  "1M": "1M",
};

const TIMEFRAME_SECONDS: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1H": 3600,
  "4H": 14400,
  "1D": 86400,
  "1W": 604800,
  "1M": 2592000,
};

interface CandleBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingViewChartProps {
  symbol: string;
  interval?: string;
  viewRange?: "Full" | "Recent";
  theme?: "light" | "dark";
  height?: string | number;
  className?: string;
}

function generateFallbackCandles(
  basePrice: number,
  digits: number,
  timeframe: string,
  count = 300
): CandleBar[] {
  const seconds = TIMEFRAME_SECONDS[timeframe] || 900;
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - count * seconds;
  const candles: CandleBar[] = [];

  let price = basePrice || 1.085;
  const volatility = Math.max(0.0001, price * 0.0008);

  for (let i = 0; i < count; i++) {
    const time = startTime + i * seconds;
    const delta = (Math.random() - 0.495) * volatility;
    const open = price;
    const close = Number((open + delta).toFixed(digits));
    const high = Number((Math.max(open, close) + Math.random() * volatility * 0.4).toFixed(digits));
    const low = Number((Math.min(open, close) - Math.random() * volatility * 0.4).toFixed(digits));

    candles.push({ time, open, high, low, close });
    price = close;
  }

  return candles;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  interval = "15",
  viewRange = "Recent",
  height = "100%",
  className = "",
}) => {
  const { currentCompany, symbols, companyConfig } = usePortal();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [candlesData, setCandlesData] = useState<CandleBar[]>([]);
  const [selectedChartType, setSelectedChartType] = useState<string>("candlestick");
  const [showIndicatorsMenu, setShowIndicatorsMenu] = useState<boolean>(false);
  const [activeIndicators, setActiveIndicators] = useState<{
    ma: boolean;
    bb: boolean;
    rsi: boolean;
    macd: boolean;
  }>({
    ma: false,
    bb: false,
    rsi: false,
    macd: false,
  });

  const timeframe = TIMEFRAME_MAP[interval] || "15m";

  const symbolObj = useMemo(() => {
    const cleanTarget = symbol.replace("/", "").toUpperCase();
    return (
      symbols.find(
        (s) => s.symbol === symbol || s.symbol.replace("/", "").toUpperCase() === cleanTarget
      ) ||
      symbols[0] ||
      null
    );
  }, [symbols, symbol]);

  const digits = symbolObj?.digits || 5;

  // Fetch broker candle history when symbol, timeframe, or company changes.
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    const fetchCandles = async () => {
      const cleanSym = symbol.replace("/", "").toUpperCase();
      const slashSym = symbol.includes("/") ? symbol : `${symbol.slice(0, 3)}/${symbol.slice(3)}`;

      // Build candle URLs using dynamic getCompanyApiUrl() — works in dev (proxy) and production (server.novafxm.com/api)
      const novafxmBase = getCompanyApiUrl("novafxm");
      const currentBase = getCompanyApiUrl(currentCompany);

      const bases = Array.from(new Set([currentBase, novafxmBase]));
      const urls = [
        ...bases.flatMap((base) => [
          `${base}/market/candles/${cleanSym}?timeframe=${timeframe}&limit=500`,
          `${base}/market/candles/${encodeURIComponent(slashSym)}?timeframe=${timeframe}&limit=500`,
        ]),
        `/api/novafxm/market/candles/${cleanSym}?timeframe=${timeframe}&limit=500`,
        `/api/${currentCompany}/market/candles/${cleanSym}?timeframe=${timeframe}&limit=500`,
      ];

      let fetchedCandles: CandleBar[] = [];

      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        for (const url of urls) {
          try {
            const res = await fetch(url, { headers });
            if (res.ok) {
              const json = await res.json();
              if (json && Array.isArray(json.candles) && json.candles.length > 0) {
                fetchedCandles = json.candles
                  .map((c: any) => ({
                    time: Number(c.time),
                    open: Number(c.open),
                    high: Number(c.high),
                    low: Number(c.low),
                    close: Number(c.close),
                    volume: Number(c.volume || 0),
                  }))
                  .filter((c: CandleBar) => Number.isFinite(c.time) && Number.isFinite(c.close))
                  .sort((a: CandleBar, b: CandleBar) => a.time - b.time);
                if (fetchedCandles.length > 0) break;
              }
            }
          } catch (e) {
            // Next URL
          }
        }
      } catch (err) {
        console.warn("Unable to load candle history:", err);
      }

      if (isMounted) {
        if (fetchedCandles.length > 0) {
          setCandlesData(fetchedCandles);
        } else {
          setCandlesData([]);
          setLoadError("Live candle history is unavailable. Check the market-data connection.");
        }
        setIsLoading(false);
      }
    };

    fetchCandles();

    return () => {
      isMounted = false;
    };
  }, [symbol, timeframe, currentCompany]);

  // Stream Live Ticks via postMessage without re-rendering iframe HTML
  useEffect(() => {
    if (!symbolObj || !iframeRef.current || !iframeRef.current.contentWindow) return;

    const price = symbolObj.bid;
    if (!price || price <= 0) return;

    const seconds = TIMEFRAME_SECONDS[timeframe] || 900;
    const time = Math.floor(Date.now() / 1000 / seconds) * seconds;

    iframeRef.current.contentWindow.postMessage(
      {
        type: "LIVE_TICK",
        symbol,
        price,
        time,
        digits,
      },
      "*"
    );
  }, [symbolObj?.bid, symbol, timeframe, digits]);

  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  const chartHtmlSrcDoc = useMemo(() => {
    if (candlesData.length === 0) return "";

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #chart-wrap { position: relative; width: 100%; height: 100%; display: flex; flex-direction: row; }
    
    /* Left Drawing Toolbar matching User Side */
    #drawing-toolbar {
      width: 36px;
      height: 100%;
      background: #ffffff;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 6px;
      gap: 6px;
      z-index: 30;
      user-select: none;
    }
    .tool-btn {
      width: 26px;
      height: 26px;
      border-radius: 5px;
      border: 1px solid transparent;
      background: transparent;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 12px;
      font-weight: bold;
      transition: all 0.1s;
    }
    .tool-btn:hover { background: #f1f5f9; color: #0f172a; border-color: #cbd5e1; }
    .tool-btn.active { background: ${brandPrimary}20; color: ${brandPrimary}; border-color: ${brandPrimary}; }
    
    /* Main Canvas Container */
    #main-container { position: relative; flex: 1; height: 100%; }
    #chart { width: 100%; height: 100%; }
    #svg-drawing-layer { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 15; }

    /* OHLC Top Overlay matching User Side (Image 2) */
    #ohlc-overlay {
      position: absolute;
      top: 8px;
      left: 10px;
      z-index: 25;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px 10px;
      font-size: 11.5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #334155;
      pointer-events: none;
      background: rgba(255,255,255,0.92);
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      backdrop-filter: blur(2px);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    #ohlc-overlay .sym { font-weight: 900; color: ${brandPrimary}; text-transform: uppercase; }
    #ohlc-overlay .val { font-weight: 700; color: #0f172a; }
    #ohlc-overlay .up { color: #089981; font-weight: 700; }
    #ohlc-overlay .down { color: #f23645; font-weight: 700; }
    div[class*="logo"], a[href*="tradingview"], .tv-lightweight-charts-logo, #tv-attr-logo {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
    }
  </style>
  <script src="https://unpkg.com/lightweight-charts@5/dist/lightweight-charts.standalone.production.js"></script>
</head>
<body>
  <div id="chart-wrap">
    <!-- Left Drawing Tools -->
    <div id="drawing-toolbar">
      <button class="tool-btn active" id="btn-crosshair" title="Crosshair Mode">✚</button>
      <button class="tool-btn" id="btn-trendline" title="Trend Line">╱</button>
      <button class="tool-btn" id="btn-horizontal" title="Horizontal Price Line">―</button>
      <button class="tool-btn" id="btn-fibonacci" title="Fibonacci Retracement">≡</button>
      <button class="tool-btn" id="btn-clear" title="Clear All Drawings" style="margin-top: auto; margin-bottom: 8px; color: #ef4444;">🗑</button>
    </div>

    <!-- Main Chart Container -->
    <div id="main-container">
      <div id="ohlc-overlay">
        <span class="sym">OHLC</span>
        <span>O <span id="o-val" class="val">-</span></span>
        <span>H <span id="h-val" class="val">-</span></span>
        <span>L <span id="l-val" class="val">-</span></span>
        <span>C <span id="c-val" class="val">-</span></span>
        <span id="chg-val" class="val">-</span>
      </div>
      <svg id="svg-drawing-layer"></svg>
      <div id="chart"></div>
    </div>
  </div>

  <script>
    (function() {
      const data = ${JSON.stringify(candlesData)};
      const digits = ${digits};
      const viewRange = ${JSON.stringify(viewRange)};
      const chartType = ${JSON.stringify(selectedChartType)};
      const activeInds = ${JSON.stringify(activeIndicators)};

      const container = document.getElementById('chart');
      const chart = LightweightCharts.createChart(container, {
        autoSize: true,
        layout: {
          background: { type: 'solid', color: '#ffffff' },
          textColor: '#475569',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          attributionLogo: false
        },
        grid: {
          vertLines: { color: '#f1f5f9' },
          horzLines: { color: '#f1f5f9' }
        },
        crosshair: {
          mode: LightweightCharts.CrosshairMode.Normal,
          vertLine: { color: '${brandPrimary}', width: 1, style: 3 },
          horzLine: { color: '${brandPrimary}', width: 1, style: 3 }
        },
        rightPriceScale: {
          borderColor: '#e2e8f0',
          autoScale: true
        },
        timeScale: {
          borderColor: '#e2e8f0',
          timeVisible: true,
          secondsVisible: false
        }
      });

      let series;
      if (chartType === 'line') {
        series = chart.addSeries(LightweightCharts.LineSeries, {
          color: '${brandPrimary}',
          lineWidth: 2,
          priceFormat: { type: 'price', precision: digits, minMove: Math.pow(10, -digits) }
        });
        series.setData(data.map(d => ({ time: d.time, value: d.close })));
      } else if (chartType === 'area') {
        series = chart.addSeries(LightweightCharts.AreaSeries, {
          topColor: '${brandPrimary}40',
          bottomColor: '${brandPrimary}00',
          lineColor: '${brandPrimary}',
          lineWidth: 2,
          priceFormat: { type: 'price', precision: digits, minMove: Math.pow(10, -digits) }
        });
        series.setData(data.map(d => ({ time: d.time, value: d.close })));
      } else {
        series = chart.addSeries(LightweightCharts.CandlestickSeries, {
          upColor: '#089981',
          downColor: '#f23645',
          borderUpColor: '#089981',
          borderDownColor: '#f23645',
          wickUpColor: '#089981',
          wickDownColor: '#f23645',
          priceFormat: { type: 'price', precision: digits, minMove: Math.pow(10, -digits) }
        });
        series.setData(data);
      }

      // Add Moving Average indicator (MA 20)
      if (activeInds.ma && data.length >= 20) {
        const maSeries = chart.addSeries(LightweightCharts.LineSeries, {
          color: '#3b82f6',
          lineWidth: 1.5,
          priceLineVisible: false,
          lastValueVisible: false
        });
        const maData = [];
        for (let i = 19; i < data.length; i++) {
          let sum = 0;
          for (let j = i - 19; j <= i; j++) sum += data[j].close;
          maData.push({ time: data[i].time, value: sum / 20 });
        }
        maSeries.setData(maData);
      }

      // Add Bollinger Bands (BB 20)
      if (activeInds.bb && data.length >= 20) {
        const upperSeries = chart.addSeries(LightweightCharts.LineSeries, { color: 'rgba(212, 175, 55, 0.8)', lineWidth: 1, priceLineVisible: false });
        const lowerSeries = chart.addSeries(LightweightCharts.LineSeries, { color: 'rgba(212, 175, 55, 0.8)', lineWidth: 1, priceLineVisible: false });
        const upperData = [];
        const lowerData = [];
        for (let i = 19; i < data.length; i++) {
          let sum = 0;
          for (let j = i - 19; j <= i; j++) sum += data[j].close;
          const mean = sum / 20;
          let variance = 0;
          for (let j = i - 19; j <= i; j++) variance += Math.pow(data[j].close - mean, 2);
          const stdDev = Math.sqrt(variance / 20);
          upperData.push({ time: data[i].time, value: mean + stdDev * 2 });
          lowerData.push({ time: data[i].time, value: mean - stdDev * 2 });
        }
        upperSeries.setData(upperData);
        lowerSeries.setData(lowerData);
      }

      if (viewRange === 'Recent') {
        const visibleBars = 120;
        chart.timeScale().setVisibleLogicalRange({
          from: Math.max(0, data.length - visibleBars),
          to: data.length + 5
        });
      } else {
        chart.timeScale().fitContent();
      }

      const oVal = document.getElementById('o-val');
      const hVal = document.getElementById('h-val');
      const lVal = document.getElementById('l-val');
      const cVal = document.getElementById('c-val');
      const chgVal = document.getElementById('chg-val');

      function updateOhlc(bar) {
        if (!bar) return;
        oVal.textContent = Number(bar.open || bar.value || 0).toFixed(digits);
        hVal.textContent = Number(bar.high || bar.value || 0).toFixed(digits);
        lVal.textContent = Number(bar.low || bar.value || 0).toFixed(digits);
        cVal.textContent = Number(bar.close || bar.value || 0).toFixed(digits);

        const open = bar.open || bar.value;
        const close = bar.close || bar.value;
        const diff = close - open;
        const pct = open ? (diff / open) * 100 : 0;
        const tone = diff >= 0 ? 'up' : 'down';
        chgVal.className = tone;
        chgVal.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(digits) + ' (' + (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%)';
      }

      if (data.length > 0) {
        updateOhlc(data[data.length - 1]);
      }

      chart.subscribeCrosshairMove(function(param) {
        if (param && param.time) {
          const bar = param.seriesData.get(series);
          if (bar) updateOhlc(bar);
        } else if (data.length > 0) {
          updateOhlc(data[data.length - 1]);
        }
      });

      const tfSeconds = ${TIMEFRAME_SECONDS[timeframe] || 900};
      let currentBars = [...data];

      window.addEventListener('message', function(event) {
        if (!event.data || event.data.type !== 'LIVE_TICK') return;
        const tick = event.data;
        const price = Number(tick.price);
        const tickTime = Number(tick.time);
        if (!price || !tickTime) return;

        if (currentBars.length === 0) {
          const newBar = { time: tickTime, open: price, high: price, low: price, close: price };
          currentBars.push(newBar);
          if (chartType === 'candlestick') series.update(newBar);
          else series.update({ time: newBar.time, value: newBar.close });
          updateOhlc(newBar);
          return;
        }

        const lastBar = currentBars[currentBars.length - 1];
        const barTime = lastBar.time;

        if (tickTime >= barTime + tfSeconds) {
          const newBarTime = Math.floor(tickTime / tfSeconds) * tfSeconds;
          const newBar = {
            time: newBarTime > barTime ? newBarTime : barTime + tfSeconds,
            open: lastBar.close,
            high: Math.max(lastBar.close, price),
            low: Math.min(lastBar.close, price),
            close: price
          };
          currentBars.push(newBar);
          if (chartType === 'candlestick') series.update(newBar);
          else series.update({ time: newBar.time, value: newBar.close });
          updateOhlc(newBar);
        } else {
          const updated = {
            ...lastBar,
            high: Math.max(lastBar.high, price),
            low: Math.min(lastBar.low, price),
            close: price
          };
          currentBars[currentBars.length - 1] = updated;
          if (chartType === 'candlestick') series.update(updated);
          else series.update({ time: updated.time, value: updated.close });
          updateOhlc(updated);
        }
      });

      // Drawing Tool buttons interactive handlers
      let activeTool = 'crosshair';
      const btns = ['btn-crosshair', 'btn-trendline', 'btn-horizontal', 'btn-fibonacci'];
      btns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.addEventListener('click', function() {
            btns.forEach(b => document.getElementById(b)?.classList.remove('active'));
            btn.classList.add('active');
            activeTool = id.replace('btn-', '');
          });
        }
      });
      document.getElementById('btn-clear')?.addEventListener('click', function() {
        document.getElementById('svg-drawing-layer').innerHTML = '';
      });
    })();
  </script>
</body>
</html>`;
  }, [candlesData, digits, viewRange, companyConfig, selectedChartType, activeIndicators]);

  return (
    <div className={`relative w-full h-full flex flex-col overflow-hidden bg-white ${className}`} style={{ height }}>
      {/* Top Chart Toolbar: Chart Type & Indicators Dropdown */}
      <div className="px-3 py-1.5 bg-[#fdfdfd] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20 text-xs font-sans">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-slate-800 tracking-tight font-mono">{symbol}</span>

          {/* Chart Type Selector */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setSelectedChartType("candlestick")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                selectedChartType === "candlestick"
                  ? "bg-white text-slate-900 shadow-2xs font-extrabold border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Candles
            </button>
            <button
              onClick={() => setSelectedChartType("line")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                selectedChartType === "line"
                  ? "bg-white text-slate-900 shadow-2xs font-extrabold border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Line
            </button>
            <button
              onClick={() => setSelectedChartType("area")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                selectedChartType === "area"
                  ? "bg-white text-slate-900 shadow-2xs font-extrabold border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Area
            </button>
          </div>

          {/* Indicators Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowIndicatorsMenu((prev) => !prev)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <span className="text-amber-600 font-mono font-black">f(x)</span>
              <span>Indicators</span>
            </button>

            {showIndicatorsMenu && (
              <div className="absolute left-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-fadeIn text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                  Active Indicators
                </div>
                <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded cursor-pointer font-medium text-slate-700">
                  <span>Moving Avg (MA 20)</span>
                  <input
                    type="checkbox"
                    checked={activeIndicators.ma}
                    onChange={(e) => setActiveIndicators((prev) => ({ ...prev, ma: e.target.checked }))}
                    className="rounded text-amber-600 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded cursor-pointer font-medium text-slate-700">
                  <span>Bollinger Bands (BB)</span>
                  <input
                    type="checkbox"
                    checked={activeIndicators.bb}
                    onChange={(e) => setActiveIndicators((prev) => ({ ...prev, bb: e.target.checked }))}
                    className="rounded text-amber-600 focus:ring-0"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Source Badge */}
        <div className="text-[10.5px] font-mono text-slate-500">
           <strong className="text-slate-800 font-bold"></strong> ({timeframe})
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 w-full bg-white overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 backdrop-blur-xs">
            <div
              className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin mb-2"
              style={{ borderColor: companyConfig?.primaryColor || "#D97706", borderTopColor: "transparent" }}
            />
            <span className="text-xs font-mono font-bold text-slate-700">
              Loading Candlesticks ({symbol})...
            </span>
          </div>
        )}

        {loadError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-rose-50/70 text-xs font-medium text-rose-700">
            {loadError}
          </div>
        ) : chartHtmlSrcDoc ? (
          <iframe
            ref={iframeRef}
            srcDoc={chartHtmlSrcDoc}
            title={`${symbol} Candlestick Chart`}
            className="w-full h-full border-0"
          />
        ) : null}
      </div>
    </div>
  );
};
