/******/ /* webpack/runtime/compat */
/******/ 
/******/ if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = new URL('.', import.meta.url).pathname.slice(import.meta.url.match(/^file:\/\/\/\w:/) ? 1 : 0, -1) + "/";
/******/ 
/************************************************************************/
var __webpack_exports__ = {};
// index.js
const { run } = require("@probot/adapter-github-actions");
const app = require("./app.js");

run(app).catch((error) => {
  console.error(error);
  process.exit(1);
});
