from pathlib import Path

SOURCE = Path("src/scale-chance-ar-envelope.js")
TEST = Path("tests/pitch-arp-octave-contract.test.mjs")
CHECKLIST = Path("docs/manual-audio-test-checklist-v0.35-pitch-octave.md")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one exact anchor, found {count}")
    return text.replace(old, new, 1)


source = SOURCE.read_text(encoding="utf-8")

source = replace_once(
    source,
    '''const DEFAULT_OSCILLATOR_FREQUENCY = 220;
const PITCH_TRANSITION_SECONDS = 0.012;''',
    '''const DEFAULT_OSCILLATOR_FREQUENCY = 220;
const PITCH_TRANSITION_SECONDS = 0.012;
const PITCH_MIN_FREQUENCY = 20;
const PITCH_MAX_FREQUENCY = 16000;
const MIN_PITCH_OCTAVE_OFFSET = -2;
const MAX_PITCH_OCTAVE_OFFSET = 2;''',
    "pitch safety constants",
)

source = replace_once(
    source,
    '''function isPitchArpOn() {
  return getControl("scaleChancePitchArpEnabled")?.value !== "off";
}

function getAttackMs() {''',
    '''function isPitchArpOn() {
  return getControl("scaleChancePitchArpEnabled")?.value !== "off";
}

function getPitchOctaveOffset() {
  return clamp(
    Math.round(Number(getControl("scaleChancePitchOctave")?.value ?? 0)),
    MIN_PITCH_OCTAVE_OFFSET,
    MAX_PITCH_OCTAVE_OFFSET
  );
}

function getPitchOctaveLabel(octaveOffset = getPitchOctaveOffset()) {
  if (octaveOffset === 0) {
    return "0 — same note";
  }

  const signedOffset = octaveOffset > 0 ? `+${octaveOffset}` : String(octaveOffset);
  const unit = Math.abs(octaveOffset) === 1 ? "octave" : "octaves";
  return `${signedOffset} ${unit}`;
}

function getPitchTargetFromMusicalTarget(musicalTarget) {
  if (!musicalTarget) {
    return null;
  }

  const octaveOffset = getPitchOctaveOffset();
  const requestedFrequency = musicalTarget.frequency * Math.pow(2, octaveOffset);
  const frequency = clamp(requestedFrequency, PITCH_MIN_FREQUENCY, PITCH_MAX_FREQUENCY);

  return {
    ...musicalTarget,
    octaveOffset,
    requestedFrequency,
    frequency,
    isLimited: Math.abs(frequency - requestedFrequency) > Number.EPSILON,
  };
}

function getAttackMs() {''',
    "pitch octave helpers",
)

source = replace_once(
    source,
    '''function applyCurrentPitchTarget(oscillatorNode, immediate = false) {
  const targetFrequency = isPitchArpOn() && latestMusicalTarget
    ? latestMusicalTarget.frequency
    : DEFAULT_OSCILLATOR_FREQUENCY;

  setOscillatorFrequency(oscillatorNode, targetFrequency, immediate);
}''',
    '''function applyCurrentPitchTarget(oscillatorNode, immediate = false) {
  const pitchTarget = isPitchArpOn()
    ? getPitchTargetFromMusicalTarget(latestMusicalTarget)
    : null;
  const targetFrequency = pitchTarget?.frequency ?? DEFAULT_OSCILLATOR_FREQUENCY;

  setOscillatorFrequency(oscillatorNode, targetFrequency, immediate);
}''',
    "current pitch application",
)

source = replace_once(
    source,
    '''  latestMusicalTarget = musicalTarget;

  if (isPitchArpOn()) {
    trackedOscillators.forEach((oscillatorNode) => {
      setOscillatorFrequency(oscillatorNode, musicalTarget.frequency);
    });
  }

  updatePitchArpAuthority();''',
    '''  latestMusicalTarget = musicalTarget;
  const pitchTarget = getPitchTargetFromMusicalTarget(musicalTarget);

  if (isPitchArpOn() && pitchTarget) {
    trackedOscillators.forEach((oscillatorNode) => {
      setOscillatorFrequency(oscillatorNode, pitchTarget.frequency);
    });
  }

  updatePitchArpAuthority();''',
    "event pitch application",
)

source = replace_once(
    source,
    '''  const pitchArpNote = document.createElement("p");
  pitchArpNote.className = "panel-note pitch-arp-note";
  pitchArpNote.textContent =
    "Pitch Arp retunes the existing oscillator from the same note event that drives Cutoff. It creates no second oscillator or sequencer.";

  cutoffArpLabel.insertAdjacentElement("afterend", pitchArpLabel);
  pitchArpLabel.insertAdjacentElement("afterend", pitchArpNote);''',
    '''  const pitchOctaveLabel = document.createElement("label");
  pitchOctaveLabel.innerHTML = `
    Pitch Octave
    <select id="scaleChancePitchOctave">
      <option value="-2">-2 octaves</option>
      <option value="-1">-1 octave</option>
      <option value="0" selected>0 — same note</option>
      <option value="1">+1 octave</option>
      <option value="2">+2 octaves</option>
    </select>
  `;

  const pitchArpNote = document.createElement("p");
  pitchArpNote.className = "panel-note pitch-arp-note";
  pitchArpNote.textContent =
    "Pitch Arp retunes the existing oscillator from the same note event that drives Cutoff. Pitch Octave changes only that oscillator destination; it creates no second oscillator or sequencer.";

  cutoffArpLabel.insertAdjacentElement("afterend", pitchArpLabel);
  pitchArpLabel.insertAdjacentElement("afterend", pitchOctaveLabel);
  pitchOctaveLabel.insertAdjacentElement("afterend", pitchArpNote);''',
    "pitch octave control",
)

source = replace_once(
    source,
    '''function getPitchArpReadoutText() {
  if (!isPitchArpOn()) {
    return "Off — oscillator uses A3 / 220 Hz fallback";
  }

  if (!latestMusicalTarget) {
    return "On — waiting for first shared note";
  }

  return `On — ${latestMusicalTarget.noteLabel} / ${latestMusicalTarget.frequency.toFixed(2)} Hz from shared event`;
}''',
    '''function getPitchArpReadoutText() {
  if (!isPitchArpOn()) {
    return "Off — oscillator uses A3 / 220 Hz fallback";
  }

  if (!latestMusicalTarget) {
    return `On — ${getPitchOctaveLabel()} — waiting for first shared note`;
  }

  const pitchTarget = getPitchTargetFromMusicalTarget(latestMusicalTarget);
  const limitText = pitchTarget?.isLimited ? " — safety-limited" : "";

  return `On — ${latestMusicalTarget.noteLabel}, ${getPitchOctaveLabel(pitchTarget?.octaveOffset)} → ${pitchTarget?.frequency.toFixed(2)} Hz${limitText}`;
}''',
    "pitch readout",
)

source = replace_once(
    source,
    '''    pitchArpNote.textContent =
      "Pitch Arp uses the exact same note, order, timing and rests as Cutoff movement. Band 5 and the dry route therefore follow one oscillator pitch.";''',
    '''    pitchArpNote.textContent =
      "Pitch Arp uses the same event identity, order, timing and rests as Cutoff movement. Pitch Octave transposes only the oscillator destination. Band 5 and the dry route still follow one oscillator pitch.";''',
    "panel authority wording",
)

source = replace_once(
    source,
    '''  const pitchState = isPitchArpOn()
    ? latestMusicalTarget
      ? `on and following ${latestMusicalTarget.noteLabel} at ${latestMusicalTarget.frequency.toFixed(2)} Hz`
      : "on and waiting for the first shared note event"
    : "off; the oscillator uses its A3 / 220 Hz fallback";''',
    '''  const pitchTarget = getPitchTargetFromMusicalTarget(latestMusicalTarget);
  const pitchState = isPitchArpOn()
    ? pitchTarget
      ? `on; ${latestMusicalTarget.noteLabel} with ${getPitchOctaveLabel(pitchTarget.octaveOffset)} reaches ${pitchTarget.frequency.toFixed(2)} Hz${pitchTarget.isLimited ? " after the safety limit" : ""}`
      : `on with ${getPitchOctaveLabel()} and waiting for the first shared note event`
    : "off; the oscillator uses its A3 / 220 Hz fallback";''',
    "patch summary pitch state",
)

source = replace_once(
    source,
    '''  const pitchArpControl = getControl("scaleChancePitchArpEnabled");
  pitchArpControl?.addEventListener("input", handlePitchArpControlChange);
  pitchArpControl?.addEventListener("change", handlePitchArpControlChange);

  document.querySelectorAll''',
    '''  const pitchArpControl = getControl("scaleChancePitchArpEnabled");
  const pitchOctaveControl = getControl("scaleChancePitchOctave");
  pitchArpControl?.addEventListener("input", handlePitchArpControlChange);
  pitchArpControl?.addEventListener("change", handlePitchArpControlChange);
  pitchOctaveControl?.addEventListener("input", handlePitchArpControlChange);
  pitchOctaveControl?.addEventListener("change", handlePitchArpControlChange);

  document.querySelectorAll''',
    "live pitch octave listener",
)

SOURCE.write_text(source, encoding="utf-8")

TEST.write_text(
    '''import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Pitch Octave offers a bounded whole-octave relationship with unison default", async () => {
  const pitchSource = await read("src/scale-chance-ar-envelope.js");

  assert.match(pitchSource, /id="scaleChancePitchOctave"/);
  assert.match(pitchSource, /<option value="-2">-2 octaves<\/option>/);
  assert.match(pitchSource, /<option value="0" selected>0 — same note<\/option>/);
  assert.match(pitchSource, /<option value="2">\+2 octaves<\/option>/);
  assert.match(pitchSource, /MIN_PITCH_OCTAVE_OFFSET = -2/);
  assert.match(pitchSource, /MAX_PITCH_OCTAVE_OFFSET = 2/);
});

test("octave transposition is applied only at the Pitch Arp destination", async () => {
  const pitchSource = await read("src/scale-chance-ar-envelope.js");
  const cutoffSource = await read("src/scale-chance-cutoff.js");

  assert.match(pitchSource, /requestedFrequency = musicalTarget\.frequency \* Math\.pow\(2, octaveOffset\)/);
  assert.match(pitchSource, /setOscillatorFrequency\(oscillatorNode, pitchTarget\.frequency\)/);
  assert.match(pitchSource, /latestMusicalTarget = musicalTarget;/);
  assert.match(cutoffSource, /applyCutoffTargetForMidiNote\(midiNote\);\s+dispatchScaleChanceNoteEvent\(noteLength\);/s);
  assert.doesNotMatch(cutoffSource, /scaleChancePitchOctave|PITCH_MIN_FREQUENCY|PITCH_MAX_FREQUENCY/);
});

test("Pitch Octave preserves fallback, live retuning and frequency safety", async () => {
  const pitchSource = await read("src/scale-chance-ar-envelope.js");

  assert.match(pitchSource, /DEFAULT_OSCILLATOR_FREQUENCY = 220/);
  assert.match(pitchSource, /PITCH_MIN_FREQUENCY = 20/);
  assert.match(pitchSource, /PITCH_MAX_FREQUENCY = 16000/);
  assert.match(pitchSource, /frequency = clamp\(requestedFrequency, PITCH_MIN_FREQUENCY, PITCH_MAX_FREQUENCY\)/);
  assert.match(pitchSource, /pitchOctaveControl\?\.addEventListener\("input", handlePitchArpControlChange\)/);
  assert.match(pitchSource, /applyCurrentPitchTarget\(oscillatorNode\)/);
  assert.match(pitchSource, /safety-limited/);
});

test("candidate checklist covers musical relationship and safety acceptance", async () => {
  const checklist = await read("docs/manual-audio-test-checklist-v0.35-pitch-octave.md");

  for (const phrase of [
    "-2 octaves",
    "0 — same note",
    "+2 octaves",
    "Rest Chance",
    "Band 5",
    "Output",
    "Panic Stop",
  ]) {
    assert.match(checklist, new RegExp(phrase.replace(/[+]/g, "\\+"), "i"));
  }
});
''',
    encoding="utf-8",
)

CHECKLIST.write_text(
    '''# SpectraSynth v0.35 Pitch Arp octave relationship — manual audio test

## Candidate identity

Record the exact tested commit before listening.

## Safety first

- Start with Output below 25%.
- Stop immediately after any painful high-frequency sound, sudden loud jump or stuck source.
- Keep Panic Stop visible throughout the test.

## Setup

1. Start Oscillator.
2. Turn Cutoff Movement On.
3. Turn Cutoff Arp Mode On.
4. Turn Pitch Arp On.
5. Use four obvious notes such as C3, E3, G3 and C4.
6. Set Rest Chance to 0 for the first comparisons.

## Relationship checks

### 0 — same note

- Select **0 — same note**.
- Confirm oscillator pitch follows the shared notes exactly as accepted v0.34.
- Confirm Cutoff / Brightness still follows the original shared note events.

### -2 octaves

- Select **-2 octaves**.
- Confirm the oscillator moves two octaves lower while Cutoff keeps the same movement pattern and timing.
- Confirm there is no second sequence, drift or extra note underneath.

### +2 octaves

- Lower Output before selecting **+2 octaves**.
- Confirm the oscillator moves two octaves higher while Cutoff keeps the same event order and timing.
- Confirm the readout reports **safety-limited** when a requested target reaches the 16000 Hz ceiling.

### Live offset change

- While notes are running, change -1 → 0 → +1.
- Confirm the currently sounding oscillator target changes immediately.
- Confirm the Cutoff sequence does not restart and the arp counter does not jump to a second sequence.

## Rest and destination checks

- Raise Rest Chance to about 50%.
- Confirm a rest creates neither a new Cutoff target nor a new Pitch target.
- Turn Pitch Arp Off and confirm the oscillator returns to A3 / 220 Hz while Cutoff movement may continue.
- Turn Pitch Arp On again and confirm the next shared event resumes at the selected Pitch Octave.

## Shared-source and safety checks

- Move Band 5 Voice fader and toggle Band 5 Mute.
- Confirm Band 5 remains a colour layer from the same transposed oscillator, not a fixed second note.
- Confirm Output controls all audible routes.
- Press Panic Stop and confirm oscillator, Band 5 contribution and all output silence immediately.

## Result

Report exactly one:

- **ACCEPT**
- **CORRECTIONS REQUIRED**, with the failing control, settings and heard behaviour.
''',
    encoding="utf-8",
)
