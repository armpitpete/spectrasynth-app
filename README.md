# SpectraSynth App

SpectraSynth is a browser-based MerrinLab instrument prototype for testing a visible musical sound path before expanding it into a larger instrument.

## Current checkpoint

**v0.34 — accepted and publicly deployed Cutoff and Pitch shared-note checkpoint**

Exact manually accepted audio candidate:

`4987e2544bd118d89ef339b725c8c35b4e83267d`

Protected audio-review head:

`26e5b7254356f1d27da02535ee786d2e0f1b9c1a`

PR #144 squash-merge checkpoint:

`ccd3d8f7d8fc1b3f7161199f7ecd19e5326c8126`

Accepted public deployment commit:

`2da1ea07801ce3b0d461ed98910720c66df799a0`

Current secured `main`:

`4007537cf085b0487ee6b973f073e698046b758e`

The public v0.34 deployment was completed by Pages run `30885076017` and accepted by owner hands-on smoke testing on 4 August 2026.

The later dependency-security repair changed only the lockfile, verification and deployment workflows, contract tests and evidence records. It did not change runtime audio or interface files. The public site therefore remains on the accepted deployment commit until a later exact-SHA Pages dispatch is separately authorised.

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
npm audit --audit-level=high
npm test
npm run build
npm run preview
```

## Acceptance evidence

The listening contract is in:

`docs/manual-audio-test-checklist.md`

The recorded accepted result is in:

`docs/manual-audio-test-acceptance-2026-08-02.md`

The dependency finding and repair are recorded in:

`docs/dependency-security-audit-2026-08-04.md`

The exact audio candidate was built, automatically verified and manually accepted. Subsequent accepted changes did not alter runtime audio or interface files. The secured `main` build produced the same public CSS and JavaScript asset names as the accepted v0.34 deployment.

Any later runtime change requires a new exact-head listening decision.

## Deployment state

The accepted public site is:

`https://armpitpete.github.io/spectrasynth-app/`

Pages deployment is manual-only. A deployment requires an exact 40-character commit SHA, verifies the checked-out SHA, installs locked dependencies, blocks high-severity audit findings, runs tests and builds before artifact upload.

Current `main` has not been redeployed after the dependency-security repair. No future merge, deployment or publication is authorised by this README.

## Threadkeeper record

- PR #144 merged the accepted shared-note audio checkpoint.
- PR #146 reconciled the initial post-merge authority record.
- PR #149 made Pages deployment manual-only and exact-SHA controlled.
- Pages run `30885076017` deployed commit `2da1ea07801ce3b0d461ed98910720c66df799a0`; the public smoke test was accepted and Issue #150 closed.
- PR #152 repaired the build-time PostCSS dependency chain and added blocking audit gates; Issue #151 closed.
- Issue #153 tracks this README-only state reconciliation.

The next product feature must start from current secured `main` and receive its own bounded issue, implementation evidence, protected review and any required hands-on audio acceptance.