# SpectraSynth Manual

Version: v0.37 visible version pill checkpoint  
Status: visible version pill updated; no audio, layout, or deployment changes

## What SpectraSynth is

SpectraSynth is a browser-based Web Audio instrument prototype.

Current stable sound path:

```text
oscillator / noise → pre-fuzz low-pass filter → soft Buttery Fuzz mix → post-fuzz low-pass filter → true left/right stereo spread → master Output → analyser meters / speakers
```

v0.37 updates the visible version pill so the public app shows the current checkpoint. It does not change audio behaviour.

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
- Cutoff shapes the sound before and after the fuzz stage
- Resonance still reaches 40 for a stronger audible peak
- true left/right stereo spread is added after the post-fuzz filter
- Feedback is parked and not connected
- Panic Stop silences the app quickly
- no fake self-oscillation is connected
- extreme noise safety shaping is active only when Noise, high Resonance, and high Buttery Fuzz are combined

## v0.37 test checklist

- public GitHub Pages route loads the app
- version pill visibly says `v0.37 current public checkpoint`
- public build link still sits visually with the header area
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

### v0.36 — Header-linked public build

Moved the public build link visually into the header area using CSS only.

### v0.37 — Visible version pill checkpoint

Updated the visible version pill using CSS only.

No audio behaviour was changed.
