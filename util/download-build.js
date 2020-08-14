require("../lib/base.js");
const fs = require("fs");
const path = require("path");
const http = require("http");
const url = require("url");
const cheerio = require("cheerio");

let htmlElement;
let downloadCommit;
let remoteURL = MODULE_JSON.getNightBuildURL();
let specifyBuild = MODULE_JSON.getTargetCommitFlag() ? MODULE_JSON.getTargetCommit() : MODULE_JSON.getTargetCommitFlag();

const getHtmlELE = async (URL) => {
  // sorted build commits by 'Last modified' column of descending order
  URL += "/?C=M;O=A";
  return new Promise ((resolve, reject) => {
    let html;
    let options = {
      host: url.parse(URL).host,
      path: url.parse(URL).path,
      port: 80
    }
    htmlElement = [];
    http.get(options, (res) => {
      res.on("data", (data) => {
        html += data;
      });
      res.on("end", () => {
        let allHtmlELE = cheerio.load(html);
        resolve(allHtmlELE);
      });
    }).on("error", (err) => {
      console.log(`getHtmlELE func got error: ${err.message}`);
    });
  });
};

const getLatestCommit = async (remoteURL) => {
  if (typeof(specifyBuild) == "string") {
    await getHtmlELE(remoteURL).then((ele) => {
      ele('a').each((i, e) => {
        htmlElement.push(ele(e).attr("href").split("/")[0]);
      });
    });
    if (htmlElement.indexOf(specifyBuild) !== -1) {
      downloadCommit = specifyBuild;
    } else {
      console.log("Please check config.json commit, it was invalid");
    }
  } else if (typeof(specifyBuild) == "boolean") {
    await getHtmlELE(remoteURL).then((ele) => {
      // get latest commit id;
      downloadCommit = ele("a")[ele("a").length-1]["attribs"]["href"].slice(0, -1);
    });
  }
  console.log(`1.1-Got latest commit as '${downloadCommit}'.`);
  await MODULE_JSON.writeLatestCommit(downloadCommit);
  return downloadCommit;
};

const getChromiumName = async (suffix) => {
  let downloadPath = remoteURL + "/" + downloadCommit + "/" + MODULE_JSON.getPath() + "/";
  let chromiumPackageName;
  await MODULE_JSON.getMd5Online(downloadPath + MODULE_JSON.getPackage() + ".md5");
  await getHtmlELE(downloadPath).then((ele) => {
    ele('a').each((i,e) => {
      htmlElement.push(ele(e).attr("href").split("/")[0]);
    });
    String.prototype.endWith = function (endStr) {
      let d = this.length - endStr.length;
      return (d >= 0 && this.lastIndexOf(endStr) == d);
    }
    htmlElement.forEach((data) => {
      if (data.endWith(suffix)) {
        MODULE_JSON.writePackage(data);
        chromiumPackageName = data;
      }
    });
  });
  return chromiumPackageName;
};

(async () => {
  console.log(`>>> 1-Start download nightly build at ${(new Date()).toLocaleTimeString()}.`);
  downloadCommit = await getLatestCommit(remoteURL);

  let downloadChromiumPath = remoteURL + "/" + downloadCommit + "/" + MODULE_JSON.getPath() + "/";
  let downloadPackageName = await getChromiumName(MODULE_JSON.getSuffix());
  let storeFileLocation = path.join(GET_CHROMIUM_PATH(), MODULE_JSON.getPath(), downloadPackageName);

  if (fs.existsSync(storeFileLocation)) {
    if (await MODULE_TOOLS.checkMD5(storeFileLocation)) {
      console.log(`${downloadPackageName} of ${downloadCommit} has already been downloaded, no need download again!`);
    } else {
      fs.unlinkSync(storeFileLocation);
      console.log("Failed to MD5 check local package, please download again!");
      process.exit(1);
    }
  } else {
    console.log(`1.2-Downloading ${downloadChromiumPath}${downloadPackageName} ...`);
    await MODULE_TOOLS.download(downloadChromiumPath + downloadPackageName);
    console.log(`>>> 1-Completed downloading at ${(new Date()).toLocaleTimeString()}.`);
  }
})().catch((err) => {
  throw err;
});