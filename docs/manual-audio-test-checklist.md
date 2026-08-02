# SpectraSynth manual audio test checklist

Use this checklist for the Issue #142 candidate that links Pitch Arp to the Cutoff musical event stream.

Automated tests and a successful build are necessary but not sufficient. The instrument must be heard at a safe monitoring level.

## Safe setup

- [ ] Set system volume low.
- [ ] Start with app Output low.
- [ ] Keep Panic Stop and the browser close control immediately available.
- [ ] Do not combine high Noise, Resonance and Buttery Fuzz at high monitoring volume.
- [ ] Stop immediately after a sudden loud jump, stuck sound or painful high-frequency output.

## Exact build

- [ ] Record the exact candidate SHA.
- [ ] Run `npm ci`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Open the production preview in a supported desktop browser.
- [ ] Confirm no audio starts before a deliberate source button press.

## Basic source controls

### Oscillator

- [ ] Press Start Oscillator.
- [ ] Confirm one quiet sawtooth source is heard.
- [ ] Confirm the Oscillator readout changes to On.
- [ ] Press Stop Oscillator.
- [ ] Confirm all oscillator sound stops, including the dry route, Band 5 contribution, delay and reverb tails after their normal decay.
- [ ] Restart the oscillator successfully.

### Noise

- [ ] Start Noise and confirm one controlled white-noise source.
- [ ] Stop Noise and confirm it becomes silent.
- [ ] Run oscillator and noise together at low Output without a sudden jump.

## Shared Cutoff and Pitch event

Set Noise off for this section.

- [ ] Start Oscillator.
- [ ] Set Cutoff Movement on.
- [ ] Set Cutoff Arp Mode on.
- [ ] Set Pitch Arp on.
- [ ] Use a clearly separated note pattern such as C2, E2, G2 and C3.
- [ ] Confirm the audible oscillator changes pitch through those notes.
- [ ] Confirm Cutoff / Brightness changes from the same note sequence.
- [ ] Confirm the Pitch Arp and Cutoff Arp readouts identify the same current note.
- [ ] Change direction to Up and confirm both destinations follow the same order.
- [ ] Change direction to Down and confirm both destinations follow the same order.
- [ ] Confirm no fixed A3 note continues underneath the changing notes.
- [ ] Confirm there is one musical note at a time, not two competing oscillator pitches.
- [ ] Confirm changing Pitch Arp does not start a second timing sequence.

## Rests and independent routing

- [ ] Raise Rest Chance enough to hear rests.
- [ ] Confirm a rest creates no new pitch target.
- [ ] Confirm a rest creates no new Cutoff target.
- [ ] Return Rest Chance to a low value.
- [ ] Turn Pitch Arp off.
- [ ] Confirm the oscillator intentionally returns to the A3 / 220 Hz fallback while Cutoff movement can continue.
- [ ] Turn Pitch Arp on.
- [ ] Confirm the existing oscillator rejoins the current shared note stream without a second oscillator appearing.

## Band 5 relationship

Current authority:

- Band 5 is a parallel colour branch from the same source.
- Band 5 does not generate an independent note.
- Bands 1–4 and 6–10 remain interface-only.

Checks:

- [ ] With Pitch Arp and Cutoff Arp on, confirm the changing oscillator pitch is audible.
- [ ] Move Band 5 down and confirm only its colour contribution reduces.
- [ ] Mute Band 5.
- [ ] Confirm the same changing musical pitch continues through the dry route.
- [ ] Confirm the remaining dry note is not a separate fixed A3 drone.
- [ ] Unmute Band 5 and confirm its colour returns once.
- [ ] Repeat mute/unmute and confirm no duplicate or stuck path appears.
- [ ] Move or mute another band and confirm it changes visible state only.

## Cutoff, Resonance and Buttery Fuzz

- [ ] Lower Cutoff and confirm the sound becomes darker.
- [ ] Raise Cutoff and confirm it becomes brighter.
- [ ] Raise Resonance gradually and confirm focus increases without an uncontrolled jump.
- [ ] Set Buttery Fuzz to 0 and establish the dry baseline.
- [ ] Raise Buttery Fuzz gradually and confirm controlled rounded saturation.
- [ ] Return Buttery Fuzz to 0 and confirm no wet path remains stuck.

## Output and Panic Stop

- [ ] Move Output down and confirm the full instrument becomes quieter.
- [ ] Raise Output gradually and confirm smooth level change.
- [ ] Press Panic Stop while Pitch Arp is running.
- [ ] Confirm the oscillator stops.
- [ ] Confirm noise stops if active.
- [ ] Confirm output reaches silence.
- [ ] Confirm no hidden fixed note remains.
- [ ] Confirm normal playback can restart after Panic Stop.

## Analyser and readouts

- [ ] Confirm analyser meters follow oscillator pitch changes.
- [ ] Confirm the pattern changes with Noise.
- [ ] Confirm meters fall towards silence after all sources stop.
- [ ] Confirm Oscillator, Noise, Output, Cutoff, Resonance, Buttery Fuzz, Cutoff Arp and Pitch Arp readouts track the current state.
- [ ] Confirm readout panels do not themselves alter audio.

## Non-capability check

Confirm the candidate does not falsely claim:

- [ ] polyphony;
- [ ] MIDI input;
- [ ] a full audible ten-band filter bank;
- [ ] microphone input;
- [ ] vocoder behaviour;
- [ ] sensors;
- [ ] recording or export;
- [ ] feedback self-oscillation.

## Acceptance record

```text
Issue #142 manual audio test
- Exact candidate SHA:
- npm test: pass/fail
- Production build: pass/fail
- Oscillator start/stop: pass/fail
- Noise start/stop: pass/fail
- Shared Cutoff and Pitch notes: pass/fail
- Fixed unrelated A3 note underneath: yes/no
- Rests preserved: pass/fail
- Pitch Arp off returns intentional A3 fallback: pass/fail
- Band 5 follows same source pitch: pass/fail
- Band 5 mute restores exactly one path: pass/fail
- Other bands remained interface-only: yes/no
- Output and Panic Stop: pass/fail
- Sudden loud jump or stuck path: yes/no
- Result: ACCEPT / CORRECTIONS REQUIRED
```

## Stop rule

Do not move the candidate towards merge if:

- a fixed unrelated note remains under Pitch Arp;
- a second oscillator or competing sequence is heard;
- Cutoff and Pitch drift onto different note events;
- Stop Oscillator does not stop the oscillator;
- Panic Stop does not stop all active sources;
- Output safety can be bypassed;
- Band 5 mute/unmute creates duplication or a stuck path;
- a rest changes pitch or Cutoff;
- any interface-only band changes audio;
- the exact tested commit is not recorded.

Stop before merge. No deployment or publication is authorised.
