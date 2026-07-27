const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

if (!process.env.NODE_ENV) {
  const envFile = path.resolve(__dirname, process.env.ENV_FILE || '.env');
  if (fs.existsSync(envFile)) {
    const configuredMode = String(dotenv.parse(fs.readFileSync(envFile)).NODE_ENV || '').trim();
    if (configuredMode) process.env.NODE_ENV = configuredMode;
  }
}
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';



const { boot } = require('./src/server');

// boot() is idempotent, so this remains safe when production already started
// while Hostinger imported src/server.js.
boot();


