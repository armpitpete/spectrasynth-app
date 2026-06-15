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
const NOTE_RANGE = Array.from({ length: 9 }, (_, octaveIndex) =>
  NOTE_NAMES.map((noteName) => `${noteName}${octaveIndex + 1}`)
).flat();
const ARP_NOTE_DEFAULTS = ["C2", "E2", "G2", "C3", "E3", "G3", "C4", "E4", "G4", "C5", "E5", "G5"];
const ARP_NOTE_COUNTS = Array.from({ length: 12 }, (_, noteIndex) => String(noteIndex + 1));
const CLUSTER_COUNTS = ["1", "2", "3", "4"];
const CLUSTER_SIZES = ["1", "2", "3", "4", "5", "6"];
const CLUSTER_NOTE_DEFAULTS = [
  ["C2", "E2", "G2", "C3", "E3", "G3"],
  ["D2", "F2", "A2", "D3", "F3", "A3"],
  ["G2", "B2", "D3", "G3", "B3", "D4"],
  ["A2", "C3", "E3", "A3", "C4", "E4"],
];
const ARP_DIRECTIONS = [
  ["as-selected", "As Selected"],
  ["up", "Up"],
  ["down", "Down"],
  ["up-down", "Up / Down"],
  ["down-up", "Down / Up"],
  ["random", "Random"],
];
const CLUSTER_DIRECTIONS = [
  ["as-selected", "As Selected"],
  ["up", "Up"],
  ["down", "Down"],
  ["up-down", "Up / Down"],
  ["random", "Random"],
];

function getOptionMarkup(options, selectedOption) {
  return options
    .map((option) => `<option value="${option}"${option === selectedOption ? " selected" : ""}>${option}</option>`)
    .join("");
}

function getLabelledNumberOptionMarkup(options, selectedOption, labelPrefix) {
  return options
    .map((option) => `<option value="${option}"${option === selectedOption ? " selected" : ""}>${labelPrefix} ${option}</option>`)
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

function getClusterNoteMarkup() {
  return CLUSTER_NOTE_DEFAULTS
    .map((clusterNotes, clusterIndex) => `
      <fieldset class="cluster-fieldset" data-cluster-index="${clusterIndex + 1}">
        <legend>Cluster ${clusterIndex + 1}</legend>
        ${clusterNotes
          .map((selectedNote, noteIndex) => `
            <label data-cluster-note-index="${noteIndex + 1}">
              Note ${noteIndex + 1}
              <select id="scaleChanceCluster${clusterIndex + 1}Note${noteIndex + 1}">
                ${getOptionMarkup(NOTE_RANGE, selectedNote)}
              </select>
            </label>
          `)
          .join("")}
      </fieldset>
    `)
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
    <h3>AR Envelope</h3>
    <p class="panel-note">Triggered by Scale Chance note events. It shapes source level before effects; rests do not trigger it.</p>
    <label>
      AR Envelope
      <select id="scaleChanceArEnvelopeEnabled">
        <option value="off" selected>Off</option>
        <option value="on">On</option>
      </select>
    </label>
    <label>
      Attack
      <input id="scaleChanceArAttack" type="range" min="5" max="1000" step="5" value="25" />
    </label>
    <label>
      Release
      <input id="scaleChanceArRelease" type="range" min="5" max="2000" step="5" value="180" />
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
      <select id="scaleChanceArpNoteCount">
        ${getOptionMarkup(ARP_NOTE_COUNTS, "4")}
      </select>
    </label>
    ${getArpNoteMarkup()}
    <h3>Arp Clusters</h3>
    <p class="panel-note">Cluster controls. Choose one cluster to edit; hidden clusters still play when active.</p>
    <label>
      Cluster Mode
      <select id="scaleChanceClusterMode">
        <option value="off" selected>Off</option>
        <option value="on">On</option>
      </select>
    </label>
    <label>
      Cluster Count
      <select id="scaleChanceClusterCount">
        ${getOptionMarkup(CLUSTER_COUNTS, "2")}
      </select>
    </label>
    <label>
      Cluster Size
      <select id="scaleChanceClusterSize">
        ${getOptionMarkup(CLUSTER_SIZES, "3")}
      </select>
    </label>
    <label>
      Cluster View
      <select id="scaleChanceClusterView">
        ${getLabelledNumberOptionMarkup(CLUSTER_COUNTS, "1", "Cluster")}
      </select>
    </label>
    <label>
      Cluster Direction
      <select id="scaleChanceClusterDirection">
        ${getValueLabelOptionMarkup(CLUSTER_DIRECTIONS, "as-selected")}
      </select>
    </label>
    ${getClusterNoteMarkup()}
  `;

  controlGrid.appendChild(scaleChancePanel);
}

function getArpDirectionLabel() {
  const arpDirection = document.querySelector("#scaleChanceArpDirection")?.value ?? "as-selected";
  const matchedDirection = ARP_DIRECTIONS.find(([value]) => value === arpDirection);

  return matchedDirection?.[1] ?? "As Selected";
}

function getClusterDirectionLabel() {
  const clusterDirection = document.querySelector("#scaleChanceClusterDirection")?.value ?? "as-selected";
  const matchedDirection = CLUSTER_DIRECTIONS.find(([value]) => value === clusterDirection);

  return matchedDirection?.[1] ?? "As Selected";
}

function getClusterCount() {
  return Number(document.querySelector("#scaleChanceClusterCount")?.value ?? 1);
}

function getClusterSize() {
  return Number(document.querySelector("#scaleChanceClusterSize")?.value ?? 1);
}

function getClusterView() {
  return Number(document.querySelector("#scaleChanceClusterView")?.value ?? 1);
}

function updateClusterViewOptions() {
  const clusterView = document.querySelector("#scaleChanceClusterView");

  if (!clusterView) {
    return;
  }

  const clusterCount = getClusterCount();
  const selectedCluster = Math.min(getClusterView(), clusterCount);
  const visibleClusterOptions = CLUSTER_COUNTS.slice(0, clusterCount);
  clusterView.innerHTML = getLabelledNumberOptionMarkup(visibleClusterOptions, String(selectedCluster), "Cluster");
  clusterView.value = String(selectedCluster);
}

function updateClusterControlVisibility() {
  updateClusterViewOptions();

  const clusterCount = getClusterCount();
  const clusterSize = getClusterSize();
  const clusterView = getClusterView();

  document.querySelectorAll(".cluster-fieldset").forEach((fieldset) => {
    const clusterIndex = Number(fieldset.dataset.clusterIndex ?? 1);
    const showCluster = clusterIndex <= clusterCount && clusterIndex === clusterView;

    fieldset.hidden = !showCluster;
    fieldset.style.display = showCluster ? "" : "none";

    fieldset.querySelectorAll("[data-cluster-note-index]").forEach((noteControl) => {
      const noteIndex = Number(noteControl.dataset.clusterNoteIndex ?? 1);
      const showNote = noteIndex <= clusterSize;

      noteControl.hidden = !showNote;
      noteControl.style.display = showNote ? "" : "none";
    });
  });
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

function getArEnvelopeSummaryText() {
  const arEnabled = document.querySelector("#scaleChanceArEnvelopeEnabled");
  const attack = document.querySelector("#scaleChanceArAttack");
  const release = document.querySelector("#scaleChanceArRelease");

  if (!arEnabled || !attack || !release) {
    return "";
  }

  return ` AR Envelope ${arEnabled.value}, attack ${attack.value} ms, release ${release.value} ms.`;
}

function getClusterSummaryText() {
  const clusterMode = document.querySelector("#scaleChanceClusterMode");
  const clusterCount = document.querySelector("#scaleChanceClusterCount");
  const clusterSize = document.querySelector("#scaleChanceClusterSize");
  const clusterView = document.querySelector("#scaleChanceClusterView");

  if (!clusterMode || !clusterCount || !clusterSize || !clusterView) {
    return "";
  }

  const count = Number(clusterCount.value);
  const size = Number(clusterSize.value);
  const view = Number(clusterView.value);
  const notes = Array.from({ length: size }, (_, noteIndex) =>
    document.querySelector(`#scaleChanceCluster${view}Note${noteIndex + 1}`)?.value ?? "C2"
  );

  return ` Arp Clusters: mode ${clusterMode.value}, ${count} clusters, ${size} notes each, direction ${getClusterDirectionLabel()}, editing Cluster ${view}: ${notes.join(" → ")}.`;
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
  patchSummaryText.textContent = `${existingSummary} Scale Chance is ${modeText}: ${root.value} ${scale.value}, range ${lowNote.value} to ${highNote.value}, randomness ${randomness.value}%, pitch centre ${pitchCentre.value}%, note length ${noteLength.value} ms, note gap ${noteGap.value} ms, rest chance ${restChance.value}%, repeat chance ${repeatChance.value}%. It controls rhythmic musical Cutoff / Brightness movement only.${getArEnvelopeSummaryText()}${getArpSummaryText()}${getClusterSummaryText()}`;
}

function initialiseScaleChancePanel() {
  injectScaleChancePanel();
  updateClusterControlVisibility();

  const controls = document.querySelectorAll("#scaleChancePanel select, #scaleChancePanel input");

  controls.forEach((control) => {
    const handleControlChange = () => {
      updateClusterControlVisibility();
      appendScaleChanceSummary();
    };

    control.addEventListener("input", handleControlChange);
    control.addEventListener("change", handleControlChange);
  });

  appendScaleChanceSummary();
}

initialiseScaleChancePanel();
