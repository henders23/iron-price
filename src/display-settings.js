import { localStore } from "./local-storage.js";

export const DISPLAY_SETTINGS_KEY = "iron-price-display-v1";
export function displayDefaults() {
  return { reducedMotion: !1, highContrast: !1, largeText: !1 };
}
export function readDisplaySettings() {
  try {
    const s = JSON.parse(localStore()?.getItem(DISPLAY_SETTINGS_KEY) ?? "null");
    return s && typeof s == "object"
      ? { ...displayDefaults(), ...s }
      : displayDefaults();
  } catch {
    return displayDefaults();
  }
}
export function writeDisplaySettings(s) {
  localStore()?.setItem(
    DISPLAY_SETTINGS_KEY,
    JSON.stringify({
      reducedMotion: !!s.reducedMotion,
      highContrast: !!s.highContrast,
      largeText: !!s.largeText,
    }),
  );
}
export function applyDisplaySettings(s) {
  const e = document.documentElement;
  (e.classList.toggle("reduced-motion", !!s.reducedMotion),
    e.classList.toggle("high-contrast", !!s.highContrast),
    e.classList.toggle("large-text", !!s.largeText));
}
// Absolute so the same string works in `src` attributes and in custom
// properties read by `screens.css` (a relative url() inside a custom property
// resolves against the consuming stylesheet, not the document).
