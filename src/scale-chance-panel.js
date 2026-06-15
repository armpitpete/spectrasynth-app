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
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_RANGE = Array.from({ length: 6 }, (_, octaveIndex) =>
  NOTE_NAMES.map((noteName) => `${noteName}${octaveIndex + 1}`)
).flat();
const ARP_NOTE_DEFAULTS = ["C2", "E2", "G2", "C3", "E3", "G3", "C4", "E4", "G4", "C5", "E5", "G5"];
const ARP_DIRECTIONS = [
  ["as-selected", "As Selected"],
  ["up", "Up"],
  ["down", "Down"],
  ["up-down", "Up / Down"],
  ["down-up", "Down / Up"],
  ["random", "Random"],
];

function getOptionMarkup(options, selectedOption) {
  return options
    .map((option) => `<option value="${option}"${option === selectedOption ? " selected" : ""}>${option}</option>`)
    .join("");
}

function getValueLabelOptionMarkup(options, selectedOption) {
  return options
    .map(([value, label]) => `<option value="${value}"${value === selectedOption ? " selected" : ""}>${label}</option>`)
    .join("");
}

function getArpNoteMarkup() {
  return ARP_NOTE_DEFAULTS
    .map(
      (selectedNote, noteIndex) => `
        <label>
          Arp Note ${noteIndex + 1}
          <select id="scaleChanceArpNote${noteIndex + 1}">
            ${getOptionMarkup(NOTE_RANGE, selectedNote)}
          </select>
        </label>
      `
    )
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
    <p class="panel-note">Controlled chance engine for rhythmic musical Cutoff / Brightness movement.</p>
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
    <label>
      Rest Chance
      <input id="scaleChanceRestChance" type="range" min="0" max="100" value="15" />
    </label>
    <label>
      Repeat Chance
      <input id="scaleChanceRepeatChance" type="range" min="0" max="100" value="20" />
    </label>
    <label>
      Arp Mode
      <select id="scaleChanceArpMode">
        <option value="off" selected>Off</option>
        <option value="on">On</option>
      </select>
    </label>
    <label>
      Arp Direction
      <select id="scaleChanceArpDirection">
        ${getValueLabelOptionMarkup(ARP_DIRECTIONS, "as-selected")}
      </select>
    </label>
    <label>
      Arp Notes
      <input id="scaleChanceArpNoteCount" type="range" min="2" max="12" step="1" value="4" />
    </label>
    ${getArpNoteMarkup()}
  `;

  controlGrid.appendChild(scaleChancePanel);
}

function getArpDirectionLabel() {
  const arpDirection = document.querySelector("#scaleChanceArpDirection")?.value ?? "as-selected";
  const matchedDirection = ARP_DIRECTIONS.find(([value]) => value === arpDirection);

  return matchedDirection?.[1] ?? "As Selected";
}

function getArpSummaryText() {
  const arpMode = document.querySelector("#scaleChanceArpMode");
  const arpNoteCount = document.querySelector("#scaleChanceArpNoteCount");

  if (!arpMode || !arpNoteCount) {
    return "";
  }

  const noteCount = Number(arpNoteCount.value);
  const notes = Array.from({ length: noteCount }, (_, noteIndex) =>
    document.querySelector(`#scaleChanceArpNote${noteIndex + 1}`)?.value ?? "C2"
  );

  return ` Arp mode ${arpMode.value}, direction ${getArpDirectionLabel()}, ${noteCount} notes: ${notes.join(" → ")}.`;
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
  const restChance = document.querySelector("#scaleChanceRestChance");
  const repeatChance = document.querySelector("#scaleChanceRepeatChance");

  if (!patchSummaryText || !enabled || !root || !scale || !lowNote || !highNote || !randomness || !pitchCentre || !noteLength || !noteGap || !restChance || !repeatChance) {
    return;
  }

  const existingSummary = patchSummaryText.textContent.replace(/ Scale Chance.*$/, "");
  const modeText = enabled.value === "on" ? "active" : "off";
  patchSummaryText.textContent = `${existingSummary} Scale Chance is ${modeText}: ${root.value} ${scale.value}, range ${lowNote.value} to ${highNote.value}, randomness ${randomness.value}%, pitch centre ${pitchCentre.value}%, note length ${noteLength.value} ms, note gap ${noteGap.value} ms, rest chance ${restChance.value}%, repeat chance ${repeatChance.value}%. It controls rhythmic musical Cutoff / Brightness movement only.${getArpSummaryText()}`;
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
