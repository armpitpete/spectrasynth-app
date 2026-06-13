import "./styles.css";

const bands = Array.from({ length: 10 }, (_, index) => index + 1);

document.querySelector("#app").innerHTML = `
  <main class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">MerrinLab instrument prototype</p>
        <h1>SpectraSynth</h1>
        <p class="subtitle">Visible spectral instrument</p>
      </div>
      <div class="version-pill">v0.1 shell</div>
    </header>

    <section class="control-grid">
      <section class="panel source-panel">
        <h2>Source</h2>
        <div class="button-row">
          <button>Oscillator</button>
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
        <p>10 static placeholder bands. No audio engine connected yet.</p>
      </div>

      <div class="band-bank">
        ${bands
          .map(
            (band) => `
              <article class="band-strip">
                <div class="band-number">${band}</div>
                <div class="meter">
                  <div class="meter-fill" style="height: ${20 + band * 5}%"></div>
                </div>
                <input class="band-fader" type="range" min="0" max="100" value="55" />
                <button class="mute-button">Mute</button>
              </article>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="panel patch-summary">
      <h2>Plain Patch Summary</h2>
      <p>No sound engine connected yet. This shell shows the planned SpectraSynth layout.</p>
    </section>
  </main>
`;