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

function updateSpectralPanelWording() {
  const spectralPanelNote = document.querySelector(".spectral-panel .section-heading p");

  if (!spectralPanelNote) {
    return;
  }

  spectralPanelNote.textContent = "Band 5 has a stable silent internal filter tap. Mute buttons now toggle visible band mute state; full audio band mute waits for the filter-bank engine.";
}

function initialiseSpectralMuteControls() {
  const muteButtons = document.querySelectorAll(".spectral-panel .mute-button");

  muteButtons.forEach((button) => {
    updateSpectralMuteVisualState(button);

    button.addEventListener("click", () => {
      window.requestAnimationFrame(() => updateSpectralMuteVisualState(button));
    });
  });

  updateSpectralPanelWording();
}

initialiseSpectralMuteControls();
