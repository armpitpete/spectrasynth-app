const MAX_DELAY_WET_GAIN = 0.16;
const MIN_DELAY_SECONDS = 0.07;
const MAX_DELAY_SECONDS = 0.5;
const STEREO_SPREAD_DELAY_LIMIT_SECONDS = 0.03;
const CONNECT_PATCH_FLAG = "__spectraSynthDelayConnectPatched";

let originalConnect = null;
let masterGainNode = null;
let delaySourceNode = null;
let delayNode = null;
let delayWetGain = null;
let delaySlider = null;

function getSliderByLabel(labelText) {
  const labels = Array.from(document.querySelectorAll("label"));
  const matchedLabel = labels.find((label) =>
    label.textContent.toLowerCase().includes(labelText.toLowerCase())
  );

  return matchedLabel?.querySelector('input[type="range"]') ?? null;
}

function getDelayAmount() {
  if (!delaySlider) {
    return 0;
  }

  return Number(delaySlider.value) / 100;
}

function getDelayTime(delayAmount) {
  return MIN_DELAY_SECONDS + delayAmount * (MAX_DELAY_SECONDS - MIN_DELAY_SECONDS);
}

function updateDelaySummary() {
  const patchSummaryText = document.querySelector("#patchSummaryText");

  if (!patchSummaryText || !delaySlider) {
    return;
  }

  const delayPercent = Number(delaySlider.value);
  const existingSummary = patchSummaryText.textContent.replace(/ Delay is active:.*$/, "");

  if (delayPercent <= 0) {
    patchSummaryText.textContent = existingSummary;
    return;
  }

  const delaySeconds = getDelayTime(delayPercent / 100).toFixed(2);
  patchSummaryText.textContent = `${existingSummary} Delay is active: ${delayPercent}% gives a short controlled echo at about ${delaySeconds} seconds with no feedback loop.`;
}

function updateDelayFromSlider() {
  const delayAmount = getDelayAmount();

  if (delayNode && delayWetGain) {
    const currentTime = delayNode.context.currentTime;
    delayNode.delayTime.setTargetAtTime(getDelayTime(delayAmount), currentTime, 0.02);
    delayWetGain.gain.setTargetAtTime(delayAmount * MAX_DELAY_WET_GAIN, currentTime, 0.02);
  }

  updateDelaySummary();
}

function ensureDelayBranch() {
  if (!delaySourceNode || !masterGainNode || delayNode || delayWetGain || !originalConnect) {
    return;
  }

  const context = delaySourceNode.context;
  delayNode = context.createDelay(MAX_DELAY_SECONDS + 0.05);
  delayWetGain = context.createGain();

  delayNode.delayTime.setValueAtTime(getDelayTime(getDelayAmount()), context.currentTime);
  delayWetGain.gain.setValueAtTime(getDelayAmount() * MAX_DELAY_WET_GAIN, context.currentTime);

  originalConnect.call(delaySourceNode, delayNode);
  originalConnect.call(delayNode, delayWetGain);
  originalConnect.call(delayWetGain, masterGainNode);
}

function isMasterOutputConnection(source, destination) {
  return (
    globalThis.GainNode &&
    globalThis.AudioDestinationNode &&
    source instanceof GainNode &&
    destination instanceof AudioDestinationNode
  );
}

function isPostFuzzStereoConnection(source, destination) {
  return (
    globalThis.BiquadFilterNode &&
    globalThis.DelayNode &&
    source instanceof BiquadFilterNode &&
    destination instanceof DelayNode &&
    destination.delayTime.value <= STEREO_SPREAD_DELAY_LIMIT_SECONDS
  );
}

function captureExistingGraphConnection(source, destination) {
  if (!masterGainNode && isMasterOutputConnection(source, destination)) {
    masterGainNode = source;
    ensureDelayBranch();
    return;
  }

  if (!delaySourceNode && isPostFuzzStereoConnection(source, destination)) {
    delaySourceNode = source;
    ensureDelayBranch();
  }
}

function patchConnectSafely() {
  if (!globalThis.AudioNode?.prototype?.connect) {
    return;
  }

  if (globalThis.AudioNode.prototype[CONNECT_PATCH_FLAG]) {
    return;
  }

  originalConnect = globalThis.AudioNode.prototype.connect;

  globalThis.AudioNode.prototype.connect = function patchedDelayConnect(destination, ...args) {
    const connectionResult = originalConnect.call(this, destination, ...args);

    try {
      captureExistingGraphConnection(this, destination);
    } catch {
      // Delay must never stop the instrument from loading or sounding.
    }

    return connectionResult;
  };

  globalThis.AudioNode.prototype[CONNECT_PATCH_FLAG] = true;
}

function initialiseDelayControl() {
  delaySlider = getSliderByLabel("Delay");

  if (!delaySlider) {
    return;
  }

  delaySlider.id = "delaySlider";
  delaySlider.addEventListener("input", updateDelayFromSlider);
  updateDelayFromSlider();
}

try {
  patchConnectSafely();
  initialiseDelayControl();
} catch {
  // Delay must fail parked rather than break the app.
}
