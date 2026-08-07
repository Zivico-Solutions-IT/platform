import { Image, Platform } from 'react-native';

const logoImage = require('../../../assets/a5markets-logo.png');

export default function NovaLogo({ dark = false, width = 190, height = 46 }) {
  return (
    <Image
      source={logoImage}
      resizeMode="contain"
      style={{
        width: width + 12,
        height,
        // The supplied PNG has a charcoal backdrop. On web dark mode this blends
        // it into the header while retaining the original blue/teal mark.
        ...(Platform.OS === 'web' && dark ? { mixBlendMode: 'screen' } : null),
      }}
    />
  );
}
