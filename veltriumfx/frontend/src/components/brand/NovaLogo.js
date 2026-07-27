import { Image } from 'react-native';

const logoImage = require('../../../assets/veltriumfx-logo.png');
const darkLogoImage = require('../../../assets/veltriumfx-logo-dark.png');

export default function NovaLogo({ dark = false, width = 220, height = 54 }) {
  return (
    <Image
      source={dark ? darkLogoImage : logoImage}
      resizeMode="contain"
      style={{ width, height }}
    />
  );
}
