# SpectraSynth App

SpectraSynth is a browser-based MerrinLab instrument prototype for testing a visible musical sound path before expanding it into a larger instrument.

## Current checkpoint

The repository is still at an **unaccepted v0.34 source checkpoint**.

The current protected work is Issue #142: connect oscillator pitch to the same musical note events that drive Cutoff / Brightness.

This work does not declare a stable release. It must be built and manually heard before any merge decision.

## Current audio path

One sawtooth oscillator and one white-noise source can feed `sourceMixGain`.

From that shared source bus:

- the core route passes through Cutoff, Resonance, Buttery Fuzz and the stereo output stage;
- Band 5 `Voice` receives a parallel source-colour branch;
- both routes reach the same protected master Output;
- Bands 1–4 and 6–10 remain interface-only.

Band 5 does not create a second note. Muting Band 5 removes only its parallel colour contribution.

## Shared musical event stream

Scale Chance owns one musical event sequence.

Each non-rest event selects one note identity. That same event is used for:

- the Cutoff / Brightness target;
- the existing oscillator pitch when **Pitch Arp** is on;
- the optional attack/release envelope.

There is no second oscillator and no second arp counter.

The oscillator starts with an A3 / 220 Hz fallback. When Pitch Arp is on and the first musical event arrives, that existing oscillator retunes to the selected note. Because both the dry route and Band 5 originate from the same oscillator, both follow the same pitch.

A rest creates no new Cutoff target and no new pitch target.

## Main controls

- **Cutoff Movement** enables the musical event engine.
- **Cutoff Arp Mode** chooses ordered arp notes instead of weighted chance notes.
- **Pitch Arp** routes those same note events to the existing oscillator.
- **Cutoff Arp Direction and Notes** define order and selected notes.
- **Cutoff Cluster controls** group the same shared note events.
- **Cutoff AR Envelope** shapes the existing source gain.
- **Band 5 fader and Mute** control only the parallel Band 5 colour branch.
- **Output** controls the protected master level.
- **Panic Stop** silences output and stops active sources.

When Pitch Arp is off, the oscillator intentionally returns to the A3 / 220 Hz fallback while Cutoff movement may continue.

## Safety boundary

- master gain remains capped;
- sources start only after deliberate user action;
- Stop Oscillator must stop the oscillator;
- Stop Noise must stop noise;
- Panic Stop must stop both sources and silence output;
- Band 5 must not bypass Output safety;
- no test should continue after a sudden loud jump, painful high-frequency sound or stuck source.

## Current non-capabilities

The current checkpoint does not claim:

- polyphony;
- a full audible ten-band filter bank;
- MIDI input;
- presets;
- recording or export;
- microphone input;
- vocoder behaviour;
- sensors;
- feedback self-oscillation.

## Run locally

```bash
npm ci
npm test
npm run build
npm run preview
```

## Required manual test

Use:

`docs/manual-audio-test-checklist.md`

The exact candidate commit must be recorded with the result.

## Threadkeeper gate

The permitted result is one of:

- **ACCEPT** — the exact candidate produces one musically linked oscillator note, Cutoff follows the same event stream, Band 5 remains only a colour branch, and all source-stop safety checks pass.
- **CORRECTIONS REQUIRED** — any fixed unrelated note remains, a second sequence appears, Stop Oscillator or Panic Stop fails, Band 5 duplicates or traps a path, or the interface disagrees with the sound.

PR #138 and PR #143 remain draft and unmerged. Issue #142 must also stop before merge. No deployment or publication is authorised.
