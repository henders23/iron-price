(() => {
  "use strict";

  const AUDIO_SOURCE = "./assets/audio/iron-price-theme.mp3";
  const STORAGE_KEY = "iron-price-music-enabled";
  const DEFAULT_VOLUME = 0.32;

  function readPreference() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) !== "off";
    } catch {
      return true;
    }
  }

  function writePreference(enabled) {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
    } catch {
      // Storage can be unavailable for local files or privacy-restricted sessions.
    }
  }

  const audio = document.createElement("audio");
  audio.id = "iron-price-music";
  audio.src = AUDIO_SOURCE;
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = DEFAULT_VOLUME;
  audio.setAttribute("playsinline", "");
  audio.hidden = true;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "music-toggle";
  toggle.innerHTML = `
  <span class="music-toggle__icon" aria-hidden="true">♪</span>
  <span class="music-toggle__label">Music: Off</span>
  <span class="music-toggle__pulse" aria-hidden="true"></span>
`;

  let enabled = readPreference();
  let awaitingGesture = false;

  function updateToggle() {
    const isPlaying = enabled && !audio.paused;
    const state = !enabled ? "off" : isPlaying ? "on" : "start";
    const label =
      state === "off"
        ? "Music: Off"
        : state === "on"
          ? "Music: On"
          : "Start music";

    toggle.dataset.state = state;
    toggle.setAttribute("aria-pressed", String(isPlaying));
    toggle.setAttribute("aria-label", label);
    toggle.title =
      state === "start"
        ? "Your browser paused autoplay. Select to start the music."
        : `${label}. Select to ${isPlaying ? "turn it off" : "turn it on"}.`;
    toggle.querySelector(".music-toggle__label").textContent = label;
  }

  async function startPlayback() {
    if (!enabled || !audio.paused) {
      updateToggle();
      return;
    }

    try {
      await audio.play();
      awaitingGesture = false;
    } catch {
      awaitingGesture = true;
    }

    updateToggle();
  }

  function stopPlayback() {
    audio.pause();
    awaitingGesture = false;
    updateToggle();
  }

  toggle.addEventListener("click", () => {
    if (enabled && !audio.paused) {
      enabled = false;
      writePreference(enabled);
      stopPlayback();
      return;
    }

    enabled = true;
    writePreference(enabled);
    void startPlayback();
  });

  function unlockPlayback(event) {
    if (
      !enabled ||
      !awaitingGesture ||
      (event.target instanceof Element && event.target.closest(".music-toggle"))
    ) {
      return;
    }

    void startPlayback();
  }

  document.addEventListener("pointerdown", unlockPlayback, { capture: true });
  document.addEventListener("keydown", unlockPlayback, { capture: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && enabled) void startPlayback();
  });

  audio.addEventListener("play", updateToggle);
  audio.addEventListener("pause", updateToggle);
  audio.addEventListener("error", () => {
    enabled = false;
    writePreference(enabled);
    updateToggle();
  });

  document.body.append(audio, toggle);
  updateToggle();
  if (enabled) void startPlayback();
})();
