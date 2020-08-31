require("../lib/base.js");
const fs = require('fs');
const path = require('path');
const csvtojson = require('csvtojson');
const jsdom = require("jsdom");
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const REPORT_HTML = path.join(process.cwd(), "output", "report", 'check-report.html');
let findings = [];

const showReport = async (reportURL) => {
  let chromium_path;
  
  if (TEST_PLATFORM == "linux") {
    chromium_path = '/usr/bin/chromium-browser-unstable';
  } else if (TEST_PLATFORM == "windows") {
    chromium_path = path.join(GET_CHROMIUM_PATH(), MODULE_JSON.getPath(), 'Chrome-bin', 'chrome.exe');
  }
  
  const browser = await chromium.launch({headless: false, executablePath: chromium_path});
  const context = await browser.newContext({ignoreHTTPSErrors: true, viewport: null});
  const page = await context.newPage();
  const contentHtml = fs.readFileSync(reportURL, 'utf8');
  await page.setContent(contentHtml);
};

const createDivEle = (dom, divId) => {
  let divEle = dom.window.document.createElement('div');
  divEle.id = divId;
  return divEle;
};

const createTableEle = (dom, backend) => {
  let tableEle = dom.window.document.createElement('table');
  tableEle.id = `${backend}Table`;
  tableEle.border = "1";
  return tableEle;
};

const createTheadEle = (dom, backend) => {
  let theadEle = dom.window.document.createElement('thead');
  let trEle = dom.window.document.createElement('tr');
  let thEle = dom.window.document.createElement('th');
  thEle.innerHTML = "CATEGORY";
  trEle.appendChild(thEle);

  thEle = dom.window.document.createElement('th');
  thEle.innerHTML = "MODEL";
  trEle.appendChild(thEle);
  
  thEle = dom.window.document.createElement('th');
  thEle.innerHTML = `baseline ${backend}`;
  trEle.appendChild(thEle);
  
  thEle = dom.window.document.createElement('th');
  thEle.innerHTML = `${backend}`;
  trEle.appendChild(thEle);
  
  thEle = dom.window.document.createElement('th');
  thEle.innerHTML = `Speedup`;
  trEle.appendChild(thEle);
  theadEle.appendChild(trEle);
  return theadEle;
};

const createTbodyTrEle = (dom, category, model, backend, baselineData, data) => {
  let trEle = dom.window.document.createElement('tr');
  let tdEle = dom.window.document.createElement('td');
  tdEle.innerHTML = category;
  trEle.appendChild(tdEle);
  
  tdEle = dom.window.document.createElement('td');
  tdEle.innerHTML = model;
  trEle.appendChild(tdEle);
  
  tdEle = dom.window.document.createElement('td');
  if (baselineData === '') {
    tdEle.innerHTML = 'NA';
  } else {
    tdEle.innerHTML = baselineData.split('/').join('<br>');
  }

  trEle.appendChild(tdEle);
    
  tdEle = dom.window.document.createElement('td');
  if (data === '') {
    tdEle.innerHTML = 'NA';
  } else {
    tdEle.innerHTML = data.split('/').join('<br>');
  }
  trEle.appendChild(tdEle);
    
  tdEle = dom.window.document.createElement('td');
  if (baselineData === '' || data === '') {
    tdEle.innerHTML = 'NA';
  } else {
    let result = sub_compare(data, baselineData);
    tdEle.innerHTML = result;
    if (result.includes('FAIL')) {
      findings.push(`${category} ${model} test by ${backend} has regression "${result}", please re-check it.`);
    }
  }
  trEle.appendChild(tdEle);
  
  return trEle;
};

const getBaselineRow = (rowDicList, category, model) => {
  for (let row of rowDicList) {
    if (row["CATEGORY"] === category && row["MODEL"] === model) {
      return row;
    }
  }

  return null;
};

const score_compare = (compare, baseline) => {
  let status = Number(compare) / Number(baseline) * 100;
  console.log(`diff ${status.toFixed(2)}`);
  return `${status.toFixed(2)}%`;
};

const label_compare = (compare, baseline) => {
  let status = 'OK';
  let [compareLabel, compareProbability] = compare.split(':');
  let [baselineLabel, baselineProbability] = baseline.split(':');

  if (compareLabel !== baselineLabel) {
    status = 'FAIL by Top1 lable';
  } else {
    const np1 = Number(compareProbability.split('%')[0]);
    const np2 = Number(baselineProbability.split('%')[0]);
    if (np1 < np2) {
      status = 'FAIL by downgrade of Top1 probability';
    }
  }

  return status;
};

const sub_compare = (compare, baseline) => {
  let [compareScore, compareTop1] = compare.split('/').slice(0,2);
  let [baselineScore, baselineTop1] = baseline.split('/').slice(0,2);
  let score_status = score_compare(compareScore.split('+')[0], baselineScore.split('+')[0]);
  let label_status = label_compare(compareTop1, baselineTop1);
  return label_status !== 'OK' ? label_status : score_status;
};

(async () => {
  let compareFile;
  let baselineFile;

  if (args.length === 1) {
    compareFile = args[0];   
  } else if (args.length === 2) {
    compareFile = args[0];
    baselineFile = args[1];
  } else {
    baselineFile = path.join("output", "report", "baseline", `baseline-${TEST_PLATFORM}.csv`);
    if (!fs.existsSync(baselineFile)) {
      baselineFile = path.join("output", "baseline", `baseline-${TEST_PLATFORM}.csv`);
      if (!fs.existsSync(baselineFile)) {
        throw new Error("baseline file doesn't exist, please check it.");
      }
    }
    compareFile  = path.join("output", "report", "dev", `result-${TEST_PLATFORM}.csv`);
  }

  const baselineConfig = await csvtojson().fromFile(baselineFile);
  const compareConfig = await csvtojson().fromFile(compareFile);

  const compareRowLen = compareConfig.length;
  const backendList = Object.keys(compareConfig[0]).slice(2);

  let htmlSource = fs.readFileSync(path.join('static', 'template', 'check-report-template.html'), "utf8");
  let dom = new jsdom.JSDOM(htmlSource);
  let detailDiv = createDivEle(dom, 'detial');


  for (let backend of backendList) {
    let tableEle = createTableEle(dom, backend);
    let theadEle = createTheadEle(dom, backend);
    let tbodyEle = dom.window.document.createElement('tbody');
    for (let rowIndex = 0; rowIndex <  compareRowLen; rowIndex++) {
      let compareRow = compareConfig[rowIndex];
      let category = compareRow["CATEGORY"];
      let model = compareRow["MODEL"];
      let baselineRow = getBaselineRow(baselineConfig, category, model);
      let trEle = createTbodyTrEle(dom, category, model, backend, baselineRow[backend], compareRow[backend]);
      tbodyEle.appendChild(trEle);
    }
    tableEle.appendChild(theadEle);
    tableEle.appendChild(tbodyEle);
    detailDiv.appendChild(tableEle);
    detailDiv.appendChild(dom.window.document.createElement('br'));  
  }
  dom.window.document.body.appendChild(detailDiv);

  let findingsDiv = createDivEle(dom, 'findings');
  let findingsH3Ele = dom.window.document.createElement('h3');
  findingsH3Ele.innerHTML = "Findings:";
  findingsDiv.appendChild(findingsH3Ele);

  if (findings.length !== 0) {
    let index = 1;
    for (let f of findings) {
      let pEle = dom.window.document.createElement('p');
      pEle.innerHTML = `${index}. ${f}`;
      findingsDiv.appendChild(pEle);
      index++;
    }
  } else {
    let pEle = dom.window.document.createElement('p');
    pEle.innerHTML = `PASS without any obvious regression.`;
    findingsDiv.appendChild(pEle);
  }

  dom.window.document.body.appendChild(findingsDiv);

  fs.writeFileSync(REPORT_HTML, dom.serialize());

  await showReport(REPORT_HTML);
})();