/* sceneWorker.js — Classic Web Worker for scene narration inference.
 *
 * Uses importScripts() to load TFLite WASM from CDN.
 * This completely bypasses the Next.js bundler — no npm package needed.
 *
 * Messages IN:
 *   { type: 'INIT' }
 *   { type: 'PROCESS_FRAME', payload: { buffer, width, height } }
 *   { type: 'DESTROY' }
 *
 * Messages OUT:
 *   { type: 'READY', payload: { webnnAvailable, modelReady } }
 *   { type: 'DETECTIONS', payload: RawDetection[] }
 *   { type: 'ERROR', payload: string }
 */

const COCO_LABELS = [
  'person','bicycle','car','motorcycle','airplane','bus','train','truck','boat',
  'traffic light','fire hydrant','stop sign','parking meter','bench','bird','cat',
  'dog','horse','sheep','cow','elephant','bear','zebra','giraffe','backpack',
  'umbrella','handbag','tie','suitcase','frisbee','skis','snowboard','sports ball',
  'kite','baseball bat','baseball glove','skateboard','surfboard','tennis racket',
  'bottle','wine glass','cup','fork','knife','spoon','bowl','banana','apple',
  'sandwich','orange','broccoli','carrot','hot dog','pizza','donut','cake','chair',
  'couch','potted plant','bed','dining table','toilet','tv','laptop','mouse',
  'remote','keyboard','cell phone','microwave','oven','toaster','sink',
  'refrigerator','book','clock','vase','scissors','teddy bear','hair drier','toothbrush',
];

const MODEL_INPUT_SIZE = 320;
const CONFIDENCE_THRESHOLD = 0.55;

let tfliteInterpreter = null;
let modelReady = false;

// ── WebNN check ───────────────────────────────────────────────────────────────
function checkWebNN() {
  return typeof navigator !== 'undefined' && 'ml' in navigator;
}

// ── Load TFLite via CDN importScripts ─────────────────────────────────────────
async function loadModel() {
  try {
    // Load TFLite WASM runtime from CDN
    importScripts(
      'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.8/dist/tf-tflite.min.js'
    );

    // tflite is now available as a global from the importScripts call
    const tflite = self.tflite || self.tfTflite;
    if (!tflite) throw new Error('TFLite global not found after importScripts');

    await tflite.setWasmPath(
      'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.8/wasm/'
    );

    // Try EfficientDet-Lite0 first
    try {
      tfliteInterpreter = await tflite.loadTFLiteModel('/models/efficientdet_lite0_int8.tflite');
      modelReady = true;
      console.log('[sceneWorker] EfficientDet-Lite0 INT8 loaded.');
    } catch {
      // Fallback to MobileNet-SSD
      tfliteInterpreter = await tflite.loadTFLiteModel('/models/mobilenet_ssd_v2_int8.tflite');
      modelReady = true;
      console.log('[sceneWorker] MobileNet-SSD v2 INT8 loaded (fallback).');
    }
  } catch (err) {
    console.error('[sceneWorker] Could not load detection model:', err);
    self.postMessage({ type: 'ERROR', payload: String(err) });
  }
}

// ── Preprocessing ──────────────────────────────────────────────────────────────
function preprocessFrame(buffer, srcWidth, srcHeight) {
  const canvas = new OffscreenCanvas(MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const ctx = canvas.getContext('2d');

  const srcCanvas = new OffscreenCanvas(srcWidth, srcHeight);
  const srcCtx = srcCanvas.getContext('2d');
  srcCtx.putImageData(new ImageData(new Uint8ClampedArray(buffer), srcWidth, srcHeight), 0, 0);

  ctx.drawImage(srcCanvas, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const resized = ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);

  const pixels = resized.data;
  const float32 = new Float32Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE * 3);
  for (let i = 0, j = 0; i < pixels.length; i += 4, j += 3) {
    float32[j]     = pixels[i]     / 255.0;
    float32[j + 1] = pixels[i + 1] / 255.0;
    float32[j + 2] = pixels[i + 2] / 255.0;
  }
  return float32;
}

// ── Inference ─────────────────────────────────────────────────────────────────
async function runInference(float32Input) {
  if (!tfliteInterpreter || !modelReady) return [];
  try {
    const outputTensors = tfliteInterpreter.predict({ 'input_0': float32Input });
    const boxes   = Object.values(outputTensors)[0];
    const classes = Object.values(outputTensors)[1];
    const scores  = Object.values(outputTensors)[2];
    const count   = Object.values(outputTensors)[3];

    const numDetections = Math.round(Array.isArray(count) ? count[0] : count.dataSync()[0]);
    const detections = [];

    for (let i = 0; i < numDetections; i++) {
      const score = Array.isArray(scores) ? scores[i] : scores.dataSync()[i];
      if (score < CONFIDENCE_THRESHOLD) continue;
      const classId = Math.round(Array.isArray(classes) ? classes[i] : classes.dataSync()[i]);
      if (classId < 0 || classId >= COCO_LABELS.length) continue;

      const b = Array.isArray(boxes) ? boxes : boxes.dataSync();
      detections.push({
        classId,
        score,
        box: [b[i * 4], b[i * 4 + 1], b[i * 4 + 2], b[i * 4 + 3]],
      });
    }
    return detections;
  } catch (err) {
    console.error('[sceneWorker] Inference error:', err);
    return [];
  }
}

// ── Message handler ────────────────────────────────────────────────────────────
self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    const webnnAvailable = checkWebNN();
    console.log('[sceneWorker] WebNN available:', webnnAvailable);
    await loadModel();
    self.postMessage({ type: 'READY', payload: { webnnAvailable, modelReady } });

  } else if (type === 'PROCESS_FRAME') {
    if (!modelReady) return;
    const { buffer, width, height } = payload;
    const float32Input = preprocessFrame(buffer, width, height);
    const detections = await runInference(float32Input);
    self.postMessage({ type: 'DETECTIONS', payload: detections });

  } else if (type === 'DESTROY') {
    tfliteInterpreter = null;
    modelReady = false;
  }
};
