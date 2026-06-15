const SPECTRAL_BAND_FREQUENCIES = [80, 160, 320, 640, 1200, 2200, 3800, 6200, 9000, 12500];
const SPECTRAL_BAND_Q = [1.15, 1.2, 1.25, 1.3, 1.35, 1.35, 1.3, 1.25, 1.2, 1.15];
const MAX_BAND_GAIN = 0.24;
const GAIN_RAMP_SECONDS = 0.02;
const MAX_GRAPH_SEARCH_DEPTH = 10;

const trackedSpectralBanks = new Set();
const patchedSources = new WeakSet();
const sourceOutputGains = new WeakSet();
const nodeOutputDestinations = new WeakMap();

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

function rememberConnection(sourceNode, destinationNode) {
  if (!sourceNode || !destinationNode) {
    return;
  }

  const destinations = nodeOutputDestinations.get(sourceNode) ?? new Set();
  destinations.add(destinationNode);
  nodeOutputDestinations.set(sourceNode, destinations);
}

function getRememberedDestinations(sourceNode) {
  return Array.from(nodeOutputDestinations.get(sourceNode) ?? []);
}

function isLowpassFilter(node) {
  return (
    typeof BiquadFilterNode !== "undefined" &&
    node instanceof BiquadFilterNode &&
    node.type === "lowpass"
  );
}

function isLikelyMainToneFilter(destinationNode) {
  return isLowpassFilter(destinationNode);
}

function isLikelySourceGain(sourceNode) {
  return typeof GainNode !== "undefined" && sourceNode instanceof GainNode;
}

function isLikelyNoiseSource(sourceNode) {
  return sourceNode?.constructor?.name === "AudioBufferSourceNode";
}

function isLikelyAudioSource(sourceNode) {
  return (
    (typeof OscillatorNode !== "undefined" && sourceNode instanceof OscillatorNode) ||
    isLikelyNoiseSource(sourceNode)
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

  return faderAmount * MAX_BAND_GAIN;
}

function findPostToneLowpass(startNode) {
  const visitedNodes = new WeakSet();
  const queue = getRememberedDestinations(startNode).map((node) => ({ node, depth: 0 }));

  while (queue.length > 0) {
    const { node, depth } = queue.shift();

    if (!node || visitedNodes.has(node) || depth > MAX_GRAPH_SEARCH_DEPTH) {
      continue;
    }

    visitedNodes.add(node);

    if (node !== startNode && isLowpassFilter(node)) {
      return node;
    }

    getRememberedDestinations(node).forEach((nextNode) => {
      queue.push({ node: nextNode, depth: depth + 1 });
    });
  }

  return null;
}

function getSpectralOutputDestinations(toneFilterNode) {
  const postToneLowpass = findPostToneLowpass(toneFilterNode);
  const postToneDestinations = postToneLowpass ? getRememberedDestinations(postToneLowpass) : [];

  if (postToneDestinations.length > 0) {
    return postToneDestinations;
  }

  const toneDestinations = getRememberedDestinations(toneFilterNode);

  if (toneDestinations.length > 0) {
    return toneDestinations;
  }

  return [toneFilterNode];
}

function createSpectralBank(sourceNode, destinationNode) {
  if (!originalAudioConnect || patchedSources.has(sourceNode)) {
    return;
  }

  patchedSources.add(sourceNode);

  const context = sourceNode.context;
  const outputDestinations = getSpectralOutputDestinations(destinationNode);
  const bandGains = SPECTRAL_BAND_FREQUENCIES.map((frequency, bandIndex) => {
    const bandFilter = context.createBiquadFilter();
    const bandGain = context.createGain();

    bandFilter.type = "bandpass";
    bandFilter.frequency.setValueAtTime(frequency, context.currentTime);
    bandFilter.Q.setValueAtTime(SPECTRAL_BAND_Q[bandIndex], context.currentTime);
    bandGain.gain.setValueAtTime(getBandTargetGain(bandIndex), context.currentTime);

    originalAudioConnect.call(sourceNode, bandFilter);
    originalAudioConnect.call(bandFilter, bandGain);

    outputDestinations.forEach((outputDestination) => {
      originalAudioConnect.call(bandGain, outputDestination);
    });

    return bandGain;
  });

  trackedSpectralBanks.add({ context, bandGains });
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
    if (isLikelyAudioSource(this) && isLikelySourceGain(destinationNode)) {
      sourceOutputGains.add(destinationNode);
    }

    if (args.length === 0 && sourceOutputGains.has(this) && isLikelyMainToneFilter(destinationNode)) {
      createSpectralBank(this, destinationNode);
      return destinationNode;
    }

    const result = originalAudioConnect.call(this, destinationNode, ...args);

    if (args.length === 0) {
      rememberConnection(this, destinationNode);
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

  spectralPanelNote.textContent = "Faders shape the audible spectral bands. All bands muted should silence the Spectral Engine contribution.";
}

function updatePatchSummaryWording() {
  const patchSummaryText = document.querySelector("#patchSummaryText");

  if (!patchSummaryText) {
    return;
  }

  patchSummaryText.textContent = patchSummaryText.textContent
    .replaceAll("Faders and Mute buttons remain visual-only and do not affect sound.", "Faders and Mute/Unmute now shape audible spectral bands.")
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