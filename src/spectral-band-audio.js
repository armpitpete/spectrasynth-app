const BAND_5_INDEX = 4;
const BAND_5_BROAD_FREQUENCY = 1200;
const BAND_5_BROAD_Q = 0.55;
const BAND_5_BROAD_PEAK_GAIN_DB = 5;
const SPECTRAL_AUDIO_STATUS = "Band 5 Voice uses a broad source-colour audition, not a narrow fixed-pitch bandpass. Bands 1–4 and 6–10 remain UI-only.";

let band5Readout = null;
let isBand5BroadeningInstalled = false;
const broadenedBand5Filters = new WeakSet();

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

function isBand5AuditionFilter(filterNode) {
  return (
    filterNode?.type === "bandpass" &&
    Math.abs(filterNode.frequency.value - BAND_5_BROAD_FREQUENCY) < 1 &&
    Math.abs(filterNode.Q.value - 1.2) < 0.05
  );
}

function broadenBand5FilterIfNeeded(filterNode) {
  if (!filterNode || broadenedBand5Filters.has(filterNode) || !isBand5AuditionFilter(filterNode)) {
    return;
  }

  broadenedBand5Filters.add(filterNode);
  filterNode.type = "peaking";
  filterNode.frequency.setValueAtTime(BAND_5_BROAD_FREQUENCY, filterNode.context.currentTime);
  filterNode.Q.setValueAtTime(BAND_5_BROAD_Q, filterNode.context.currentTime);
  filterNode.gain.setValueAtTime(BAND_5_BROAD_PEAK_GAIN_DB, filterNode.context.currentTime);
}

function installBand5BroadeningGuard() {
  if (isBand5BroadeningInstalled || typeof AudioContext === "undefined") {
    return;
  }

  const originalCreateBiquadFilter = AudioContext.prototype.createBiquadFilter;

  AudioContext.prototype.createBiquadFilter = function createBiquadFilterWithBand5Broadening(...args) {
    const filterNode = originalCreateBiquadFilter.apply(this, args);

    window.setTimeout(() => {
      broadenBand5FilterIfNeeded(filterNode);
    }, 0);

    return filterNode;
  };

  isBand5BroadeningInstalled = true;
}

function ensureBand5Readout() {
  const spectralPanel = document.querySelector(".spectral-panel");

  if (!spectralPanel) {
    return null;
  }

  if (!band5Readout) {
    band5Readout = document.createElement("p");
    band5Readout.className = "spectral-band5-readout";
    band5Readout.style.margin = "0.75rem 0 0";
    band5Readout.style.fontSize = "0.88rem";
    band5Readout.style.fontWeight = "700";
    band5Readout.style.color = "#ffd8ef";
    spectralPanel.appendChild(band5Readout);
  }

  return band5Readout;
}

function updateBand5Readout() {
  const readout = ensureBand5Readout();

  if (!readout) {
    return;
  }

  const faderPercent = Math.round(getBand5FaderAmount() * 100);
  const muted = isBand5Muted();

  readout.textContent = `Band 5 broad colour branch: ${muted ? "muted" : "active"}; fader ${faderPercent}%; peaking colour ${BAND_5_BROAD_PEAK_GAIN_DB} dB at ${BAND_5_BROAD_FREQUENCY} Hz, Q ${BAND_5_BROAD_Q}.`;
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
    .replaceAll("Band 5 has a temporary audible proof tone for control testing.", "Band 5 uses a broad source-colour audition; the fixed proof tone has been removed.")
    .replaceAll("Band 5 Voice has a temporary audible proof tone. Bands 1–4 and 6–10 remain UI-only.", SPECTRAL_AUDIO_STATUS)
    .replaceAll("Band 5 Voice now uses the source-fed audition branch. No fixed proof tone is generated. Bands 1–4 and 6–10 remain UI-only.", SPECTRAL_AUDIO_STATUS)
    .replaceAll("Only Band 5 fader and Mute/Unmute control the temporary audible proof tone.", "Only Band 5 fader and Mute/Unmute control the broad source-colour audition branch.")
    .replaceAll("No active all-10-band filter bank", "No active full ten-band filter bank");
}

function initialiseBand5SourceFedStatus() {
  const band5Fader = getBand5Fader();
  const band5MuteButton = getBand5MuteButton();

  installBand5BroadeningGuard();
  updateSpectralPanelWording();
  updatePatchSummaryWording();
  updateBand5Readout();

  band5Fader?.addEventListener("input", () => {
    updateBand5Readout();
    updatePatchSummaryWording();
  });

  band5MuteButton?.addEventListener("click", () => {
    window.requestAnimationFrame(() => {
      updateBand5Readout();
      updatePatchSummaryWording();
    });
  });

  window.addEventListener("spectral-band-mute-change", (event) => {
    if (event.detail?.bandIndex === BAND_5_INDEX) {
      updateBand5Readout();
      updatePatchSummaryWording();
    }
  });
}

function initialiseSpectralBandAudio() {
  console.info(SPECTRAL_AUDIO_STATUS);
  initialiseBand5SourceFedStatus();

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