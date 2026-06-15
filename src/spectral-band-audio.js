const SPECTRAL_AUDIO_STATUS = "Band 5 Voice is the only audible Spectral Engine test band. Bands 1–4 and 6–10 remain UI-only.";

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

  spectralPanelNote.textContent = SPECTRAL_AUDIO_STATUS;
}

function updatePatchSummaryWording() {
  const patchSummaryText = document.querySelector("#patchSummaryText");

  if (!patchSummaryText) {
    return;
  }

  patchSummaryText.textContent = patchSummaryText.textContent
    .replaceAll("Spectral Engine audio is paused while the core synth path is restored.", "Band 5 Voice is active as the only safe Spectral Engine audio test band.")
    .replaceAll("Spectral Engine audio is paused while the core synth path is restored. Faders and Mute/Unmute are UI-only in this recovery build.", SPECTRAL_AUDIO_STATUS)
    .replaceAll("Faders and Mute/Unmute now shape audible spectral bands.", "Only Band 5 fader and Mute/Unmute shape the audible spectral test band.")
    .replaceAll("No active all-10-band filter bank", "No active full ten-band filter bank");
}

function initialiseSpectralBandAudio() {
  console.info(SPECTRAL_AUDIO_STATUS);
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