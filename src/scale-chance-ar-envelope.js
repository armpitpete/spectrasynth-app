const MINIMUM_RAMP_MS = 5;
const OSCILLATOR_BASE_GAIN = 0.08;
const NOISE_BASE_GAIN = 0.05;
const DEFAULT_OSCILLATOR_FREQUENCY = 220;
const PITCH_TRANSITION_SECONDS = 0.012;
const PITCH_MIN_FREQUENCY = 20;
const PITCH_MAX_FREQUENCY = 16000;
const MIN_PITCH_OCTAVE_OFFSET = -2;
const MAX_PITCH_OCTAVE_OFFSET = 2;

const NOTE_TO_SEMITONE = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

const trackedSourceGains = new Set();
const sourceGainTargets = new WeakMap();
const trackedOscillators = new Set();

let releaseTimer = null;
let isConnectPatched = false;
let latestMusicalTarget = null;
let isUpdatingAuthorityWording = false;

function getControl(id) {
  return document.querySelector(`#${id}`);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function isArEnvelopeOn() {
  return getControl("scaleChanceArEnvelopeEnabled")?.value === "on";
}

function isPitchArpOn() {
  return getControl("scaleChancePitchArpEnabled")?.value !== "off";
}

function getPitchOctaveOffset() {
  return clamp(
    Math.round(Number(getControl("scaleChancePitchOctave")?.value ?? 0)),
    MIN_PITCH_OCTAVE_OFFSET,
    MAX_PITCH_OCTAVE_OFFSET
  );
}

function getPitchOctaveLabel(octaveOffset = getPitchOctaveOffset()) {
  if (octaveOffset === 0) {
    return "0 — same note";
  }

  const signedOffset = octaveOffset > 0 ? `+${octaveOffset}` : String(octaveOffset);
  const unit = Math.abs(octaveOffset) === 1 ? "octave" : "octaves";
  return `${signedOffset} ${unit}`;
}

function getPitchTargetFromMusicalTarget(musicalTarget) {
  if (!musicalTarget) {
    return null;
  }

  const octaveOffset = getPitchOctaveOffset();
  const requestedFrequency = musicalTarget.frequency * Math.pow(2, octaveOffset);
  const frequency = clamp(requestedFrequency, PITCH_MIN_FREQUENCY, PITCH_MAX_FREQUENCY);
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
}

function getAttackMs() {
  return clamp(Number(getControl("scaleChanceArAttack")?.value ?? 25), 5, 1000);
}

function getReleaseMs() {
  return clamp(Number(getControl("scaleChanceArRelease")?.value ?? 180), 5, 2000);
}

function isOscillatorNode(node) {
  return typeof OscillatorNode !== "undefined" && node instanceof OscillatorNode;
}

function isBufferSourceNode(node) {
  return typeof AudioBufferSourceNode !== "undefined" && node instanceof AudioBufferSourceNode;
}

function isGainNode(node) {
  return typeof GainNode !== "undefined" && node instanceof GainNode;
}

function getBaseGainForSourceNode(sourceNode) {
  if (isOscillatorNode(sourceNode)) {
    return OSCILLATOR_BASE_GAIN;
  }

  if (isBufferSourceNode(sourceNode)) {
    return NOISE_BASE_GAIN;
  }

  return null;
}

function parseNoteLabel(noteLabel) {
  const match = /^(C#|D#|F#|G#|A#|C|D|E|F|G|A|B)(\d)$/.exec(noteLabel);

  if (!match) {
    return null;
  }

  const [, noteName, octaveText] = match;
  const midiNote = (Number(octaveText) + 1) * 12 + NOTE_TO_SEMITONE[noteName];
  const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);

  return {
    noteLabel,
    midiNote,
    frequency,
  };
}

function getMusicalTargetFromEvent(event) {
  const targetText = String(event.detail?.target ?? "");
  const noteLabel = targetText.split(" maps to ")[0]?.trim();

  if (!noteLabel || noteLabel === "rest") {
    return null;
  }

  const parsedTarget = parseNoteLabel(noteLabel);

  if (!parsedTarget) {
    return null;
  }

  return {
    ...parsedTarget,
    cutoffValue: Number(event.detail?.cutoffValue),
    noteLengthMs: Math.max(20, Number(event.detail?.noteLengthMs ?? 250)),
  };
}

function setOscillatorFrequency(oscillatorNode, frequency, immediate = false) {
  if (!oscillatorNode?.frequency || !Number.isFinite(frequency) || frequency <= 0) {
    return;
  }

  const now = oscillatorNode.context.currentTime;
  oscillatorNode.frequency.cancelScheduledValues(now);

  if (immediate) {
    oscillatorNode.frequency.setValueAtTime(frequency, now);
    return;
  }

  oscillatorNode.frequency.setTargetAtTime(frequency, now, PITCH_TRANSITION_SECONDS);
}

function applyCurrentPitchTarget(oscillatorNode, immediate = false) {
  const pitchTarget = isPitchArpOn()
    ? getPitchTargetFromMusicalTarget(latestMusicalTarget)
    : null;
  const targetFrequency = pitchTarget?.frequency ?? DEFAULT_OSCILLATOR_FREQUENCY;

  setOscillatorFrequency(oscillatorNode, targetFrequency, immediate);
}

function rememberOscillator(sourceNode) {
  if (!isOscillatorNode(sourceNode) || trackedOscillators.has(sourceNode)) {
    return;
  }

  trackedOscillators.add(sourceNode);
  applyCurrentPitchTarget(sourceNode, true);

  sourceNode.addEventListener("ended", () => {
    trackedOscillators.delete(sourceNode);
  }, { once: true });
}

function rememberSourceGain(sourceNode, destinationNode) {
  rememberOscillator(sourceNode);

  if (!isGainNode(destinationNode)) {
    return;
  }

  const baseGain = getBaseGainForSourceNode(sourceNode);

  if (baseGain === null) {
    return;
  }

  trackedSourceGains.add(destinationNode);
  sourceGainTargets.set(destinationNode, baseGain);

  if (isArEnvelopeOn()) {
    setGainImmediately(destinationNode, 0);
  }
}

function patchAudioConnect() {
  if (isConnectPatched || typeof AudioNode === "undefined") {
    return;
  }

  const originalConnect = AudioNode.prototype.connect;

  AudioNode.prototype.connect = function patchedConnect(destinationNode, ...args) {
    const result = originalConnect.call(this, destinationNode, ...args);
    rememberSourceGain(this, destinationNode);
    return result;
  };

  isConnectPatched = true;
}

function cancelReleaseTimer() {
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
}

function getSafeAudioParamValue(audioParam, fallbackValue) {
  const currentValue = Number(audioParam.value);
  return Number.isFinite(currentValue) ? currentValue : fallbackValue;
}

function setGainImmediately(gainNode, targetValue) {
  const now = gainNode.context.currentTime;

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(targetValue, now);
}

function rampGainTo(gainNode, targetValue, durationMs) {
  const now = gainNode.context.currentTime;
  const safeDurationSeconds = Math.max(MINIMUM_RAMP_MS, durationMs) / 1000;
  const currentValue = getSafeAudioParamValue(gainNode.gain, targetValue);

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(currentValue, now);
  gainNode.gain.linearRampToValueAtTime(targetValue, now + safeDurationSeconds);
}

function triggerSourceAttack(attackMs) {
  trackedSourceGains.forEach((gainNode) => {
    const targetGain = sourceGainTargets.get(gainNode) ?? 0;

    setGainImmediately(gainNode, 0);
    rampGainTo(gainNode, targetGain, attackMs);
  });
}

function triggerSourceRelease(releaseMs) {
  trackedSourceGains.forEach((gainNode) => {
    rampGainTo(gainNode, 0, releaseMs);
  });
}

function restoreSourceGains() {
  cancelReleaseTimer();

  trackedSourceGains.forEach((gainNode) => {
    const targetGain = sourceGainTargets.get(gainNode) ?? 0;
    rampGainTo(gainNode, targetGain, 30);
  });
}

function silenceSourceGains() {
  cancelReleaseTimer();

  trackedSourceGains.forEach((gainNode) => {
    rampGainTo(gainNode, 0, MINIMUM_RAMP_MS);
  });
}

function triggerArEnvelope(event) {
  if (!isArEnvelopeOn()) {
    return;
  }

  const noteLengthMs = Math.max(20, Number(event.detail?.noteLengthMs ?? 250));
  const attackMs = getAttackMs();
  const releaseMs = getReleaseMs();

  cancelReleaseTimer();
  triggerSourceAttack(attackMs);

  releaseTimer = setTimeout(() => {
    triggerSourceRelease(releaseMs);
  }, Math.max(MINIMUM_RAMP_MS, noteLengthMs));
}

function triggerPitchArp(event) {
  const musicalTarget = getMusicalTargetFromEvent(event);

  if (!musicalTarget) {
    return;
  }

  latestMusicalTarget = musicalTarget;
  const pitchTarget = getPitchTargetFromMusicalTarget(musicalTarget);

  if (isPitchArpOn() && pitchTarget) {
    trackedOscillators.forEach((oscillatorNode) => {
      setOscillatorFrequency(oscillatorNode, pitchTarget.frequency);
    });
  }

  updatePitchArpAuthority();
}

function ensurePitchArpControl() {
  const cutoffArpControl = getControl("scaleChanceArpMode");
  const cutoffArpLabel = cutoffArpControl?.closest("label");

  if (!cutoffArpLabel || getControl("scaleChancePitchArpEnabled")) {
    return;
  }

  const pitchArpLabel = document.createElement("label");
  pitchArpLabel.innerHTML = `
    Pitch Arp
    <select id="scaleChancePitchArpEnabled">
      <option value="on" selected>On — follow shared notes</option>
      <option value="off">Off — use A3 fallback</option>
    </select>
  `;

  const pitchOctaveLabel = document.createElement("label");
  pitchOctaveLabel.innerHTML = `
    Pitch Octave
    <select id="scaleChancePitchOctave">
      <option value="-2">-2 octaves</option>
      <option value="-1">-1 octave</option>
      <option value="0" selected>0 — same note</option>
      <option value="1">+1 octave</option>
      <option value="2">+2 octaves</option>
    </select>
  `;

  const pitchArpNote = document.createElement("p");
  pitchArpNote.className = "panel-note pitch-arp-note";
  pitchArpNote.textContent =
    "Pitch Arp retunes the existing oscillator from the same note event that drives Cutoff. Pitch Octave changes only that oscillator destination; it creates no second oscillator or sequencer.";

  cutoffArpLabel.insertAdjacentElement("afterend", pitchArpLabel);
  pitchArpLabel.insertAdjacentElement("afterend", pitchOctaveLabel);
  pitchOctaveLabel.insertAdjacentElement("afterend", pitchArpNote);
}

function ensurePitchArpReadout() {
  const sourceReadoutGrid = document.querySelector(".source-readout-grid");

  if (!sourceReadoutGrid || getControl("readoutPitchArp")) {
    return;
  }

  const readoutRow = document.createElement("div");
  readoutRow.innerHTML = `<dt>Pitch Arp</dt><dd id="readoutPitchArp">On — waiting for first shared note</dd>`;
  sourceReadoutGrid.appendChild(readoutRow);
}

function getPitchArpReadoutText() {
  if (!isPitchArpOn()) {
    return "Off — oscillator uses A3 / 220 Hz fallback";
  }

  if (!latestMusicalTarget) {
    return `On — ${getPitchOctaveLabel()} — waiting for first shared note`;
  }

  const pitchTarget = getPitchTargetFromMusicalTarget(latestMusicalTarget);

  return `On — ${latestMusicalTarget.noteLabel}, ${getPitchOctaveLabel(pitchTarget?.octaveOffset)} → ${pitchTarget?.frequency.toFixed(2)} Hz${getPitchLimitText(pitchTarget)}`;
}

function getCutoffArpReadoutText() {
  const cutoffMovementOn = getControl("scaleChanceEnabled")?.value === "on";
  const cutoffArpOn = getControl("scaleChanceArpMode")?.value === "on";

  if (!cutoffMovementOn) {
    return "Off — manual Cutoff remains available";
  }

  if (!latestMusicalTarget) {
    return cutoffArpOn
      ? "On — waiting for first shared note"
      : "Chance movement on — waiting for first shared note";
  }

  const modeText = cutoffArpOn ? "Cutoff Arp" : "Cutoff chance";
  return `${modeText} — ${latestMusicalTarget.noteLabel} maps to Cutoff ${latestMusicalTarget.cutoffValue.toFixed(1)}`;
}

function updatePanelAuthorityWording() {
  const panelNote = document.querySelector("#scaleChancePanel > .panel-note");

  if (panelNote) {
    panelNote.textContent =
      "One musical event stream drives Cutoff / Brightness and, when Pitch Arp is On, the existing oscillator. No second sequencer or oscillator is created.";
  }

  const pitchArpNote = document.querySelector("#scaleChancePanel .pitch-arp-note");
  if (pitchArpNote) {
    pitchArpNote.textContent =
      "Pitch Arp uses the same event identity, order, timing and rests as Cutoff movement. Pitch Octave transposes only the oscillator destination. Band 5 and the dry route still follow one oscillator pitch.";
  }
}

function updateReadouts() {
  const cutoffReadout = getControl("readoutCutoffArp");
  const pitchReadout = getControl("readoutPitchArp");

  if (cutoffReadout) {
    cutoffReadout.textContent = getCutoffArpReadoutText();
  }

  if (pitchReadout) {
    pitchReadout.textContent = getPitchArpReadoutText();
  }
}

function updatePatchSummaryAuthority() {
  const patchSummaryText = getControl("patchSummaryText");

  if (!patchSummaryText || isUpdatingAuthorityWording) {
    return;
  }

  const pitchTarget = getPitchTargetFromMusicalTarget(latestMusicalTarget);
  const pitchState = isPitchArpOn()
    ? pitchTarget
      ? `on; ${latestMusicalTarget.noteLabel} with ${getPitchOctaveLabel(pitchTarget.octaveOffset)} reaches ${pitchTarget.frequency.toFixed(2)} Hz${getPitchLimitText(pitchTarget)}`
      : `on with ${getPitchOctaveLabel()} and waiting for the first shared note event`
    : "off; the oscillator uses its A3 / 220 Hz fallback";

  const correctedText = patchSummaryText.textContent
    .replace(/ Pitch Arp authority:.*$/, "")
    .replaceAll(
      "These note names select Cutoff / Brightness targets; they do not change oscillator pitch.",
      "These note names drive Cutoff / Brightness and the existing oscillator when Pitch Arp is on."
    )
    .replaceAll(
      "Oscillator pitch remains fixed at A3 / 220 Hz.",
      "Pitch Arp can retune the existing oscillator from the same shared note event."
    )
    .replaceAll(
      "It does not change oscillator pitch; the oscillator remains fixed at A3 / 220 Hz.",
      "Pitch Arp can route the same musical event to the existing oscillator."
    );

  const nextText =
    `${correctedText} Pitch Arp authority: ${pitchState}; no second oscillator or sequencer is created.`.trim();

  if (nextText === patchSummaryText.textContent) {
    return;
  }

  isUpdatingAuthorityWording = true;
  patchSummaryText.textContent = nextText;
  isUpdatingAuthorityWording = false;
}

function updatePitchArpAuthority() {
  updatePanelAuthorityWording();
  updateReadouts();
  updatePatchSummaryAuthority();
}

function handlePitchArpControlChange() {
  trackedOscillators.forEach((oscillatorNode) => {
    applyCurrentPitchTarget(oscillatorNode);
  });

  updatePitchArpAuthority();
}

function observeAuthorityWording() {
  const patchSummaryText = getControl("patchSummaryText");

  if (!patchSummaryText) {
    return;
  }

  const observer = new MutationObserver(() => {
    if (!isUpdatingAuthorityWording) {
      updatePitchArpAuthority();
    }
  });

  observer.observe(patchSummaryText, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

function initialiseScaleChanceArEnvelope() {
  const arEnvelopeControl = getControl("scaleChanceArEnvelopeEnabled");
  const panicButton = getControl("panicButton");

  if (!arEnvelopeControl) {
    return;
  }

  patchAudioConnect();
  ensurePitchArpControl();
  ensurePitchArpReadout();

  arEnvelopeControl.addEventListener("change", () => {
    if (isArEnvelopeOn()) {
      silenceSourceGains();
      return;
    }

    restoreSourceGains();
  });

  const pitchArpControl = getControl("scaleChancePitchArpEnabled");
  const pitchOctaveControl = getControl("scaleChancePitchOctave");
  pitchArpControl?.addEventListener("input", handlePitchArpControlChange);
  pitchArpControl?.addEventListener("change", handlePitchArpControlChange);
  pitchOctaveControl?.addEventListener("input", handlePitchArpControlChange);
  pitchOctaveControl?.addEventListener("change", handlePitchArpControlChange);

  document.querySelectorAll("#scaleChancePanel select, #scaleChancePanel input").forEach((control) => {
    control.addEventListener("input", () => requestAnimationFrame(updatePitchArpAuthority));
    control.addEventListener("change", () => requestAnimationFrame(updatePitchArpAuthority));
  });

  if (panicButton) {
    panicButton.addEventListener("click", silenceSourceGains);
  }

  document.addEventListener("spectraSynthScaleChanceNote", triggerArEnvelope);
  document.addEventListener("spectraSynthScaleChanceNote", triggerPitchArp);

  observeAuthorityWording();
  updatePitchArpAuthority();
}

initialiseScaleChanceArEnvelope();
