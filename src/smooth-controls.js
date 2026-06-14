function initialiseFineControlResolution() {
  const cutoffSlider = document.querySelector("#cutoffSlider");

  if (!cutoffSlider) {
    return;
  }

  cutoffSlider.step = "0.1";
}

initialiseFineControlResolution();
