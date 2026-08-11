import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(
  new URL("../src/music-player.js", import.meta.url),
  "utf8",
);

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.className = "";
    this.dataset = {};
    this.hidden = false;
    this.innerHTML = "";
    this.listeners = new Map();
    this.label = { textContent: "" };
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type, event = { target: this }) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  querySelector(selector) {
    return selector === ".music-toggle__label" ? this.label : null;
  }

  closest(selector) {
    return selector === ".music-toggle" && this.className === "music-toggle"
      ? this
      : null;
  }
}

function createHarness({
  musicPreference = null,
  playbackAllowed = true,
} = {}) {
  const storage = new Map();
  if (musicPreference) storage.set("iron-price-music-enabled", musicPreference);

  class FakeAudio extends FakeElement {
    constructor() {
      super("audio");
      this.paused = true;
    }

    async play() {
      if (!playbackAllowed) throw new Error("Autoplay blocked");
      this.paused = false;
      this.emit("play");
    }

    pause() {
      this.paused = true;
      this.emit("pause");
    }
  }

  const appended = [];
  const documentListeners = new Map();
  const document = {
    hidden: false,
    body: {
      append(...elements) {
        appended.push(...elements);
      },
    },
    createElement(tagName) {
      return tagName === "audio" ? new FakeAudio() : new FakeElement(tagName);
    },
    addEventListener(type, listener) {
      const listeners = documentListeners.get(type) ?? [];
      listeners.push(listener);
      documentListeners.set(type, listeners);
    },
  };

  const context = vm.createContext({
    document,
    Element: FakeElement,
    window: {
      localStorage: {
        getItem(key) {
          return storage.get(key) ?? null;
        },
        setItem(key, value) {
          storage.set(key, value);
        },
      },
    },
  });
  vm.runInContext(source, context);

  return {
    audio: appended.find((element) => element.tagName === "AUDIO"),
    toggle: appended.find((element) => element.tagName === "BUTTON"),
    storage,
    allowPlayback() {
      playbackAllowed = true;
    },
    emitDocument(type, event) {
      for (const listener of documentListeners.get(type) ?? []) listener(event);
    },
  };
}

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const autoplay = createHarness();
await flushPromises();
assert.equal(autoplay.audio.paused, false);
assert.equal(autoplay.toggle.dataset.state, "on");

const blocked = createHarness({ playbackAllowed: false });
await flushPromises();
assert.equal(blocked.audio.paused, true);
assert.equal(blocked.toggle.dataset.state, "start");
blocked.allowPlayback();
blocked.emitDocument("pointerdown", { target: new FakeElement() });
await flushPromises();
assert.equal(blocked.audio.paused, false);
assert.equal(blocked.toggle.dataset.state, "on");

const disabled = createHarness({ musicPreference: "off" });
await flushPromises();
assert.equal(disabled.audio.paused, true);
assert.equal(disabled.toggle.dataset.state, "off");
disabled.toggle.emit("click");
await flushPromises();
assert.equal(disabled.audio.paused, false);
assert.equal(disabled.storage.get("iron-price-music-enabled"), "on");
disabled.toggle.emit("click");
assert.equal(disabled.audio.paused, true);
assert.equal(disabled.storage.get("iron-price-music-enabled"), "off");

console.log(
  "Verified music autoplay, gesture fallback, and persistent toggle.",
);
