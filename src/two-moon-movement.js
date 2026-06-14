const TWO_MOON_MAX_DEPTH = 9;
const TWO_MOON_SLOW_PERIOD_MS = 9000;
const TWO_MOON_FAST_PERIOD_MS = 5300;

function getMovementSliderByLabel(labelText) {
  const labels = Array.from(document.querySelectorAll("label"));
  const matchedLabel = labels.find((label) =>
    label.textContent.toLowerCase().includes(labelText.toLowerCase())
  );

  return matchedLabel?.querySelector('input[type="range"]') ?? null;
}

function dispatchExistingInputUpdate(slider) {
  slider.dispatchEvent(new Event("input", { bubbles: true }));
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function appendTwoMoonSummary(amountPercent, cutoffValue) {
  const patchSummaryText = document.querySelector("#patchSummaryText");

  if (!patchSummaryText) {
    return;
  }

  const existingSummary = patchSummaryText.textContent.replace(/ Two-Moon Movement is active:.*$/, "");

  if (amountPercent <= 0) {
    patchSummaryText.textContent = existingSummary;
    return;
  }

  patchSummaryText.textContent = `${existingSummary} Two-Moon Movement is active: ${amountPercent}% movement is gently moving Cutoff / Brightness around ${cutoffValue}.`;
}

function initialiseTwoMoonMovement() {
  const twoMoonSlider = getMovementSliderByLabel("Two-Moon Movement");
  const cutoffSlider = document.querySelector("#cutoffSlider");

  if (!twoMoonSlider || !cutoffSlider) {
    return;
  }

  twoMoonSlider.id = "twoMoonMovementSlider";

  let baseCutoffValue = Number(cutoffSlider.value);
  let isApplyingTwoMoonMovement = false;
  let animationFrame = null;

  cutoffSlider.addEventListener("input", () => {
    if (!isApplyingTwoMoonMovement) {
      baseCutoffValue = Number(cutoffSlider.value);
    }
  });

  const applyTwoMoonMovement = (timestamp) => {
    const amountPercent = Number(twoMoonSlider.value);
    const movementAmount = amountPercent / 100;

    if (amountPercent <= 0) {
      animationFrame = null;
      appendTwoMoonSummary(0, baseCutoffValue);
      return;
    }

    const slowMoon = Math.sin((timestamp / TWO_MOON_SLOW_PERIOD_MS) * Math.PI * 2);
    const fastMoon = Math.sin((timestamp / TWO_MOON_FAST_PERIOD_MS) * Math.PI * 2 + Math.PI / 3);
    const combinedMovement = slowMoon * 0.65 + fastMoon * 0.35;
    const movementDepth = TWO_MOON_MAX_DEPTH * movementAmount;
    const cutoffValue = Math.round(clamp(baseCutoffValue + combinedMovement * movementDepth, 0, 100));

    isApplyingTwoMoonMovement = true;
    cutoffSlider.value = String(cutoffValue);
    dispatchExistingInputUpdate(cutoffSlider);
    isApplyingTwoMoonMovement = false;

    appendTwoMoonSummary(amountPercent, cutoffValue);
    animationFrame = requestAnimationFrame(applyTwoMoonMovement);
  };

  const restartTwoMoonMovement = () => {
    baseCutoffValue = Number(cutoffSlider.value);

    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    if (Number(twoMoonSlider.value) > 0) {
      animationFrame = requestAnimationFrame(applyTwoMoonMovement);
    } else {
      appendTwoMoonSummary(0, baseCutoffValue);
    }
  };

  twoMoonSlider.addEventListener("input", restartTwoMoonMovement);
  restartTwoMoonMovement();
}

initialiseTwoMoonMovement();
