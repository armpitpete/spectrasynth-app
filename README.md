# SpectraSynth App

SpectraSynth is a browser-based MerrinLab instrument prototype for making a visible spectral sound path understandable before expanding it into a larger instrument.

## Live build

https://armpitpete.github.io/spectrasynth-app/

## Current source checkpoint

**v0.34 — source readout layout**

This is the version displayed by current `main` source. The earlier README claim that v0.13 was the current checkpoint is retired.

The repository has advanced through several experimental audio lanes. Version labels alone do not prove that every visible control or historical branch is accepted. The current authority below is derived from the active `src/main.js` path and must still be confirmed through the manual listening checklist before a new stable audio checkpoint is declared.

## Current accepted-source boundary

### Sources

- one quiet sawtooth oscillator at A3;
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
- extreme safety state.

The readout is display-only and does not alter audio.

## Visible or imported work that is not automatically accepted authority

The source tree includes interface or experimental modules for areas such as:

- Virtual Distance;
- Two-Moon Movement;
- Delay;
- Reverb;
- active-control wording;
- stereo width;
- Scale Chance controls;
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
- MIDI;
- presets;
- recording or export.

Do not describe a visible placeholder or imported module as working audio unless the current source path and manual test prove it.

## Run locally

```bash
npm install
npm run dev
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
- confirmation that the other bands remain UI-only.

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
3. manual listening against the current checklist;
4. safe Output and Panic Stop proof;
5. no unexpected audio from UI-only controls;
6. a short acceptance record stating what was heard and what remains unimplemented.

## Immediate gate

Run the v0.34 manual audio checklist against the exact branch or `main` commit being considered. Then either:

- record v0.34 as an accepted stable checkpoint; or
- list exact defects and keep it as a source checkpoint only.

## Stop rule

Do not add more spectral bands, feedback, microphone, vocoder, MIDI, presets, effects or sensor behaviour until the current source path is manually tested and its accepted boundary is recorded.
