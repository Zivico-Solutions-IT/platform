import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { storage } from '../../utils/storage';

const logoImage = require('../../../assets/a5markets-logo.png');

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

  return (
    <Image
      source={logoImage}
      resizeMode="contain"
      style={{ width: width + 12, height }}
    />
  );
}
