module.exports = {
  apps: [
    {
      name: 'simply-cupboards',
      cwd: './app',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
