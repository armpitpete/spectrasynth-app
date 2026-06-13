import "./styles.css";

const MAX_SAFE_MASTER_GAIN = 0.35;
const PANIC_RAMP_SECONDS = 0.02;
const BAND_5_AUDITION_GAIN = 0.18;
const BAND_5_AUDITION_RAMP_SECONDS = 0.035;
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
const BAND_5_INDEX = 4;
const BAND_5_FREQUENCY = 1200;
const BAND_5_Q = 1.2;

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
  isAuditionEnabled: false,
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
let band5Filter = null;
let band5AuditionGain = null;
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
      <div class="version-pill">v0.27 Band 5 audition path</div>
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
        <label>Cutoff / Brightness<input id="cutoffSlider" type="range" min="0" max="100" value="63" /></label>
        <label>Resonance<input id="resonanceSlider" type="range" min="0.4" max="40" step="0.1" value="2" /></label>
        <label>Buttery Fuzz<input id="butteryFuzzSlider" type="range" min="0" max="100" value="70" /></label>
        <label>Virtual Distance<input type="range" min="0" max="100" value="35" /></label>
        <label>Two-Moon Movement<input type="range" min="0" max="100" value="60" /></label>
      </section>

      <section class="panel effects-panel">
        <h2>Effects</h2>
        <label>Delay<input type="range" min="0" max="100" value="20" /></label>
        <label>Reverb<input type="range" min="0" max="100" value="35" /></label>
        <label>Output<input id="outputSlider" type="range" min="0" max="100" value="70" /></label>
      </section>
    </section>

    <section class="panel spectral-panel">
      <div class="section-heading">
        <h2>Spectral Engine</h2>
        <p>Band 5 can be auditioned at low level. Faders and Mute buttons remain visual-only.</p>
      </div>

      <div class="button-row">
        <button id="band5AuditionButton" aria-pressed="false">Band 5 Audition: Off</button>
      </div>

      <div class="band-bank">
        ${bands.map((band, bandIndex) => `
          <article class="band-strip" data-band-index="${bandIndex}">
            <div class="band-top">
              <div class="band-number">${band.number}</div>
              <div class="band-label">${band.label}</div>
            </div>
            <div class="meter-wrap"><div class="meter"><div class="meter-fill" style="height: 0%"></div></div></div>
            <input class="band-fader" data-band-index="${bandIndex}" type="range" min="0" max="100" value="${band.height}" aria-label="${band.label} visual band value" />
            <button class="mute-button" data-band-index="${bandIndex}" aria-pressed="false">Mute</button>
          </article>
        `).join("")}
      </div>
    </section>

    <section class="panel patch-summary">
      <h2>Plain Patch Summary</h2>
      <p id="patchSummaryText">Band 5 Audition is off. The app should sound like v0.26 until audition is switched on.</p>
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
const band5AuditionButton = document.querySelector("#band5AuditionButton");
const patchSummaryText = document.querySelector("#patchSummaryText");
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
cutoffSlider.addEventListener("input", updateToneAndSummary);
resonanceSlider.addEventListener("input", updateToneAndSummary);
butteryFuzzSlider.addEventListener("input", () => {
  updateButteryFuzzFromSlider();
  updatePatchSummary();
});
outputSlider.addEventListener("input", () => {
  updateMasterGainFromSlider();
  updatePatchSummary();
});
band5AuditionButton.addEventListener("click", async () => {
  const band5State = spectralBandState[BAND_5_INDEX];
  band5State.isAuditionEnabled = !band5State.isAuditionEnabled;
  lastTouchedBandIndex = BAND_5_INDEX;
  updateBand5AuditionButtonFromState();

  if (band5State.isAuditionEnabled) {
    await ensureAudioContext();
  }

  updateBand5AuditionGainFromState();
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

function updateToneAndSummary() {
  updateToneFilterFromControls();
  updatePatchSummary();
}

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
    butteryFuzzInputGain = audioContext.createGain();
    butteryFuzz = audioContext.createWaveShaper();
    butteryFuzzOutputGain = audioContext.createGain();
    butteryFuzzDryGain = audioContext.createGain();
    butteryFuzzWetGain = audioContext.createGain();
    butteryFuzzMixGain = audioContext.createGain();
    postFuzzFilter = audioContext.createBiquadFilter();
    band5Filter = audioContext.createBiquadFilter();
    band5AuditionGain = audioContext.createGain();
    stereoCenterGain = audioContext.createGain();
    stereoLeftDelay = audioContext.createDelay(0.02);
    stereoLeftPanner = audioContext.createStereoPanner();
    stereoLeftGain = audioContext.createGain();
    stereoRightDelay = audioContext.createDelay(0.02);
    stereoRightPanner = audioContext.createStereoPanner();
    stereoRightGain = audioContext.createGain();

    toneFilter.type = "lowpass";
    butteryFuzz.curve = createButteryFuzzCurve();
    butteryFuzz.oversample = "2x";
    butteryFuzzOutputGain.gain.setValueAtTime(FUZZ_OUTPUT_TRIM, audioContext.currentTime);
    butteryFuzzMixGain.gain.setValueAtTime(1, audioContext.currentTime);
    postFuzzFilter.type = "lowpass";
    postFuzzFilter.Q.setValueAtTime(POST_FUZZ_FILTER_Q, audioContext.currentTime);
    band5Filter.type = "bandpass";
    band5Filter.frequency.setValueAtTime(BAND_5_FREQUENCY, audioContext.currentTime);
    band5Filter.Q.setValueAtTime(BAND_5_Q, audioContext.currentTime);
    band5AuditionGain.gain.setValueAtTime(0, audioContext.currentTime);
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
    postFuzzFilter.connect(band5Filter);
    band5Filter.connect(band5AuditionGain);
    band5AuditionGain.connect(masterGain);
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
    updateBand5AuditionGainFromState();
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

function updateToneFilterFromControls() {
  if (!toneFilter || !audioContext) return;

  const cutoffFrequency = getCutoffFrequencyFromSlider();
  const resonanceAmount = Number(resonanceSlider.value);

  toneFilter.frequency.setTargetAtTime(cutoffFrequency, audioContext.currentTime, 0.015);
  toneFilter.Q.setTargetAtTime(resonanceAmount, audioContext.currentTime, 0.015);
  postFuzzFilter.frequency.setTargetAtTime(cutoffFrequency, audioContext.currentTime, 0.015);
  postFuzzFilter.Q.setTargetAtTime(POST_FUZZ_FILTER_Q, audioContext.currentTime, 0.015);
}

function updateButteryFuzzFromSlider() {
  if (!butteryFuzzInputGain || !audioContext) return;

  const fuzzAmount = Number(butteryFuzzSlider.value) / 100;
  const fuzzInputGain = FUZZ_MIN_INPUT_GAIN + fuzzAmount * (FUZZ_MAX_INPUT_GAIN - FUZZ_MIN_INPUT_GAIN);
  const dryLevel = Math.max(0.35, 1 - fuzzAmount * 0.6);
  const wetLevel = fuzzAmount * 0.95;

  butteryFuzzInputGain.gain.setTargetAtTime(fuzzInputGain, audioContext.currentTime, 0.015);
  butteryFuzzDryGain.gain.setTargetAtTime(dryLevel, audioContext.currentTime, 0.015);
  butteryFuzzWetGain.gain.setTargetAtTime(wetLevel, audioContext.currentTime, 0.015);
}

function updateBand5AuditionButtonFromState() {
  const band5State = spectralBandState[BAND_5_INDEX];
  band5AuditionButton.textContent = band5State.isAuditionEnabled ? "Band 5 Audition: On" : "Band 5 Audition: Off";
  band5AuditionButton.setAttribute("aria-pressed", String(band5State.isAuditionEnabled));
}

function updateBand5AuditionGainFromState() {
  if (!band5AuditionGain || !audioContext) return;

  const band5State = spectralBandState[BAND_5_INDEX];
  const targetGain = band5State.isAuditionEnabled ? BAND_5_AUDITION_GAIN : 0;

  band5AuditionGain.gain.cancelScheduledValues(audioContext.currentTime);
  band5AuditionGain.gain.setValueAtTime(band5AuditionGain.gain.value, audioContext.currentTime);
  band5AuditionGain.gain.linearRampToValueAtTime(targetGain, audioContext.currentTime + BAND_5_AUDITION_RAMP_SECONDS);
}

function updateMasterGainFromSlider() {
  if (!masterGain || !audioContext) return;

  const sliderValue = Number(outputSlider.value) / 100;
  const safeMasterLevel = Math.min(sliderValue * MAX_SAFE_MASTER_GAIN, MAX_SAFE_MASTER_GAIN);
  masterGain.gain.setTargetAtTime(safeMasterLevel, audioContext.currentTime, 0.015);
}

function silenceMasterOutput() {
  if (!masterGain || !audioContext) return;

  masterGain.gain.cancelScheduledValues(audioContext.currentTime);
  masterGain.gain.setValueAtTime(masterGain.gain.value, audioContext.currentTime);
  masterGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + PANIC_RAMP_SECONDS);
}

function startAnalyserMeters() {
  if (analyserAnimationFrame) return;
  updateAnalyserMeters();
}

function updateAnalyserMeters() {
  if (!analyser || !analyserData || !audioContext) return;

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
    Math.min(analyserData.length, Math.floor((ANALYSER_MAX_FREQUENCY / nyquistFrequency) * analyserData.length))
  );
  const binStart = Math.floor((bandIndex / ANALYSER_BAND_COUNT) * maxUsefulBin);
  const binEnd = Math.max(binStart + 1, Math.floor(((bandIndex + 1) / ANALYSER_BAND_COUNT) * maxUsefulBin));
  let total = 0;
  let count = 0;

  for (let binIndex = binStart; binIndex < binEnd; binIndex += 1) {
    total += analyserData[binIndex];
    count += 1;
  }

  return count === 0 ? 0 : Math.round((total / count / 255) * 100);
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
  updateBand5AuditionGainFromState();

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
  if (!oscillator || !oscillatorGain || !audioContext) return;

  const { immediate = false, updateSummary = true } = options;
  const rampSeconds = immediate ? PANIC_RAMP_SECONDS : 0.05;
  const stopTime = audioContext.currentTime + rampSeconds + 0.01;

  oscillatorGain.gain.cancelScheduledValues(audioContext.currentTime);
  oscillatorGain.gain.setValueAtTime(oscillatorGain.gain.value, audioContext.currentTime);
  oscillatorGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + rampSeconds);

  try {
    oscillator.stop(stopTime);
  } catch {
    // Ignore duplicate stop attempts.
  }

  oscillator.onended = () => {
    oscillator.disconnect();
    oscillatorGain.disconnect();
    oscillator = null;
    oscillatorGain = null;
  };

  isOscillatorRunning = false;
  oscillatorButton.textContent = "Start Oscillator";
  if (updateSummary) updatePatchSummary();
}

async function startNoise() {
  const context = await ensureAudioContext();
  const noiseBuffer = createWhiteNoiseBuffer(context);
  wasPanicStopped = false;
  updateMasterGainFromSlider();
  updateButteryFuzzFromSlider();
  updateBand5AuditionGainFromState();

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
  if (!noiseSource || !noiseGain || !audioContext) return;

  const { immediate = false, updateSummary = true } = options;
  const rampSeconds = immediate ? PANIC_RAMP_SECONDS : 0.05;
  const stopTime = audioContext.currentTime + rampSeconds + 0.01;

  noiseGain.gain.cancelScheduledValues(audioContext.currentTime);
  noiseGain.gain.setValueAtTime(noiseGain.gain.value, audioContext.currentTime);
  noiseGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + rampSeconds);

  try {
    noiseSource.stop(stopTime);
  } catch {
    // Ignore duplicate stop attempts.
  }

  noiseSource.onended = () => {
    noiseSource.disconnect();
    noiseGain.disconnect();
    noiseSource = null;
    noiseGain = null;
  };

  isNoiseRunning = false;
  noiseButton.textContent = "Start Noise";
  if (updateSummary) updatePatchSummary();
}

function panicStop() {
  wasPanicStopped = true;
  silenceMasterOutput();
  stopOscillator({ immediate: true, updateSummary: false });
  stopNoise({ immediate: true, updateSummary: false });
  oscillatorButton.textContent = "Start Oscillator";
  noiseButton.textContent = "Start Noise";
  isOscillatorRunning = false;
  isNoiseRunning = false;
  updatePatchSummary();
}

function createWhiteNoiseBuffer(context) {
  const sampleCount = context.sampleRate;
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

function getFuzzSummaryText() {
  const fuzzPercent = Number(butteryFuzzSlider.value);
  if (fuzzPercent <= 0) return "Buttery Fuzz is off.";

  const fuzzAmount = fuzzPercent / 100;
  const fuzzInputGain = FUZZ_MIN_INPUT_GAIN + fuzzAmount * (FUZZ_MAX_INPUT_GAIN - FUZZ_MIN_INPUT_GAIN);
  return `Buttery Fuzz is set to ${fuzzPercent}%, with ${fuzzInputGain.toFixed(2)}x input drive.`;
}

function getBand5AuditionSummaryText() {
  const bandState = spectralBandState[BAND_5_INDEX];
  return bandState.isAuditionEnabled
    ? `Band 5 Audition is on at low gain ${BAND_5_AUDITION_GAIN}.`
    : "Band 5 Audition is off, so the sound should match v0.26.";
}

function getSpectralBandSummaryText() {
  const mutedBands = spectralBandState.filter((bandState) => bandState.isMuted);
  const mutedSummary = mutedBands.length === 0
    ? "No bands are marked muted."
    : `${mutedBands.length} visual band${mutedBands.length === 1 ? " is" : "s are"} marked muted.`;
  const lastTouchedSummary = lastTouchedBandIndex === null
    ? "No spectral control has been moved yet."
    : `Last touched band: ${spectralBandState[lastTouchedBandIndex].label}.`;

  return `Faders and Mute buttons remain visual-only. ${getBand5AuditionSummaryText()} ${mutedSummary} ${lastTouchedSummary}`;
}

function updatePatchSummary() {
  const outputPercent = outputSlider.value;
  const cutoffFrequency = getRoundedCutoffFrequency();
  const resonanceAmount = resonanceSlider.value;
  const runningText = isOscillatorRunning && isNoiseRunning
    ? "Oscillator and noise are running."
    : isOscillatorRunning
      ? "Oscillator is running."
      : isNoiseRunning
        ? "Noise is running."
        : wasPanicStopped
          ? "Panic Stop used. Output has been silenced."
          : "No sound engine running.";

  patchSummaryText.textContent =
    `${runningText} Output is set to ${outputPercent}%. Cutoff maps to ${cutoffFrequency} Hz. Resonance is set to ${resonanceAmount}. ${getFuzzSummaryText()} ${getSpectralBandSummaryText()} No full filter bank, feedback, vocoder, microphone, MIDI, presets, or sensors are connected yet.`;
}
