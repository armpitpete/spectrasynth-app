const DISABLED_SPECTRAL_AUDIO_REASON = "v0.76 spectral audio hook paused because it interfered with Cutoff, Resonance, Buttery Fuzz, and source level.";

function getBandFaders() {
  return Array.from(document.querySelectorAll(".spectral-panel .band-fader"));
}

function getMuteButtons() {
  return Array.from(document.querySelectorAll(".spectral-panel .mute-button"));
}

function updateSpectralPanelWording() {
  const spectralPanelNote = document.querySelector(".spectral-panel .section-heading p");

  if (!spectralPanelNote) {
    return;
  }

  spectralPanelNote.textContent = "Spectral Engine audio is paused while the core synth path is restored. Faders and Mute/Unmute are UI-only in this recovery build.";
}

function updatePatchSummaryWording() {
  const patchSummaryText = document.querySelector("#patchSummaryText");

  if (!patchSummaryText) {
    return;
  }

  patchSummaryText.textContent = patchSummaryText.textContent
    .replaceAll("Faders and Mute buttons remain visual-only and do not affect sound.", "Spectral Engine audio is paused so Cutoff, Resonance, Buttery Fuzz, oscillator level, and noise level can be restored safely.")
    .replaceAll("Faders and Mute/Unmute now shape audible spectral bands.", "Spectral Engine audio is paused while the core synth path is restored.")
    .replaceAll("No full all-10-band filter bank", "No active all-10-band filter bank");
}

function initialiseSpectralBandAudio() {
  console.info(DISABLED_SPECTRAL_AUDIO_REASON);
  updateSpectralPanelWording();
  updatePatchSummaryWording();

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