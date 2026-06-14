const WIDTH_DEFAULT = 50;
const CENTER_GAIN_NARROW = 1.0;
const CENTER_GAIN_NORMAL = 0.62;
const CENTER_GAIN_WIDE = 0.5;
const SIDE_GAIN_NARROW = 0;
const SIDE_GAIN_NORMAL = 0.42;
const SIDE_GAIN_WIDE = 0.48;
const PAN_NARROW = 0;
const PAN_NORMAL = 0.85;
const PAN_WIDE = 1.0;
const CONNECT_PATCH_FLAG = "__spectraSynthStereoWidthPatched";

let originalConnect = null;
let stereoWidthSlider = null;
let centerGainNode = null;
let leftPannerNode = null;
let leftGainNode = null;
let rightPannerNode = null;
let rightGainNode = null;

function interpolate(startValue, endValue, amount) {
  return startValue + (endValue - startValue) * amount;
}

function getWidthStageValues(widthPercent) {
  if (widthPercent <= 50) {
    const amount = widthPercent / 50;

    return {
      centerGain: interpolate(CENTER_GAIN_NARROW, CENTER_GAIN_NORMAL, amount),
      sideGain: interpolate(SIDE_GAIN_NARROW, SIDE_GAIN_NORMAL, amount),
      panAmount: interpolate(PAN_NARROW, PAN_NORMAL, amount),
    };
  }

  const amount = (widthPercent - 50) / 50;

  return {
    centerGain: interpolate(CENTER_GAIN_NORMAL, CENTER_GAIN_WIDE, amount),
    sideGain: interpolate(SIDE_GAIN_NORMAL, SIDE_GAIN_WIDE, amount),
    panAmount: interpolate(PAN_NORMAL, PAN_WIDE, amount),
  };
}

function injectStereoWidthSlider() {
  const effectsPanel = document.querySelector(".effects-panel");
  const outputSlider = document.querySelector("#outputSlider");
  const outputLabel = outputSlider?.closest("label");

  if (!effectsPanel || !outputLabel || document.querySelector("#stereoWidthSlider")) {
    return;
  }

  const widthLabel = document.createElement("label");
  widthLabel.textContent = "Stereo Width";

  const widthSlider = document.createElement("input");
  widthSlider.id = "stereoWidthSlider";
  widthSlider.type = "range";
  widthSlider.min = "0";
  widthSlider.max = "100";
  widthSlider.value = String(WIDTH_DEFAULT);

  widthLabel.appendChild(widthSlider);
  effectsPanel.insertBefore(widthLabel, outputLabel);
  stereoWidthSlider = widthSlider;
}

function updateStereoWidthSummary() {
  const patchSummaryText = document.querySelector("#patchSummaryText");

  if (!patchSummaryText || !stereoWidthSlider) {
    return;
  }

  const existingSummary = patchSummaryText.textContent.replace(/ Stereo Width is active:.*$/, "");
  const widthPercent = Number(stereoWidthSlider.value);
  patchSummaryText.textContent = `${existingSummary} Stereo Width is active: ${widthPercent}% controls the existing output spread stage.`;
}

function applyStereoWidth() {
  if (!stereoWidthSlider) {
    return;
  }

  const widthPercent = Number(stereoWidthSlider.value);
  const values = getWidthStageValues(widthPercent);
  const currentTime = centerGainNode?.context?.currentTime ?? leftGainNode?.context?.currentTime ?? rightGainNode?.context?.currentTime;

  if (centerGainNode && currentTime !== undefined) {
    centerGainNode.gain.setTargetAtTime(values.centerGain, currentTime, 0.02);
  }

  if (leftGainNode && currentTime !== undefined) {
    leftGainNode.gain.setTargetAtTime(values.sideGain, currentTime, 0.02);
  }

  if (rightGainNode && currentTime !== undefined) {
    rightGainNode.gain.setTargetAtTime(values.sideGain, currentTime, 0.02);
  }

  if (leftPannerNode && currentTime !== undefined) {
    leftPannerNode.pan.setTargetAtTime(-values.panAmount, currentTime, 0.02);
  }

  if (rightPannerNode && currentTime !== undefined) {
    rightPannerNode.pan.setTargetAtTime(values.panAmount, currentTime, 0.02);
  }

  updateStereoWidthSummary();
}

function looksLikeCenterSpreadGain(destination) {
  return Math.abs(destination.gain.value - CENTER_GAIN_NORMAL) < 0.08;
}

function captureExistingStereoConnection(source, destination) {
  if (
    !centerGainNode &&
    globalThis.BiquadFilterNode &&
    globalThis.GainNode &&
    source instanceof BiquadFilterNode &&
    destination instanceof GainNode &&
    looksLikeCenterSpreadGain(destination)
  ) {
    centerGainNode = destination;
    applyStereoWidth();
    return;
  }

  if (
    globalThis.StereoPannerNode &&
    globalThis.GainNode &&
    source instanceof StereoPannerNode &&
    destination instanceof GainNode
  ) {
    if (source.pan.value < 0) {
      leftPannerNode = source;
      leftGainNode = destination;
    }

    if (source.pan.value > 0) {
      rightPannerNode = source;
      rightGainNode = destination;
    }

    applyStereoWidth();
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

  globalThis.AudioNode.prototype.connect = function patchedStereoWidthConnect(destination, ...args) {
    const connectionResult = originalConnect.call(this, destination, ...args);

    try {
      captureExistingStereoConnection(this, destination);
    } catch {
      // Stereo Width must never stop the instrument from loading or sounding.
    }

    return connectionResult;
  };

  globalThis.AudioNode.prototype[CONNECT_PATCH_FLAG] = true;
}

function initialiseStereoWidthControl() {
  injectStereoWidthSlider();

  if (!stereoWidthSlider) {
    return;
  }

  stereoWidthSlider.addEventListener("input", applyStereoWidth);
  applyStereoWidth();
}

try {
  patchConnectSafely();
  initialiseStereoWidthControl();
} catch {
  // Stereo Width must fail parked rather than break the app.
}
