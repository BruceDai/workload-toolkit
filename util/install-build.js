require("../lib/base.js");
const {DEV_CHROMIUM_PATH} = require("../settings.js");
const path = require("path");

(async () => {
  console.log(`>>> 2-Start install nightly/dev build at ${(new Date()).toLocaleTimeString()}.`);
  // Uninstall existed chromium build
  await MODULE_TOOLS.uninstallChromium();

  let localPath;
  const args = process.argv.slice(2);

  if (args.length === 0) {
    localPath = path.join(GET_CHROMIUM_PATH(), MODULE_JSON.getPath(), MODULE_JSON.getPackage());
    console.log(`2.2-Go to install nightly build '${localPath}'.`);
  } else {
    localPath = DEV_CHROMIUM_PATH;
    console.log(`2.3-Go to install dev build '${localPath}'.`);
  }

  await MODULE_TOOLS.install(localPath);
  
  if (args.length === 0) {
    console.log(`>>> 2-Completed install nightly build at ${(new Date()).toLocaleTimeString()}!`);
  } else {
    console.log(`>>> 2(rc)-Completed install dev build at ${(new Date()).toLocaleTimeString()}!`);
  }
})().catch((err) => {
  throw err;
});