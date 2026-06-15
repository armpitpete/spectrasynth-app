const MINIMUM_RAMP_MS = 5;
const OSCILLATOR_BASE_GAIN = 0.08;
const NOISE_BASE_GAIN = 0.05;

const trackedSourceGains = new Set();
const sourceGainTargets = new WeakMap();

let releaseTimer = null;
let isConnectPatched = false;

function getControl(id) {
  return document.querySelector(`#${id}`);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function isArEnvelopeOn() {
  return getControl("scaleChanceArEnvelopeEnabled")?.value === "on";
}

function getAttackMs() {
  return clamp(Number(getControl("scaleChanceArAttack")?.value ?? 25), 5, 1000);
}

function getReleaseMs() {
  return clamp(Number(getControl("scaleChanceArRelease")?.value ?? 180), 5, 2000);
}

function isOscillatorNode(node) {
  return typeof OscillatorNode !== "undefined" && node instanceof OscillatorNode;
}

function isBufferSourceNode(node) {
  return typeof AudioBufferSourceNode !== "undefined" && node instanceof AudioBufferSourceNode;
}

function isGainNode(node) {
  return typeof GainNode !== "undefined" && node instanceof GainNode;
}

function getBaseGainForSourceNode(sourceNode) {
  if (isOscillatorNode(sourceNode)) {
    return OSCILLATOR_BASE_GAIN;
  }

  if (isBufferSourceNode(sourceNode)) {
    return NOISE_BASE_GAIN;
  }

  return null;
}

function rememberSourceGain(sourceNode, destinationNode) {
  if (!isGainNode(destinationNode)) {
    return;
  }

  const baseGain = getBaseGainForSourceNode(sourceNode);

  if (baseGain === null) {
    return;
  }

  trackedSourceGains.add(destinationNode);
  sourceGainTargets.set(destinationNode, baseGain);

  if (isArEnvelopeOn()) {
    setGainImmediately(destinationNode, 0);
  }
}

function patchAudioConnect() {
  if (isConnectPatched || typeof AudioNode === "undefined") {
    return;
  }

  const originalConnect = AudioNode.prototype.connect;

  AudioNode.prototype.connect = function patchedConnect(destinationNode, ...args) {
    const result = originalConnect.call(this, destinationNode, ...args);
    rememberSourceGain(this, destinationNode);
    return result;
  };

  isConnectPatched = true;
}

function cancelReleaseTimer() {
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
}

function getSafeAudioParamValue(audioParam, fallbackValue) {
  const currentValue = Number(audioParam.value);
  return Number.isFinite(currentValue) ? currentValue : fallbackValue;
}

function setGainImmediately(gainNode, targetValue) {
  const now = gainNode.context.currentTime;

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(targetValue, now);
}

function rampGainTo(gainNode, targetValue, durationMs) {
  const now = gainNode.context.currentTime;
  const safeDurationSeconds = Math.max(MINIMUM_RAMP_MS, durationMs) / 1000;
  const currentValue = getSafeAudioParamValue(gainNode.gain, targetValue);

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(currentValue, now);
  gainNode.gain.linearRampToValueAtTime(targetValue, now + safeDurationSeconds);
}

function triggerSourceAttack(attackMs) {
  trackedSourceGains.forEach((gainNode) => {
    const targetGain = sourceGainTargets.get(gainNode) ?? 0;

    setGainImmediately(gainNode, 0);
    rampGainTo(gainNode, targetGain, attackMs);
  });
}

function triggerSourceRelease(releaseMs) {
  trackedSourceGains.forEach((gainNode) => {
    rampGainTo(gainNode, 0, releaseMs);
  });
}

function restoreSourceGains() {
  cancelReleaseTimer();

  trackedSourceGains.forEach((gainNode) => {
    const targetGain = sourceGainTargets.get(gainNode) ?? 0;
    rampGainTo(gainNode, targetGain, 30);
  });
}

function silenceSourceGains() {
  cancelReleaseTimer();

  trackedSourceGains.forEach((gainNode) => {
    rampGainTo(gainNode, 0, MINIMUM_RAMP_MS);
  });
}

function triggerArEnvelope(event) {
  if (!isArEnvelopeOn()) {
    return;
  }

  const noteLengthMs = Math.max(20, Number(event.detail?.noteLengthMs ?? 250));
  const attackMs = getAttackMs();
  const releaseMs = getReleaseMs();

  cancelReleaseTimer();
  triggerSourceAttack(attackMs);

  releaseTimer = setTimeout(() => {
    triggerSourceRelease(releaseMs);
  }, Math.max(MINIMUM_RAMP_MS, noteLengthMs));
}

function initialiseScaleChanceArEnvelope() {
  const arEnvelopeControl = getControl("scaleChanceArEnvelopeEnabled");
  const panicButton = getControl("panicButton");

  if (!arEnvelopeControl) {
    return;
  }

  patchAudioConnect();

  arEnvelopeControl.addEventListener("change", () => {
    if (isArEnvelopeOn()) {
      silenceSourceGains();
      return;
    }

    restoreSourceGains();
  });

  if (panicButton) {
    panicButton.addEventListener("click", silenceSourceGains);
  }

  document.addEventListener("spectraSynthScaleChanceNote", triggerArEnvelope);
}

initialiseScaleChanceArEnvelope();
