// index.js
import { run } from "@probot/adapter-github-actions";
import app from "./app.js";

run(app).catch((error) => {
  console.error(error);
  process.exit(1);
});