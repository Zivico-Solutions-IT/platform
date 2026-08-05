import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { storage } from '../../utils/storage';

const logoImage = require('../../../assets/novafxm logo cropped.png');
const darkLogoImage = require('../../../assets/novafxm logo dark cropped.png');
const veltriumLogo = require('../../../assets/veltriumfx-logo.png');
const veltriumDarkLogo = require('../../../assets/veltriumfx-logo-dark.png');

export default function NovaLogo({ dark = false, width = 190, height = 46 }) {
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    const checkProject = async () => {
      let name = null;
      if (typeof window !== 'undefined') {
        name = localStorage.getItem('x-project-name');
      }
      if (!name) {
        name = await storage.get('x-project-name');
      }
      if (name) setProjectName(name);
    };
    checkProject();
    const interval = setInterval(checkProject, 500);
    return () => clearInterval(interval);
  }, []);

  const isVeltrium = /veltrium/i.test(projectName);
  const source = isVeltrium
    ? (dark ? veltriumDarkLogo : veltriumLogo)
    : (dark ? darkLogoImage : logoImage);

  return (
    <Image
      source={source}
      resizeMode="contain"
      style={{ width: isVeltrium ? width + 15 : width, height }}
    />
  );
}
