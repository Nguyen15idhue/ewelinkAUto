module.exports = {
  apps: [
    {
      name: "ewelink-auto",
      script: "index.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
