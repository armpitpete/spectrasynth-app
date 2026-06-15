const SPECTRAL_MUTE_CHANGE_EVENT = "spectral-band-mute-change";

function getBandStrip(button) {
  return button.closest(".band-strip");
}

function getMeterFill(bandStrip) {
  return bandStrip?.querySelector(".meter-fill") ?? null;
}

function updateSpectralMuteVisualState(button) {
  const isMuted = button.getAttribute("aria-pressed") === "true";
  const bandStrip = getBandStrip(button);
  const meterFill = getMeterFill(bandStrip);

  button.textContent = isMuted ? "Unmute" : "Mute";
  button.classList.toggle("is-muted", isMuted);

  if (bandStrip) {
    bandStrip.classList.toggle("is-muted", isMuted);
    bandStrip.style.opacity = isMuted ? "0.45" : "";
  }

  if (meterFill) {
    meterFill.style.visibility = isMuted ? "hidden" : "";
  }
}

function notifySpectralMuteStateChanged(button) {
  const bandIndex = Number(button.dataset.bandIndex);
  const isMuted = button.getAttribute("aria-pressed") === "true";

  window.dispatchEvent(new CustomEvent(SPECTRAL_MUTE_CHANGE_EVENT, {
    detail: { bandIndex, isMuted }
  }));
}

function updateSpectralPanelWording() {
  const spectralPanelNote = document.querySelector(".spectral-panel .section-heading p");

  if (!spectralPanelNote) {
    return;
  }

  spectralPanelNote.textContent = "Faders shape the audible spectral bands. Mute and Unmute now update the same audio band state.";
}

function initialiseSpectralMuteControls() {
  const muteButtons = document.querySelectorAll(".spectral-panel .mute-button");

  muteButtons.forEach((button) => {
    updateSpectralMuteVisualState(button);

    button.addEventListener("click", () => {
      window.requestAnimationFrame(() => {
        updateSpectralMuteVisualState(button);
        notifySpectralMuteStateChanged(button);
      });
    });
  });

  updateSpectralPanelWording();
}

initialiseSpectralMuteControls();