from pathlib import Path

SOURCE = Path("src/scale-chance-ar-envelope.js")
TEST = Path("tests/pitch-arp-octave-contract.test.mjs")
CHECKLIST = Path("docs/manual-audio-test-checklist-v0.35-pitch-octave.md")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one exact anchor, found {count}")
    return text.replace(old, new, 1)


source = SOURCE.read_text(encoding="utf-8")

source = replace_once(
    source,
    '''  const frequency = clamp(requestedFrequency, PITCH_MIN_FREQUENCY, PITCH_MAX_FREQUENCY);

  return {
    ...musicalTarget,
    octaveOffset,
    requestedFrequency,
    frequency,
    isLimited: Math.abs(frequency - requestedFrequency) > Number.EPSILON,
  };
}''',
    '''  const frequency = clamp(requestedFrequency, PITCH_MIN_FREQUENCY, PITCH_MAX_FREQUENCY);
  const limitReason = requestedFrequency < PITCH_MIN_FREQUENCY
    ? "floor"
    : requestedFrequency > PITCH_MAX_FREQUENCY
      ? "ceiling"
      : null;

  return {
    ...musicalTarget,
    octaveOffset,
    requestedFrequency,
    frequency,
    limitReason,
    isLimited: limitReason !== null,
  };
}

function getPitchLimitText(pitchTarget) {
  if (pitchTarget?.limitReason === "floor") {
    return ` — limited to ${PITCH_MIN_FREQUENCY} Hz floor`;
  }

  if (pitchTarget?.limitReason === "ceiling") {
    return ` — limited to ${PITCH_MAX_FREQUENCY} Hz ceiling`;
  }

  return "";
}''',
    "explicit pitch safety reason",
)

source = replace_once(
    source,
    '''  const pitchTarget = getPitchTargetFromMusicalTarget(latestMusicalTarget);
  const limitText = pitchTarget?.isLimited ? " — safety-limited" : "";

  return `On — ${latestMusicalTarget.noteLabel}, ${getPitchOctaveLabel(pitchTarget?.octaveOffset)} → ${pitchTarget?.frequency.toFixed(2)} Hz${limitText}`;''',
    '''  const pitchTarget = getPitchTargetFromMusicalTarget(latestMusicalTarget);

  return `On — ${latestMusicalTarget.noteLabel}, ${getPitchOctaveLabel(pitchTarget?.octaveOffset)} → ${pitchTarget?.frequency.toFixed(2)} Hz${getPitchLimitText(pitchTarget)}`;''',
    "readout limit description",
)

source = replace_once(
    source,
    '''      ? `on; ${latestMusicalTarget.noteLabel} with ${getPitchOctaveLabel(pitchTarget.octaveOffset)} reaches ${pitchTarget.frequency.toFixed(2)} Hz${pitchTarget.isLimited ? " after the safety limit" : ""}`''',
    '''      ? `on; ${latestMusicalTarget.noteLabel} with ${getPitchOctaveLabel(pitchTarget.octaveOffset)} reaches ${pitchTarget.frequency.toFixed(2)} Hz${getPitchLimitText(pitchTarget)}`''',
    "summary limit description",
)

SOURCE.write_text(source, encoding="utf-8")

test_text = TEST.read_text(encoding="utf-8")
test_text = replace_once(
    test_text,
    '''  assert.match(pitchSource, /frequency = clamp\\(requestedFrequency, PITCH_MIN_FREQUENCY, PITCH_MAX_FREQUENCY\\)/);
  assert.match(pitchSource, /pitchOctaveControl\\?\\.addEventListener\\("input", handlePitchArpControlChange\\)/);
  assert.match(pitchSource, /applyCurrentPitchTarget\\(oscillatorNode\\)/);
  assert.match(pitchSource, /safety-limited/);''',
    '''  assert.match(pitchSource, /frequency = clamp\\(requestedFrequency, PITCH_MIN_FREQUENCY, PITCH_MAX_FREQUENCY\\)/);
  assert.match(pitchSource, /limitReason = requestedFrequency < PITCH_MIN_FREQUENCY/);
  assert.match(pitchSource, /requestedFrequency > PITCH_MAX_FREQUENCY/);
  assert.match(pitchSource, /limited to \\${PITCH_MIN_FREQUENCY} Hz floor/);
  assert.match(pitchSource, /limited to \\${PITCH_MAX_FREQUENCY} Hz ceiling/);
  assert.match(pitchSource, /pitchOctaveControl\\?\\.addEventListener\\("input", handlePitchArpControlChange\\)/);
  assert.match(pitchSource, /applyCurrentPitchTarget\\(oscillatorNode\\)/);''',
    "safety contract assertions",
)

test_text = replace_once(
    test_text,
    '''    "+2 octaves",
    "Rest Chance",''',
    '''    "+2 octaves",
    "20 Hz floor",
    "16000 Hz ceiling",
    "Rest Chance",''',
    "checklist safety phrases",
)
TEST.write_text(test_text.rstrip() + "\n", encoding="utf-8")

checklist = CHECKLIST.read_text(encoding="utf-8")
checklist = replace_once(
    checklist,
    '''### -2 octaves

- Select **-2 octaves**.
- Confirm the oscillator moves two octaves lower while Cutoff keeps the same movement pattern and timing.
- Confirm there is no second sequence, drift or extra note underneath.''',
    '''### -2 octaves

- Select **-2 octaves**.
- Confirm the oscillator moves two octaves lower while Cutoff keeps the same movement pattern and timing.
- Confirm there is no second sequence, drift or extra note underneath.
- Select C1 as a shared note and confirm the readout names the **20 Hz floor** when the requested pitch falls below it.''',
    "floor listening check",
)
checklist = replace_once(
    checklist,
    '''- Lower Output before selecting **+2 octaves**.
- Confirm the oscillator moves two octaves higher while Cutoff keeps the same event order and timing.
- Confirm the readout reports **safety-limited** when a requested target reaches the 16000 Hz ceiling.''',
    '''- Lower Output before selecting **+2 octaves**.
- Confirm the oscillator moves two octaves higher while Cutoff keeps the same event order and timing.
- Select B9 as a shared note and confirm the readout names the **16000 Hz ceiling** when the requested pitch exceeds it.''',
    "ceiling listening check",
)
CHECKLIST.write_text(checklist.rstrip() + "\n", encoding="utf-8")
