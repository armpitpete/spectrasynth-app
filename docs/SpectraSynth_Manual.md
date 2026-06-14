# SpectraSynth Manual

Version: v0.35 public build link  
Status: public build link added; no audio behaviour changes

## What SpectraSynth is

SpectraSynth is a browser-based Web Audio instrument prototype.

Current sound sources:

- one sawtooth oscillator
- one white noise source

Current stable sound path:

```text
oscillator / noise → pre-fuzz low-pass filter → soft Buttery Fuzz mix → post-fuzz low-pass filter → true left/right stereo spread → master Output → analyser meters / speakers
```

v0.35 adds a small public build link above the app shell so the deployed GitHub Pages route is easy to find and share. It does not change audio behaviour.

## Public viewing

Public build:

```text
https://armpitpete.github.io/spectrasynth-app/
```

Local testing:

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

The Source Readout panel shows:

- Oscillator: On/Off
- Noise: On/Off
- Output %
- Cutoff Hz
- Resonance visible value
- Buttery Fuzz %
- Extreme safety: Idle/Active

This panel is display-only. It does not change sound.

v0.34 fixed the Source Readout layout so the values appear as readable cards instead of a collapsed vertical stack.

## Controls

### Start Oscillator

Starts one sawtooth oscillator at A3.

### Start Noise

Starts one white noise source.

Noise is useful because it shows the whole filter shape clearly. It also reveals when fuzz or filtering becomes too harsh.

### Panic Stop

Silences oscillator, noise, and output quickly.

### Cutoff / Brightness

Controls the low-pass filter cutoff.

The current cutoff range is 120 Hz to 16000 Hz, with a perceptual slider curve.

Cutoff controls both the pre-fuzz low-pass filter and the post-fuzz low-pass filter.

### Resonance

Emphasises the first filter cutoff point.

The visible Resonance control reaches 40. Internally, the app gently reduces effective resonance only when this extreme combination happens:

```text
Noise on + Resonance above 30 + Buttery Fuzz above 85%
```

At the strongest extreme setting, effective resonance is pulled toward 24.

### Buttery Fuzz

Controls the fuzz amount.

The base internal limits are:

```text
fuzz input gain range = 1.0 to 26.0
fuzz curve drive = 3.8
fuzz output trim = 0.28
```

The goal is audible soft buttery distortion, not raspy hard clipping.

When Noise, very high Resonance, and very high Buttery Fuzz are combined, the app gently pulls the effective fuzz input drive down toward 18.0.

### Stereo width

A true left/right stereo-width branch is active after the post-fuzz filter.

Current internal settings:

```text
left spread delay = 0.004 seconds
right spread delay = 0.009 seconds
stereo center gain = 0.62
stereo spread gain = 0.42 per side
```

### Output

Controls the final level.

The Output control is clamped to a safe maximum.

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

## v0.35 test checklist

- public GitHub Pages URL loads the app
- public build link is visible above the app shell
- public build link points to the GitHub Pages route
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

## What waits for later

Not built yet:

- redesigned Band 5 audition
- active feedback with fuzz
- microphone input
- vocoder mode
- MIDI
- presets
- sensors
- real 10-band filter bank
- band fader sound control
- delay/reverb effects
- plugin export

## Build log

### v0.28 — Extreme noise fuzz safety

Added a narrow internal safety shaper for one bad edge case: Noise on, high Resonance, high Buttery Fuzz, and mid Cutoff.

### v0.29 — Stable extreme noise fuzz safety checkpoint

Recorded v0.28 as stable after ear testing.

### v0.30 — Band 5 audition decision

Closed PR #43 and recorded that the current audition architecture should not be merged.

### v0.31 — Visible source level readout

Added a display-only Source Readout panel.

### v0.32 — GitHub Pages workflow

Added deployment wiring for GitHub Pages.

### v0.33 — Stable Pages deployment checkpoint

Recorded that GitHub Pages deployment is fixed and stable.

### v0.34 — Source Readout layout fix

Fixed the Source Readout panel layout so the values display as readable cards instead of a collapsed vertical list.

### v0.35 — Public build link

Added a small public build link above the app shell.

No audio behaviour was changed.
