const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '../..');
const localEnvFile = path.join(root, '.env');
const requestedFile = process.env.ENV_FILE
  ? path.resolve(root, process.env.ENV_FILE)
  : null;
const requestedProfile = requestedFile ? path.basename(requestedFile).toLowerCase() : '';
const localEnv = fs.existsSync(localEnvFile)
  ? dotenv.parse(fs.readFileSync(localEnvFile))
  : {};
const runtimeMode = process.env.NODE_ENV
  || (requestedProfile === 'hostinger.env'
    || requestedProfile === '.env.production'
    ? 'production'
    : localEnv.NODE_ENV || 'development');
const productionFiles = [
  path.join(root, 'hostinger.env'),
  path.join(root, '.env.production'),
  localEnvFile,
];
const developmentFiles = [
  localEnvFile,
];
const candidates = [
  requestedFile,
  ...(runtimeMode === 'production' ? productionFiles : developmentFiles),
].filter((file, index, files) => file && files.indexOf(file) === index && fs.existsSync(file));
const loadedFiles = [];

// Existing variables supplied by Hostinger always win. Files only fill missing values.
for (const file of candidates) {
  const result = dotenv.config({ path: file, quiet: true, override: false });
  if (!result.error) loadedFiles.push(path.basename(file));
}

const placeholder = /^(change|replace|your[-_ ]|example|xxx|<)/i;

function validateEnvironment() {
  const required = [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'JWT_SECRET',
    'CORS_ORIGIN',
    'FRONTEND_URL',
  ];
  const invalid = required.filter((key) => {
    const value = String(process.env[key] || '').trim();
    return !value || placeholder.test(value);
  });

  if (invalid.length) {
    throw new Error(`Missing or placeholder production configuration: ${invalid.join(', ')}`);
  }
  if (String(process.env.JWT_SECRET).length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }
  if (!Number.isInteger(Number(process.env.DB_PORT || 3306))) {
    throw new Error('DB_PORT must be a valid integer.');
  }
  if (process.env.NODE_ENV === 'production') {
    const dbPassword = String(process.env.DB_PASSWORD || '').trim();
    if (!dbPassword || placeholder.test(dbPassword)) {
      throw new Error('Missing or placeholder production configuration: DB_PASSWORD');
    }
    if (process.env.CORS_ORIGIN === '*') {
      throw new Error('CORS_ORIGIN cannot be * in production.');
    }
    for (const key of ['CORS_ORIGIN', 'FRONTEND_URL']) {
      const urls = String(process.env[key] || '').split(',').map((value) => value.trim()).filter(Boolean);
      if (urls.some((value) => !value.startsWith('https://') && !value.includes('localhost') && !value.includes('127.0.0.1'))) {
        throw new Error(`${key} must contain HTTPS URLs in production.`);
      }
    }
  }
  return true;
}

function environmentSummary() {
  return {
    nodeEnv: process.env.NODE_ENV || '(unset)',
    port: process.env.PORT || '3000 (fallback)',
    host: process.env.HOST || '0.0.0.0 (fallback)',
    envFiles: loadedFiles.length ? loadedFiles : ['Hostinger/system variables only'],
    database: {
      hostConfigured: Boolean(process.env.DB_HOST),
      port: process.env.DB_PORT || '3306',
      nameConfigured: Boolean(process.env.DB_NAME),
      userConfigured: Boolean(process.env.DB_USER),
      passwordConfigured: Boolean(process.env.DB_PASSWORD),
    },
    jwtConfigured: Boolean(process.env.JWT_SECRET),
    corsOrigin: process.env.CORS_ORIGIN || '(unset)',
    frontendUrl: process.env.FRONTEND_URL || '(unset)',
  };
}

/** Each platform owns its own Master Console. */
function isMasterEnabled() {
  return true;
}

module.exports = { validateEnvironment, environmentSummary, isMasterEnabled };
