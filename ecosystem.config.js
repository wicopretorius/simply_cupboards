module.exports = {
  apps: [
    {
      name: 'simply-cupboards-directus',
      cwd: './directus',
      script: 'node_modules/.bin/directus',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'simply-cupboards-app',
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
