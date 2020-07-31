const { chromium } = require('playwright');
const os = require("os");
const settings = require("../settings.js");

let BACKEND_CONFIG = settings.BACKEND_CONFIG;
let chromium_path = '/usr/bin/chromium-browser-unstable';

const launch_workload_page = async (args = ['--no-sandbox']) => {
  const browser = await chromium.launch({headless: false, executablePath: chromium_path, args: args});
  const context = await browser.newContext({ignoreHTTPSErrors: true});
  const page = await context.newPage();
  await page.goto(settings.WORKLOAD_URL);
  return [browser, page];
};

const get_category_list = async () => {
  let category_list = [];

  const [browser, page] = await launch_workload_page();

  // category select
  const catgOptSelect = await page.$$('select#categoryselect option');
  for (let opt of catgOptSelect) {
    let catg = await opt.evaluate(element => element.textContent);
    category_list.push(catg);
  }

  await browser.close();
  return category_list;
};


const get_model_list = async (category) => {
  let model_list = [];

  const [browser, page] = await launch_workload_page();

  // category select
  const catgSelect = await page.$('select#categoryselect');
  await catgSelect.type(category);

  const modelOptSelect = await page.$$('select#modelselect1 option');
  for (let opt of modelOptSelect) {
    let model = await opt.evaluate(element => element.textContent);
    model_list.push(model);
  }

  await browser.close();
  return model_list;
};

const get_skip_status = (category, model, backend) => {
  const filter1 = settings.CATEGORY_FILTER;
  const filter2 = settings.MODEL_FILTER;
  let status = false;

  // check category supported status by backend
  if (filter1.hasOwnProperty(category)) {
    status = filter1[category].includes(backend);
  }

  // check model supported status by backend
  return status || filter2[backend].includes(model);
};

const execute_workload_test = async (category, model, config) => {
  const [browser, page] = await launch_workload_page(config.args);
  page.setDefaultTimeout((settings.ITERATIONS + 1) * 20000);

  // category select
  const catgSelect = await page.$('select#categoryselect');
  await catgSelect.type(category);

  const modelSelect = await page.$('select#modelselect1');
  await modelSelect.type(model);

  const backendSelect = await page.$('select#webnnbackend');
  await backendSelect.type(config.backend);

  const preferSelect = await page.$('select#preferselect');
  await preferSelect.type(config.prefer);

  await page.fill('#iterations', settings.ITERATIONS.toString());

  await page.click('#runbutton');

  try {
    await page.waitForSelector("em").then(async () => {
      const resultElement = await page.$('em');
      const score = await resultElement.evaluate(element => element.textContent);
      console.log(`${config.backend} + ${config.prefer} + ${model}: ${score}`);
    });
  } catch (e) {
    console.log(`${config.backend} + ${config.prefer} + ${model}: ${e}`);
  }

  await browser.close();
};

(async () => {
  // for Windows
  if (os.type() === 'Windows_NT') {
    BACKEND_CONFIG['DirectML'] = {
      args: ['--no-sandbox', '--use-dml', '--enable-features=WebML'],
      backend: 'WebNN',
      prefer: 'SUSTAINED_SPEED'
    };
  }

  console.log(`>>> Start test at ${(new Date()).toLocaleTimeString()}`);

  if (settings.DEBUG_FLAG) {
    // for debugging  'SqueezeNet (TFLite)' 'Inception v4 Quant (TFLite)'
    await execute_workload_test('Image Classification', 'SqueezeNet (TFLite)', {backend: 'WASM', prefer: 'NONE', args: ['--no-sandbox']});
  } else {
    // get category list
    const category_list =  await get_category_list();
    for (let category of category_list) {
      console.log(`#### ${category}`);
      let model_list = await get_model_list(category);
      for (let model of model_list) {
          for (let key in BACKEND_CONFIG) {
            const sub_config = BACKEND_CONFIG[key];
            let is_skip = get_skip_status(category, model, key);
            if (is_skip) {
              console.log(`Skip test ${sub_config.backend} + ${sub_config.prefer} + ${category} / ${model}`);
              continue;
            }
            await execute_workload_test(category, model, sub_config);
          }
      }
    }
  }
})().then(() => {
  console.log(`>>> Completed test at ${(new Date()).toLocaleTimeString()}`);
}).catch((err) => {
  throw err;
});