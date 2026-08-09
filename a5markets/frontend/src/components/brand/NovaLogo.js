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
        // A bright monochrome variant keeps the mark and lettering legible on
        // dark portal and trading surfaces while the original PNG remains used
        // throughout light mode.
        ...(Platform.OS === 'web' && dark ? { filter: 'brightness(0) invert(1)' } : null),
      }}
    />
  );
}
