# SpectraSynth Manual

Version: v0.30 decision checkpoint  
Status: Band 5 audition closed and deferred for redesign

## What SpectraSynth is

SpectraSynth is a browser-based Web Audio instrument prototype.

The current version is not a full synthesizer yet. It is a controlled test instrument for building the sound engine one safe piece at a time.

Current sound sources:

- one sawtooth oscillator
- one white noise source

Current stable sound path:

```text
oscillator / noise → pre-fuzz low-pass filter → soft Buttery Fuzz mix → post-fuzz low-pass filter → true left/right stereo spread → master Output → analyser meters / speakers
```

v0.29 confirmed that the v0.28 extreme noise fuzz safety fix is stable after ear testing.

v0.30 is a decision checkpoint. It closes the old Band 5 audition PR and defers audible Band 5 work until the audition design is clearer.

Feedback is parked.

There is no active feedback loop in this version.

The 10 spectral faders are still visual-only. They do not shape the sound yet.

Band 5 Voice has a real silent internal bandpass tap at 1200 Hz with Q 1.2. It is still routed to a zero-gain internal path only.

PR #43 / Band 5 audition is now closed and must not be merged.

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
- Feedback is not connected
- Panic Stop silences the app quickly
- no fake self-oscillation is connected
- extreme noise safety shaping is active only when Noise, high Resonance, and high Buttery Fuzz are combined

## Quick start

1. Open the app in the browser.
2. Press **Start Oscillator**.
3. Raise **Output** if needed.
4. Move **Cutoff / Brightness**.
5. Move **Resonance** carefully.
6. Move **Buttery Fuzz**.
7. Press **Start Noise** only when testing noise behaviour.
8. Press **Panic Stop** if the sound feels too strong.

## Controls

### Start Oscillator

Starts one sawtooth oscillator at A3.

This is the simplest tone source. Use it when checking pitch, filter movement, resonance, and fuzz behaviour.

### Start Noise

Starts one white noise source.

Noise is useful because it shows the whole filter shape clearly. It also reveals when fuzz or filtering becomes too harsh.

Noise also activates the extreme-combination check. The check does nothing at normal settings.

### Panic Stop

Silences oscillator, noise, and output quickly.

Use it whenever the sound feels too loud, too sharp, or unstable.

### Cutoff / Brightness

Controls the low-pass filter cutoff.

The current cutoff range is 120 Hz to 16000 Hz, with a perceptual slider curve.

Cutoff controls two stages:

```text
pre-fuzz low-pass filter
post-fuzz low-pass filter
```

This is because fuzz can create new harmonics after the first filter. The post-fuzz filter makes Cutoff feel strong again by shaping the final tone after the distortion stage.

### Resonance

Emphasises the first filter cutoff point.

Resonance reaches 40, so it can produce a strong audible peak.

Higher resonance can make the sound sharper and more ring-like. Use it carefully with Noise and Buttery Fuzz.

The visible Resonance control still reaches 40. Internally, the app gently reduces effective resonance only when this extreme combination happens:

```text
Noise on + Resonance above 30 + Buttery Fuzz above 85%
```

At the strongest extreme setting, effective resonance is pulled toward 24. Normal resonance settings are unchanged.

### Buttery Fuzz

Controls the fuzz amount.

At 0%, the fuzz path is effectively off and the dry filtered sound dominates.

As the control rises, the input drive into the fuzz stage increases and more fuzz signal is blended into the output.

The base internal limits are:

```text
fuzz input gain range = 1.0 to 26.0
fuzz curve drive = 3.8
fuzz output trim = 0.28
```

The curve is deliberately soft. It uses rounded saturation and a small warm asymmetry, while keeping dry signal in the blend.

The goal is audible soft buttery distortion, not raspy hard clipping.

When Noise, very high Resonance, and very high Buttery Fuzz are combined, the app gently pulls the effective fuzz input drive down toward 18.0. Normal fuzz settings are unchanged.

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

Feedback is parked.

There is no Feedback slider in this version. Feedback should not be tested until the core tone is stable.

### Output

Controls the final level.

The Output control is clamped to a safe maximum. At 100%, it is still deliberately limited.

## Extreme noise fuzz safety

v0.29 treats the v0.28 fix as stable.

The fixed problem setting was:

```text
Noise on
Resonance full
Buttery Fuzz full
Cutoff / Brightness around 50%
```

At this setting, the sound could develop a repetitive artificial pattern. The likely cause was a high-Q filter and full fuzz drive exaggerating one narrow noise peak until it started to sound periodic.

The fix is not a limiter and not a compressor.

The fix is a small internal safety shaper:

- it checks whether Noise is running
- it checks whether Resonance is above 30
- it checks whether Buttery Fuzz is above 85%
- it gradually reduces effective resonance and fuzz input drive only in that corner
- it leaves normal Resonance and Buttery Fuzz behaviour alone

At the most extreme setting:

```text
visible resonance = 40
effective resonance target = 24
base fuzz input drive = 26.0
effective fuzz input drive target = 18.0
```

The patch summary reports when this shaping is active.

## Spectral Engine panel

The 10 meters show real analyser data from the audio output.

The faders are not connected to the sound yet. They are placeholders for future spectral-band control.

Current rule:

```text
meters = real audio data
faders = visual only
Mute buttons = visual only
```

Band 5 Voice has a real silent internal filter tap, but it is not audible in v0.30.

## Band 5 audition decision

PR #43 added a Band 5 audition experiment, but it is now closed and must not be merged.

Decision:

```text
Close PR #43 and redesign Band 5 audition later.
```

Reason:

- the audition path was not clearly audible in user testing
- raising gain from 0.08 to 0.18 did not solve the underlying design problem
- blindly raising gain is not a good synth-design method
- main has moved on to the v0.29 stable safety checkpoint

Future Band 5 audition should be redesigned as a clearer comparison tool, not a louder hidden parallel layer.

Possible future designs:

- solo audition
- A/B audition
- wet/dry comparison
- temporary narrow-band emphasis
- clearer source-dependent test instructions

No audible spectral-band work should happen until a new contained issue defines the audition method.

## v0.30 decision checklist

Use this checklist after pulling v0.30.

- app still loads
- app still says `v0.29 stable extreme noise fuzz safety checkpoint`
- manual says `v0.30 decision checkpoint`
- PR #43 is closed and unmerged
- Band 5 remains silent
- faders remain visual-only
- Mute buttons remain visual-only
- no audio code changed for v0.30
- no new Band 5 audition path exists
- future Band 5 work requires a new redesign issue

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

### v0.17 — Buttery feedback character

Added gentle internal soft saturation inside the protected feedback loop.

Purpose: make feedback less brittle and less electronic without adding a separate distortion effect.

### v0.19 — Extended cutoff brightness range

Raised the Cutoff / Brightness maximum from 8000 Hz to 16000 Hz.

Purpose: let the filter open properly before adding fuzz distortion.

### v0.20 — Buttery fuzz distortion

Added a Buttery Fuzz amount control after the low-pass filter.

Retuned the fuzz after testing showed two separate failures: first it was not obvious enough, then it became too hard and raspy.

Raised Resonance maximum from 8 to 40.

Added a post-fuzz low-pass filter controlled by Cutoff so distortion does not weaken the Cutoff control.

Added a true left/right stereo-width branch after the post-fuzz filter.

Feedback was parked.

Purpose: give the oscillator and noise an audible soft buttery distortion edge before reconnecting feedback later.

### v0.26 — Stable silent Band 5 tap checkpoint

Added a real Band 5 Voice bandpass filter at 1200 Hz with Q 1.2.

The tap was routed only to an internal zero-gain path.

Purpose: prove the first spectral-band tap can exist safely before making any band audible.

### v0.28 — Extreme noise fuzz safety

Added a narrow internal safety shaper for one bad edge case: Noise on, high Resonance, high Buttery Fuzz, and mid Cutoff.

The shaper gently reduces effective resonance and fuzz input drive only in that corner.

Purpose: reduce the repetitive artificial pattern without weakening normal Resonance, soft Buttery Fuzz, stereo spread, analyser behaviour, or the silent Band 5 tap.

### v0.29 — Stable extreme noise fuzz safety checkpoint

Recorded v0.28 as stable after ear testing.

No audio behaviour was changed.

PR #43 / Band 5 audition remained parked at this checkpoint.

Purpose: make the stable repo state clear before deciding whether to redesign the Band 5 audition path or move to another contained feature.

### v0.30 — Band 5 audition decision

Closed PR #43 and recorded that the current audition architecture should not be merged.

No audio behaviour was changed.

Purpose: prevent unclear Band 5 audition work from entering main and require a clearer redesign before audible spectral-band work continues.
