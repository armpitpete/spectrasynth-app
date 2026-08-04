# SpectraSynth v0.35 Pitch Arp octave relationship — manual audio test

## Candidate identity

Record the exact tested commit before listening.

## Safety first

- Start with Output below 25%.
- Stop immediately after any painful high-frequency sound, sudden loud jump or stuck source.
- Keep Panic Stop visible throughout the test.

## Setup

1. Start Oscillator.
2. Turn Cutoff Movement On.
3. Turn Cutoff Arp Mode On.
4. Turn Pitch Arp On.
5. Use four obvious notes such as C3, E3, G3 and C4.
6. Set Rest Chance to 0 for the first comparisons.

## Relationship checks

### 0 — same note

- Select **0 — same note**.
- Confirm oscillator pitch follows the shared notes exactly as accepted v0.34.
- Confirm Cutoff / Brightness still follows the original shared note events.

### -2 octaves

- Select **-2 octaves**.
- Confirm the oscillator moves two octaves lower while Cutoff keeps the same movement pattern and timing.
- Confirm there is no second sequence, drift or extra note underneath.
- Select C1 as a shared note and confirm the readout names the **20 Hz floor** when the requested pitch falls below it.

### +2 octaves

- Lower Output before selecting **+2 octaves**.
- Confirm the oscillator moves two octaves higher while Cutoff keeps the same event order and timing.
- Select B9 as a shared note and confirm the readout names the **16000 Hz ceiling** when the requested pitch exceeds it.

### Live offset change

- While notes are running, change -1 → 0 → +1.
- Confirm the currently sounding oscillator target changes immediately.
- Confirm the Cutoff sequence does not restart and the arp counter does not jump to a second sequence.

## Rest and destination checks

- Raise Rest Chance to about 50%.
- Confirm a rest creates neither a new Cutoff target nor a new Pitch target.
- Turn Pitch Arp Off and confirm the oscillator returns to A3 / 220 Hz while Cutoff movement may continue.
- Turn Pitch Arp On again and confirm the next shared event resumes at the selected Pitch Octave.

## Shared-source and safety checks

- Move Band 5 Voice fader and toggle Band 5 Mute.
- Confirm Band 5 remains a colour layer from the same transposed oscillator, not a fixed second note.
- Confirm Output controls all audible routes.
- Press Panic Stop and confirm oscillator, Band 5 contribution and all output silence immediately.

## Result

Report exactly one:

- **ACCEPT**
- **CORRECTIONS REQUIRED**, with the failing control, settings and heard behaviour.
