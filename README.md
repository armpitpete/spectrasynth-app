# SpectraSynth App

SpectraSynth App is a browser-based MerrinLab instrument prototype.

## Current checkpoint

**v0.13 — Stable audio core freeze**

This checkpoint freezes the first safe audio foundation before analyser, vocoder, microphone, MIDI, effects, sensors, or real spectral bands are added.

## Current working core

- one sawtooth oscillator source
- one white noise source
- one low-pass filter
- Cutoff / Brightness control
- Resonance control
- protected Feedback control
- master Output control with safety clamp
- Panic Stop
- visual-only 10-band spectral panel
- no fake self-oscillation

## Not added yet

- analyser
- vocoder
- microphone input
- MIDI
- presets
- delay/reverb effects
- sensors
- 10 real filter bands
- fake self-oscillation

## Safety rules

- Audio starts only after user interaction.
- Output is clamped to a safe maximum gain.
- Feedback defaults to 0 and is capped.
- Panic Stop resets Feedback to 0, stops oscillator/noise, and silences output.

## Test checklist

- Start Oscillator / Stop Oscillator works.
- Start Noise / Stop Noise works.
- Output changes master volume.
- Cutoff / Brightness darkens and brightens the sound.
- Resonance changes filter focus.
- Feedback is audible at low/mid/high settings without jumping loud.
- Panic Stop works with oscillator, noise, and both together.
- Normal use works again after Panic Stop.
