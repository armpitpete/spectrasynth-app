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
let outputGain = null;
let isOscillatorRunning = false;

document.querySelector("#app").innerHTML = `
  <main class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">MerrinLab instrument prototype</p>
        <h1>SpectraSynth</h1>
        <p class="subtitle">Visible spectral instrument</p>
      </div>
      <div class="version-pill">v0.4 oscillator test</div>
    </header>

    <section class="control-grid">
      <section class="panel source-panel">
        <h2>Source</h2>
        <div class="button-row">
          <button id="oscillatorButton">Start Oscillator</button>
          <button>Noise</button>
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
      <p id="patchSummaryText">No sound engine running. Press Start Oscillator to hear one quiet sawtooth test tone.</p>
    </section>
  </main>
`;

const oscillatorButton = document.querySelector("#oscillatorButton");
const patchSummaryText = document.querySelector("#patchSummaryText");

oscillatorButton.addEventListener("click", async () => {
  if (isOscillatorRunning) {
    stopOscillator();
    return;
  }

  await startOscillator();
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
  outputGain = context.createGain();

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(220, context.currentTime);

  outputGain.gain.setValueAtTime(0, context.currentTime);
  outputGain.gain.linearRampToValueAtTime(0.04, context.currentTime + 0.05);

  oscillator.connect(outputGain);
  outputGain.connect(context.destination);

  oscillator.start();

  isOscillatorRunning = true;
  oscillatorButton.textContent = "Stop Oscillator";
  patchSummaryText.textContent =
    "One quiet sawtooth oscillator is running at A3. No analyser, vocoder, effects, MIDI, microphone, or sensors are connected yet.";
}

function stopOscillator() {
  if (!oscillator || !outputGain || !audioContext) {
    return;
  }

  const stopTime = audioContext.currentTime + 0.06;

  outputGain.gain.cancelScheduledValues(audioContext.currentTime);
  outputGain.gain.setValueAtTime(outputGain.gain.value, audioContext.currentTime);
  outputGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.05);

  oscillator.stop(stopTime);

  oscillator.onended = () => {
    oscillator.disconnect();
    outputGain.disconnect();

    oscillator = null;
    outputGain = null;
  };

  isOscillatorRunning = false;
  oscillatorButton.textContent = "Start Oscillator";
  patchSummaryText.textContent =
    "No sound engine running. Press Start Oscillator to hear one quiet sawtooth test tone.";
}
