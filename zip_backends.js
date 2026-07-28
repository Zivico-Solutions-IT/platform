const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📦 Starting Backend Compression...');

const novafxmZip = 'd:\\platform\\novafxm-backend.zip';
const veltriumfxZip = 'd:\\platform\\veltriumfx-backend.zip';

if (fs.existsSync(novafxmZip)) fs.unlinkSync(novafxmZip);
if (fs.existsSync(veltriumfxZip)) fs.unlinkSync(veltriumfxZip);

const psNova = `Compress-Archive -Path "d:\\platform\\novafxm\\src", "d:\\platform\\novafxm\\package.json", "d:\\platform\\novafxm\\package-lock.json", "d:\\platform\\novafxm\\.env", "d:\\platform\\novafxm\\app.js" -DestinationPath "${novafxmZip}" -Force`;
const psVeltrium = `Compress-Archive -Path "d:\\platform\\veltriumfx\\src", "d:\\platform\\veltriumfx\\package.json", "d:\\platform\\veltriumfx\\package-lock.json", "d:\\platform\\veltriumfx\\.env", "d:\\platform\\veltriumfx\\app.js" -DestinationPath "${veltriumfxZip}" -Force`;

console.log('1. Zipping NovaFXM Backend...');
execSync(`powershell -Command "${psNova}"`, { stdio: 'inherit' });

console.log('2. Zipping VeltriumFX Backend...');
execSync(`powershell -Command "${psVeltrium}"`, { stdio: 'inherit' });

console.log('✅ Both backend zip files created successfully in d:\\platform\\');
console.log('Files:');
console.log(' - d:\\platform\\novafxm-backend.zip (' + (fs.statSync(novafxmZip).size / 1024 / 1024).toFixed(2) + ' MB)');
console.log(' - d:\\platform\\veltriumfx-backend.zip (' + (fs.statSync(veltriumfxZip).size / 1024 / 1024).toFixed(2) + ' MB)');
