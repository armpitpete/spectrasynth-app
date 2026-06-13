# SpectraSynth Manual

Version: v0.20 draft  
Status: written alongside the prototype

## What SpectraSynth is

SpectraSynth is a browser-based Web Audio instrument prototype.

The current version is not a full synthesizer yet. It is a controlled test instrument for building the sound engine one safe piece at a time.

Current sound sources:

- one sawtooth oscillator
- one white noise source

Current sound path:

```text
oscillator / noise → low-pass filter → fixed buttery fuzz → master Output → analyser meters / speakers
```

Feedback is parked in v0.20.

There is no active feedback loop in this version. The previous feedback work is not deleted as a design direction, but it is not part of the v0.20 fuzz test.

The 10 spectral faders are still visual-only. They do not shape the sound yet.

## Current safe-audio rules

SpectraSynth is being built cautiously because browser audio can become loud or unstable.

Current safety rules:

- master Output is clamped
- the main fuzz stage has fixed gain and output trim
- Feedback is parked and disabled in v0.20
- Panic Stop silences the app quickly
- no fake self-oscillation is connected

## Quick start

1. Open the app in the browser.
2. Press **Start Oscillator**.
3. Raise **Output** if needed.
4. Move **Cutoff / Brightness**.
5. Move **Resonance** carefully.
6. Listen to the fixed buttery fuzz stage.
7. Press **Panic Stop** if the sound feels too strong.

## Controls

### Start Oscillator

Starts one sawtooth oscillator at A3.

This is the simplest tone source. Use it when checking pitch, filter movement, and fuzz behaviour.

### Start Noise

Starts one white noise source.

Noise is useful because it shows the whole filter shape clearly. It also reveals when fuzz or filtering becomes too harsh.

### Panic Stop

Silences oscillator, noise, and output quickly.

Use it whenever the sound feels too loud, too sharp, or unstable.

### Cutoff / Brightness

Controls the low-pass filter cutoff.

In v0.19, this range was extended from 8000 Hz to 16000 Hz.

This means the filter can now open much brighter than before. That matters because fuzz and distortion need enough high-frequency content to judge their tone properly.

### Resonance

Emphasises the filter cutoff point.

Higher resonance can make the sound sharper and more ring-like. Use it carefully with high cutoff.

### Feedback

Feedback is parked in v0.20.

The Feedback slider is disabled and stays at 0.

This version is only for judging the fixed buttery fuzz tone.

### Fixed buttery fuzz

Adds a fixed fuzz stage after the low-pass filter and before the master Output control.

The current fuzz is not a separate knob yet. It uses fixed internal settings:

```text
fuzz input gain = 2.4
fuzz curve drive = 1.5
fuzz output trim = 0.2
```

The goal is a warmer, fuzzier edge without harsh clipping.

### Output

Controls the final level.

The Output control is clamped to a safe maximum. At 100%, it is still deliberately limited.

## Spectral Engine panel

The 10 meters show real analyser data from the audio output.

The faders are not connected to the sound yet. They are placeholders for future spectral-band control.

Current rule:

```text
meters = real audio data
faders = visual only
```

## v0.20 test checklist

Use this checklist after pulling v0.20.

- app loads
- header says `v0.20 buttery fuzz distortion`
- oscillator starts and stops
- noise starts and stops
- oscillator has a warmer or fuzzier edge
- noise has character but does not become harsh white fizz
- Cutoff / Brightness still reaches 16000 Hz
- Feedback slider is disabled and stays at 0
- Output still controls level
- Panic Stop silences everything
- analyser meters still respond
- band faders remain visual-only

Do not test feedback in v0.20. Feedback is parked until the fuzz tone is good.

## What waits for later

Not built yet:

- fuzz amount control
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

### v0.17 — Buttery feedback character

Added gentle internal soft saturation inside the protected feedback loop.

Purpose: make feedback less brittle and less electronic without adding a separate distortion effect.

### v0.19 — Extended cutoff brightness range

Raised the Cutoff / Brightness maximum from 8000 Hz to 16000 Hz.

Purpose: let the filter open properly before adding fuzz distortion in v0.20.

### v0.20 — Buttery fuzz distortion

Added a fixed buttery fuzz stage after the low-pass filter and before master Output.

Feedback is parked in this version. The v0.20 target is good fuzz only.

Purpose: give the oscillator and noise a warmer fuzz edge without adding another visible control yet.
