const DEFAULT_OUTPUT_VALUE = 70;
const MINIMUM_RAMP_MS = 5;

let baseOutputValue = DEFAULT_OUTPUT_VALUE;
let isApplyingEnvelope = false;
let rampFrame = null;
let releaseTimer = null;

function getControl(id) {
  return document.querySelector(`#${id}`);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getOutputSlider() {
  return getControl("outputSlider");
}

function isArEnvelopeOn() {
  return getControl("scaleChanceArEnvelopeEnabled")?.value === "on";
}

function getAttackMs() {
  return clamp(Number(getControl("scaleChanceArAttack")?.value ?? 25), 5, 1000);
}

function getReleaseMs() {
  return clamp(Number(getControl("scaleChanceArRelease")?.value ?? 180), 5, 2000);
}

function cancelEnvelopeTimers() {
  if (rampFrame) {
    cancelAnimationFrame(rampFrame);
    rampFrame = null;
  }

  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
}

function setOutputValue(value) {
  const outputSlider = getOutputSlider();

  if (!outputSlider) {
    return;
  }

  isApplyingEnvelope = true;
  outputSlider.value = String(clamp(value, 0, 100));
  outputSlider.dispatchEvent(new Event("input", { bubbles: true }));
  isApplyingEnvelope = false;
}

function getCurrentOutputValue() {
  return Number(getOutputSlider()?.value ?? baseOutputValue);
}

function rampOutputValue(targetValue, durationMs) {
  const startValue = getCurrentOutputValue();
  const safeDuration = Math.max(MINIMUM_RAMP_MS, durationMs);
  const startTime = performance.now();

  if (rampFrame) {
    cancelAnimationFrame(rampFrame);
    rampFrame = null;
  }

  const step = (now) => {
    const amount = clamp((now - startTime) / safeDuration, 0, 1);
    const nextValue = startValue + (targetValue - startValue) * amount;

    setOutputValue(nextValue);

    if (amount < 1) {
      rampFrame = requestAnimationFrame(step);
    } else {
      rampFrame = null;
    }
  };

  rampFrame = requestAnimationFrame(step);
}

function resetOutputToBase() {
  cancelEnvelopeTimers();
  setOutputValue(baseOutputValue);
}

function triggerArEnvelope(event) {
  if (!isArEnvelopeOn()) {
    return;
  }

  const noteLengthMs = Math.max(20, Number(event.detail?.noteLengthMs ?? 250));
  const attackMs = getAttackMs();
  const releaseMs = getReleaseMs();

  cancelEnvelopeTimers();
  setOutputValue(0);
  rampOutputValue(baseOutputValue, attackMs);

  releaseTimer = setTimeout(() => {
    rampOutputValue(0, releaseMs);
  }, Math.max(MINIMUM_RAMP_MS, noteLengthMs));
}

function initialiseScaleChanceArEnvelope() {
  const outputSlider = getOutputSlider();
  const arEnvelopeControl = getControl("scaleChanceArEnvelopeEnabled");
  const panicButton = getControl("panicButton");

  if (!outputSlider || !arEnvelopeControl) {
    return;
  }

  baseOutputValue = Number(outputSlider.value || DEFAULT_OUTPUT_VALUE);

  outputSlider.addEventListener("input", () => {
    if (!isApplyingEnvelope) {
      baseOutputValue = Number(outputSlider.value || DEFAULT_OUTPUT_VALUE);
    }
  });

  arEnvelopeControl.addEventListener("change", () => {
    if (!isArEnvelopeOn()) {
      resetOutputToBase();
    }
  });

  if (panicButton) {
    panicButton.addEventListener("click", () => {
      cancelEnvelopeTimers();
      setOutputValue(0);
    });
  }

  document.addEventListener("spectraSynthScaleChanceNote", triggerArEnvelope);
}

initialiseScaleChanceArEnvelope();
