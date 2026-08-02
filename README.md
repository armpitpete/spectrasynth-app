# SpectraSynth App

SpectraSynth is a browser-based MerrinLab instrument prototype for making a visible spectral sound path understandable before expanding it into a larger instrument.

## Live build

https://armpitpete.github.io/spectrasynth-app/

## Current source checkpoint

**v0.34 — source readout layout**

This is the version displayed by current `main` source. The earlier README claim that v0.13 was the current checkpoint is retired.

The repository has advanced through several experimental audio lanes. Version labels alone do not prove that every visible control or historical branch is accepted. The current authority below is derived from the active `src/main.js` path and must still be confirmed through the manual listening checklist before a new stable audio checkpoint is declared.

The first v0.34 listening pass found an interface-clarity defect: the control called `Arp Mode` moved Cutoff / Brightness while the core oscillator remained fixed. v0.34 therefore remains a source checkpoint only until the corrected Cutoff Arp wording is built and manually retested.

## Current accepted-source boundary

### Sources

- one quiet sawtooth oscillator fixed at A3 / 220 Hz;
- one quiet white-noise source;
- both feed an explicit `sourceMixGain` bus;
- sources start only after deliberate user action;
- sources can run separately or together.

### Core shaping

- perceptual Cutoff / Brightness mapping from 120 Hz to 16 kHz;
- Resonance control;
- Buttery Fuzz with rounded waveshaping, dry/wet blend and post-fuzz filtering;
- fixed centre plus left/right delayed stereo spread;
- master Output clamped to a maximum gain of `0.35`.

### Scale Chance and Cutoff Arp

- Scale Chance generates note-labelled musical events and maps each selected note frequency to a Cutoff / Brightness target;
- Cutoff Arp determines the order of those cutoff targets;
- Cutoff Cluster controls group those cutoff targets;
- the note names describe filter targets and do not change oscillator pitch;
- the core oscillator remains fixed at A3 / 220 Hz;
- a true Pitch Arp is not implemented in v0.34 and belongs to separate issue #142 after this clarity repair is accepted.

### Safety

- Panic Stop ramps output to silence and stops oscillator and noise;
- normal use can restart after Panic Stop;
- combined Noise, high Resonance and high Buttery Fuzz activates additional safety shaping;
- the source readout shows whether extreme-state safety shaping is active.

### Spectral Engine

- ten visible spectral bands;
- live analyser levels across the ten visible meters;
- Band 5 `Voice` is the only audible spectral test band;
- Band 5 uses a parallel 1200 Hz band-pass branch and can be level-adjusted or muted;
- Bands 1–4 and 6–10 remain UI-only.

### Source Readout

The display reports:

- Oscillator state;
- Noise state;
- Output percentage;
- Cutoff frequency;
- Resonance;
- Buttery Fuzz;
- extreme safety state;
- Cutoff Arp state and the fixed A3 / 220 Hz oscillator contract.

The readout is display-only and does not alter audio.

## Visible or imported work that is not automatically accepted authority

The source tree includes interface or experimental modules for areas such as:

- Virtual Distance;
- Two-Moon Movement;
- Delay;
- Reverb;
- active-control wording;
- stereo width;
- spectral mute and band-audio experiments.

Their presence in the repository does not by itself establish that each path is complete, currently connected, manually accepted or part of a stable release. Each audio path needs its own source review and listening evidence.

## Current non-capabilities

Current core authority does not claim:

- a full audible ten-band filter bank;
- a feedback loop;
- vocoder behaviour;
- microphone input;
- sensors;
- audio behaviour for every spectral fader;
- real self-oscillation;
- oscillator pitch arpeggiation or a Pitch Arp;
- MIDI;
- presets;
- recording or export.

Do not describe a visible placeholder or imported module as working audio unless the current source path and manual test prove it.

## Run locally

```bash
npm install
npm run dev
```

Run the focused source-contract checks:

```bash
npm test
```

Build the production output:

```bash
npm run build
```

Preview the production output:

```bash
npm run preview
```

## Required listening check

Use:

`docs/manual-audio-test-checklist.md`

The checklist covers:

- safe monitoring;
- oscillator and noise paths;
- Output and Panic Stop;
- Cutoff and Resonance;
- Buttery Fuzz;
- extreme Noise safety shaping;
- Band 5 level and mute behaviour;
- analyser and source readout;
- confirmation that the other bands remain UI-only;
- confirmation that Cutoff Arp moves Cutoff / Brightness while oscillator pitch remains fixed at A3 / 220 Hz.

## Acceptance rule

A source or build checkpoint is not stable merely because:

- it builds;
- controls are visible;
- a version label changed;
- an automated check passes;
- an old PR called it stable.

A stable audio checkpoint requires:

1. exact commit identity;
2. successful production build;
3. successful focused contract tests;
4. manual listening against the current checklist;
5. safe Output and Panic Stop proof;
6. no unexpected audio from UI-only controls;
7. clear agreement between Cutoff Arp wording and the fixed-pitch sound;
8. a short acceptance record stating what was heard and what remains unimplemented.

## Immediate gate

Build and manually test the exact corrected Issue #141 head. Then either:

- accept the Cutoff Arp clarity repair and record v0.34 as the corrected source checkpoint ready for the next protected decision; or
- list exact remaining defects and keep v0.34 as an unaccepted source checkpoint.

PR #138 remains draft and unmerged. Issue #142 must not begin until Issue #141 is accepted.

## Stop rule

Do not add Pitch Arp, more spectral bands, feedback, microphone, vocoder, MIDI, presets, effects or sensor behaviour until the Cutoff Arp clarity repair is manually tested and its accepted boundary is recorded.
