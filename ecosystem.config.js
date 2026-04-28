/**
 * Configuration PM2 pour Projecter
 * ============================================
 * Voir: /Shared/docs/PORTS-REGISTRY.md
 * URL:  https://msa.hopto.org:6054
 * POS:  05  ([APP]=5, [ENV]: 1=PRD, 4=DEV)
 * Convention: {app}_{env}_{type}
 * ============================================
 *
 * Démarrage : cd ~/Development/Projects/Projecter && pm2 start ecosystem.config.js
 * Logs      : pm2 logs projecter_dev_server / pm2 logs projecter_dev_client
 * Status    : pm2 status
 * Stop      : pm2 stop projecter_dev_server projecter_dev_client
 */

module.exports = {
  apps: [
    // ═══════════════════════════════════════════
    // DÉVELOPPEMENT - Serveur Backend
    // ═══════════════════════════════════════════
    {
      name: 'projecter_dev_server',
      cwd: './Projecter_dev/server',
      script: 'src/app.js',
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs', 'storage'],
      env: {
        NODE_ENV: 'development',
        PORT: 5054,
        HOST: '0.0.0.0',
      },
      log_file: 'logs/dev_server_combined.log',
      out_file: 'logs/dev_server_out.log',
      error_file: 'logs/dev_server_error.log',
      time: true,
      autorestart: true,
      max_memory_restart: '500M',
    },

    // ═══════════════════════════════════════════
    // DÉVELOPPEMENT - Client React (CRA + TS)
    // ═══════════════════════════════════════════
    {
      name: 'projecter_dev_client',
      cwd: './Projecter_dev/client',
      script: 'npm',
      args: 'start',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3054,
        HOST: '0.0.0.0',
        BROWSER: 'none',
        DANGEROUSLY_DISABLE_HOST_CHECK: 'true',
        CHOKIDAR_USEPOLLING: 'true',
        REACT_APP_API_URL: '/api',
      },
      log_file: 'logs/dev_client_combined.log',
      out_file: 'logs/dev_client_out.log',
      error_file: 'logs/dev_client_error.log',
      time: true,
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',
      max_memory_restart: '1G',
    },

    // ═══════════════════════════════════════════
    // PRODUCTION - Serveur Backend
    // ═══════════════════════════════════════════
    {
      name: 'projecter_prd_server',
      cwd: './Projecter_prd/Projecter_dev/server',
      script: 'src/app.js',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5051,
        HOST: '0.0.0.0',
      },
      log_file: 'logs/prd_server_combined.log',
      out_file: 'logs/prd_server_out.log',
      error_file: 'logs/prd_server_error.log',
      time: true,
      autorestart: true,
      max_memory_restart: '500M',
    },

    // ═══════════════════════════════════════════
    // PRODUCTION - Client React (serve build)
    // ═══════════════════════════════════════════
    {
      name: 'projecter_prd_client',
      cwd: './Projecter_prd/Projecter_dev/client',
      script: 'npx',
      args: 'serve -s build --listen 3051',
      watch: false,
      env: { NODE_ENV: 'production' },
      log_file: 'logs/prd_client_combined.log',
      out_file: 'logs/prd_client_out.log',
      error_file: 'logs/prd_client_error.log',
      time: true,
      autorestart: true,
      max_memory_restart: '500M',
    },
  ],
};
