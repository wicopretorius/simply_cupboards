module.exports = {
  apps: [
    {
      name: 'dm-cupboards-directus',
      cwd: './directus',
      script: 'node_modules/.bin/directus',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'dm-cupboards-app',
      cwd: './app',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
