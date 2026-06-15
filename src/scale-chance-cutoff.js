const SCALE_INTERVALS = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10],
  "Pentatonic Minor": [0, 3, 5, 7, 10],
  "Pentatonic Major": [0, 2, 4, 7, 9],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  "Whole Tone": [0, 2, 4, 6, 8, 10],
  Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

const NOTE_TO_SEMITONE = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

const SEMITONE_TO_NOTE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const CUTOFF_MIN_FREQUENCY = 120;
const CUTOFF_MAX_FREQUENCY = 16000;
const STEADY_CUTOFF_VALUE = 63;
const MIN_ARP_NOTES = 1;
const MAX_ARP_NOTES = 12;

let scaleChanceTimeout = null;
let previousMidiNote = null;
let previousCutoffValue = STEADY_CUTOFF_VALUE;
let lastChosenLabel = "none";
let isScaleChanceApplyingCutoff = false;
let arpStepIndex = 0;

function getControl(id) {
  return document.querySelector(`#${id}`);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function parseNoteName(noteName) {
  const match = /^(C#|D#|F#|G#|A#|C|D|E|F|G|A|B)(\d)$/.exec(noteName);

  if (!match) {
    return null;
  }

  const [, note, octaveText] = match;
  const octave = Number(octaveText);

  return (octave + 1) * 12 + NOTE_TO_SEMITONE[note];
}

function getNoteLabelFromMidi(midiNote) {
  const noteName = SEMITONE_TO_NOTE[midiNote % 12];
  const octave = Math.floor(midiNote / 12) - 1;
  return `${noteName}${octave}`;
}

function getFrequencyFromMidi(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

function getCutoffSliderValueFromFrequency(frequency) {
  const clampedFrequency = clamp(frequency, CUTOFF_MIN_FREQUENCY, CUTOFF_MAX_FREQUENCY);
  const amount = Math.log(clampedFrequency / CUTOFF_MIN_FREQUENCY) / Math.log(CUTOFF_MAX_FREQUENCY / CUTOFF_MIN_FREQUENCY);
  return Number(clamp(amount * 100, 0, 100).toFixed(1));
}

function getAllowedMidiNotes() {
  const root = getControl("scaleChanceRoot")?.value ?? "C";
  const scale = getControl("scaleChanceScale")?.value ?? "Minor";
  const lowNote = parseNoteName(getControl("scaleChanceLowNote")?.value ?? "C2") ?? parseNoteName("C2");
  const highNote = parseNoteName(getControl("scaleChanceHighNote")?.value ?? "C5") ?? parseNoteName("C5");
  const rangeStart = Math.min(lowNote, highNote);
  const rangeEnd = Math.max(lowNote, highNote);
  const rootOffset = NOTE_TO_SEMITONE[root] ?? 0;
  const scaleIntervals = SCALE_INTERVALS[scale] ?? SCALE_INTERVALS.Minor;
  const allowedPitchClasses = scaleIntervals.map((interval) => (rootOffset + interval) % 12);
  const allowedNotes = [];

  for (let midiNote = rangeStart; midiNote <= rangeEnd; midiNote += 1) {
    if (allowedPitchClasses.includes(midiNote % 12)) {
      allowedNotes.push(midiNote);
    }
  }

  return allowedNotes.length > 0 ? allowedNotes : [parseNoteName("C3")];
}

function getSelectedArpMidiNotes() {
  const arpNoteCount = Number(getControl("scaleChanceArpNoteCount")?.value ?? 4);
  const safeNoteCount = clamp(Math.round(arpNoteCount), MIN_ARP_NOTES, MAX_ARP_NOTES);
  const selectedNotes = [];

  for (let noteIndex = 1; noteIndex <= safeNoteCount; noteIndex += 1) {
    const noteName = getControl(`scaleChanceArpNote${noteIndex}`)?.value ?? "C2";
    const midiNote = parseNoteName(noteName);

    if (midiNote !== null) {
      selectedNotes.push(midiNote);
    }
  }

  return selectedNotes.length >= MIN_ARP_NOTES ? selectedNotes : [parseNoteName("C2")];
}

function getArpDirection() {
  return getControl("scaleChanceArpDirection")?.value ?? "as-selected";
}

function getDirectedArpMidiNotes() {
  const selectedNotes = getSelectedArpMidiNotes();
  const ascendingNotes = [...selectedNotes].sort((a, b) => a - b);
  const descendingNotes = [...ascendingNotes].reverse();

  switch (getArpDirection()) {
    case "up":
      return ascendingNotes;
    case "down":
      return descendingNotes;
    case "up-down":
      return ascendingNotes.length > 2
        ? [...ascendingNotes, ...ascendingNotes.slice(1, -1).reverse()]
        : ascendingNotes;
    case "down-up":
      return descendingNotes.length > 2
        ? [...descendingNotes, ...descendingNotes.slice(1, -1).reverse()]
        : descendingNotes;
    case "random":
    case "as-selected":
    default:
      return selectedNotes;
  }
}

function isArpModeOn() {
  return getControl("scaleChanceArpMode")?.value === "on";
}

function getWeightedRandomNote(candidates) {
  const pitchCentreAmount = Number(getControl("scaleChancePitchCentre")?.value ?? 50) / 100;
  const randomnessAmount = Number(getControl("scaleChanceRandomness")?.value ?? 50) / 100;
  const centreIndex = pitchCentreAmount * (candidates.length - 1);
  const maxJump = 2 + randomnessAmount * Math.max(4, candidates.length);
  const jumpFilteredCandidates = previousMidiNote === null
    ? candidates
    : candidates.filter((midiNote) => Math.abs(midiNote - previousMidiNote) <= maxJump);
  const usableCandidates = jumpFilteredCandidates.length > 0 ? jumpFilteredCandidates : candidates;
  const centreTightness = 0.25 + randomnessAmount * 2.2;
  const weightedCandidates = usableCandidates.map((midiNote) => {
    const candidateIndex = candidates.indexOf(midiNote);
    const centreDistance = Math.abs(candidateIndex - centreIndex);
    const centreWeight = 1 / (1 + centreDistance / centreTightness);
    const jumpDistance = previousMidiNote === null ? 0 : Math.abs(midiNote - previousMidiNote);
    const jumpWeight = 1 / (1 + jumpDistance / (2 + randomnessAmount * 16));

    return {
      midiNote,
      weight: Math.max(0.001, centreWeight * jumpWeight),
    };
  });
  const totalWeight = weightedCandidates.reduce((total, candidate) => total + candidate.weight, 0);
  let draw = Math.random() * totalWeight;

  for (const candidate of weightedCandidates) {
    draw -= candidate.weight;

    if (draw <= 0) {
      return candidate.midiNote;
    }
  }

  return weightedCandidates[weightedCandidates.length - 1].midiNote;
}

function getNextArpMidiNote() {
  const arpNotes = getDirectedArpMidiNotes();

  if (getArpDirection() === "random") {
    return arpNotes[Math.floor(Math.random() * arpNotes.length)];
  }

  const midiNote = arpNotes[arpStepIndex % arpNotes.length];
  arpStepIndex += 1;
  return midiNote;
}

function chooseNextMidiNote() {
  const restChance = Number(getControl("scaleChanceRestChance")?.value ?? 0);
  const repeatChance = Number(getControl("scaleChanceRepeatChance")?.value ?? 0);

  if (Math.random() * 100 < restChance) {
    return null;
  }

  if (previousMidiNote !== null && Math.random() * 100 < repeatChance) {
    return previousMidiNote;
  }

  if (isArpModeOn()) {
    return getNextArpMidiNote();
  }

  return getWeightedRandomNote(getAllowedMidiNotes());
}

function applyCutoffTargetForMidiNote(midiNote) {
  const cutoffSlider = getControl("cutoffSlider");

  if (!cutoffSlider) {
    return;
  }

  const frequency = getFrequencyFromMidi(midiNote);
  const cutoffValue = getCutoffSliderValueFromFrequency(frequency);

  previousMidiNote = midiNote;
  previousCutoffValue = cutoffValue;
  lastChosenLabel = `${getNoteLabelFromMidi(midiNote)} / ${Math.round(frequency)} Hz`;

  isScaleChanceApplyingCutoff = true;
  cutoffSlider.value = String(cutoffValue);
  cutoffSlider.dispatchEvent(new Event("input", { bubbles: true }));
  isScaleChanceApplyingCutoff = false;
}

function appendScaleChanceEngineSummary(extraText = "") {
  const patchSummaryText = getControl("patchSummaryText");

  if (!patchSummaryText) {
    return;
  }

  const directionText = getArpDirection().replaceAll("-", " / ");
  const arpText = isArpModeOn() ? ` Arp Mode is on: ${directionText}.` : " Arp Mode is off.";
  const existingSummary = patchSummaryText.textContent.replace(/ Scale Chance engine:.*$/, "");
  patchSummaryText.textContent = `${existingSummary} Scale Chance engine: rhythmic musical Cutoff movement is ${isScaleChanceOn() ? "active" : "off"}.${arpText} Last target: ${lastChosenLabel}. ${extraText}`.trim();
}

function isScaleChanceOn() {
  return getControl("scaleChanceEnabled")?.value === "on";
}

function clearScaleChanceTimer() {
  if (scaleChanceTimeout) {
    clearTimeout(scaleChanceTimeout);
    scaleChanceTimeout = null;
  }
}

function runScaleChanceCycle() {
  clearScaleChanceTimer();

  if (!isScaleChanceOn()) {
    appendScaleChanceEngineSummary("Manual Cutoff remains available.");
    return;
  }

  const noteLength = Number(getControl("scaleChanceNoteLength")?.value ?? 250);
  const noteGap = Number(getControl("scaleChanceNoteGap")?.value ?? 150);
  const midiNote = chooseNextMidiNote();

  if (midiNote === null) {
    lastChosenLabel = "rest";
    appendScaleChanceEngineSummary("This cycle rested, so Cutoff did not move.");
  } else {
    applyCutoffTargetForMidiNote(midiNote);
    appendScaleChanceEngineSummary(`Cutoff slider moved to ${previousCutoffValue.toFixed(1)}.`);
  }

  scaleChanceTimeout = setTimeout(runScaleChanceCycle, Math.max(20, noteLength + noteGap));
}

function restartScaleChanceEngine() {
  clearScaleChanceTimer();
  arpStepIndex = 0;

  if (!isScaleChanceOn()) {
    appendScaleChanceEngineSummary("Manual Cutoff remains available.");
    return;
  }

  runScaleChanceCycle();
}

function initialiseScaleChanceCutoffEngine() {
  const scaleChancePanel = getControl("scaleChancePanel");
  const cutoffSlider = getControl("cutoffSlider");

  if (!scaleChancePanel || !cutoffSlider) {
    return;
  }

  cutoffSlider.addEventListener("input", () => {
    if (!isScaleChanceApplyingCutoff) {
      previousMidiNote = null;
    }
  });

  const controls = scaleChancePanel.querySelectorAll("select, input");
  controls.forEach((control) => {
    control.addEventListener("input", restartScaleChanceEngine);
    control.addEventListener("change", restartScaleChanceEngine);
  });

  appendScaleChanceEngineSummary("Manual Cutoff remains available.");
}

initialiseScaleChanceCutoffEngine();
