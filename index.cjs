// index.js
const { run } = require("@probot/adapter-github-actions");
const app = require("./app.cjs");

run(app).catch((error) => {
  console.error(error);
  process.exit(1);
});