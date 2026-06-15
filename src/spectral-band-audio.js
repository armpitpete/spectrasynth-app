const BAND_5_INDEX = 4;
const BAND_5_PROOF_FREQUENCY = 1200;
const BAND_5_PROOF_MAX_GAIN = 0.08;
const SPECTRAL_AUDIO_STATUS = "Band 5 Voice has a temporary audible proof tone. Bands 1–4 and 6–10 remain UI-only.";

let proofAudioContext = null;
let proofOscillator = null;
let proofGain = null;
let proofReadout = null;

function getBandFaders() {
  return Array.from(document.querySelectorAll(".spectral-panel .band-fader"));
}

function getMuteButtons() {
  return Array.from(document.querySelectorAll(".spectral-panel .mute-button"));
}

function getBand5Fader() {
  return document.querySelector(`.spectral-panel .band-fader[data-band-index="${BAND_5_INDEX}"]`);
}

function getBand5MuteButton() {
  return document.querySelector(`.spectral-panel .mute-button[data-band-index="${BAND_5_INDEX}"]`);
}

function isBand5Muted() {
  const muteButton = getBand5MuteButton();
  return muteButton?.getAttribute("aria-pressed") === "true" || muteButton?.classList.contains("is-muted");
}

function getBand5FaderAmount() {
  const fader = getBand5Fader();
  return Math.min(1, Math.max(0, Number(fader?.value ?? 0) / 100));
}

function getBand5ProofTargetGain() {
  if (isBand5Muted()) {
    return 0;
  }

  return getBand5FaderAmount() * BAND_5_PROOF_MAX_GAIN;
}

function ensureProofReadout() {
  const spectralPanel = document.querySelector(".spectral-panel");

  if (!spectralPanel) {
    return null;
  }

  if (!proofReadout) {
    proofReadout = document.createElement("p");
    proofReadout.className = "spectral-proof-readout";
    proofReadout.style.margin = "0.75rem 0 0";
    proofReadout.style.fontSize = "0.88rem";
    proofReadout.style.fontWeight = "700";
    proofReadout.style.color = "#ffd8ef";
    spectralPanel.appendChild(proofReadout);
  }

  return proofReadout;
}

function updateProofReadout() {
  const readout = ensureProofReadout();

  if (!readout) {
    return;
  }

  const faderPercent = Math.round(getBand5FaderAmount() * 100);
  const isMuted = isBand5Muted();
  const targetGain = getBand5ProofTargetGain();

  readout.textContent = `Band 5 proof tone: ${isMuted ? "muted" : "active"}; fader ${faderPercent}%; proof gain ${targetGain.toFixed(3)}.`;
}

async function ensureProofAudio() {
  if (!proofAudioContext) {
    proofAudioContext = new AudioContext();
    proofGain = proofAudioContext.createGain();
    proofOscillator = proofAudioContext.createOscillator();

    proofOscillator.type = "sine";
    proofOscillator.frequency.setValueAtTime(BAND_5_PROOF_FREQUENCY, proofAudioContext.currentTime);
    proofGain.gain.setValueAtTime(0, proofAudioContext.currentTime);

    proofOscillator.connect(proofGain);
    proofGain.connect(proofAudioContext.destination);
    proofOscillator.start();
  }

  if (proofAudioContext.state === "suspended") {
    await proofAudioContext.resume();
  }
}

async function updateBand5ProofTone() {
  await ensureProofAudio();

  if (!proofGain || !proofAudioContext) {
    return;
  }

  proofGain.gain.setTargetAtTime(getBand5ProofTargetGain(), proofAudioContext.currentTime, 0.015);
  updateProofReadout();
}

function silenceBand5ProofTone() {
  if (!proofGain || !proofAudioContext) {
    return;
  }

  proofGain.gain.cancelScheduledValues(proofAudioContext.currentTime);
  proofGain.gain.setTargetAtTime(0, proofAudioContext.currentTime, 0.01);
  updateProofReadout();
}

function updateSpectralPanelWording() {
  const spectralPanelNote = document.querySelector(".spectral-panel .section-heading p");

  if (!spectralPanelNote) {
    return;
  }

  spectralPanelNote.textContent = SPECTRAL_AUDIO_STATUS;
}

function updatePatchSummaryWording() {
  const patchSummaryText = document.querySelector("#patchSummaryText");

  if (!patchSummaryText) {
    return;
  }

  patchSummaryText.textContent = patchSummaryText.textContent
    .replaceAll("Spectral Engine audio is paused while the core synth path is restored.", "Band 5 has a temporary audible proof tone for control testing.")
    .replaceAll("Spectral Engine audio is paused while the core synth path is restored. Faders and Mute/Unmute are UI-only in this recovery build.", SPECTRAL_AUDIO_STATUS)
    .replaceAll("Faders and Mute/Unmute now shape audible spectral bands.", "Only Band 5 fader and Mute/Unmute control the temporary audible proof tone.")
    .replaceAll("No active all-10-band filter bank", "No active full ten-band filter bank");
}

function initialiseBand5ProofMode() {
  const band5Fader = getBand5Fader();
  const band5MuteButton = getBand5MuteButton();
  const panicButton = document.querySelector("#panicButton");

  updateSpectralPanelWording();
  updatePatchSummaryWording();
  updateProofReadout();

  band5Fader?.addEventListener("input", () => {
    updateBand5ProofTone();
    updatePatchSummaryWording();
  });

  band5MuteButton?.addEventListener("click", () => {
    window.requestAnimationFrame(() => {
      updateBand5ProofTone();
      updatePatchSummaryWording();
    });
  });

  window.addEventListener("spectral-band-mute-change", (event) => {
    if (event.detail?.bandIndex === BAND_5_INDEX) {
      updateBand5ProofTone();
      updatePatchSummaryWording();
    }
  });

  panicButton?.addEventListener("click", silenceBand5ProofTone);
}

function initialiseSpectralBandAudio() {
  console.info(SPECTRAL_AUDIO_STATUS);
  initialiseBand5ProofMode();

  getBandFaders().forEach((fader) => {
    fader.addEventListener("input", updatePatchSummaryWording);
  });

  getMuteButtons().forEach((button) => {
    button.addEventListener("click", () => {
      window.requestAnimationFrame(updatePatchSummaryWording);
    });
  });
}

initialiseSpectralBandAudio();