// index.js
const { run } = require("@probot/adapter-github-actions");
const app = require("./app.js");

run(app).catch((error) => {
  console.error(error);
  process.exit(1);
});