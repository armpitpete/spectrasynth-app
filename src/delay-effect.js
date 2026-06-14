const MAX_DELAY_WET_GAIN = 0.08;
const MIN_DELAY_SECONDS = 0.07;
const MAX_DELAY_SECONDS = 0.33;
const STEREO_SPREAD_DELAY_LIMIT_SECONDS = 0.03;

const originalConnect = AudioNode.prototype.connect;

let masterGainNode = null;
let delaySourceNode = null;
let delayNode = null;
let delayWetGain = null;
let delaySlider = null;
let summaryObserver = null;
let isUpdatingSummary = false;

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

  if (!patchSummaryText || isUpdatingSummary) {
    return;
  }

  const delayPercent = delaySlider ? Number(delaySlider.value) : 0;
  const existingSummary = patchSummaryText.textContent.replace(/ Delay is active:.*$/, "");

  isUpdatingSummary = true;

  if (delayPercent <= 0) {
    patchSummaryText.textContent = existingSummary;
  } else {
    const delaySeconds = getDelayTime(delayPercent / 100).toFixed(2);
    patchSummaryText.textContent = `${existingSummary} Delay is active: ${delayPercent}% gives a short quiet echo at about ${delaySeconds} seconds with no feedback loop.`;
  }

  isUpdatingSummary = false;
}

function startDelaySummaryObserver() {
  const patchSummaryText = document.querySelector("#patchSummaryText");

  if (!patchSummaryText || summaryObserver) {
    return;
  }

  summaryObserver = new MutationObserver(() => {
    updateDelaySummary();
  });

  summaryObserver.observe(patchSummaryText, {
    childList: true,
    characterData: true,
    subtree: true,
  });
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
  if (!delaySourceNode || !masterGainNode || delayNode || delayWetGain) {
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

function captureExistingGraphConnection(source, destination) {
  if (!masterGainNode && source instanceof GainNode && destination instanceof AudioDestinationNode) {
    masterGainNode = source;
    ensureDelayBranch();
    return;
  }

  if (
    !delaySourceNode &&
    source instanceof BiquadFilterNode &&
    destination instanceof DelayNode &&
    destination.delayTime.value <= STEREO_SPREAD_DELAY_LIMIT_SECONDS
  ) {
    delaySourceNode = source;
    ensureDelayBranch();
  }
}

AudioNode.prototype.connect = function patchedDelayConnect(destination, ...args) {
  const connectionResult = originalConnect.call(this, destination, ...args);
  captureExistingGraphConnection(this, destination);
  return connectionResult;
};

function initialiseDelayControl() {
  delaySlider = getSliderByLabel("Delay");

  if (!delaySlider) {
    return;
  }

  delaySlider.id = "delaySlider";
  delaySlider.addEventListener("input", updateDelayFromSlider);
  startDelaySummaryObserver();
  updateDelayFromSlider();
}

initialiseDelayControl();
