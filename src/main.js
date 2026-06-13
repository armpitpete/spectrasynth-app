import "./styles.css";

const MAX_SAFE_MASTER_GAIN = 0.35;
const PANIC_RAMP_SECONDS = 0.02;
const ANALYSER_FFT_SIZE = 1024;
const ANALYSER_SMOOTHING = 0.82;
const ANALYSER_MIN_DECIBELS = -90;
const ANALYSER_MAX_DECIBELS = -35;
const ANALYSER_BAND_COUNT = 10;
const ANALYSER_MAX_FREQUENCY = 10000;
const FUZZ_MIN_INPUT_GAIN = 1.0;
const FUZZ_MAX_INPUT_GAIN = 60.0;
const FUZZ_OUTPUT_TRIM = 0.22;
const FUZZ_CURVE_DRIVE = 8.0;
const STEREO_LEFT_DELAY_SECONDS = 0.004;
const STEREO_RIGHT_DELAY_SECONDS = 0.009;
const STEREO_CENTER_GAIN = 0.62;
const STEREO_SPREAD_GAIN = 0.42;

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
let butteryFuzzInputGain = null;
let butteryFuzz = null;
let butteryFuzzOutputGain = null;
let butteryFuzzDryGain = null;
let butteryFuzzWetGain = null;
let butteryFuzzMixGain = null;
let stereoCenterGain = null;
let stereoLeftDelay = null;
let stereoLeftPanner = null;
let stereoLeftGain = null;
let stereoRightDelay = null;
let stereoRightPanner = null;
let stereoRightGain = null;
let masterGain = null;
let analyser = null;
let analyserData = null;
let analyserAnimationFrame = null;

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
      <div class="version-pill">v0.20 buttery fuzz distortion</div>
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
          <input id="cutoffSlider" type="range" min="120" max="16000" value="2600" />
        </label>
        <label>
          Resonance
          <input id="resonanceSlider" type="range" min="0.4" max="40" step="0.1" value="2" />
        </label>
        <label>
          Buttery Fuzz
          <input id="butteryFuzzSlider" type="range" min="0" max="100" value="70" />
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
        <p>10 live analyser meters. Faders remain visual-only and do not control sound yet.</p>
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
                    <div class="meter-fill" style="height: 0%"></div>
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
      <p id="patchSummaryText">Stable audio core with analyser meters. No sound engine running. Press Start Oscillator or Start Noise to test one quiet source. Output is set to 70%, clamped to a safe maximum. Low-pass cutoff is set to 2600 Hz and can now open up to 16000 Hz. Resonance now reaches 40 for a much stronger audible peak. Buttery Fuzz is set to 70% and now uses high-drive clipping. A stronger left/right stereo-width branch is active after the fuzz mix. Feedback is not connected in v0.20. The spectral meters listen after the master Output control. The spectral faders are visual only. No fake self-oscillation is connected.</p>
    </section>
  </main>
`;

const oscillatorButton = document.querySelector("#oscillatorButton");
const noiseButton = document.querySelector("#noiseButton");
const panicButton = document.querySelector("#panicButton");
const cutoffSlider = document.querySelector("#cutoffSlider");
const resonanceSlider = document.querySelector("#resonanceSlider");
const butteryFuzzSlider = document.querySelector("#butteryFuzzSlider");
const outputSlider = document.querySelector("#outputSlider");
const patchSummaryText = document.querySelector("#patchSummaryText");
const meterFills = document.querySelectorAll(".meter-fill");

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

butteryFuzzSlider.addEventListener("input", () => {
  updateButteryFuzzFromSlider();
  updatePatchSummary();
});

outputSlider.addEventListener("input", () => {
  updateMasterGainFromSlider();
  updatePatchSummary();
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

  if (!analyser) {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = ANALYSER_FFT_SIZE;
    analyser.smoothingTimeConstant = ANALYSER_SMOOTHING;
    analyser.minDecibels = ANALYSER_MIN_DECIBELS;
    analyser.maxDecibels = ANALYSER_MAX_DECIBELS;
    analyserData = new Uint8Array(analyser.frequencyBinCount);
    masterGain.connect(analyser);
    startAnalyserMeters();
  }

  if (!toneFilter) {
    toneFilter = audioContext.createBiquadFilter();
    toneFilter.type = "lowpass";

    butteryFuzzInputGain = audioContext.createGain();
    butteryFuzz = audioContext.createWaveShaper();
    butteryFuzzOutputGain = audioContext.createGain();
    butteryFuzzDryGain = audioContext.createGain();
    butteryFuzzWetGain = audioContext.createGain();
    butteryFuzzMixGain = audioContext.createGain();
    stereoCenterGain = audioContext.createGain();
    stereoLeftDelay = audioContext.createDelay(0.02);
    stereoLeftPanner = audioContext.createStereoPanner();
    stereoLeftGain = audioContext.createGain();
    stereoRightDelay = audioContext.createDelay(0.02);
    stereoRightPanner = audioContext.createStereoPanner();
    stereoRightGain = audioContext.createGain();

    butteryFuzz.curve = createButteryFuzzCurve();
    butteryFuzz.oversample = "2x";
    butteryFuzzOutputGain.gain.setValueAtTime(FUZZ_OUTPUT_TRIM, audioContext.currentTime);
    butteryFuzzMixGain.gain.setValueAtTime(1, audioContext.currentTime);
    stereoCenterGain.gain.setValueAtTime(STEREO_CENTER_GAIN, audioContext.currentTime);
    stereoLeftDelay.delayTime.setValueAtTime(STEREO_LEFT_DELAY_SECONDS, audioContext.currentTime);
    stereoLeftPanner.pan.setValueAtTime(-0.85, audioContext.currentTime);
    stereoLeftGain.gain.setValueAtTime(STEREO_SPREAD_GAIN, audioContext.currentTime);
    stereoRightDelay.delayTime.setValueAtTime(STEREO_RIGHT_DELAY_SECONDS, audioContext.currentTime);
    stereoRightPanner.pan.setValueAtTime(0.85, audioContext.currentTime);
    stereoRightGain.gain.setValueAtTime(STEREO_SPREAD_GAIN, audioContext.currentTime);

    toneFilter.connect(butteryFuzzDryGain);
    toneFilter.connect(butteryFuzzInputGain);
    butteryFuzzInputGain.connect(butteryFuzz);
    butteryFuzz.connect(butteryFuzzOutputGain);
    butteryFuzzOutputGain.connect(butteryFuzzWetGain);
    butteryFuzzDryGain.connect(butteryFuzzMixGain);
    butteryFuzzWetGain.connect(butteryFuzzMixGain);
    butteryFuzzMixGain.connect(stereoCenterGain);
    butteryFuzzMixGain.connect(stereoLeftDelay);
    butteryFuzzMixGain.connect(stereoRightDelay);
    stereoCenterGain.connect(masterGain);
    stereoLeftDelay.connect(stereoLeftPanner);
    stereoLeftPanner.connect(stereoLeftGain);
    stereoLeftGain.connect(masterGain);
    stereoRightDelay.connect(stereoRightPanner);
    stereoRightPanner.connect(stereoRightGain);
    stereoRightGain.connect(masterGain);

    updateToneFilterFromControls();
    updateButteryFuzzFromSlider();
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

function updateButteryFuzzFromSlider() {
  if (!butteryFuzzInputGain || !butteryFuzzDryGain || !butteryFuzzWetGain || !audioContext) {
    return;
  }

  const fuzzAmount = Number(butteryFuzzSlider.value) / 100;
  const fuzzInputGain = FUZZ_MIN_INPUT_GAIN + fuzzAmount * (FUZZ_MAX_INPUT_GAIN - FUZZ_MIN_INPUT_GAIN);
  const dryLevel = Math.max(0, 1 - fuzzAmount * 1.05);
  const wetLevel = fuzzAmount * 1.35;

  butteryFuzzInputGain.gain.setTargetAtTime(fuzzInputGain, audioContext.currentTime, 0.015);
  butteryFuzzDryGain.gain.setTargetAtTime(dryLevel, audioContext.currentTime, 0.015);
  butteryFuzzWetGain.gain.setTargetAtTime(wetLevel, audioContext.currentTime, 0.015);
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

function startAnalyserMeters() {
  if (analyserAnimationFrame) {
    return;
  }

  updateAnalyserMeters();
}

function updateAnalyserMeters() {
  if (!analyser || !analyserData || !audioContext) {
    return;
  }

  analyser.getByteFrequencyData(analyserData);

  meterFills.forEach((meterFill, bandIndex) => {
    meterFill.style.height = `${getAnalyserBandLevel(bandIndex)}%`;
  });

  analyserAnimationFrame = requestAnimationFrame(updateAnalyserMeters);
}

function getAnalyserBandLevel(bandIndex) {
  const nyquistFrequency = audioContext.sampleRate / 2;
  const maxUsefulBin = Math.max(
    ANALYSER_BAND_COUNT,
    Math.min(
      analyserData.length,
      Math.floor((ANALYSER_MAX_FREQUENCY / nyquistFrequency) * analyserData.length)
    )
  );
  const binStart = Math.floor((bandIndex / ANALYSER_BAND_COUNT) * maxUsefulBin);
  const binEnd = Math.max(
    binStart + 1,
    Math.floor(((bandIndex + 1) / ANALYSER_BAND_COUNT) * maxUsefulBin)
  );

  let total = 0;
  let count = 0;

  for (let binIndex = binStart; binIndex < binEnd; binIndex += 1) {
    total += analyserData[binIndex];
    count += 1;
  }

  if (count === 0) {
    return 0;
  }

  return Math.round((total / count / 255) * 100);
}

function createButteryFuzzCurve() {
  const curveLength = 2048;
  const curve = new Float32Array(curveLength);

  for (let index = 0; index < curveLength; index += 1) {
    const x = (index / (curveLength - 1)) * 2 - 1;
    const driven = x * FUZZ_CURVE_DRIVE;
    const hardLimit = Math.max(-1, Math.min(1, driven));
    const saturated = Math.tanh(driven * 1.4);
    const squaredEdge = Math.sign(saturated) * Math.pow(Math.abs(saturated), 0.52);
    const asymmetry = 0.14 * Math.tanh((driven + 0.35) * 0.65);
    curve[index] = Math.max(-1, Math.min(1, hardLimit * 0.38 + squaredEdge * 0.52 + asymmetry));
  }

  return curve;
}

async function startOscillator() {
  const context = await ensureAudioContext();

  wasPanicStopped = false;
  updateMasterGainFromSlider();
  updateButteryFuzzFromSlider();

  oscillator = context.createOscillator();
  oscillatorGain = context.createGain();

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(220, context.currentTime);

  oscillatorGain.gain.setValueAtTime(0, context.currentTime);
  oscillatorGain.gain.linearRampToValueAtTime(0.08, context.currentTime + 0.05);

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
  updateButteryFuzzFromSlider();

  noiseSource = context.createBufferSource();
  noiseGain = context.createGain();

  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  noiseGain.gain.setValueAtTime(0, context.currentTime);
  noiseGain.gain.linearRampToValueAtTime(0.05, context.currentTime + 0.05);

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

function getFuzzSummaryText() {
  const fuzzPercent = Number(butteryFuzzSlider.value);

  if (fuzzPercent <= 0) {
    return "Buttery Fuzz is off.";
  }

  const fuzzAmount = fuzzPercent / 100;
  const fuzzInputGain = FUZZ_MIN_INPUT_GAIN + fuzzAmount * (FUZZ_MAX_INPUT_GAIN - FUZZ_MIN_INPUT_GAIN);

  return `Buttery Fuzz is set to ${fuzzPercent}%, with ${fuzzInputGain.toFixed(2)}x input drive, mostly-wet blend at high settings, an aggressive clipping curve, and true left/right stereo spread after the fuzz mix.`;
}

function updatePatchSummary() {
  const outputPercent = outputSlider.value;
  const cutoffFrequency = cutoffSlider.value;
  const resonanceAmount = resonanceSlider.value;
  const fuzzSummary = getFuzzSummaryText();
  const safetyText = `Output is clamped to a safe maximum gain of ${MAX_SAFE_MASTER_GAIN}.`;
  const spectralText = "The spectral meters are analyser-driven from the real output. The spectral faders are visual only and do not control sound yet.";
  const notYetText = "No feedback loop, vocoder, delay/reverb effects, MIDI, microphone, sensors, 10 real filter bands, filter mode switching, or fake self-oscillation is connected yet.";

  if (wasPanicStopped && !isOscillatorRunning && !isNoiseRunning) {
    patchSummaryText.textContent =
      `Panic Stop used. Oscillator and noise are stopped, and output has been silenced. The analyser meters will fall as the output reaches silence. Press Start Oscillator or Start Noise to resume normal use. ${fuzzSummary} ${safetyText} Low-pass cutoff is set to ${cutoffFrequency} Hz. Resonance is set to ${resonanceAmount}. ${notYetText}`;
    return;
  }

  if (isOscillatorRunning && isNoiseRunning) {
    patchSummaryText.textContent =
      `One quiet sawtooth oscillator and one quiet white noise source are running through one low-pass filter set to ${cutoffFrequency} Hz with resonance set to ${resonanceAmount}, then through the Buttery Fuzz stage and master Output control set to ${outputPercent}%. ${fuzzSummary} ${safetyText} ${spectralText} ${notYetText}`;
    return;
  }

  if (isOscillatorRunning) {
    patchSummaryText.textContent =
      `One quiet sawtooth oscillator is running at A3 through one low-pass filter set to ${cutoffFrequency} Hz with resonance set to ${resonanceAmount}, then through the Buttery Fuzz stage and master Output control set to ${outputPercent}%. ${fuzzSummary} ${safetyText} ${spectralText} ${notYetText}`;
    return;
  }

  if (isNoiseRunning) {
    patchSummaryText.textContent =
      `One quiet white noise source is running through one low-pass filter set to ${cutoffFrequency} Hz with resonance set to ${resonanceAmount}, then through the Buttery Fuzz stage and master Output control set to ${outputPercent}%. ${fuzzSummary} ${safetyText} ${spectralText} ${notYetText}`;
    return;
  }

  patchSummaryText.textContent =
    `Stable audio core with analyser meters. No sound engine running. Press Start Oscillator or Start Noise to test one quiet source. Output is set to ${outputPercent}%. ${fuzzSummary} ${safetyText} Low-pass cutoff is set to ${cutoffFrequency} Hz. Resonance is set to ${resonanceAmount}. ${spectralText} ${notYetText}`;
}
