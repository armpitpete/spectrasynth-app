const SPECTRAL_BAND_FREQUENCIES = [80, 160, 320, 640, 1200, 2200, 3800, 6200, 9000, 12500];
const SPECTRAL_BAND_Q = [0.8, 0.9, 1.0, 1.05, 1.15, 1.2, 1.25, 1.25, 1.15, 1.0];
const SPECTRAL_DRY_GAIN = 0.5;
const MAX_BAND_GAIN = 0.16;
const GAIN_RAMP_SECONDS = 0.02;

const trackedSpectralBanks = new Set();
const patchedSources = new WeakSet();
const sourceOutputGains = new WeakSet();

let isConnectPatched = false;
let originalAudioConnect = null;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getBandFaders() {
  return Array.from(document.querySelectorAll(".spectral-panel .band-fader"));
}

function getMuteButtons() {
  return Array.from(document.querySelectorAll(".spectral-panel .mute-button"));
}

function isLikelyMainToneFilter(destinationNode) {
  return (
    typeof BiquadFilterNode !== "undefined" &&
    destinationNode instanceof BiquadFilterNode &&
    destinationNode.type === "lowpass"
  );
}

function isLikelySourceGain(sourceNode) {
  return typeof GainNode !== "undefined" && sourceNode instanceof GainNode;
}

function isLikelyAudioSource(sourceNode) {
  return (
    (typeof OscillatorNode !== "undefined" && sourceNode instanceof OscillatorNode) ||
    (typeof AudioBufferSourceNode !== "undefined" && sourceNode instanceof AudioBufferSourceNode)
  );
}

function getBandTargetGain(bandIndex) {
  const fader = document.querySelector(`.spectral-panel .band-fader[data-band-index="${bandIndex}"]`);
  const muteButton = document.querySelector(`.spectral-panel .mute-button[data-band-index="${bandIndex}"]`);
  const faderAmount = clamp(Number(fader?.value ?? 0) / 100, 0, 1);
  const isMuted = muteButton?.getAttribute("aria-pressed") === "true";

  if (isMuted) {
    return 0;
  }

  return Math.pow(faderAmount, 1.15) * MAX_BAND_GAIN;
}

function disconnectDirectSourcePath(sourceNode, destinationNode) {
  try {
    sourceNode.disconnect(destinationNode);
  } catch {
    // If the browser cannot disconnect this exact connection, leave the dry path intact.
    // The spectral layer will still be added, but the fader effect may be less strong.
  }
}

function createSpectralBank(sourceNode, destinationNode) {
  if (!originalAudioConnect || patchedSources.has(sourceNode)) {
    return;
  }

  patchedSources.add(sourceNode);

  const context = sourceNode.context;
  const dryGain = context.createGain();

  dryGain.gain.setValueAtTime(SPECTRAL_DRY_GAIN, context.currentTime);

  disconnectDirectSourcePath(sourceNode, destinationNode);
  originalAudioConnect.call(sourceNode, dryGain);
  originalAudioConnect.call(dryGain, destinationNode);

  const bandGains = SPECTRAL_BAND_FREQUENCIES.map((frequency, bandIndex) => {
    const bandFilter = context.createBiquadFilter();
    const bandGain = context.createGain();

    bandFilter.type = "bandpass";
    bandFilter.frequency.setValueAtTime(frequency, context.currentTime);
    bandFilter.Q.setValueAtTime(SPECTRAL_BAND_Q[bandIndex], context.currentTime);
    bandGain.gain.setValueAtTime(getBandTargetGain(bandIndex), context.currentTime);

    originalAudioConnect.call(sourceNode, bandFilter);
    originalAudioConnect.call(bandFilter, bandGain);
    originalAudioConnect.call(bandGain, destinationNode);

    return bandGain;
  });

  trackedSpectralBanks.add({ context, bandGains, dryGain });
  updateSpectralPanelWording();
}

function updateSpectralBandGains() {
  trackedSpectralBanks.forEach(({ context, bandGains }) => {
    bandGains.forEach((bandGain, bandIndex) => {
      bandGain.gain.setTargetAtTime(getBandTargetGain(bandIndex), context.currentTime, GAIN_RAMP_SECONDS);
    });
  });
}

function patchAudioConnect() {
  if (isConnectPatched || typeof AudioNode === "undefined") {
    return;
  }

  originalAudioConnect = AudioNode.prototype.connect;

  AudioNode.prototype.connect = function patchedConnect(destinationNode, ...args) {
    const result = originalAudioConnect.call(this, destinationNode, ...args);

    if (isLikelyAudioSource(this) && isLikelySourceGain(destinationNode)) {
      sourceOutputGains.add(destinationNode);
    }

    if (sourceOutputGains.has(this) && isLikelyMainToneFilter(destinationNode)) {
      createSpectralBank(this, destinationNode);
    }

    return result;
  };

  isConnectPatched = true;
}

function updateSpectralPanelWording() {
  const spectralPanelNote = document.querySelector(".spectral-panel .section-heading p");

  if (!spectralPanelNote) {
    return;
  }

  spectralPanelNote.textContent = "Faders now shape an audible spectral source layer. Mute/Unmute removes or restores each band contribution.";
}

function updatePatchSummaryWording() {
  const patchSummaryText = document.querySelector("#patchSummaryText");

  if (!patchSummaryText) {
    return;
  }

  patchSummaryText.textContent = patchSummaryText.textContent
    .replaceAll("Faders and Mute buttons remain visual-only and do not affect sound.", "Faders and Mute/Unmute now shape an audible spectral source layer.")
    .replaceAll("band-fader audio behaviour, ", "")
    .replaceAll("No audible Band 5 filtering, all-10-band filter bank", "No full all-10-band filter bank");
}

function initialiseSpectralBandAudio() {
  patchAudioConnect();
  updateSpectralPanelWording();
  updatePatchSummaryWording();

  getBandFaders().forEach((fader) => {
    fader.addEventListener("input", () => {
      updateSpectralBandGains();
      window.requestAnimationFrame(updatePatchSummaryWording);
    });
  });

  getMuteButtons().forEach((button) => {
    button.addEventListener("click", () => {
      window.requestAnimationFrame(() => {
        updateSpectralBandGains();
        updatePatchSummaryWording();
      });
    });
  });
}

initialiseSpectralBandAudio();