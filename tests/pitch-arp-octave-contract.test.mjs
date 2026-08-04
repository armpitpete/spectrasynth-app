import test from "node:test";
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
    assert.match(checklist, new RegExp(phrase.replace(/[+]/g, "\+"), "i"));
  }
});
