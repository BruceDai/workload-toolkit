console.log("===== Start workload testing... ======");

const childProcess = require("child_process");

(async function() {
  let processDownload = await childProcess.spawnSync(
    "node",
    ["./util/download-build.js"],
    {stdio: [process.stdin, process.stdout, "pipe"]}
  );

  if (processDownload.stderr.toString() != "") {
    console.log(processDownload.stderr.toString());
    process.exit(1);
  }

  let processInstall = await childProcess.spawnSync(
    "node",
    ["./util/install-build.js"],
    {stdio: [process.stdin, process.stdout, "pipe"]}
  );

  if (processInstall.stderr.toString() != "") {
    console.log(processInstall.stderr.toString());
    process.exit(1);
  }

  let processRunTest = await childProcess.spawnSync(
    "node",
    ["./util/run-test.js"],
    {stdio: [process.stdin, process.stdout, "pipe"]}
  );

  if (processRunTest.stderr.toString() != "") {
    console.log(processRunTest.stderr.toString());
    process.exit(1);
  }
})().then(() => {
  console.log("========== Completed workload testing! =======");
}).catch((err) => {
  console.log(`Error:${err}`);
});