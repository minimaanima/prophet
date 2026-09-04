module.exports = {
  apps: [
    {
      name: "prophet",
      cwd: "/home/deploy/prophet",
      script: "/home/deploy/.nvm/versions/node/v24.20.0/bin/npm",
      args: "run dev",
      interpreter: "none",
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: "10s",
      env: {
        NODE_ENV: "development",
        PATH:
          "/home/deploy/.nvm/versions/node/v24.20.0/bin:/usr/local/bin:/usr/bin:/bin",
      },
    },
  ],
};
