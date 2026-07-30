const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

console.log('📦 Zipping VeltriumFX Frontend...');
const webBuildPath = path.join(__dirname, 'veltriumfx', 'frontend', 'web_build');
const distPath = fs.existsSync(webBuildPath) ? webBuildPath : path.join(__dirname, 'veltriumfx', 'frontend', 'dist');
const zipPath = path.join(__dirname, 'veltriumfx-frontend.zip');

if (!fs.existsSync(distPath)) {
  console.error('❌ Build folder (web_build / dist) not found!');
  process.exit(1);
}

const zip = new AdmZip();
zip.addLocalFolder(distPath);
zip.writeZip(zipPath);
console.log('✅ veltriumfx-frontend.zip created successfully in d:\\platform\\');
