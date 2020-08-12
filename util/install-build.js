require("../lib/base.js");
const path = require("path");

(async () => {
  console.log(`>>> 2-Start install nightly build at ${(new Date()).toLocaleTimeString()}.`);
  // Uninstall existed chromium build
  await MODULE_TOOLS.uninstallChromium();

  let localPath = path.join(GET_CHROMIUM_PATH(), MODULE_JSON.getPath(), MODULE_JSON.getPackage());
  console.log(`2.2-Go to install nightly build '${localPath}'.`);
  await MODULE_TOOLS.install(localPath);
})().then(() => {
  console.log(`>>> 2-Completed install nightly build at ${(new Date()).toLocaleTimeString()}!`);
}).catch((err) => {
  throw err;
});