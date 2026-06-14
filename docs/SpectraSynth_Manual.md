# SpectraSynth Manual

Version: v0.36 header-linked public build  
Status: public build link visually moved into header area; no audio behaviour changes

## What SpectraSynth is

SpectraSynth is a browser-based Web Audio instrument prototype.

Current stable sound path:

```text
oscillator / noise → pre-fuzz low-pass filter → soft Buttery Fuzz mix → post-fuzz low-pass filter → true left/right stereo spread → master Output → analyser meters / speakers
```

v0.36 moves the existing public build link so it sits visually with the app header instead of reading like a separate page banner. It does not change audio behaviour.

## Public viewing

Use the repository GitHub Pages route for the public build.

Local testing still works with:

```text
npm install
npm run dev
```

GitHub Pages uses **GitHub Actions** as the source.

## Current safe-audio rules

- master Output is clamped
- Buttery Fuzz has a controlled slider
- the fuzz stage uses rounded saturation, not hard clipping
- the fuzz output is trimmed before the mix
- the dry signal remains in the mix so the distortion stays softer
- Cutoff shapes the sound before and after the fuzz stage
- Resonance still reaches 40 for a stronger audible peak
- true left/right stereo spread is added after the post-fuzz filter
- Feedback is parked and not connected
- Panic Stop silences the app quickly
- no fake self-oscillation is connected
- extreme noise safety shaping is active only when Noise, high Resonance, and high Buttery Fuzz are combined

## Source Readout panel

The Source Readout panel shows Oscillator, Noise, Output, Cutoff, Resonance, Buttery Fuzz, and Extreme safety state.

This panel is display-only. It does not change sound.

## Spectral Engine panel

The 10 meters show real analyser data from the audio output.

Current rule:

```text
meters = real audio data
faders = visual only
Mute buttons = visual only
```

Band 5 Voice has a real silent internal filter tap at 1200 Hz with Q 1.2, but it is not audible.

## Band 5 audition decision

PR #43 added a Band 5 audition experiment, but it is closed and must not be merged.

Decision:

```text
Close PR #43 and redesign Band 5 audition later.
```

No audible spectral-band work should happen until a new contained issue defines the audition method.

## v0.36 test checklist

- public GitHub Pages route loads the app
- public build link appears visually with the header area
- public build link no longer reads like a separate full-width banner on desktop
- Source Readout panel still uses readable cards
- Source Readout values still update correctly
- oscillator starts and stops
- noise starts and stops
- Output still controls level
- Panic Stop silences everything
- analyser meters still respond
- band faders remain visual-only
- Mute buttons remain visual-only
- Band 5 remains silent
- Feedback remains parked

## Build log

### v0.34 — Source Readout layout fix

Fixed the Source Readout panel layout so the values display as readable cards instead of a collapsed vertical list.

### v0.35 — Public build link

Added a small public build link above the app shell.

### v0.36 — Header-linked public build

Moved the public build link visually into the header area using CSS only.

No audio behaviour was changed.
