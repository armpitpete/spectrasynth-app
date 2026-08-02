import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("one existing oscillator feeds both the dry and Band 5 routes", async () => {
  const mainSource = await read("src/main.js");
  const oscillatorCreations = mainSource.match(/context\.createOscillator\(\)/g) ?? [];

  assert.equal(oscillatorCreations.length, 1);
  assert.match(mainSource, /oscillator\.connect\(oscillatorGain\);/);
  assert.match(mainSource, /oscillatorGain\.connect\(sourceMixGain\);/);
  assert.match(mainSource, /sourceMixGain\.connect\(toneFilter\);/);
  assert.match(mainSource, /sourceMixGain\.connect\(spectralBand5Filter\);/);
});

test("Pitch Arp retunes that oscillator from the Cutoff event stream", async () => {
  const pitchSource = await read("src/scale-chance-ar-envelope.js");
  const cutoffSource = await read("src/scale-chance-cutoff.js");

  assert.doesNotMatch(pitchSource, /createOscillator\(/);
  assert.match(pitchSource, /const trackedOscillators = new Set\(\);/);
  assert.match(pitchSource, /rememberOscillator\(sourceNode\);/);
  assert.match(pitchSource, /document\.addEventListener\("spectraSynthScaleChanceNote", triggerPitchArp\);/);
  assert.match(pitchSource, /oscillatorNode\.frequency\.setTargetAtTime\(/);
  assert.match(pitchSource, /Pitch Arp retunes the existing oscillator/);

  assert.match(cutoffSource, /document\.dispatchEvent\(new CustomEvent\("spectraSynthScaleChanceNote"/);
  assert.match(cutoffSource, /applyCutoffTargetForMidiNote\(midiNote\);\s+dispatchScaleChanceNoteEvent\(noteLength\);/s);
  assert.match(cutoffSource, /if \(midiNote === null\) \{\s+lastChosenLabel = "rest";/s);
});

test("Pitch Arp preserves the A3 fallback and source stop safety", async () => {
  const mainSource = await read("src/main.js");
  const pitchSource = await read("src/scale-chance-ar-envelope.js");

  assert.match(mainSource, /oscillator\.frequency\.setValueAtTime\(220, context\.currentTime\);/);
  assert.match(mainSource, /oscillator\.stop\(stopTime\);/);
  assert.match(mainSource, /stopOscillator\(\{ immediate: true, updateSummary: false \}\);/);
  assert.match(pitchSource, /DEFAULT_OSCILLATOR_FREQUENCY = 220/);
  assert.match(pitchSource, /sourceNode\.addEventListener\("ended"/);
  assert.match(pitchSource, /trackedOscillators\.delete\(sourceNode\);/);
});

test("repository authority describes the shared note relationship", async () => {
  const readme = await read("README.md");
  const checklist = await read("docs/manual-audio-test-checklist.md");

  for (const text of [readme, checklist]) {
    assert.match(text, /Pitch Arp/);
    assert.match(text, /same|shared/i);
    assert.match(text, /no second oscillator|one oscillator/i);
    assert.match(text, /Band 5/);
    assert.match(text, /Panic Stop/);
  }
});
