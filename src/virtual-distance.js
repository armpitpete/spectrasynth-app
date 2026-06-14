const CLOSE_OUTPUT_VALUE = 70;
const FAR_OUTPUT_VALUE = 32;
const CLOSE_CUTOFF_VALUE = 63;
const FAR_CUTOFF_VALUE = 34;

function getVirtualDistanceSlider() {
  const labels = Array.from(document.querySelectorAll("label"));
  const virtualDistanceLabel = labels.find((label) =>
    label.textContent.toLowerCase().includes("virtual distance")
  );

  return virtualDistanceLabel?.querySelector('input[type="range"]') ?? null;
}

function dispatchExistingInputUpdate(slider) {
  slider.dispatchEvent(new Event("input", { bubbles: true }));
}

function getMappedValue(closeValue, farValue, distanceAmount) {
  return closeValue - distanceAmount * (closeValue - farValue);
}

function getOutputValue(closeValue, farValue, distanceAmount) {
  return Math.round(getMappedValue(closeValue, farValue, distanceAmount));
}

function getCutoffValue(closeValue, farValue, distanceAmount) {
  return Number(getMappedValue(closeValue, farValue, distanceAmount).toFixed(1));
}

function appendVirtualDistanceSummary(distancePercent, outputValue, cutoffValue) {
  const patchSummaryText = document.querySelector("#patchSummaryText");

  if (!patchSummaryText) {
    return;
  }

  const existingSummary = patchSummaryText.textContent.replace(/ Virtual Distance is active:.*$/, "");
  patchSummaryText.textContent = `${existingSummary} Virtual Distance is active: ${distancePercent}% distance maps to Output ${outputValue}% and Cutoff ${cutoffValue.toFixed(1)}.`;
}

function initialiseVirtualDistanceControl() {
  const virtualDistanceSlider = getVirtualDistanceSlider();
  const outputSlider = document.querySelector("#outputSlider");
  const cutoffSlider = document.querySelector("#cutoffSlider");

  if (!virtualDistanceSlider || !outputSlider || !cutoffSlider) {
    return;
  }

  virtualDistanceSlider.id = "virtualDistanceSlider";

  const applyVirtualDistance = () => {
    const distancePercent = Number(virtualDistanceSlider.value);
    const distanceAmount = distancePercent / 100;
    const mappedOutputValue = getOutputValue(CLOSE_OUTPUT_VALUE, FAR_OUTPUT_VALUE, distanceAmount);
    const mappedCutoffValue = getCutoffValue(CLOSE_CUTOFF_VALUE, FAR_CUTOFF_VALUE, distanceAmount);

    outputSlider.value = String(mappedOutputValue);
    cutoffSlider.value = String(mappedCutoffValue);

    dispatchExistingInputUpdate(outputSlider);
    dispatchExistingInputUpdate(cutoffSlider);
    appendVirtualDistanceSummary(distancePercent, mappedOutputValue, mappedCutoffValue);
  };

  virtualDistanceSlider.addEventListener("input", applyVirtualDistance);
  applyVirtualDistance();
}

initialiseVirtualDistanceControl();
