require("../lib/base.js");
const {DEV_CHROMIUM_PATH} = require("../settings.js");
const path = require('path');

(async () => {
  console.log(`>>> 2-Start install chromium build at ${(new Date()).toLocaleTimeString()}.`);
  // Uninstall existed chromium build
  await MODULE_TOOLS.uninstallChromium();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    const localPath = path.join(GET_CHROMIUM_PATH(), MODULE_JSON.getPath(), MODULE_JSON.getPackage());
    console.log(`2.2-Go to install nightly build (${localPath}).`);
    await MODULE_TOOLS.install(localPath);
  } else {
    if (TEST_PLATFORM === "linux") {
      console.log(`2.2(regression test)-Go to install dev build (${DEV_CHROMIUM_PATH}).`);
      await MODULE_TOOLS.install(DEV_CHROMIUM_PATH);
    } else if (TEST_PLATFORM === "windows") {
      console.log(`Don't do installation for testing dev build on Windows.`);
    }
  }
})().catch((err) => {
  throw err;
});