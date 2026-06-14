const OLD_CHECKPOINT_TEXT = "The v0.28 extreme noise fuzz safety fix is frozen, PR #43 / Band 5 audition is closed, and v0.34 fixes only the Source Readout layout.";
const NEW_CHECKPOINT_TEXT = "The v0.28 extreme noise fuzz safety fix is frozen, PR #43 / Band 5 audition is closed, and v0.53 confirms Virtual Distance, Two-Moon Movement, Delay, and Cathedral Reverb are active.";

const OLD_NOT_CONNECTED_TEXT = "No audible Band 5 filtering, all-10-band filter bank, feedback loop, vocoder, delay/reverb effects, MIDI, microphone, sensors, band-fader audio behaviour, or fake self-oscillation is connected yet.";
const NEW_NOT_CONNECTED_TEXT = "Virtual Distance, Two-Moon Movement, Delay, and Cathedral Reverb are active. No audible Band 5 filtering, all-10-band filter bank, feedback loop, vocoder, MIDI, microphone, sensor input, band-fader audio behaviour, or fake self-oscillation is connected yet.";

let isUpdatingSummaryText = false;

function correctSummaryWording() {
  const patchSummaryText = document.querySelector("#patchSummaryText");

  if (!patchSummaryText || isUpdatingSummaryText) {
    return;
  }

  const correctedText = patchSummaryText.textContent
    .replace(OLD_CHECKPOINT_TEXT, NEW_CHECKPOINT_TEXT)
    .replace(OLD_NOT_CONNECTED_TEXT, NEW_NOT_CONNECTED_TEXT);

  if (correctedText === patchSummaryText.textContent) {
    return;
  }

  isUpdatingSummaryText = true;
  patchSummaryText.textContent = correctedText;
  isUpdatingSummaryText = false;
}

function initialiseActiveControlWording() {
  const patchSummaryText = document.querySelector("#patchSummaryText");

  if (!patchSummaryText) {
    return;
  }

  correctSummaryWording();

  const wordingObserver = new MutationObserver(() => {
    correctSummaryWording();
  });

  wordingObserver.observe(patchSummaryText, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

initialiseActiveControlWording();
