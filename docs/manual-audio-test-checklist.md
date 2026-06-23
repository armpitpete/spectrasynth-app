# SpectraSynth manual audio test checklist

Use this checklist before merging any PR that changes the audio path, spectral bands, mute/unmute behaviour, source routing, feedback, or output level.

Automated checks are not enough for this project. Audio behaviour must be heard.

## Safe listening setup

- [ ] Set system volume low before starting.
- [ ] Use speakers/headphones at a safe level.
- [ ] Start with output low in the app.
- [ ] Keep one hand ready for Panic Stop or browser tab close.
- [ ] Do not test feedback changes at high monitoring volume.

## Core synth path

- [ ] Start the oscillator.
- [ ] Confirm the oscillator makes sound.
- [ ] Stop the oscillator.
- [ ] Confirm sound stops.
- [ ] Start noise.
- [ ] Confirm noise makes sound.
- [ ] Stop noise.
- [ ] Confirm sound stops.
- [ ] Start oscillator and noise together.
- [ ] Confirm both are audible without sudden loud jumps.

## Output and safety controls

- [ ] Move Output down.
- [ ] Confirm level gets quieter.
- [ ] Move Output up gradually.
- [ ] Confirm level gets louder without jumping dangerously.
- [ ] Press Panic Stop.
- [ ] Confirm all sound stops.
- [ ] Confirm Feedback resets to 0 if that is current expected behaviour.
- [ ] Confirm normal playback can start again after Panic Stop.

## Filter and feedback checks

- [ ] Move Cutoff / Brightness down.
- [ ] Confirm the sound gets darker.
- [ ] Move Cutoff / Brightness up.
- [ ] Confirm the sound gets brighter.
- [ ] Move Resonance gradually.
- [ ] Confirm filter focus changes without unsafe level jumps.
- [ ] Raise Feedback gently.
- [ ] Confirm Feedback is audible but controlled.
- [ ] Return Feedback to 0.
- [ ] Confirm the sound returns to a stable baseline.

## Spectral band contribution checks

Use this section when a PR changes spectral bands, band source routing, or Band 5 behaviour.

- [ ] Start the known core sound source.
- [ ] Confirm the core sound path is audible before testing bands.
- [ ] Change Band 5 level or contribution.
- [ ] Confirm Band 5 makes an audible difference if the PR says it should.
- [ ] Confirm Band 5 does not bypass output safety.
- [ ] Confirm broad-colour/source-colour audition changes are audible but not overpowering.
- [ ] Confirm turning the band contribution down reduces or removes its effect.
- [ ] Confirm other bands are not accidentally broken by the Band 5 change.

## Mute/unmute regression check

Run this before merging any mute, band, or spectral routing PR.

- [ ] Start a sound source.
- [ ] Confirm the band or source contribution is audible.
- [ ] Mute the relevant band/source.
- [ ] Confirm its contribution is removed.
- [ ] Unmute it.
- [ ] Confirm its contribution returns.
- [ ] Repeat once.
- [ ] Confirm no duplicate, stuck, or missing audio path is created.

## Known-good checkpoint note

Before merging a risky audio PR, write a short note in the PR or issue:

```text
Manual audio test:
- Core synth path audible: yes/no
- Output safety OK: yes/no
- Panic Stop OK: yes/no
- Band contribution changed as expected: yes/no/not applicable
- Mute/unmute regression passed: yes/no/not applicable
- Any loud jump or stuck audio: yes/no
```

## Stop rule

Do not merge if:

- the core synth path stops making sound.
- Panic Stop does not silence output.
- mute/unmute does not restore audio correctly.
- a band change creates a sudden loud jump.
- the PR cannot be described as a known-good checkpoint.
