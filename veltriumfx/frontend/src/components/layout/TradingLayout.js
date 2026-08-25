import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  Briefcase,
  CandlestickChart,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ListFilter,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react-native';
import TopAccountBar from '../header/TopAccountBar';
import TradingChart from '../chart/TradingChart';
import OrderPanel from '../order/OrderPanel';
import SymbolPanel from '../market/SymbolPanel';
import InsufficientFundsModal from '../order/InsufficientFundsModal';
import OpenPositions from '../positions/OpenPositions';
import MarketOverviewWidget from '../market/MarketOverviewWidget';
import AccountHealthGauge from '../account/AccountHealthGauge';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import BirthdayWidget from '../account/BirthdayWidget';
import BirthdayModal from '../account/BirthdayModal';

export default function TradingLayout() {
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const { darkMode, colors } = useAppTheme();
  const { user, isAdmin } = useAuth();
  const {
    summary,
    insufficientFundsVisible,
    setInsufficientFundsVisible,
    sidePanel,
    setSidePanel,
  } = useDemoTrading();

  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [mobileTab, setMobileTab] = useState('chart'); // 'markets', 'chart', 'positions'
  const [leftWatchlistVisible, setLeftWatchlistVisible] = useState(true);
  const [rightOrderPanelVisible, setRightOrderPanelVisible] = useState(true);

  const desktop = width >= 1180;
  const tablet = width >= 760 && width < 1180;
  const mobile = width < 760;

  // Chart height calculations
  const chartAreaHeight = desktop
    ? Math.max(520, Math.min(680, height - 220))
    : tablet
      ? Math.max(480, Math.min(620, height - 230))
      : Math.max(380, Math.min(520, height - 240));

  useEffect(() => {
    if (params.panel === 'verification') setSidePanel('verification');
    if (params.panel === 'history') {
      setSidePanel('history');
      if (mobile) setMobileTab('positions');
    }
    if (params.panel === 'settings') {
      const section = typeof params.section === 'string' && params.section ? params.section : 'profile';
      setSidePanel(`settings:${section}`);
    }
  }, [mobile, params.panel, params.section, setSidePanel]);

  // Mobile View
  if (mobile) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        {!chartFullscreen && <TopAccountBar />}

        <View className="flex-1" style={{ paddingBottom: chartFullscreen ? 0 : 52 }}>
          {mobileTab === 'markets' ? (
            <View className="flex-1 p-2">
              <SymbolPanel onSelectSymbol={() => setMobileTab('chart')} />
            </View>
          ) : mobileTab === 'positions' ? (
            <ScrollView className="flex-1 p-2" contentContainerStyle={{ paddingBottom: 24 }}>
              <OpenPositions showOverview={false} />
            </ScrollView>
          ) : (
            <View className="flex-1">
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 6, paddingBottom: 112 }}
                showsVerticalScrollIndicator={false}
              >
                <View style={{ height: chartFullscreen ? undefined : chartAreaHeight }} className="overflow-hidden rounded-xl">
                  <TradingChart
                    isFullscreen={chartFullscreen}
                    onFullscreenChange={setChartFullscreen}
                    isAdmin={isAdmin}
                  />
                </View>
                {!chartFullscreen ? (
                  <View className="mt-2 gap-2.5">
                    <MarketOverviewWidget />
                    <AccountHealthGauge />
                  </View>
                ) : null}
              </ScrollView>

              {!chartFullscreen ? <OrderPanel /> : null}
            </View>
          )}
        </View>

        {/* Mobile Bottom Navigation Bar */}
        {!chartFullscreen ? (
          <View
            className="flex-row items-center justify-around border-t"
            style={{
              backgroundColor: colors.panel,
              borderColor: colors.border,
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: 50,
              zIndex: 4000,
              elevation: 4000,
            }}
          >
            {/* Markets Tab */}
            <Pressable
              onPress={() => setMobileTab('markets')}
              className="items-center justify-center flex-1 py-1"
            >
              <View
                className="items-center justify-center w-8 h-8 rounded-full"
                style={{
                  backgroundColor: mobileTab === 'markets' ? `${colors.primary}20` : 'transparent',
                }}
              >
                <ListFilter
                  size={16}
                  color={mobileTab === 'markets' ? colors.primary : colors.muted}
                />
              </View>
              <Text
                className="text-[9.5px] font-bold"
                style={{ color: mobileTab === 'markets' ? colors.primary : colors.muted }}
              >
                Markets
              </Text>
            </Pressable>

            {/* Chart Tab */}
            <Pressable
              onPress={() => setMobileTab('chart')}
              className="items-center justify-center flex-1 py-1"
            >
              <View
                className="items-center justify-center w-8 h-8 rounded-full"
                style={{
                  backgroundColor: mobileTab === 'chart' ? `${colors.primary}20` : 'transparent',
                }}
              >
                <CandlestickChart
                  size={16}
                  color={mobileTab === 'chart' ? colors.primary : colors.muted}
                />
              </View>
              <Text
                className="text-[9.5px] font-bold"
                style={{ color: mobileTab === 'chart' ? colors.primary : colors.muted }}
              >
                Chart
              </Text>
            </Pressable>

            {/* Positions Tab */}
            <Pressable
              onPress={() => setMobileTab('positions')}
              className="items-center justify-center flex-1 py-1"
            >
              <View
                className="items-center justify-center w-8 h-8 rounded-full"
                style={{
                  backgroundColor: mobileTab === 'positions' ? `${colors.primary}20` : 'transparent',
                }}
              >
                <Briefcase
                  size={16}
                  color={mobileTab === 'positions' ? colors.primary : colors.muted}
                />
              </View>
              <Text
                className="text-[9.5px] font-bold"
                style={{ color: mobileTab === 'positions' ? colors.primary : colors.muted }}
              >
                Positions
              </Text>
            </Pressable>
          </View>
        ) : null}

        <InsufficientFundsModal
          visible={insufficientFundsVisible}
          onClose={() => setInsufficientFundsVisible(false)}
        />
        <BirthdayModal />
      </View>
    );
  }

  // Desktop & Tablet 3-Column Responsive Layout
  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {!chartFullscreen && <TopAccountBar />}

      {/* Main 3-Column Workspace */}
      <View className="flex-row flex-1 min-h-0 p-2 gap-2.5">
        {/* Left Column: Market Watch Panel (Desktop) */}
        {!chartFullscreen && desktop && leftWatchlistVisible ? (
          <View className="h-full w-[290px] xl:w-[310px] shrink-0">
            <SymbolPanel />
          </View>
        ) : null}

        {/* Center Column: Trading Chart + Bottom Analytics & Positions */}
        <View className="flex-1 h-full min-w-0 min-h-0">
          <ScrollView
            scrollEnabled={!chartFullscreen}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {/* Main Candlestick Chart Area */}
            <View
              className="overflow-hidden rounded-xl border"
              style={{
                height: chartFullscreen ? '100%' : chartAreaHeight,
                borderColor: colors.border,
                backgroundColor: colors.panel,
              }}
            >
              <TradingChart
                isFullscreen={chartFullscreen}
                onFullscreenChange={setChartFullscreen}
                isAdmin={isAdmin}
              />
            </View>

            {/* Bottom Section: Market Overview Sentiment + Account Health Gauge + Positions/Orders/History */}
            {!chartFullscreen ? <OpenPositions /> : null}
          </ScrollView>
        </View>

        {/* Right Column: Order Ticket Panel (Desktop & Tablet) */}
        {!chartFullscreen && rightOrderPanelVisible ? (
          <View className="h-full w-[295px] xl:w-[320px] shrink-0">
            <OrderPanel />
          </View>
        ) : null}
      </View>

      <InsufficientFundsModal
        visible={insufficientFundsVisible}
        onClose={() => setInsufficientFundsVisible(false)}
      />
      <BirthdayModal />
    </View>
  );
}
