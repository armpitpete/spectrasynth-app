import "./styles.css";

const MAX_SAFE_MASTER_GAIN = 0.35;
const MAX_SAFE_FEEDBACK_GAIN = 0.5;
const FEEDBACK_CURVE_EXPONENT = 0.35;
const FEEDBACK_DELAY_SECONDS = 0.018;
const PANIC_RAMP_SECONDS = 0.02;

const bands = [
  { number: 1, label: "Low", height: 28 },
  { number: 2, label: "Low-Mid", height: 34 },
  { number: 3, label: "Body", height: 40 },
  { number: 4, label: "Warmth", height: 46 },
  { number: 5, label: "Voice", height: 52 },
  { number: 6, label: "Edge", height: 58 },
  { number: 7, label: "Presence", height: 64 },
  { number: 8, label: "Bright", height: 70 },
  { number: 9, label: "Air", height: 76 },
  { number: 10, label: "Hiss", height: 82 },
];

let audioContext = null;
let toneFilter = null;
let feedbackDelay = null;
let feedbackGain = null;
let masterGain = null;

let oscillator = null;
let oscillatorGain = null;
let isOscillatorRunning = false;

let noiseSource = null;
let noiseGain = null;
let isNoiseRunning = false;
let wasPanicStopped = false;

document.querySelector("#app").innerHTML = `
  <main class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">MerrinLab instrument prototype</p>
        <h1>SpectraSynth</h1>
        <p class="subtitle">Visible spectral instrument</p>
      </div>
      <div class="version-pill">v0.12 protected feedback</div>
    </header>

    <section class="control-grid">
      <section class="panel source-panel">
        <h2>Source</h2>
        <div class="button-row">
          <button id="oscillatorButton">Start Oscillator</button>
          <button id="noiseButton">Start Noise</button>
          <button id="panicButton">Panic Stop</button>
          <button>Microphone / Audio Input</button>
        </div>
      </section>

      <section class="panel movement-panel">
        <h2>Movement</h2>
        <label>
          Cutoff / Brightness
          <input id="cutoffSlider" type="range" min="120" max="8000" value="2600" />
        </label>
        <label>
          Resonance
          <input id="resonanceSlider" type="range" min="0.4" max="8" step="0.1" value="0.7" />
        </label>
        <label>
          Feedback
          <input id="feedbackSlider" type="range" min="0" max="100" value="0" />
        </label>
        <label>
          Virtual Distance
          <input type="range" min="0" max="100" value="35" />
        </label>
        <label>
          Two-Moon Movement
          <input type="range" min="0" max="100" value="60" />
        </label>
      </section>

      <section class="panel effects-panel">
        <h2>Effects</h2>
        <label>
          Delay
          <input type="range" min="0" max="100" value="20" />
        </label>
        <label>
          Reverb
          <input type="range" min="0" max="100" value="35" />
        </label>
        <label>
          Output
          <input id="outputSlider" type="range" min="0" max="100" value="70" />
        </label>
      </section>
    </section>

    <section class="panel spectral-panel">
      <div class="section-heading">
        <h2>Spectral Engine</h2>
        <p>10 visual bands. Faders update their matching meters only.</p>
      </div>

      <div class="band-bank">
        ${bands
          .map(
            (band) => `
              <article class="band-strip">
                <div class="band-top">
                  <div class="band-number">${band.number}</div>
                  <div class="band-label">${band.label}</div>
                </div>

                <div class="meter-wrap">
                  <div class="meter">
                    <div class="meter-fill" style="height: ${band.height}%"></div>
                  </div>
                </div>

                <input class="band-fader" type="range" min="0" max="100" value="${band.height}" />
                <button class="mute-button">Mute</button>
              </article>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="panel patch-summary">
      <h2>Plain Patch Summary</h2>
      <p id="patchSummaryText">No sound engine running. Press Start Oscillator or Start Noise to test one quiet source. Output is set to 70%, clamped to a safe maximum. Low-pass cutoff is set to 2600 Hz. Resonance is set to 0.7. Feedback is off.</p>
    </section>
  </main>
`;

const oscillatorButton = document.querySelector("#oscillatorButton");
const noiseButton = document.querySelector("#noiseButton");
const panicButton = document.querySelector("#panicButton");
const cutoffSlider = document.querySelector("#cutoffSlider");
const resonanceSlider = document.querySelector("#resonanceSlider");
const feedbackSlider = document.querySelector("#feedbackSlider");
const outputSlider = document.querySelector("#outputSlider");
const patchSummaryText = document.querySelector("#patchSummaryText");
const bandFaders = document.querySelectorAll(".band-fader");

oscillatorButton.addEventListener("click", async () => {
  if (isOscillatorRunning) {
    stopOscillator();
    return;
  }

  await startOscillator();
});

noiseButton.addEventListener("click", async () => {
  if (isNoiseRunning) {
    stopNoise();
    return;
  }

  await startNoise();
});

panicButton.addEventListener("click", panicStop);

cutoffSlider.addEventListener("input", () => {
  updateToneFilterFromControls();
  updatePatchSummary();
});

resonanceSlider.addEventListener("input", () => {
  updateToneFilterFromControls();
  updatePatchSummary();
});

feedbackSlider.addEventListener("input", () => {
  updateFeedbackFromSlider();
  updatePatchSummary();
});

outputSlider.addEventListener("input", () => {
  updateMasterGainFromSlider();
  updatePatchSummary();
});

bandFaders.forEach((fader) => {
  fader.addEventListener("input", () => {
    updateBandMeterFromFader(fader);
  });
});

async function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  if (!masterGain) {
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    updateMasterGainFromSlider();
  }

  if (!toneFilter) {
    toneFilter = audioContext.createBiquadFilter();
    toneFilter.type = "lowpass";
    toneFilter.connect(masterGain);
    updateToneFilterFromControls();
  }

  if (!feedbackDelay) {
    feedbackDelay = audioContext.createDelay(0.08);
    feedbackGain = audioContext.createGain();

    feedbackDelay.delayTime.setValueAtTime(FEEDBACK_DELAY_SECONDS, audioContext.currentTime);
    feedbackGain.gain.setValueAtTime(0, audioContext.currentTime);

    toneFilter.connect(feedbackDelay);
    feedbackDelay.connect(feedbackGain);
    feedbackGain.connect(toneFilter);
    updateFeedbackFromSlider();
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  return audioContext;
}

function updateToneFilterFromControls() {
  if (!toneFilter || !audioContext) {
    return;
  }

  const cutoffFrequency = Number(cutoffSlider.value);
  const resonanceAmount = Number(resonanceSlider.value);

  toneFilter.frequency.setTargetAtTime(cutoffFrequency, audioContext.currentTime, 0.015);
  toneFilter.Q.setTargetAtTime(resonanceAmount, audioContext.currentTime, 0.015);
}

function updateFeedbackFromSlider() {
  if (!feedbackGain || !audioContext) {
    return;
  }

  const sliderValue = Number(feedbackSlider.value) / 100;
  const shapedFeedbackValue = sliderValue === 0 ? 0 : Math.pow(sliderValue, FEEDBACK_CURVE_EXPONENT);
  const safeFeedbackLevel = Math.min(shapedFeedbackValue * MAX_SAFE_FEEDBACK_GAIN, MAX_SAFE_FEEDBACK_GAIN);

  feedbackGain.gain.setTargetAtTime(safeFeedbackLevel, audioContext.currentTime, 0.02);
}

function updateMasterGainFromSlider() {
  if (!masterGain || !audioContext) {
    return;
  }

  const sliderValue = Number(outputSlider.value) / 100;
  const safeMasterLevel = Math.min(sliderValue * MAX_SAFE_MASTER_GAIN, MAX_SAFE_MASTER_GAIN);

  masterGain.gain.setTargetAtTime(safeMasterLevel, audioContext.currentTime, 0.015);
}

function silenceMasterOutput() {
  if (!masterGain || !audioContext) {
    return;
  }

  masterGain.gain.cancelScheduledValues(audioContext.currentTime);
  masterGain.gain.setValueAtTime(masterGain.gain.value, audioContext.currentTime);
  masterGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + PANIC_RAMP_SECONDS);
}

function silenceFeedback() {
  if (!feedbackGain || !audioContext) {
    return;
  }

  feedbackGain.gain.cancelScheduledValues(audioContext.currentTime);
  feedbackGain.gain.setValueAtTime(feedbackGain.gain.value, audioContext.currentTime);
  feedbackGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + PANIC_RAMP_SECONDS);
}

function updateBandMeterFromFader(fader) {
  const bandStrip = fader.closest(".band-strip");
  const meterFill = bandStrip.querySelector(".meter-fill");

  meterFill.style.height = `${fader.value}%`;
}

async function startOscillator() {
  const context = await ensureAudioContext();

  wasPanicStopped = false;
  updateMasterGainFromSlider();
  updateFeedbackFromSlider();

  oscillator = context.createOscillator();
  oscillatorGain = context.createGain();

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(220, context.currentTime);

  oscillatorGain.gain.setValueAtTime(0, context.currentTime);
  oscillatorGain.gain.linearRampToValueAtTime(0.04, context.currentTime + 0.05);

  oscillator.connect(oscillatorGain);
  oscillatorGain.connect(toneFilter);

  oscillator.start();

  isOscillatorRunning = true;
  oscillatorButton.textContent = "Stop Oscillator";
  updatePatchSummary();
}

function stopOscillator(options = {}) {
  if (!oscillator || !oscillatorGain || !audioContext) {
    return;
  }

  const { immediate = false, updateSummary = true } = options;
  const rampSeconds = immediate ? PANIC_RAMP_SECONDS : 0.05;
  const stopTime = audioContext.currentTime + rampSeconds + 0.01;

  oscillatorGain.gain.cancelScheduledValues(audioContext.currentTime);
  oscillatorGain.gain.setValueAtTime(oscillatorGain.gain.value, audioContext.currentTime);
  oscillatorGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + rampSeconds);

  try {
    oscillator.stop(stopTime);
  } catch {
    // The oscillator may already be stopping. Ignore duplicate stop attempts.
  }

  oscillator.onended = () => {
    oscillator.disconnect();
    oscillatorGain.disconnect();

    oscillator = null;
    oscillatorGain = null;
  };

  isOscillatorRunning = false;
  oscillatorButton.textContent = "Start Oscillator";

  if (updateSummary) {
    updatePatchSummary();
  }
}

async function startNoise() {
  const context = await ensureAudioContext();
  const noiseBuffer = createWhiteNoiseBuffer(context);

  wasPanicStopped = false;
  updateMasterGainFromSlider();
  updateFeedbackFromSlider();

  noiseSource = context.createBufferSource();
  noiseGain = context.createGain();

  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  noiseGain.gain.setValueAtTime(0, context.currentTime);
  noiseGain.gain.linearRampToValueAtTime(0.025, context.currentTime + 0.05);

  noiseSource.connect(noiseGain);
  noiseGain.connect(toneFilter);

  noiseSource.start();

  isNoiseRunning = true;
  noiseButton.textContent = "Stop Noise";
  updatePatchSummary();
}

function stopNoise(options = {}) {
  if (!noiseSource || !noiseGain || !audioContext) {
    return;
  }

  const { immediate = false, updateSummary = true } = options;
  const rampSeconds = immediate ? PANIC_RAMP_SECONDS : 0.05;
  const stopTime = audioContext.currentTime + rampSeconds + 0.01;

  noiseGain.gain.cancelScheduledValues(audioContext.currentTime);
  noiseGain.gain.setValueAtTime(noiseGain.gain.value, audioContext.currentTime);
  noiseGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + rampSeconds);

  try {
    noiseSource.stop(stopTime);
  } catch {
    // The noise source may already be stopping. Ignore duplicate stop attempts.
  }

  noiseSource.onended = () => {
    noiseSource.disconnect();
    noiseGain.disconnect();

    noiseSource = null;
    noiseGain = null;
  };

  isNoiseRunning = false;
  noiseButton.textContent = "Start Noise";

  if (updateSummary) {
    updatePatchSummary();
  }
}

function panicStop() {
  wasPanicStopped = true;
  feedbackSlider.value = "0";

  if (audioContext) {
    silenceFeedback();
  }

  if (audioContext && masterGain) {
    silenceMasterOutput();
  }

  stopOscillator({ immediate: true, updateSummary: false });
  stopNoise({ immediate: true, updateSummary: false });

  oscillatorButton.textContent = "Start Oscillator";
  noiseButton.textContent = "Start Noise";
  isOscillatorRunning = false;
  isNoiseRunning = false;

  updatePatchSummary();
}

function createWhiteNoiseBuffer(context) {
  const durationSeconds = 1;
  const sampleCount = context.sampleRate * durationSeconds;
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const channelData = buffer.getChannelData(0);

  for (let index = 0; index < sampleCount; index += 1) {
    channelData[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

function getFeedbackSummaryText() {
  const feedbackPercent = Number(feedbackSlider.value);

  if (feedbackPercent <= 0) {
    return "Feedback is off.";
  }

  return `Protected feedback is active at ${feedbackPercent}%, shaped for earlier response, capped to ${MAX_SAFE_FEEDBACK_GAIN} gain and routed through a ${FEEDBACK_DELAY_SECONDS}s delay.`;
}

function updatePatchSummary() {
  const outputPercent = outputSlider.value;
  const cutoffFrequency = cutoffSlider.value;
  const resonanceAmount = resonanceSlider.value;
  const feedbackSummary = getFeedbackSummaryText();
  const safetyText = `Output is clamped to a safe maximum gain of ${MAX_SAFE_MASTER_GAIN}.`;

  if (wasPanicStopped && !isOscillatorRunning && !isNoiseRunning) {
    patchSummaryText.textContent =
      `Panic Stop used. Oscillator and noise are stopped, feedback has been reset to 0%, and output has been silenced. Press Start Oscillator or Start Noise to resume normal use. ${safetyText} Low-pass cutoff is set to ${cutoffFrequency} Hz. Resonance is set to ${resonanceAmount}. No fake self-oscillation is connected.`;
    return;
  }

  if (isOscillatorRunning && isNoiseRunning) {
    patchSummaryText.textContent =
      `One quiet sawtooth oscillator and one quiet white noise source are running through one low-pass filter set to ${cutoffFrequency} Hz with resonance set to ${resonanceAmount}, then through the master Output control set to ${outputPercent}%. ${feedbackSummary} ${safetyText} The spectral faders are visual only. No analyser, vocoder, effects, MIDI, microphone, 10 real filter bands, filter mode switching, sensors, or fake self-oscillation is connected yet.`;
    return;
  }

  if (isOscillatorRunning) {
    patchSummaryText.textContent =
      `One quiet sawtooth oscillator is running at A3 through one low-pass filter set to ${cutoffFrequency} Hz with resonance set to ${resonanceAmount}, then through the master Output control set to ${outputPercent}%. ${feedbackSummary} ${safetyText} The spectral faders are visual only. No analyser, vocoder, effects, MIDI, microphone, 10 real filter bands, filter mode switching, sensors, or fake self-oscillation is connected yet.`;
    return;
  }

  if (isNoiseRunning) {
    patchSummaryText.textContent =
      `One quiet white noise source is running through one low-pass filter set to ${cutoffFrequency} Hz with resonance set to ${resonanceAmount}, then through the master Output control set to ${outputPercent}%. ${feedbackSummary} ${safetyText} The spectral faders are visual only. No analyser, vocoder, effects, MIDI, microphone, 10 real filter bands, filter mode switching, sensors, or fake self-oscillation is connected yet.`;
    return;
  }

  patchSummaryText.textContent =
    `No sound engine running. Press Start Oscillator or Start Noise to test one quiet source. Output is set to ${outputPercent}%. ${feedbackSummary} ${safetyText} Low-pass cutoff is set to ${cutoffFrequency} Hz. Resonance is set to ${resonanceAmount}. The spectral faders are visual only. No fake self-oscillation is connected yet.`;
}
