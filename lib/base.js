const fs = require("fs");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const url = require("url");
const unzip = require("unzip");
const moment = require("moment");


// lock current work path
let array = process.cwd().split(path.sep);

if (array[array.length - 1] != "workload-toolkit") {
  if (array[array.length - 2] == "workload-toolkit") {
    process.chdir("../");
  } else {
    throw new Error("The current work path is not the inside path of the project");
  }
}


// creat output directory
function mkdirsSync(dirname) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (mkdirsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    }
  }
}

// delete folder
function deleteFolder(dirname) {
  let files = [];
  if(fs.existsSync(dirname)) {
    files = fs.readdirSync(dirname);
    files.forEach(function(files, index) {
      let curPath = dirname + path.sep + files;
      if(fs.statSync(curPath).isDirectory()) { // recurse
        deleteFolder(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirname);
  }
}

REPORT_PATH = null;
CHROMIUM_PATH = null;

// default: json module
class modules_json {
  constructor() {
    this.json;
    this.open();
  }

  open() {
    this.json = JSON.parse(fs.readFileSync("./build-config.json"));
  }

  getTargetPlatform() {
    if (!(this.json.platform == "linux" || this.json.platform == "windows")) {
      throw new Error(`This toolkit doesn't support ${this.json.platform} platform, please set 'linux' or 'windows' as target platform.`);
    }

    return this.json.platform;
  }

  getPassword() {
    if (TEST_PLATFORM == "linux") {
      return this.json.password.linux;
    } else if (TEST_PLATFORM == "windows") {
      return this.json.password.windows;
    } else {
      return null;
    }
  }

  getPackage() {
    if (TEST_PLATFORM == "linux") {
      if (this.json.linux.chromiumBuild == null) {
        throw new Error("Package name on linux is null!");
      } else {
        return this.json.linux.chromiumBuild;
      }
    } else if (TEST_PLATFORM == "windows") {
      if (this.json.windows.chromiumBuild == null) {
        throw new Error("Package name on windows is null!");
      } else {
        return this.json.windows.chromiumBuild;
      }
    } else {
      if (TEST_PLATFORM == null) {
        throw new Error("Set test platform first");
      } else {
        throw new Error("Can not get package name!");
      }
    }
  }

  getPath() {
    if (TEST_PLATFORM == "linux") {
      if (this.json.linux.path == null) {
        throw new Error("Path on linux is null!");
      } else {
        return this.json.linux.path;
      }
    } else if (TEST_PLATFORM == "windows") {
      if (this.json.windows.path == null) {
        throw new Error("Path on windows is null!");
      } else {
        return this.json.windows.path;
      }
    } else {
      if (TEST_PLATFORM == null) {
        throw new Error("Set test platform first");
      } else {
        throw new Error("Can not get path!");
      }
    }
  }

  getSuffix() {
    if (TEST_PLATFORM == "linux") {
      if (this.json.linux.suffix == null) {
        throw new Error("Suffix on linux is null!");
      } else {
        return this.json.linux.suffix;
      }
    } else if (TEST_PLATFORM == "windows") {
      if (this.json.windows.suffix == null) {
        throw new Error("Suffix on windows is null!");
      } else {
        return this.json.windows.suffix;
      }
    } else {
      if (TEST_PLATFORM == null) {
        throw new Error("Set test platform first");
      } else {
        throw new Error("Can not get suffix!");
      }
    }
  }

  checkURL(url) {
    let reg = (/(((^https?:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)$/g);
    if (!reg.test(url)) {
      return false;
    } else {
      return true;
    }
  }

  getNightBuildURL() {
    if (this.json.nightlyBuildURL !== null) {
      if (MODULE_JSON.checkURL(this.json.nightlyBuildURL)) {
        return this.json.nightlyBuildURL;
      } else {
        console.log("Incorrect network addr, will launch default addr, \n Please check config.json");
        return "http://powerbuilder.sh.intel.com/public/webml/nightly/";
      }
    } else {
      return "http://powerbuilder.sh.intel.com/public/webml/nightly/";
    }
  }

  getMd5Online(url) {
    let md5Value = "";
    http.get(url, (res) => {
      const {statusCode} = res;
      let error;
      if (statusCode == 404) {
        throw new Error("Please make sure md5 file exist!");
      }
      if (statusCode !== 200) {
        error = new Error("Request Failed.\n" + `Status Code: ${statusCode}`);
      }
      if (error) {
        console.log(error.message);
        res.resume();
        return;
      }
      res.on("data", (chunk) => {
        md5Value += chunk;
      });
      res.on("end", () => {
        md5Value = md5Value.split(" ")[0];
        MODULE_JSON.writeMd5(md5Value);
      });
    }).on("error", (e) => {
      console.log(`getMd5Online func got error: ${e.message}`);
    });
  }

  getMd5() {
    if (TEST_PLATFORM == "linux") {
      return this.json.linux.md5;
    } else if (TEST_PLATFORM == "windows") {
      return this.json.windows.md5;
    } else {
      if (TEST_PLATFORM == null) {
        throw new Error("Set test platform first");
      } else {
        throw new Error("Can not get md5 value!");
      }
    }
  }

  getTargetCommitFlag() {
    if (typeof(this.json.targetcommit.flag) == "boolean") {
      return this.json.targetcommit.flag;
    } else {
      let string = "Can not support target commit flag: " + this.json.targetcommit.flag;
      throw new Error(string);
    }
  }

  getTargetCommit() {
    if (this.json.targetcommit.commit == null) {
      throw new Error("Specify commit value is null!");
    } else {
      return this.json.targetcommit.commit;
    }
  }

  getLatestCommit() {
    return this.json.latestcommit;
  }

  writeLatestCommit(commit) {
    console.log(`Record latest commit '${commit}' into build-config.json.`);
    this.json.latestcommit = commit;
    this.write();
  }

  writePackage(name) {
    if (TEST_PLATFORM == "linux") {
      this.json.linux.chromiumBuild = name;
    } else if (TEST_PLATFORM == "windows") {
      this.json.windows.chromiumBuild = name;
    } else {
      if (TEST_PLATFORM == null) {
        throw new Error("Set test platform first");
      } else {
        throw new Error("Can not write package name!");
      }
    }
    this.write();
  }

  writeMd5(value) {
    if (TEST_PLATFORM == "linux") {
      this.json.linux.md5 = value;
    } else if (TEST_PLATFORM == "windows") {
      this.json.windows.md5 = value;
    } else {
      if (TEST_PLATFORM == null) {
        throw new Error("Set test platform first");
      } else {
        throw new Error("Can not write md5 value!");
      }
    }
    this.write();
  }

  write() {
    fs.writeFileSync("./build-config.json", JSON.stringify(this.json, null, 2));
  }

  close() {
    fs.closeSync(0);
    fs.closeSync(1);
  }
}

// load json file to initialization
MODULE_JSON = new modules_json();
TEST_PLATFORM = MODULE_JSON.getTargetPlatform();
PASS_WORD = MODULE_JSON.getPassword();
TARGET_COMMIT = MODULE_JSON.getTargetCommit();
FLAG_TARGET_COMMIT = MODULE_JSON.getTargetCommitFlag();

// global tools
// TODO: support windows
TOOLS_DATE = function() {
  let DateString = moment().format("YYYYMMDDHHmmsss")
  return DateString;
}

LOGGER_HEARD = function() {
  let heard = TEST_PLATFORM + "--" + TOOLS_DATE() + "--" + TEST_PLATFORM + "-- ";
  return heard;
}

GET_CHROMIUM_PATH = function() {
  if (FLAG_TARGET_COMMIT) {
    CHROMIUM_PATH = path.join(process.cwd(), "output", "chromiumBuild", TARGET_COMMIT);
  } else {
    if (MODULE_JSON.getLatestCommit() == null) {
      throw new Error("Latest commit can not be null!");
    } else {
      CHROMIUM_PATH = path.join(process.cwd(), "output", "chromiumBuild", MODULE_JSON.getLatestCommit());
    }
  }
  mkdirsSync(CHROMIUM_PATH);
  return CHROMIUM_PATH;
}

GET_REPORT_PATH = function() {
  if (FLAG_TARGET_COMMIT) {
    REPORT_PATH = path.join(process.cwd(), "output", "report", TARGET_COMMIT)
  } else {
    if (MODULE_JSON.getLatestCommit() == null) {
      throw new Error("Latest commit can not be null!");
    } else {
      REPORT_PATH = path.join(process.cwd(), "output", "report", MODULE_JSON.getLatestCommit())
    }
  }
  mkdirsSync(REPORT_PATH);
  return REPORT_PATH;
}

// csv module
class modules_csv {
  constructor() {
    this.csv = require("../node_modules/fast-csv");
    this.csvStream;
  }
  async open() {
    this.csvStream = await this.csv.createWriteStream({headers: true})
      .transform(function(row) {return {
        "Feature": row.Feature,
        "Case Id": row.CaseId,
        "Test Case": row.TestCase,
        "Pass": row.Pass,
        "Fail": row.Fail,
        "N/A": row.NA,
        "Measured": row.Measured,
        "Comment": row.Comment,
        "Measured Name": row.MeasuredName,
        "Value": row.Value,
        "Unit": row.Unit,
        "Target": row.Target,
        "Failure": row.Failure,
        "Execution Type": row.ExecutionType,
        "Suite Name": row.SuiteName
      }});
    let name;
    if (TEST_PLATFORM == "android") {
      let cpu = MODULE_JSON.getPath().split("_")[1];
      name = GET_REPORT_PATH() + path.sep + "report-" + TEST_PLATFORM + "-" + cpu + "-" +  WEBML_BACKEND + "-" + TOOLS_DATE() + ".csv";
    } else {
      name = GET_REPORT_PATH() + path.sep + "report-" + TEST_PLATFORM + "-" + WEBML_BACKEND + "-" + TOOLS_DATE() + ".csv";
    }
    let WriteStream = await fs.createWriteStream(name);
    await this.csvStream.pipe(WriteStream);
  }
  async write(data) {
    await this.csvStream.write(data);
  }
  async close() {
    await this.csvStream.end();
  }
}

// tools module
class modules_tools {
  constructor() {
    this.childProcess = require("child_process");
  }

  async download(URL) {
    let savepath = path.join(GET_CHROMIUM_PATH(), MODULE_JSON.getPath());
    mkdirsSync(savepath);
    let name = path.join(savepath, MODULE_JSON.getPackage());
    let options = {
      host: url.parse(URL).host,
      path: url.parse(URL).pathname,
      port: 80
    }
    let files = fs.createWriteStream(name);
    http.get(options, (res) => {
      res.on("data", (data) => {
        files.write(data);
      });
      res.on("end", () => {
        files.end();
      });
    }).on("error", (err) => {
      console.log(`download func got error: ${err.message}`);
    })
  }

  install(installPath) {
    if (!fs.existsSync(installPath)) {
      throw new Error(`No such '${installPath}' file for installing package`);
    }

    if (TEST_PLATFORM === "linux") {
      let command = "echo '" + PASS_WORD + "' | sudo -S dpkg -i " + installPath;
      this.childProcess.execSync(
        command,
        {stdio: [process.stdin, process.stdout, "pipe"], timeout: 300000}
      );
    } else if (TEST_PLATFORM === "windows") {
      let unzipPath = path.join(GET_CHROMIUM_PATH(), MODULE_JSON.getPath());
      fs.createReadStream(installPath).pipe(unzip.Extract({path: unzipPath}));
    }
  }

  checkCommit() {
    let str = GET_CHROMIUM_PATH();
    return fs.existsSync(str);
  }

  checkPackage(path) {
    return fs.existsSync(path);
  }

  uninstallChromium() {
    console.log("Now will uninstall chromium package.");
    if (TEST_PLATFORM === "linux") {
      let command = "echo '" + PASS_WORD + "' | sudo -S dpkg -r chromium-browser-unstable";
      let subprocess = this.childProcess.execSync(
        command, {timeout: 300000, encoding: "UTF-8", stdio: [process.stdin, process.stdout, "pipe"]}
        );
    }
  }

  // TODO: support ios, windows
  checkInstalled() {
    let chromePath;
    if (TEST_PLATFORM === "linux") {
      chromePath = "/usr/bin/chromium-browser-unstable";
    } else if (TEST_PLATFORM === "mac") {
      chromePath = path.join(GET_CHROMIUM_PATH(), MODULE_JSON.getPath(), "chromium-mac/Chromium.app/Contents/MacOS/Chromium");
    } else if (TEST_PLATFORM === "android") {
      return false;
    } else if (TEST_PLATFORM === "windows") {
      return false;
    } else {
      let string = "We will support this test platform to install chrome package: " + TEST_PLATFORM;
      throw new Error(string);
    }
    return fs.existsSync(chromePath);
  }

  // TODO: support windows
  checkMD5(path) {
    if (!fs.existsSync(path)) {
      throw new Error(`No such ${path} file for checking md5 value`);
    }
    let valueMD5;
    valueMD5 = crypto.createHash("md5").update(fs.readFileSync(path)).digest("hex");
    if (valueMD5 == MODULE_JSON.getMd5()) {
      return true;
    } else {
      return false;
    }
  }
}

// read require json file
let requireJsonPath = require.main.filename.slice(0, -2) + "json";
if (fs.existsSync(requireJsonPath)) {
  let requireJson = JSON.parse(fs.readFileSync(requireJsonPath)).modules;
  // analyse require json file
  for (let x in requireJson) {
    if (requireJson[x] == "chrome") {
      MODULE_CHROME = new modules_chrome();
    } else if (requireJson[x] == "csv") {
      MODULE_CSV = new modules_csv();
    } else if (requireJson[x] == "tools") {
      MODULE_TOOLS = new modules_tools();
    }
  }
}
