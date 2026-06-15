# Spectral Engine Audio Architecture v0.77

## Purpose

This note answers issue #123. It defines the safe architecture for the next real Spectral Engine audio attempt.

The previous v0.76 approach failed because it patched `AudioNode.prototype.connect` and tried to infer the audio graph after the fact. That made the Spectral Engine interfere with the core synth path.

The next implementation must use explicit named nodes created during normal audio setup.

## Current safe state

The restored core synth path is:

```text
oscillator/noise
→ tone filter
→ buttery fuzz dry/wet path
→ post-fuzz filter
→ stereo spread / centre path
→ master output
```

This path must remain intact.

The Spectral Engine UI remains visible, but the audio layer is paused.

## Design rule

The Spectral Engine must be added as an explicit optional parallel branch, not as a hidden replacement for the main synth path.

Do not patch `AudioNode.prototype.connect`.

## Proposed signal path

Use this structure:

```text
source mix
├─ core path:
│  → tone filter
│  → buttery fuzz
│  → post-fuzz filter
│  → stereo / effects / master
│
└─ spectral path:
   → spectral input gain
   → 10 bandpass filters
   → 10 band gain nodes
   → spectral mix gain
   → spectral reinsertion point
```

The first safe reinsertion point should be after `postFuzzFilter`, before the existing stereo spread/master path.

That means:

```text
spectral mix gain
→ stereoCenterGain
→ stereoLeftDelay
→ stereoRightDelay
```

This keeps the Spectral Engine audible while avoiding the normal low-pass filter swallowing the high bands again.

## Source mix

Create one explicit source bus:

```text
sourceMixGain
```

Oscillator and Noise should feed this source bus first:

```text
oscillatorGain → sourceMixGain
noiseGain      → sourceMixGain
```

Then split from `sourceMixGain`:

```text
sourceMixGain → toneFilter
sourceMixGain → spectralInputGain
```

This keeps source wiring predictable and avoids needing a global connection hook.

## Required nodes

Add named variables for:

```text
sourceMixGain
spectralInputGain
spectralBandFilters[10]
spectralBandGains[10]
spectralMixGain
```

Do not hide these in a separate interceptor script.

They should be created inside the normal audio setup function where the other core nodes are created.

## Band frequencies

Use fixed bands for the first implementation:

```text
1  = 80 Hz
2  = 160 Hz
3  = 320 Hz
4  = 640 Hz
5  = 1200 Hz
6  = 2200 Hz
7  = 3800 Hz
8  = 6200 Hz
9  = 9000 Hz
10 = 12500 Hz
```

These are not pitch controls. They are fixed spectral regions.

## Band Q

Use moderate Q values first:

```text
1  = 0.9
2  = 1.0
3  = 1.1
4  = 1.15
5  = 1.2
6  = 1.25
7  = 1.3
8  = 1.3
9  = 1.2
10 = 1.1
```

Do not make the first version too resonant. Strong resonance can be added later.

## Fader behaviour

Each Spectral Engine fader controls only the gain of its matching band:

```text
band fader value → spectralBandGains[index].gain
```

The fader should not change oscillator pitch.

The fader should not change the main Cutoff control.

The fader should not change Buttery Fuzz.

## Mute behaviour

Mute must use one source of truth.

Use the existing band state object, or create one explicit spectral state array. Do not let one script own the visual state while another owns the audio state.

Each band needs:

```text
value: 0–100
isMuted: true/false
```

Effective gain should be:

```text
if isMuted:
  gain = 0
else:
  gain = faderAmount * maxBandGain
```

## All-muted behaviour

All muted should silence only the Spectral Engine branch.

It must not silence the normal core path.

Expected result:

```text
core path still works
spectral contribution disappears
```

That is different from the earlier broken test where all-muted was expected to silence all sound. The correct architecture is parallel, so all-muted means no spectral colour, not no synth.

## Main controls protection

These controls must stay on the core path:

- Cutoff
- Resonance
- Buttery Fuzz
- Delay
- Reverb
- Stereo Width
- Output
- Panic Stop

The Spectral Engine must not bypass or disable them.

For the first implementation, Cutoff/Resonance/Fuzz do not need to shape the Spectral Engine branch. They only need to keep working normally on the core path.

## Output level safety

Set conservative first values:

```text
spectralInputGain = 0.35
spectralMixGain = 0.35
maxBandGain = 0.12
```

The Spectral Engine should be audible but not overpower the core synth.

## Implementation order

Do not implement the whole filter-bank at once.

First safe implementation issue should do only this:

1. Create `sourceMixGain`.
2. Route Oscillator and Noise into `sourceMixGain`.
3. Route `sourceMixGain` to the existing `toneFilter`.
4. Confirm core path still works.
5. Do not add spectral filters yet.

Second implementation issue:

1. Add one test spectral band, probably Band 5.
2. Route it in parallel after `sourceMixGain`.
3. Reinstate after `postFuzzFilter` into stereo path.
4. Confirm fader and mute work for one band only.

Third implementation issue:

1. Expand from one band to ten bands.
2. Keep all bands using the same tested gain/mute logic.
3. Confirm bands 1–10 differ clearly.

## First implementation acceptance test

The first coding PR after this plan must pass:

```text
App loads
Start Oscillator works
Start Noise works
Oscillator level is not reduced
Noise level is not reduced
Cutoff works
Resonance works
Buttery Fuzz works
Delay/Reverb/Stereo Width still work
Panic Stop works
Spectral UI remains visible
```

No spectral audio behaviour is required in the first implementation PR if its job is only source-bus preparation.

## Stop rule

If Cutoff, Resonance, Buttery Fuzz, Oscillator level, or Noise level regresses, stop and restore the core path before continuing.

Do not patch around a broken audio graph.

## Recommended next issue

Create:

```text
#124 — Add explicit source mix bus for future Spectral Engine
```

Scope:

- source bus only
- no spectral filters
- no band audio
- no mute/fader audio
- prove core path still works after source routing is made explicit
