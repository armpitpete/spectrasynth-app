const MAX_REVERB_WET_GAIN = 0.30;
const REVERB_DECAY_SECONDS = 1.15;
const REVERB_PRE_DELAY_SECONDS = 0.018;
const STEREO_SPREAD_DELAY_LIMIT_SECONDS = 0.03;
const CONNECT_PATCH_FLAG = "__spectraSynthReverbConnectPatched";

let originalConnect = null;
let masterGainNode = null;
let reverbSourceNode = null;
let reverbPreDelay = null;
let reverbConvolver = null;
let reverbWetGain = null;
let reverbSlider = null;

function getSliderByLabel(labelText) {
  const labels = Array.from(document.querySelectorAll("label"));
  const matchedLabel = labels.find((label) =>
    label.textContent.toLowerCase().includes(labelText.toLowerCase())
  );

  return matchedLabel?.querySelector('input[type="range"]') ?? null;
}

function getReverbAmount() {
  if (!reverbSlider) {
    return 0;
  }

  return Number(reverbSlider.value) / 100;
}

function createSmallRoomImpulse(context) {
  const length = Math.max(1, Math.floor(context.sampleRate * REVERB_DECAY_SECONDS));
  const impulse = context.createBuffer(2, length, context.sampleRate);

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const channelData = impulse.getChannelData(channel);

    for (let index = 0; index < length; index += 1) {
      const position = index / length;
      const decay = Math.pow(1 - position, 2.2);
      const earlyReflection = index < context.sampleRate * 0.09 ? 0.55 : 1;
      channelData[index] = (Math.random() * 2 - 1) * decay * earlyReflection * 0.42;
    }
  }

  return impulse;
}

function updateReverbSummary() {
  const patchSummaryText = document.querySelector("#patchSummaryText");

  if (!patchSummaryText || !reverbSlider) {
    return;
  }

  const reverbPercent = Number(reverbSlider.value);
  const existingSummary = patchSummaryText.textContent.replace(/ Reverb is active:.*$/, "");

  if (reverbPercent <= 0) {
    patchSummaryText.textContent = existingSummary;
    return;
  }

  patchSummaryText.textContent = `${existingSummary} Reverb is active: ${reverbPercent}% adds a controlled room space with no feedback loop.`;
}

function updateReverbFromSlider() {
  const reverbAmount = getReverbAmount();

  if (reverbWetGain && reverbWetGain.context) {
    reverbWetGain.gain.setTargetAtTime(
      reverbAmount * MAX_REVERB_WET_GAIN,
      reverbWetGain.context.currentTime,
      0.025
    );
  }

  updateReverbSummary();
}

function ensureReverbBranch() {
  if (!reverbSourceNode || !masterGainNode || reverbPreDelay || reverbConvolver || reverbWetGain || !originalConnect) {
    return;
  }

  const context = reverbSourceNode.context;
  reverbPreDelay = context.createDelay(0.08);
  reverbConvolver = context.createConvolver();
  reverbWetGain = context.createGain();

  reverbPreDelay.delayTime.setValueAtTime(REVERB_PRE_DELAY_SECONDS, context.currentTime);
  reverbConvolver.buffer = createSmallRoomImpulse(context);
  reverbWetGain.gain.setValueAtTime(getReverbAmount() * MAX_REVERB_WET_GAIN, context.currentTime);

  originalConnect.call(reverbSourceNode, reverbPreDelay);
  originalConnect.call(reverbPreDelay, reverbConvolver);
  originalConnect.call(reverbConvolver, reverbWetGain);
  originalConnect.call(reverbWetGain, masterGainNode);
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
    ensureReverbBranch();
    return;
  }

  if (!reverbSourceNode && isPostFuzzStereoConnection(source, destination)) {
    reverbSourceNode = source;
    ensureReverbBranch();
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

  globalThis.AudioNode.prototype.connect = function patchedReverbConnect(destination, ...args) {
    const connectionResult = originalConnect.call(this, destination, ...args);

    try {
      captureExistingGraphConnection(this, destination);
    } catch {
      // Reverb must never stop the instrument from loading or sounding.
    }

    return connectionResult;
  };

  globalThis.AudioNode.prototype[CONNECT_PATCH_FLAG] = true;
}

function initialiseReverbControl() {
  reverbSlider = getSliderByLabel("Reverb");

  if (!reverbSlider) {
    return;
  }

  reverbSlider.id = "reverbSlider";
  reverbSlider.addEventListener("input", updateReverbFromSlider);
  updateReverbFromSlider();
}

try {
  patchConnectSafely();
  initialiseReverbControl();
} catch {
  // Reverb must fail parked rather than break the app.
}
