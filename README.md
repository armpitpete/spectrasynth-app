# SpectraSynth App

SpectraSynth is a browser-based MerrinLab instrument prototype for testing a visible musical sound path before expanding it into a larger instrument.

## Current checkpoint

**v0.34 — accepted Cutoff and Pitch shared-note checkpoint**

Merged `main` commit:

`ccd3d8f7d8fc1b3f7161199f7ecd19e5326c8126`

Exact manually accepted audio candidate:

`4987e2544bd118d89ef339b725c8c35b4e83267d`

Protected review head:

`26e5b7254356f1d27da02535ee786d2e0f1b9c1a`

PR #144 was guarded squash-merged on 2 August 2026 after automated verification, owner hands-on listening acceptance and protected review.

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

## Acceptance evidence

The listening contract is in:

`docs/manual-audio-test-checklist.md`

The recorded accepted result is in:

`docs/manual-audio-test-acceptance-2026-08-02.md`

The exact accepted audio candidate was built, automatically verified and manually accepted. The protected review proved that later changes before merge were documentation-only. Any later runtime change requires a new exact-head listening decision.

## Threadkeeper record

- PR #144 merged the accepted checkpoint into `main`.
- Issues #140, #141 and #142 are completed.
- PRs #138 and #143 were closed as superseded without merge.
- Issue #145 reconciles this post-merge repository wording.

Deployment and publication remain separate protected decisions. This checkpoint record does not authorise either.