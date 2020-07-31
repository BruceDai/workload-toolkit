require("../lib/base.js");
const path = require("path");

(async () => {
  // Uninstall existed chromium build
  await MODULE_TOOLS.uninstallChromium();

  let localPath = path.join(GET_CHROMIUM_PATH(), MODULE_JSON.getPath(), MODULE_JSON.getPackage());
  await MODULE_TOOLS.install(localPath);
})().then(() => {
  console.log("Completed install package!");
}).catch((err) => {
  throw err;
});