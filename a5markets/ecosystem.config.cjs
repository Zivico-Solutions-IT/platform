module.exports = {
  apps: [{
    name: 'a5markets-api',
    script: './app.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '750M',
    env: {
      NODE_ENV: 'production',
    },
  }],
};
