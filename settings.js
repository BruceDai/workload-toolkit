// https://github.com/intel/webml-polyfill/wiki/Proposed-Chromium-Switches-for-Backends
// https://github.com/intel/webml-polyfill/wiki/WebML-Examples-Results-on-Different-Backends-and-Platforms

const WORKLOAD_URL = "http://localhost:8080/workload";
// const TARGET_BACKEND = ['WASM', 'WebGL', 'DNNL', 'clDNN',
//                         'IE-MKLDNN', 'IE-clDNN', 'DirectML'];
const TARGET_BACKEND = ['WASM'];
const ITERATIONS = 1;

// flag: true for regression check, false for normal workload testing
const REGRESSION_FLAG = false; // default false

const DEBUG_FLAG = true;


// const REGRESSION_TEST = {
//   'Image Classification': ['MobileNet v2 (TFLite)', 'SqueezeNet (TFLite)', 
//                            'Inception v3 (TFLite)', 'Inception v4 (TFLite)',
//                            'ResNet50 v2 (ONNX)']
// };

const REGRESSION_TEST = {
  'Image Classification': ['SqueezeNet (TFLite)']
};
// if purpose of 'regression-check', please set variable DEV_CHROMIUM_PATH 
// as a absolute path of deb package for Linux or chrome.exe for Windows
const DEV_CHROMIUM_PATH = '/home/dev/workspace/bruce/workload-toolkit/output-1/chromiumBuild/9237011/linux_x64_SUCCEED/chromium-browser-unstable_86.0.4209.0-1_amd64.deb'; 

const BACKEND_CONFIG = {
  'WASM': {
    args: ['--no-sandbox'],
    backend: 'WASM',
    prefer: 'NONE'
  },
  'WebGL': {
    args: ['--no-sandbox'],
    backend: 'WebGL',
    prefer: 'NONE'
  },
  'DNNL': {
    args: ['--no-sandbox', '--enable-features=WebML'],
    backend: 'WebNN',
    prefer: 'FAST_SINGLE_ANSWER'
  },
  'clDNN': {
    args: ['--no-sandbox', '--enable-features=WebML'],
    backend: 'WebNN',
    prefer: 'SUSTAINED_SPEED'
  },
  'IE-MKLDNN': {
    args: ['--no-sandbox', '--use-inference-engine', '--enable-features=WebML'],
    backend: 'WebNN',
    prefer: 'FAST_SINGLE_ANSWER'
  },
  'IE-clDNN': {
    args: ['--no-sandbox', '--use-inference-engine', '--enable-features=WebML'],
    backend: 'WebNN',
    prefer: 'SUSTAINED_SPEED'
  },
  'DirectML': { // Only for Windows
    args: ['--no-sandbox', '--use-dml', '--enable-features=WebML'],
    backend: 'WebNN',
    prefer: 'SUSTAINED_SPEED'
  }
};

// skip test such category by listed backend
const CATEGORY_FILTER = {
  'Semantic Segmentation': ["DNNL", "IE-clDNN", "IE-MKLDNN"],
  'Super Resolution': ["clDNN", "DNNL", "DirectML", "IE-clDNN", "IE-MKLDNN"],
  'Emotion Analysis': ["clDNN", "DNNL", "DirectML", "IE-clDNN", "IE-MKLDNN"],
  'Facial Landmark Detection': ["clDNN", "IE-clDNN", "IE-MKLDNN"]
};

// skip test such model by backend
const MODEL_FILTER= {
  "WASM": ['MobileNet v1 Quant (Caffe2)'],
  "WebGL": [
    'MobileNet v1 Quant (TFLite)',
    'MobileNet v2 Quant (TFLite)',
    'Inception v3 Quant (TFLite)',
    'Inception v4 Quant (TFLite)',
    'MobileNet v1 Quant (Caffe2)',
    'SSD MobileNet v1 Quant (TFLite)',
    'SSD MobileNet v2 Quant (TFLite)'
  ],
  "clDNN": [
    'MobileNet v1 Quant (TFLite)',
    'MobileNet v2 Quant (TFLite)',
    'Inception v3 Quant (TFLite)',
    'Inception v4 Quant (TFLite)',
    'MobileNet v1 Quant (Caffe2)',
    'SSD MobileNet v1 Quant (TFLite)',
    'SSD MobileNet v2 Quant (TFLite)',
    'Tiny Yolo v2 COCO (TFLite)',
    'Tiny Yolo v2 VOC (TFLite)'
  ],
  "DNNL": [
    'MobileNet v1 Quant (TFLite)',
    'MobileNet v2 Quant (TFLite)',
    'Inception v3 Quant (TFLite)',
    'Inception v4 Quant (TFLite)',
    'Inception v2 (ONNX)',
    'DenseNet 121 (ONNX)',
    'SqueezeNet (OpenVino)',
    'DenseNet 121 (OpenVino)',
    'MobileNet v1 Quant (Caffe2)',
    'SSD MobileNet v1 Quant (TFLite)',
    'SSD MobileNet v2 Quant (TFLite)',
    'Tiny Yolo v2 COCO (TFLite)',
    'Tiny Yolo v2 VOC (TFLite)',
    'Tiny Yolo v2 Face (TFlite)'
  ],
  "DirectML": [
    'MobileNet v1 Quant (TFLite)',
    'MobileNet v2 Quant (TFLite)',
    'Inception v3 Quant (TFLite)',
    'Inception v4 Quant (TFLite)',
    'DenseNet 121 (ONNX)',
    'SqueezeNet (OpenVino)',
    'DenseNet 121 (OpenVino)',
    'MobileNet v1 Quant (Caffe2)',
    'SSD MobileNet v1 Quant (TFLite)',
    'SSD MobileNet v2 Quant (TFLite)',
    'Deeplab 257 (TFLite)',
    'Deeplab 257 Atrous (TFLite)',
    'Deeplab 321 (TFLite)',
    'Deeplab 321 Atrous (TFLite)',
    'Deeplab 513 (TFLite)',
    'Deeplab 513 Atrous (TFLite)',
    'Deeplab 257 Atrous (OpenVINO)',
    'Deeplab 321 Atrous (OpenVINO)',
    'Deeplab 513 Atrous (OpenVINO)',
    'Tiny Yolo v2 COCO (TFLite)',
    'Tiny Yolo v2 VOC (TFLite)',
    'Tiny Yolo v2 Face (TFlite)'
  ],
  "IE-clDNN": [
    'MobileNet v1 Quant (TFLite)',
    'MobileNet v2 Quant (TFLite)',
    'Inception v3 Quant (TFLite)',
    'Inception v4 (TFLite)',
    'Inception v4 Quant (TFLite)',
    'Inception ResNet v2 (TFLite)',
    'Inception v2 (ONNX)',
    'DenseNet 121 (ONNX)',
    'ResNet50 v1 (ONNX)',
    'ResNet50 v2 (ONNX)',
    'Inception v2 (ONNX)',
    'DenseNet 121 (ONNX)',
    'ResNet50 v1 (OpenVino)',
    'DenseNet 121 (OpenVino)',
    'Inception v2 (OpenVino)',
    'Inception v4 (OpenVino)',
    'MobileNet v1 Quant (Caffe2)',
    'SSD MobileNet v1 Quant (TFLite)',
    'SSD MobileNet v2 Quant (TFLite)',
    'Tiny Yolo v2 COCO (TFLite)',
    'Tiny Yolo v2 VOC (TFLite)',
    'Tiny Yolo v2 Face (TFlite)'
  ],
  "IE-MKLDNN": [
    'MobileNet v1 Quant (TFLite)',
    'MobileNet v2 Quant (TFLite)',
    'Inception v3 Quant (TFLite)',
    'Inception v4 Quant (TFLite)',
    'Inception ResNet v2 (TFLite)',
    'Inception v2 (ONNX)',
    'DenseNet 121 (ONNX)',
    'Inception v2 (ONNX)',
    'DenseNet 121 (ONNX)',
    'DenseNet 121 (OpenVino)',
    'MobileNet v1 Quant (Caffe2)',
    'SSD MobileNet v1 Quant (TFLite)',
    'SSD MobileNet v2 Quant (TFLite)',
    'Tiny Yolo v2 COCO (TFLite)',
    'Tiny Yolo v2 VOC (TFLite)',
    'Tiny Yolo v2 Face (TFlite)'
  ]
};

module.exports = {
  DEBUG_FLAG: DEBUG_FLAG,
  WORKLOAD_URL: WORKLOAD_URL,
  TARGET_BACKEND: TARGET_BACKEND,
  ITERATIONS: ITERATIONS,
  BACKEND_CONFIG: BACKEND_CONFIG,
  CATEGORY_FILTER: CATEGORY_FILTER,
  MODEL_FILTER: MODEL_FILTER,
  REGRESSION_FLAG: REGRESSION_FLAG,
  REGRESSION_TEST: REGRESSION_TEST,
  DEV_CHROMIUM_PATH: DEV_CHROMIUM_PATH,
};