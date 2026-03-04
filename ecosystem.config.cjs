module.exports = {
  apps: [
    {
      name: "crypto-exchange",
      script: "server/index.js",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        SERVER_PORT: 3000
      }
    }
  ]
};
