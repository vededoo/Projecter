module.exports = {
  apps: [
    {
      name: 'projecter_dev_server',
      cwd: '/Users/ldurpel/Development/Projects/Projecter/Projecter_dev/server',
      script: 'src/app.js',
      env: { NODE_ENV: 'development' },
      watch: false,
      max_memory_restart: '500M',
      out_file: '/Users/ldurpel/Development/Projects/Projecter/logs/projecter_dev_server-out.log',
      error_file: '/Users/ldurpel/Development/Projects/Projecter/logs/projecter_dev_server-error.log',
      merge_logs: true,
    },
    {
      name: 'projecter_dev_client',
      cwd: '/Users/ldurpel/Development/Projects/Projecter/Projecter_dev/client',
      script: 'npm',
      args: 'start',
      env: {
        PORT: '3054',
        BROWSER: 'none',
        DANGEROUSLY_DISABLE_HOST_CHECK: 'true',
        REACT_APP_API_URL: '/api',
      },
      watch: false,
      out_file: '/Users/ldurpel/Development/Projects/Projecter/logs/projecter_dev_client-out.log',
      error_file: '/Users/ldurpel/Development/Projects/Projecter/logs/projecter_dev_client-error.log',
      merge_logs: true,
    },
  ],
};
