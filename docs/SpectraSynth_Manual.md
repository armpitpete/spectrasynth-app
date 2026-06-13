# SpectraSynth Manual

Version: v0.19 draft  
Status: written alongside the prototype

## What SpectraSynth is

SpectraSynth is a browser-based Web Audio instrument prototype.

The current version is not a full synthesizer yet. It is a controlled test instrument for building the sound engine one safe piece at a time.

Current sound sources:

- one sawtooth oscillator
- one white noise source

Current sound path:

```text
oscillator / noise → low-pass filter → master Output → analyser meters / speakers
```

The feedback path is separate and protected:

```text
filter output → short feedback delay → soft saturation → feedback gain → back into filter
```

The 10 spectral faders are still visual-only. They do not shape the sound yet.

## Current safe-audio rules

SpectraSynth is being built cautiously because browser audio can become loud or unstable.

Current safety rules:

- master Output is clamped
- feedback is capped
- feedback is shaped so it comes in more gradually
- feedback passes through a very short delay
- feedback includes gentle soft saturation
- Panic Stop silences the app quickly
- no fake self-oscillation is connected

## Quick start

1. Open the app in the browser.
2. Press **Start Oscillator**.
3. Raise **Output** if needed.
4. Move **Cutoff / Brightness**.
5. Move **Resonance** carefully.
6. Raise **Feedback** slowly.
7. Press **Panic Stop** if the sound feels too strong.

## Controls

### Start Oscillator

Starts one sawtooth oscillator at A3.

This is the simplest tone source. Use it when checking pitch, filter movement, feedback character, and future fuzz behaviour.

### Start Noise

Starts one white noise source.

Noise is useful because it shows the whole filter shape clearly. It also reveals when feedback, fuzz, or filtering becomes too harsh.

### Panic Stop

Silences oscillator, noise, feedback, and output quickly.

Use it whenever the sound feels too loud, too sharp, or unstable.

### Cutoff / Brightness

Controls the low-pass filter cutoff.

In v0.19, this range was extended from 8000 Hz to 16000 Hz.

This means the filter can now open much brighter than before. That matters because fuzz and distortion need enough high-frequency content to judge their tone properly.

### Resonance

Emphasises the filter cutoff point.

Higher resonance can make the sound sharper and more ring-like. Use it carefully with high cutoff and feedback.

### Feedback

Routes part of the filter output back into the filter.

The feedback is protected. It is capped, delayed, shaped, and softly saturated inside the loop.

Feedback should add bite, thickness, and movement. It should not run away or become uncontrollable.

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

## v0.19 test checklist

Use this checklist after pulling v0.19.

- app loads
- header says `v0.19 extended cutoff brightness`
- oscillator starts and stops
- noise starts and stops
- Cutoff / Brightness reaches 16000 Hz
- full cutoff sounds brighter than v0.17
- Output still controls level
- feedback still works
- buttery feedback character remains
- full Cutoff + full Resonance + full Feedback does not run away
- Panic Stop silences everything
- analyser meters still respond
- band faders remain visual-only

## What waits for later

Not built yet:

- buttery fuzz distortion
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
