// Blink detection with MediaPipe Face Landmarker (replaces BRFv4).
// The model outputs an eyeBlinkLeft / eyeBlinkRight score per frame (0 = open, 1 = closed).
// We learn each player's resting "open" score for a moment, then count a blink when both
// eyes rise clearly above it for a few consecutive frames. Calls startGame() and blink()
// from index_original.js. Add ?debug to the URL to see the live scores.

import {
  FaceLandmarker,
  FilesetResolver,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const CALIBRATION_MS = 1500; // learn the open-eye baseline before the game starts
const CLOSED_MARGIN = 0.3; // how far above the baseline counts as closed
const MIN_CLOSED = 0.45; // ...but never below this
const MAX_CLOSED = 0.8; // ...and never above this
const CONSEC_FRAMES = 2; // frames both eyes must stay closed (~60ms at 30fps)
const BASELINE_RATE = 0.02; // how fast the baseline follows slow changes (posture, light)

const debug = new URLSearchParams(location.search).has('debug');
const webcam = document.getElementById('_webcam');

let landmarker = null;
let lastVideoTime = -1;
let calibrationStart = 0;
let samples = [];
let baseline = null;
let closedFrames = 0;
let debugEl = null;

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function blinkScore(result) {
  const shapes = result.faceBlendshapes && result.faceBlendshapes[0];
  if (!shapes) return null;

  let left = 0;
  let right = 0;
  for (const c of shapes.categories) {
    if (c.categoryName === 'eyeBlinkLeft') left = c.score;
    if (c.categoryName === 'eyeBlinkRight') right = c.score;
  }

  // Both eyes have to close: a wink or one badly lit eye doesn't count.
  return Math.min(left, right);
}

function update(score, now) {
  if (score === null) {
    // No face: don't count anything, and restart the closed-frame run.
    closedFrames = 0;
    if (debugEl) debugEl.textContent = 'no face';
    return;
  }

  if (baseline === null) {
    if (!calibrationStart) calibrationStart = now;
    samples.push(score);
    if (now - calibrationStart >= CALIBRATION_MS) {
      baseline = median(samples);
      startGame();
    }
    return;
  }

  const threshold = Math.min(MAX_CLOSED, Math.max(MIN_CLOSED, baseline + CLOSED_MARGIN));

  if (score > threshold) {
    closedFrames += 1;
    if (closedFrames === CONSEC_FRAMES) blink();
  } else {
    closedFrames = 0;
    // Only learn from frames that are clearly open, so half-blinks don't drag the baseline up.
    if (score < threshold - 0.1) baseline += (score - baseline) * BASELINE_RATE;
  }

  if (debugEl) {
    debugEl.textContent =
      'score ' + score.toFixed(2) +
      '  baseline ' + baseline.toFixed(2) +
      '  threshold ' + threshold.toFixed(2) +
      '  closed ' + closedFrames;
  }
}

function loop() {
  if (webcam.currentTime !== lastVideoTime) {
    lastVideoTime = webcam.currentTime;
    const now = performance.now();
    update(blinkScore(landmarker.detectForVideo(webcam, now)), now);
  }
  requestAnimationFrame(loop);
}

async function init() {
  if (debug) {
    debugEl = document.createElement('div');
    debugEl.style.cssText =
      'position:fixed;left:8px;bottom:8px;z-index:9999;padding:4px 8px;font:12px monospace;color:#0f0;background:rgba(0,0,0,.7)';
    debugEl.textContent = 'loading…';
    document.body.appendChild(debugEl);
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, frameRate: 30, facingMode: 'user' },
    });
  } catch (e) {
    alert('No camera available.');
    return;
  }

  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  const options = {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
  };
  try {
    landmarker = await FaceLandmarker.createFromOptions(vision, options);
  } catch (e) {
    // No WebGL / GPU delegate: fall back to the CPU.
    options.baseOptions.delegate = 'CPU';
    landmarker = await FaceLandmarker.createFromOptions(vision, options);
  }

  webcam.srcObject = stream;
  await webcam.play();
  if (debugEl) debugEl.textContent = 'calibrating — look at the screen';
  loop();
}

init().catch(function(e) {
  console.error(e);
});
