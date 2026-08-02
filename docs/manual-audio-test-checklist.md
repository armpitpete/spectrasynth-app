# SpectraSynth manual audio test checklist

Use this checklist before accepting any change to the audio path, source routing, Cutoff, Resonance, Buttery Fuzz, spectral Band 5, mute behaviour, analyser meters, stereo output, safety shaping, Cutoff Arp wording or Panic Stop.

Automated source and build checks are not enough. Audio behaviour must be heard at a safe monitoring level.

## Safe listening setup

- [ ] Set system volume low before starting.
- [ ] Start with the app Output control low.
- [ ] Keep Panic Stop and the browser tab close control immediately available.
- [ ] Do not test Noise, high Resonance and high Buttery Fuzz at high monitoring volume.
- [ ] Stop immediately if there is a sudden loud jump, stuck sound or painful high-frequency output.

## Build and page start

- [ ] Run `npm test` successfully.
- [ ] Run `npm run build` successfully.
- [ ] Open the current build in a supported desktop browser.
- [ ] Confirm no audio starts before a deliberate button press.
- [ ] Confirm the version display reads `v0.34 source readout layout` unless the tested change intentionally advances it.
- [ ] Confirm the Source Readout begins with Oscillator Off and Noise Off.
- [ ] Confirm the Source Readout states that the oscillator is fixed at A3 / 220 Hz.

## Core source path

- [ ] Start Oscillator.
- [ ] Confirm one quiet sawtooth source is audible.
- [ ] Confirm the Oscillator readout changes to On.
- [ ] Confirm the audible oscillator is one fixed A3 / 220 Hz source before Cutoff movement is enabled.
- [ ] Stop Oscillator and confirm it becomes silent.
- [ ] Start Noise.
- [ ] Confirm one quiet white-noise source is audible.
- [ ] Confirm the Noise readout changes to On.
- [ ] Stop Noise and confirm it becomes silent.
- [ ] Start Oscillator and Noise together.
- [ ] Confirm both remain controlled without a sudden level jump.

## Output and Panic Stop

- [ ] Move Output down and confirm the level becomes quieter.
- [ ] Raise Output gradually and confirm the level rises smoothly.
- [ ] Confirm the visible Output readout follows the control.
- [ ] Press Panic Stop while Oscillator is running.
- [ ] Confirm the oscillator stops and output falls to silence.
- [ ] Repeat with Noise running.
- [ ] Repeat with both sources running.
- [ ] Confirm normal playback can restart after Panic Stop.
- [ ] Confirm no source remains stuck after restart.

## Cutoff and Resonance

- [ ] Start one source.
- [ ] Lower Cutoff / Brightness and confirm the sound becomes darker.
- [ ] Raise Cutoff / Brightness and confirm the sound becomes brighter.
- [ ] Confirm the Cutoff readout changes in hertz.
- [ ] Raise Resonance gradually and confirm filter focus increases.
- [ ] Confirm Resonance changes do not produce an uncontrolled level jump.
- [ ] Return Resonance to a moderate setting and confirm the path remains stable.

## Cutoff Arp clarity

Current authority:

- Scale Chance turns note names into Cutoff / Brightness targets.
- Cutoff Arp orders those cutoff targets.
- Cutoff Arp does not change oscillator pitch.
- The core oscillator remains fixed at A3 / 220 Hz.
- A true Pitch Arp is not implemented in this checkpoint.

Checks:

- [ ] Start Oscillator with Noise off and establish the fixed A3 / 220 Hz source.
- [ ] Confirm the panel heading and controls say `Cutoff Arp`, not a generic pitch-changing Arp.
- [ ] Confirm the panel states that note names select Cutoff / Brightness targets and do not change oscillator pitch.
- [ ] Turn Cutoff Movement on and turn Cutoff Arp Mode on.
- [ ] Confirm the sound becomes rhythmically darker and brighter as cutoff targets change.
- [ ] Confirm the core oscillator pitch remains fixed at A3 / 220 Hz throughout.
- [ ] Confirm the Cutoff Arp readout says that Cutoff moves while oscillator pitch remains fixed.
- [ ] Change Cutoff Arp direction and selected notes; confirm the filter movement changes without implying that the oscillator is playing those pitches.
- [ ] Confirm the Plain Patch Summary says `Cutoff Arp` and states that oscillator pitch remains fixed at A3 / 220 Hz.
- [ ] Turn Cutoff Arp Mode off and confirm no control or status text claims that pitch arpeggiation occurred.

## Buttery Fuzz

- [ ] Set Buttery Fuzz to 0 and establish the dry baseline.
- [ ] Raise it to a low setting and confirm a small rounded saturation change.
- [ ] Raise it to a middle setting and confirm the dry source remains present.
- [ ] Raise it gradually toward a high setting and confirm output remains controlled.
- [ ] Confirm the Buttery Fuzz readout follows the control.
- [ ] Confirm lowering it to 0 returns to the dry baseline without a stuck parallel path.

## Extreme Noise safety shaping

- [ ] Start Noise at low Output.
- [ ] Raise Resonance and Buttery Fuzz gradually toward their high ranges.
- [ ] Confirm the Extreme safety readout changes from Idle to Active when the combined threshold is reached.
- [ ] Confirm effective intensity is restrained rather than jumping louder.
- [ ] Lower either Resonance or Buttery Fuzz and confirm the readout returns to Idle.
- [ ] Use Panic Stop and confirm immediate safe recovery.

## Spectral Engine and Band 5

Current authority:

- Band 5 Voice is the only audible spectral test band.
- Bands 1–4 and 6–10 remain UI-only.

Checks:

- [ ] Start one source and establish the core sound.
- [ ] Move Band 5 down and confirm its parallel 1200 Hz contribution reduces.
- [ ] Move Band 5 up gradually and confirm its contribution returns without bypassing Output safety.
- [ ] Mute Band 5 and confirm its audible contribution is removed.
- [ ] Unmute Band 5 and confirm its contribution returns once, without duplication.
- [ ] Repeat mute/unmute once and confirm no stuck or multiplied path appears.
- [ ] Move or mute another band and confirm it changes only visible state, not audio.
- [ ] Confirm the patch summary still states that only Band 5 affects sound.

## Analyser and source readout

- [ ] Start Oscillator and confirm analyser meters respond.
- [ ] Start Noise and confirm the meter pattern changes.
- [ ] Stop all sources and confirm meters fall toward silence.
- [ ] Confirm Oscillator, Noise, Output, Cutoff, Resonance, Buttery Fuzz, Extreme safety and Cutoff Arp readouts follow the current state.
- [ ] Confirm the Source Readout panel itself does not change audio.

## Current non-capabilities

Confirm the tested build does not falsely claim these are active:

- [ ] full ten-band filter-bank audio;
- [ ] feedback loop;
- [ ] vocoder;
- [ ] microphone input;
- [ ] sensors;
- [ ] all-band fader audio behaviour;
- [ ] fake self-oscillation;
- [ ] oscillator pitch arpeggiation or Pitch Arp.

Controls or modules displayed for future work must remain clearly distinguishable from accepted audio behaviour.

## Acceptance note

Record this in the PR or issue:

```text
Manual audio test
- Contract tests passed: yes/no
- Build passed: yes/no
- Oscillator path: pass/fail
- Noise path: pass/fail
- Output and Panic Stop: pass/fail
- Cutoff and Resonance: pass/fail
- Cutoff Arp clarity and fixed A3 / 220 Hz pitch: pass/fail
- Buttery Fuzz: pass/fail
- Extreme Noise safety shaping: pass/fail/not applicable
- Band 5 fader and mute: pass/fail/not applicable
- Other bands remained UI-only: yes/no
- Analyser and readouts: pass/fail
- Sudden loud jump or stuck path: yes/no
- Accepted checkpoint and commit: <version / SHA>
```

## Stop rule

Do not merge an audio-path or interface-authority change if:

- the core source path stops making sound;
- Panic Stop does not silence all active sources;
- Output safety can be bypassed;
- Band 5 mute/unmute does not restore exactly one path;
- an UI-only band unexpectedly changes audio;
- Extreme Noise safety shaping fails under the combined high-risk state;
- Cutoff Arp wording implies oscillator pitch movement;
- the oscillator changes pitch in the Issue #141 clarity repair;
- a sudden loud jump or stuck source occurs;
- the exact tested commit is not recorded.
