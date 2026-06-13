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
oscillator / noise → low-pass filter → soft Buttery Fuzz mix → post-fuzz low-pass filter → true left/right stereo spread → master Output → analyser meters / speakers
```

Feedback is parked in v0.20.

There is no active feedback loop in this version. The previous feedback work is not deleted as a design direction, but it is not part of the v0.20 fuzz test.

The 10 spectral faders are still visual-only. They do not shape the sound yet.

## Current safe-audio rules

SpectraSynth is being built cautiously because browser audio can become loud or unstable.

Current safety rules:

- master Output is clamped
- Buttery Fuzz has a controlled slider
- the fuzz stage uses rounded saturation, not hard clipping
- the fuzz output is trimmed before the mix
- the dry signal remains in the mix so the distortion stays softer
- Cutoff shapes the sound before and after the fuzz stage
- Resonance still reaches 40 for a stronger audible peak
- true left/right stereo spread is added after the post-fuzz filter
- Feedback is not connected in v0.20
- Panic Stop silences the app quickly
- no fake self-oscillation is connected

## Quick start

1. Open the app in the browser.
2. Press **Start Oscillator**.
3. Raise **Output** if needed.
4. Move **Cutoff / Brightness**.
5. Move **Resonance** carefully.
6. Move **Buttery Fuzz**.
7. Press **Panic Stop** if the sound feels too strong.

## Controls

### Start Oscillator

Starts one sawtooth oscillator at A3.

This is the simplest tone source. Use it when checking pitch, filter movement, resonance, and fuzz behaviour.

### Start Noise

Starts one white noise source.

Noise is useful because it shows the whole filter shape clearly. It also reveals when fuzz or filtering becomes too harsh.

### Panic Stop

Silences oscillator, noise, and output quickly.

Use it whenever the sound feels too loud, too sharp, or unstable.

### Cutoff / Brightness

Controls the low-pass filter cutoff.

In v0.19, this range was extended from 8000 Hz to 16000 Hz.

In this v0.20 branch, Cutoff now controls two stages:

```text
pre-fuzz low-pass filter
post-fuzz low-pass filter
```

This was added because fuzz can create new harmonics after the first filter. The post-fuzz filter makes Cutoff feel strong again by shaping the final tone after the distortion stage.

### Resonance

Emphasises the first filter cutoff point.

In this v0.20 branch, Resonance now reaches 40 instead of 8, so it should be much more obvious.

Higher resonance can make the sound sharper and more ring-like. Use it carefully with high cutoff.

### Buttery Fuzz

Controls the fuzz amount.

At 0%, the fuzz path is effectively off and the dry filtered sound dominates.

As the control rises, the input drive into the fuzz stage increases and more fuzz signal is blended into the output.

The current internal limits are:

```text
fuzz input gain range = 1.0 to 26.0
fuzz curve drive = 3.8
fuzz output trim = 0.28
```

The current curve is deliberately softer than the previous hard-clipping test. It uses rounded saturation and a small warm asymmetry, while keeping dry signal in the blend.

The goal is audible soft buttery distortion, not raspy hard clipping.

### Stereo width

A true left/right stereo-width branch is active after the post-fuzz filter.

It uses two very short offset branches panned left and right. It is not a delay effect control and should stay controlled.

Current internal settings:

```text
left spread delay = 0.004 seconds
right spread delay = 0.009 seconds
stereo center gain = 0.62
stereo spread gain = 0.42 per side
```

### Feedback

Feedback is parked in v0.20.

There is no Feedback slider in this version. Feedback should not be tested until the fuzz tone is good.

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
- Cutoff / Brightness strongly changes the tone even when Buttery Fuzz is high
- Buttery Fuzz slider works from 0 to 100
- oscillator gains soft rounded distortion as Buttery Fuzz rises
- noise gains character without becoming raspy or brittle
- Resonance is much more obvious than before
- stereo image feels wider than a plain mono centre signal
- Cutoff / Brightness still reaches 16000 Hz
- Output still controls level
- Panic Stop silences everything
- analyser meters still respond
- band faders remain visual-only

Do not test feedback in v0.20. Feedback is parked until the fuzz tone is good.

## What waits for later

Not built yet:

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

Added a Buttery Fuzz amount control after the low-pass filter.

Retuned the fuzz several times after testing showed two separate failures: first it was not obvious enough, then it became too hard and raspy.

Current direction: soft rounded saturation with enough drive to be audible.

Raised Resonance maximum from 8 to 40.

Added a post-fuzz low-pass filter controlled by Cutoff so distortion does not weaken the Cutoff control.

Added a true left/right stereo-width branch after the post-fuzz filter.

Feedback is parked in this version. The v0.20 target is good fuzz only.

Purpose: give the oscillator and noise an audible soft buttery distortion edge before reconnecting feedback later.
