import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the core oscillator remains a fixed A3 / 220 Hz source", async () => {
  const mainSource = await read("src/main.js");

  assert.match(mainSource, /oscillator\.type = "sawtooth";/);
  assert.match(
    mainSource,
    /oscillator\.frequency\.setValueAtTime\(220, context\.currentTime\);/
  );
});

test("the interface names the current feature Cutoff Arp and denies pitch automation", async () => {
  const panelSource = await read("src/scale-chance-panel.js");
  const cutoffSource = await read("src/scale-chance-cutoff.js");

  assert.match(panelSource, /Cutoff Arp Mode/);
  assert.match(panelSource, /moves Cutoff only; oscillator fixed at A3 \/ 220 Hz/);
  assert.match(panelSource, /It does not change oscillator pitch/);
  assert.doesNotMatch(panelSource, />\s*Arp Mode\s*</);

  assert.match(cutoffSource, /Cutoff Arp is on/);
  assert.match(cutoffSource, /Oscillator pitch remains fixed at A3 \/ 220 Hz/);
  assert.match(cutoffSource, /maps to .* Hz Cutoff/);
  assert.doesNotMatch(cutoffSource, / Arp Mode is on/);
});

test("repository authority and listening checks state the same contract", async () => {
  const readme = await read("README.md");
  const checklist = await read("docs/manual-audio-test-checklist.md");

  for (const text of [readme, checklist]) {
    assert.match(text, /Cutoff Arp/);
    assert.match(text, /A3/);
    assert.match(text, /220 Hz/);
    assert.match(text, /does not change oscillator pitch|does not change the oscillator pitch|remains fixed/i);
  }
});
