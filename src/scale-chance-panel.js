const ROOT_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SCALES = [
  "Major",
  "Minor",
  "Pentatonic Minor",
  "Pentatonic Major",
  "Dorian",
  "Phrygian",
  "Whole Tone",
  "Chromatic",
];
const NOTE_RANGE = ["C1", "C2", "C3", "C4", "C5", "C6"];

function getOptionMarkup(options, selectedOption) {
  return options
    .map((option) => `<option value="${option}"${option === selectedOption ? " selected" : ""}>${option}</option>`)
    .join("");
}

function injectScaleChancePanel() {
  const controlGrid = document.querySelector(".control-grid");

  if (!controlGrid || document.querySelector("#scaleChancePanel")) {
    return;
  }

  const scaleChancePanel = document.createElement("section");
  scaleChancePanel.id = "scaleChancePanel";
  scaleChancePanel.className = "panel scale-chance-panel";
  scaleChancePanel.innerHTML = `
    <h2>Scale Chance</h2>
    <p class="panel-note">Visual-only controlled random note engine. It does not change pitch yet.</p>
    <label>
      Scale Chance
      <select id="scaleChanceEnabled">
        <option value="off" selected>Off</option>
        <option value="on">On</option>
      </select>
    </label>
    <label>
      Root
      <select id="scaleChanceRoot">
        ${getOptionMarkup(ROOT_NOTES, "C")}
      </select>
    </label>
    <label>
      Scale
      <select id="scaleChanceScale">
        ${getOptionMarkup(SCALES, "Minor")}
      </select>
    </label>
    <label>
      Low Note
      <select id="scaleChanceLowNote">
        ${getOptionMarkup(NOTE_RANGE, "C2")}
      </select>
    </label>
    <label>
      High Note
      <select id="scaleChanceHighNote">
        ${getOptionMarkup(NOTE_RANGE, "C5")}
      </select>
    </label>
    <label>
      Randomness
      <input id="scaleChanceRandomness" type="range" min="0" max="100" value="50" />
    </label>
    <label>
      Pitch Centre
      <input id="scaleChancePitchCentre" type="range" min="0" max="100" value="50" />
    </label>
    <label>
      Note Length
      <input id="scaleChanceNoteLength" type="range" min="50" max="1000" step="10" value="250" />
    </label>
    <label>
      Note Gap
      <input id="scaleChanceNoteGap" type="range" min="0" max="1000" step="10" value="150" />
    </label>
  `;

  controlGrid.appendChild(scaleChancePanel);
}

function appendScaleChanceSummary() {
  const patchSummaryText = document.querySelector("#patchSummaryText");
  const enabled = document.querySelector("#scaleChanceEnabled");
  const root = document.querySelector("#scaleChanceRoot");
  const scale = document.querySelector("#scaleChanceScale");
  const lowNote = document.querySelector("#scaleChanceLowNote");
  const highNote = document.querySelector("#scaleChanceHighNote");
  const randomness = document.querySelector("#scaleChanceRandomness");
  const pitchCentre = document.querySelector("#scaleChancePitchCentre");
  const noteLength = document.querySelector("#scaleChanceNoteLength");
  const noteGap = document.querySelector("#scaleChanceNoteGap");

  if (!patchSummaryText || !enabled || !root || !scale || !lowNote || !highNote || !randomness || !pitchCentre || !noteLength || !noteGap) {
    return;
  }

  const existingSummary = patchSummaryText.textContent.replace(/ Scale Chance is visual-only:.*$/, "");
  patchSummaryText.textContent = `${existingSummary} Scale Chance is visual-only: ${enabled.value}, ${root.value} ${scale.value}, range ${lowNote.value} to ${highNote.value}, randomness ${randomness.value}%, pitch centre ${pitchCentre.value}%, note length ${noteLength.value} ms, note gap ${noteGap.value} ms. It does not change oscillator pitch yet.`;
}

function initialiseScaleChancePanel() {
  injectScaleChancePanel();

  const controls = document.querySelectorAll("#scaleChancePanel select, #scaleChancePanel input");

  controls.forEach((control) => {
    control.addEventListener("input", appendScaleChanceSummary);
    control.addEventListener("change", appendScaleChanceSummary);
  });

  appendScaleChanceSummary();
}

initialiseScaleChancePanel();
