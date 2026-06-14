import "./styles.css";

const MAX_SAFE_MASTER_GAIN = 0.35;
const PANIC_RAMP_SECONDS = 0.02;
const ANALYSER_FFT_SIZE = 1024;
const ANALYSER_SMOOTHING = 0.82;
const ANALYSER_MIN_DECIBELS = -90;
const ANALYSER_MAX_DECIBELS = -35;
const ANALYSER_BAND_COUNT = 10;
const ANALYSER_MAX_FREQUENCY = 10000;
const CUTOFF_MIN_FREQUENCY = 120;
const CUTOFF_MAX_FREQUENCY = 16000;
const FUZZ_MIN_INPUT_GAIN = 1.0;
const FUZZ_MAX_INPUT_GAIN = 26.0;
const FUZZ_OUTPUT_TRIM = 0.28;
const FUZZ_CURVE_DRIVE = 3.8;
const POST_FUZZ_FILTER_Q = 0.7;
const STEREO_LEFT_DELAY_SECONDS = 0.004;
const STEREO_RIGHT_DELAY_SECONDS = 0.009;
const STEREO_CENTER_GAIN = 0.62;
const STEREO_SPREAD_GAIN = 0.42;
const SILENT_BAND_5_INDEX = 4;
const SILENT_BAND_5_FREQUENCY = 1200;
const SILENT_BAND_5_Q = 1.2;
const EXTREME_NOISE_RESONANCE_START = 30;
const EXTREME_NOISE_RESONANCE_TARGET = 24;
const EXTREME_NOISE_FUZZ_START = 0.85;
const EXTREME_NOISE_FUZZ_TARGET_GAIN = 18.0;

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

const spectralBandState = bands.map((band) => ({
  number: band.number,
  label: band.label,
  faderValue: band.height,
  isMuted: false,
  analyserLevel: 0,
  hasSilentFilterTap: band.number === 5,
}));

let lastTouchedBandIndex = null;
let audioContext = null;
let toneFilter = null;
let butteryFuzzInputGain = null;
let butteryFuzz = null;
let butteryFuzzOutputGain = null;
let butteryFuzzDryGain = null;
let butteryFuzzWetGain = null;
let butteryFuzzMixGain = null;
let postFuzzFilter = null;
let silentBand5Filter = null;
let silentBand5Gain = null;
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
      <div class="version-pill">v0.34 source readout layout</div>
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
          <input id="cutoffSlider" type="range" min="0" max="100" value="63" />
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

    <section class="panel source-readout-panel" aria-label="Visible source level readout">
      <div class="section-heading">
        <h2>Source Readout</h2>
        <p>Display-only test values. This panel does not change audio.</p>
      </div>
      <dl class="source-readout-grid">
        <div><dt>Oscillator</dt><dd id="readoutOscillator">Off</dd></div>
        <div><dt>Noise</dt><dd id="readoutNoise">Off</dd></div>
        <div><dt>Output</dt><dd id="readoutOutput">70%</dd></div>
        <div><dt>Cutoff</dt><dd id="readoutCutoff">2625 Hz</dd></div>
        <div><dt>Resonance</dt><dd id="readoutResonance">2.0</dd></div>
        <div><dt>Buttery Fuzz</dt><dd id="readoutFuzz">70%</dd></div>
        <div><dt>Extreme safety</dt><dd id="readoutSafety">Idle</dd></div>
      </dl>
    </section>

    <section class="panel spectral-panel">
      <div class="section-heading">
        <h2>Spectral Engine</h2>
        <p>Band 5 has a stable silent internal filter tap. Faders and Mute buttons remain visual-only.</p>
      </div>

      <div class="band-bank">
        ${bands
          .map(
            (band, bandIndex) => `
              <article class="band-strip" data-band-index="${bandIndex}">
                <div class="band-top">
                  <div class="band-number">${band.number}</div>
                  <div class="band-label">${band.label}</div>
                </div>

                <div class="meter-wrap">
                  <div class="meter">
                    <div class="meter-fill" style="height: 0%"></div>
                  </div>
                </div>

                <input class="band-fader" data-band-index="${bandIndex}" type="range" min="0" max="100" value="${band.height}" aria-label="${band.label} visual band value" />
                <button class="mute-button" data-band-index="${bandIndex}" aria-pressed="false">Mute</button>
              </article>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="panel patch-summary">
      <h2>Plain Patch Summary</h2>
      <p id="patchSummaryText">Stable source readout layout checkpoint. No sound engine running. Press Start Oscillator or Start Noise to test one quiet source. Output is set to 70%, clamped to a safe maximum. Cutoff / Brightness uses a perceptual response curve from 120 Hz to 16000 Hz. The current mapped cutoff is about 2625 Hz and shapes both before and after the fuzz stage. Resonance reaches 40 for a strong audible peak, but the stable safety shaper gently reduces effective resonance and fuzz drive only when Noise, high Resonance, and high Buttery Fuzz are combined. Band 5 Voice remains a real silent bandpass filter tap at 1200 Hz with Q 1.2, routed only to an internal zero-gain path. Faders and Mute buttons are still visual-only. PR #43 / Band 5 audition is closed. Feedback is not connected. No fake self-oscillation is connected.</p>
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
const readoutOscillator = document.querySelector("#readoutOscillator");
const readoutNoise = document.querySelector("#readoutNoise");
const readoutOutput = document.querySelector("#readoutOutput");
const readoutCutoff = document.querySelector("#readoutCutoff");
const readoutResonance = document.querySelector("#readoutResonance");
const readoutFuzz = document.querySelector("#readoutFuzz");
const readoutSafety = document.querySelector("#readoutSafety");
const meterFills = document.querySelectorAll(".meter-fill");
const bandFaders = document.querySelectorAll(".band-fader");
const muteButtons = document.querySelectorAll(".mute-button");

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
  updateButteryFuzzFromSlider();
  updatePatchSummary();
});

butteryFuzzSlider.addEventListener("input", () => {
  updateButteryFuzzFromSlider();
  updateToneFilterFromControls();
  updatePatchSummary();
});

outputSlider.addEventListener("input", () => {
  updateMasterGainFromSlider();
  updatePatchSummary();
});

bandFaders.forEach((fader) => {
  fader.addEventListener("input", () => {
    const bandIndex = Number(fader.dataset.bandIndex);

    spectralBandState[bandIndex].faderValue = Number(fader.value);
    lastTouchedBandIndex = bandIndex;
    updatePatchSummary();
  });
});

muteButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const bandIndex = Number(button.dataset.bandIndex);
    const bandState = spectralBandState[bandIndex];

    bandState.isMuted = !bandState.isMuted;
    lastTouchedBandIndex = bandIndex;
    updateMuteButtonFromState(button, bandState);
    updatePatchSummary();
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
    postFuzzFilter = audioContext.createBiquadFilter();
    silentBand5Filter = audioContext.createBiquadFilter();
    silentBand5Gain = audioContext.createGain();
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
    postFuzzFilter.type = "lowpass";
    postFuzzFilter.Q.setValueAtTime(POST_FUZZ_FILTER_Q, audioContext.currentTime);
    silentBand5Filter.type = "bandpass";
    silentBand5Filter.frequency.setValueAtTime(SILENT_BAND_5_FREQUENCY, audioContext.currentTime);
    silentBand5Filter.Q.setValueAtTime(SILENT_BAND_5_Q, audioContext.currentTime);
    silentBand5Gain.gain.setValueAtTime(0, audioContext.currentTime);
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
    butteryFuzzMixGain.connect(postFuzzFilter);
    postFuzzFilter.connect(silentBand5Filter);
    silentBand5Filter.connect(silentBand5Gain);
    postFuzzFilter.connect(stereoCenterGain);
    postFuzzFilter.connect(stereoLeftDelay);
    postFuzzFilter.connect(stereoRightDelay);
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

function getCutoffFrequencyFromSlider() {
  const sliderAmount = Number(cutoffSlider.value) / 100;
  return CUTOFF_MIN_FREQUENCY * Math.pow(CUTOFF_MAX_FREQUENCY / CUTOFF_MIN_FREQUENCY, sliderAmount);
}

function getRoundedCutoffFrequency() {
  return Math.round(getCutoffFrequencyFromSlider());
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getExtremeNoiseSafetyAmount(resonanceAmount, fuzzAmount) {
  if (!isNoiseRunning) {
    return 0;
  }

  const resonancePressure = clamp(
    (resonanceAmount - EXTREME_NOISE_RESONANCE_START) / (40 - EXTREME_NOISE_RESONANCE_START),
    0,
    1
  );
  const fuzzPressure = clamp(
    (fuzzAmount - EXTREME_NOISE_FUZZ_START) / (1 - EXTREME_NOISE_FUZZ_START),
    0,
    1
  );

  return resonancePressure * fuzzPressure;
}

function getEffectiveResonanceAmount(resonanceAmount, safetyAmount) {
  const resonanceReduction = Math.max(0, resonanceAmount - EXTREME_NOISE_RESONANCE_TARGET) * safetyAmount;
  return resonanceAmount - resonanceReduction;
}

function getEffectiveFuzzInputGain(fuzzInputGain, safetyAmount) {
  const fuzzDriveReduction = Math.max(0, fuzzInputGain - EXTREME_NOISE_FUZZ_TARGET_GAIN) * safetyAmount;
  return fuzzInputGain - fuzzDriveReduction;
}

function updateToneFilterFromControls() {
  if (!toneFilter || !audioContext) {
    return;
  }

  const cutoffFrequency = getCutoffFrequencyFromSlider();
  const resonanceAmount = Number(resonanceSlider.value);
  const fuzzAmount = Number(butteryFuzzSlider.value) / 100;
  const safetyAmount = getExtremeNoiseSafetyAmount(resonanceAmount, fuzzAmount);
  const effectiveResonanceAmount = getEffectiveResonanceAmount(resonanceAmount, safetyAmount);

  toneFilter.frequency.setTargetAtTime(cutoffFrequency, audioContext.currentTime, 0.015);
  toneFilter.Q.setTargetAtTime(effectiveResonanceAmount, audioContext.currentTime, 0.015);

  if (postFuzzFilter) {
    postFuzzFilter.frequency.setTargetAtTime(cutoffFrequency, audioContext.currentTime, 0.015);
    postFuzzFilter.Q.setTargetAtTime(POST_FUZZ_FILTER_Q, audioContext.currentTime, 0.015);
  }
}

function updateButteryFuzzFromSlider() {
  if (!butteryFuzzInputGain || !butteryFuzzDryGain || !butteryFuzzWetGain || !audioContext) {
    return;
  }

  const resonanceAmount = Number(resonanceSlider.value);
  const fuzzAmount = Number(butteryFuzzSlider.value) / 100;
  const safetyAmount = getExtremeNoiseSafetyAmount(resonanceAmount, fuzzAmount);
  const rawFuzzInputGain = FUZZ_MIN_INPUT_GAIN + fuzzAmount * (FUZZ_MAX_INPUT_GAIN - FUZZ_MIN_INPUT_GAIN);
  const fuzzInputGain = getEffectiveFuzzInputGain(rawFuzzInputGain, safetyAmount);
  const dryLevel = Math.max(0.35, 1 - fuzzAmount * 0.6);
  const wetLevel = fuzzAmount * 0.95;

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
    const analyserBandLevel = getAnalyserBandLevel(bandIndex);

    spectralBandState[bandIndex].analyserLevel = analyserBandLevel;
    meterFill.style.height = `${analyserBandLevel}%`;
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
    const rounded = Math.tanh(driven) / Math.tanh(FUZZ_CURVE_DRIVE);
    const softArc = (2 / Math.PI) * Math.atan(driven * 0.85);
    const warmEven = 0.045 * (Math.tanh((driven + 0.25) * 0.7) - Math.tanh(0.25 * 0.7));
    curve[index] = Math.max(-1, Math.min(1, rounded * 0.72 + softArc * 0.24 + warmEven));
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
  updateToneFilterFromControls();
  updateButteryFuzzFromSlider();
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
  updateToneFilterFromControls();
  updateButteryFuzzFromSlider();

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
  updateToneFilterFromControls();
  updateButteryFuzzFromSlider();

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

function updateMuteButtonFromState(button, bandState) {
  button.textContent = bandState.isMuted ? "Muted" : "Mute";
  button.classList.toggle("is-muted", bandState.isMuted);
  button.setAttribute("aria-pressed", String(bandState.isMuted));
}

function getSafetyAmountFromControls() {
  const resonanceAmount = Number(resonanceSlider.value);
  const fuzzAmount = Number(butteryFuzzSlider.value) / 100;
  return getExtremeNoiseSafetyAmount(resonanceAmount, fuzzAmount);
}

function updateSourceReadout() {
  readoutOscillator.textContent = isOscillatorRunning ? "On" : "Off";
  readoutNoise.textContent = isNoiseRunning ? "On" : "Off";
  readoutOutput.textContent = `${outputSlider.value}%`;
  readoutCutoff.textContent = `${getRoundedCutoffFrequency()} Hz`;
  readoutResonance.textContent = Number(resonanceSlider.value).toFixed(1);
  readoutFuzz.textContent = `${butteryFuzzSlider.value}%`;
  readoutSafety.textContent = getSafetyAmountFromControls() > 0 ? "Active" : "Idle";
}

function getFuzzSummaryText() {
  const fuzzPercent = Number(butteryFuzzSlider.value);

  if (fuzzPercent <= 0) {
    return "Buttery Fuzz is off.";
  }

  const resonanceAmount = Number(resonanceSlider.value);
  const fuzzAmount = fuzzPercent / 100;
  const safetyAmount = getExtremeNoiseSafetyAmount(resonanceAmount, fuzzAmount);
  const rawFuzzInputGain = FUZZ_MIN_INPUT_GAIN + fuzzAmount * (FUZZ_MAX_INPUT_GAIN - FUZZ_MIN_INPUT_GAIN);
  const effectiveFuzzInputGain = getEffectiveFuzzInputGain(rawFuzzInputGain, safetyAmount);
  const safetyText = safetyAmount > 0
    ? ` Extreme noise safety shaping is active, so effective fuzz drive is ${effectiveFuzzInputGain.toFixed(2)}x.`
    : "";

  return `Buttery Fuzz is set to ${fuzzPercent}%, with ${rawFuzzInputGain.toFixed(2)}x input drive before safety shaping, rounded saturation, dry blend kept in the sound, post-fuzz cutoff shaping, and true left/right stereo spread.${safetyText}`;
}

function getExtremeNoiseSafetySummaryText() {
  const resonanceAmount = Number(resonanceSlider.value);
  const fuzzAmount = Number(butteryFuzzSlider.value) / 100;
  const safetyAmount = getExtremeNoiseSafetyAmount(resonanceAmount, fuzzAmount);

  if (safetyAmount <= 0) {
    return "Extreme noise safety shaping is idle.";
  }

  const effectiveResonanceAmount = getEffectiveResonanceAmount(resonanceAmount, safetyAmount);
  const rawFuzzInputGain = FUZZ_MIN_INPUT_GAIN + fuzzAmount * (FUZZ_MAX_INPUT_GAIN - FUZZ_MIN_INPUT_GAIN);
  const effectiveFuzzInputGain = getEffectiveFuzzInputGain(rawFuzzInputGain, safetyAmount);

  return `Extreme noise safety shaping is active because Noise, high Resonance, and high Buttery Fuzz are combined. Effective resonance is ${effectiveResonanceAmount.toFixed(1)} instead of ${resonanceAmount.toFixed(1)}, and effective fuzz drive is ${effectiveFuzzInputGain.toFixed(2)}x instead of ${rawFuzzInputGain.toFixed(2)}x.`;
}

function getSilentBand5TapSummaryText() {
  const bandState = spectralBandState[SILENT_BAND_5_INDEX];

  if (!bandState?.hasSilentFilterTap) {
    return "No silent spectral filter tap is active.";
  }

  return `The tested silent Band 5 tap is frozen. Band 5 ${bandState.label} has a real silent bandpass filter tap at ${SILENT_BAND_5_FREQUENCY} Hz with Q ${SILENT_BAND_5_Q}. It is routed only to an internal zero-gain path and does not affect sound.`;
}

function getSpectralBandSummaryText() {
  const mutedBands = spectralBandState.filter((bandState) => bandState.isMuted);
  const mutedSummary = mutedBands.length === 0
    ? "No bands are marked muted."
    : `${mutedBands.length} visual band${mutedBands.length === 1 ? " is" : "s are"} marked muted: ${mutedBands.map((bandState) => bandState.label).join(", ")}.`;
  const lastTouchedSummary = lastTouchedBandIndex === null
    ? "No spectral fader or Mute button has been moved yet."
    : `Last touched band: ${spectralBandState[lastTouchedBandIndex].label} at ${spectralBandState[lastTouchedBandIndex].faderValue}% visual value, analyser level ${spectralBandState[lastTouchedBandIndex].analyserLevel}%.`;

  return `The 10 spectral bands store fader value, muted state, analyser level, and stable Band 5 silent filter-tap state. Faders and Mute buttons remain visual-only and do not affect sound. ${getSilentBand5TapSummaryText()} ${mutedSummary} ${lastTouchedSummary}`;
}

function updatePatchSummary() {
  updateSourceReadout();

  const outputPercent = outputSlider.value;
  const cutoffFrequency = getRoundedCutoffFrequency();
  const resonanceAmount = resonanceSlider.value;
  const fuzzSummary = getFuzzSummaryText();
  const safetyShapeText = getExtremeNoiseSafetySummaryText();
  const spectralStateText = getSpectralBandSummaryText();
  const checkpointText = "The v0.28 extreme noise fuzz safety fix is frozen, PR #43 / Band 5 audition is closed, and v0.34 fixes only the Source Readout layout.";
  const safetyText = `Output is clamped to a safe maximum gain of ${MAX_SAFE_MASTER_GAIN}.`;
  const cutoffText = `Cutoff / Brightness uses a perceptual slider curve from ${CUTOFF_MIN_FREQUENCY} Hz to ${CUTOFF_MAX_FREQUENCY} Hz and is currently mapped to ${cutoffFrequency} Hz.`;
  const notYetText = "No audible Band 5 filtering, all-10-band filter bank, feedback loop, vocoder, delay/reverb effects, MIDI, microphone, sensors, band-fader audio behaviour, or fake self-oscillation is connected yet.";

  if (wasPanicStopped && !isOscillatorRunning && !isNoiseRunning) {
    patchSummaryText.textContent =
      `Panic Stop used. Oscillator and noise are stopped, and output has been silenced. ${checkpointText} The analyser meters will fall as the output reaches silence. Press Start Oscillator or Start Noise to resume normal use. ${fuzzSummary} ${safetyShapeText} ${safetyText} ${cutoffText} Resonance is set to ${resonanceAmount}. ${spectralStateText} ${notYetText}`;
    return;
  }

  if (isOscillatorRunning && isNoiseRunning) {
    patchSummaryText.textContent =
      `One quiet sawtooth oscillator and one quiet white noise source are running through one pre-fuzz low-pass filter set to ${cutoffFrequency} Hz with resonance set to ${resonanceAmount}, then through the Buttery Fuzz stage, then through a post-fuzz low-pass filter that follows Cutoff, then through the unchanged master Output path set to ${outputPercent}%. ${checkpointText} ${fuzzSummary} ${safetyShapeText} ${safetyText} ${cutoffText} ${spectralStateText} ${notYetText}`;
    return;
  }

  if (isOscillatorRunning) {
    patchSummaryText.textContent =
      `One quiet sawtooth oscillator is running at A3 through one pre-fuzz low-pass filter set to ${cutoffFrequency} Hz with resonance set to ${resonanceAmount}, then through the Buttery Fuzz stage, then through a post-fuzz low-pass filter that follows Cutoff, then through the unchanged master Output path set to ${outputPercent}%. ${checkpointText} ${fuzzSummary} ${safetyShapeText} ${safetyText} ${cutoffText} ${spectralStateText} ${notYetText}`;
    return;
  }

  if (isNoiseRunning) {
    patchSummaryText.textContent =
      `One quiet white noise source is running through one pre-fuzz low-pass filter set to ${cutoffFrequency} Hz with resonance set to ${resonanceAmount}, then through the Buttery Fuzz stage, then through a post-fuzz low-pass filter that follows Cutoff, then through the unchanged master Output path set to ${outputPercent}%. ${checkpointText} ${fuzzSummary} ${safetyShapeText} ${safetyText} ${cutoffText} ${spectralStateText} ${notYetText}`;
    return;
  }

  patchSummaryText.textContent =
    `Stable source readout layout checkpoint. ${checkpointText} No sound engine running. Press Start Oscillator or Start Noise to test one quiet source. Output is set to ${outputPercent}%. ${fuzzSummary} ${safetyShapeText} ${safetyText} ${cutoffText} Resonance is set to ${resonanceAmount}. ${spectralStateText} ${notYetText}`;
}

updatePatchSummary();
