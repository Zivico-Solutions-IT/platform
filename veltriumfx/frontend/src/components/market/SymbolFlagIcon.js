import React from 'react';
import { Image, View, Text } from 'react-native';

const CURRENCY_FLAGS = {
  EUR: 'eu', USD: 'us', GBP: 'gb', JPY: 'jp', AUD: 'au', CAD: 'ca',
  CHF: 'ch', NZD: 'nz', SGD: 'sg', HKD: 'hk', TRY: 'tr', MXN: 'mx', CNH: 'cn',
  WTI: 'us', SPX: 'us', NDX: 'us', DJI: 'us', DAX: 'de', FTSE: 'gb', FTS: 'gb',
  NIK: 'jp', HSI: 'hk', ASX: 'au',
};

function CountryFlag({ currency, size }) {
  const countryCode = CURRENCY_FLAGS[currency];
  if (!countryCode) return null;
  return (
    <Image
      source={{ uri: `https://flagcdn.com/w40/${countryCode}.png` }}
      style={{ width: size, height: size }}
      resizeMode="cover"
      accessibilityLabel={`${currency} flag`}
    />
  );
}

const CURRENCY_COLORS = {
  EUR: { bg: '#003399', text: '#FFCC00', label: '€' },
  USD: { bg: '#0A3161', text: '#FFFFFF', label: '$' },
  GBP: { bg: '#00247D', text: '#FFFFFF', label: '£' },
  JPY: { bg: '#BC002D', text: '#FFFFFF', label: '¥' },
  AUD: { bg: '#00008B', text: '#FFD700', label: 'A$' },
  CAD: { bg: '#FF0000', text: '#FFFFFF', label: 'C$' },
  CHF: { bg: '#D52B1E', text: '#FFFFFF', label: 'Fr' },
  NZD: { bg: '#00247D', text: '#CC142B', label: 'NZ' },
  SGD: { bg: '#ED2939', text: '#FFFFFF', label: 'S$' },
  HKD: { bg: '#C8102E', text: '#FFFFFF', label: 'HK' },
  TRY: { bg: '#E30A17', text: '#FFFFFF', label: '₺' },
  MXN: { bg: '#006847', text: '#FFFFFF', label: 'Mex' },
  CNH: { bg: '#DE2910', text: '#FFDE00', label: '¥' },

  // Crypto
  BTC: { bg: '#F7931A', text: '#FFFFFF', label: '₿' },
  ETH: { bg: '#627EEA', text: '#FFFFFF', label: 'Ξ' },
  SOL: { bg: '#14F195', text: '#000000', label: 'SOL' },
  XRP: { bg: '#23292F', text: '#FFFFFF', label: 'XRP' },
  BNB: { bg: '#F3BA2F', text: '#000000', label: 'BNB' },
  DOGE: { bg: '#C2A633', text: '#FFFFFF', label: 'Ð' },
  ADA: { bg: '#0033AD', text: '#FFFFFF', label: 'ADA' },
  AVAX: { bg: '#E84142', text: '#FFFFFF', label: 'AVAX' },
  LINK: { bg: '#375BD2', text: '#FFFFFF', label: 'LINK' },
  DOT: { bg: '#E6007A', text: '#FFFFFF', label: 'DOT' },
  NEAR: { bg: '#000000', text: '#FFFFFF', label: 'NEAR' },

  // Commodities & Indices
  XAU: { bg: '#D4AF37', text: '#111111', label: 'AU' },
  XAG: { bg: '#C0C0C0', text: '#111111', label: 'AG' },
  WTI: { bg: '#2A2A2A', text: '#FFA500', label: 'OIL' },
  BRN: { bg: '#1C2833', text: '#FFA500', label: 'BCO' },
  NGC: { bg: '#2980B9', text: '#FFFFFF', label: 'GAS' },
  SPX: { bg: '#1E88E5', text: '#FFFFFF', label: 'SPX' },
  NDX: { bg: '#7B1FA2', text: '#FFFFFF', label: 'NAS' },
  DJI: { bg: '#0D47A1', text: '#FFFFFF', label: 'US30' },
  DAX: { bg: '#D32F2F', text: '#FFFFFF', label: 'DAX' },
  FTSE: { bg: '#004D40', text: '#FFFFFF', label: 'UK' },
  FTS: { bg: '#004D40', text: '#FFFFFF', label: 'UK' },
  NIK: { bg: '#C2185B', text: '#FFFFFF', label: 'JP' },
  HSI: { bg: '#C62828', text: '#FFFFFF', label: 'HK' },
  ASX: { bg: '#00796B', text: '#FFFFFF', label: 'AU' },
};

export default function SymbolFlagIcon({ symbol = '', size = 26 }) {
  const cleanSymbol = String(symbol || '').trim();
  const parts = cleanSymbol.includes('/') ? cleanSymbol.split('/') : [cleanSymbol.slice(0, 3), cleanSymbol.slice(3)];
  const base = (parts[0] || '').toUpperCase();
  const quote = (parts[1] || '').toUpperCase();

  const baseConfig = CURRENCY_COLORS[base] || { bg: '#00674F', text: '#FFFFFF', label: base.slice(0, 2) || '$' };
  const quoteConfig = CURRENCY_COLORS[quote] || { bg: '#374151', text: '#FFFFFF', label: quote.slice(0, 2) || '' };

  const isDual = parts.length >= 2 && quote.length > 0;
  const singleSize = size;
  const dualCircleSize = Math.round(size * 0.82);

  if (!isDual || baseConfig.label.length > 2) {
    return (
      <View
        style={{
          width: singleSize,
          height: singleSize,
          borderRadius: singleSize / 2,
          backgroundColor: baseConfig.bg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.15)',
        }}
      >
        {CURRENCY_FLAGS[base] ? (
          <CountryFlag currency={base} size={singleSize} />
        ) : (
          <Text
            style={{ color: baseConfig.text, fontSize: baseConfig.label.length > 2 ? 8 : 10, fontWeight: '700' }}
            numberOfLines={1}
          >
            {baseConfig.label}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={{ width: size + 6, height: size, position: 'relative' }}>
      {/* Base currency circle (left) */}
      <View
        style={{
          width: dualCircleSize,
          height: dualCircleSize,
          borderRadius: dualCircleSize / 2,
          backgroundColor: baseConfig.bg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'absolute',
          left: 0,
          top: 0,
          zIndex: 2,
          borderWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
        }}
      >
        {CURRENCY_FLAGS[base] ? (
          <CountryFlag currency={base} size={dualCircleSize} />
        ) : (
          <Text style={{ color: baseConfig.text, fontSize: 8.5, fontWeight: '800' }} numberOfLines={1}>
            {baseConfig.label}
          </Text>
        )}
      </View>

      {/* Quote currency circle (right overlapped) */}
      <View
        style={{
          width: dualCircleSize,
          height: dualCircleSize,
          borderRadius: dualCircleSize / 2,
          backgroundColor: quoteConfig.bg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'absolute',
          right: 0,
          bottom: 0,
          zIndex: 1,
          borderWidth: 0,
        }}
      >
        {CURRENCY_FLAGS[quote] ? (
          <CountryFlag currency={quote} size={dualCircleSize} />
        ) : (
          <Text style={{ color: quoteConfig.text, fontSize: 8.5, fontWeight: '800' }} numberOfLines={1}>
            {quoteConfig.label}
          </Text>
        )}
      </View>
    </View>
  );
}
