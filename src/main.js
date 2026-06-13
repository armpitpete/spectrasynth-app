import "./styles.css";

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
let oscillator = null;
let oscillatorGain = null;
let isOscillatorRunning = false;

let noiseSource = null;
let noiseGain = null;
let isNoiseRunning = false;

document.querySelector("#app").innerHTML = `
  <main class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">MerrinLab instrument prototype</p>
        <h1>SpectraSynth</h1>
        <p class="subtitle">Visible spectral instrument</p>
      </div>
      <div class="version-pill">v0.5 noise source</div>
    </header>

    <section class="control-grid">
      <section class="panel source-panel">
        <h2>Source</h2>
        <div class="button-row">
          <button id="oscillatorButton">Start Oscillator</button>
          <button id="noiseButton">Start Noise</button>
          <button>Microphone / Audio Input</button>
        </div>
      </section>

      <section class="panel movement-panel">
        <h2>Movement</h2>
        <label>
          Spectral Shift
          <input type="range" min="0" max="100" value="50" />
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
          <input type="range" min="0" max="100" value="70" />
        </label>
      </section>
    </section>

    <section class="panel spectral-panel">
      <div class="section-heading">
        <h2>Spectral Engine</h2>
        <p>10 static placeholder bands. No analyser connected yet.</p>
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
      <p id="patchSummaryText">No sound engine running. Press Start Oscillator or Start Noise to test one quiet source.</p>
    </section>
  </main>
`;

const oscillatorButton = document.querySelector("#oscillatorButton");
const noiseButton = document.querySelector("#noiseButton");
const patchSummaryText = document.querySelector("#patchSummaryText");

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

async function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  return audioContext;
}

async function startOscillator() {
  const context = await ensureAudioContext();

  oscillator = context.createOscillator();
  oscillatorGain = context.createGain();

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(220, context.currentTime);

  oscillatorGain.gain.setValueAtTime(0, context.currentTime);
  oscillatorGain.gain.linearRampToValueAtTime(0.04, context.currentTime + 0.05);

  oscillator.connect(oscillatorGain);
  oscillatorGain.connect(context.destination);

  oscillator.start();

  isOscillatorRunning = true;
  oscillatorButton.textContent = "Stop Oscillator";
  updatePatchSummary();
}

function stopOscillator() {
  if (!oscillator || !oscillatorGain || !audioContext) {
    return;
  }

  const stopTime = audioContext.currentTime + 0.06;

  oscillatorGain.gain.cancelScheduledValues(audioContext.currentTime);
  oscillatorGain.gain.setValueAtTime(oscillatorGain.gain.value, audioContext.currentTime);
  oscillatorGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.05);

  oscillator.stop(stopTime);

  oscillator.onended = () => {
    oscillator.disconnect();
    oscillatorGain.disconnect();

    oscillator = null;
    oscillatorGain = null;
  };

  isOscillatorRunning = false;
  oscillatorButton.textContent = "Start Oscillator";
  updatePatchSummary();
}

async function startNoise() {
  const context = await ensureAudioContext();
  const noiseBuffer = createWhiteNoiseBuffer(context);

  noiseSource = context.createBufferSource();
  noiseGain = context.createGain();

  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  noiseGain.gain.setValueAtTime(0, context.currentTime);
  noiseGain.gain.linearRampToValueAtTime(0.025, context.currentTime + 0.05);

  noiseSource.connect(noiseGain);
  noiseGain.connect(context.destination);

  noiseSource.start();

  isNoiseRunning = true;
  noiseButton.textContent = "Stop Noise";
  updatePatchSummary();
}

function stopNoise() {
  if (!noiseSource || !noiseGain || !audioContext) {
    return;
  }

  const stopTime = audioContext.currentTime + 0.06;

  noiseGain.gain.cancelScheduledValues(audioContext.currentTime);
  noiseGain.gain.setValueAtTime(noiseGain.gain.value, audioContext.currentTime);
  noiseGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.05);

  noiseSource.stop(stopTime);

  noiseSource.onended = () => {
    noiseSource.disconnect();
    noiseGain.disconnect();

    noiseSource = null;
    noiseGain = null;
  };

  isNoiseRunning = false;
  noiseButton.textContent = "Start Noise";
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

function updatePatchSummary() {
  if (isOscillatorRunning && isNoiseRunning) {
    patchSummaryText.textContent =
      "One quiet sawtooth oscillator and one quiet white noise source are running. No analyser, vocoder, effects, MIDI, microphone, filters, or sensors are connected yet.";
    return;
  }

  if (isOscillatorRunning) {
    patchSummaryText.textContent =
      "One quiet sawtooth oscillator is running at A3. No analyser, vocoder, effects, MIDI, microphone, filters, or sensors are connected yet.";
    return;
  }

  if (isNoiseRunning) {
    patchSummaryText.textContent =
      "One quiet white noise source is running. No analyser, vocoder, effects, MIDI, microphone, filters, or sensors are connected yet.";
    return;
  }

  patchSummaryText.textContent =
    "No sound engine running. Press Start Oscillator or Start Noise to test one quiet source.";
}
