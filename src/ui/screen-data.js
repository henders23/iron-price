export const ART_PATH = new URL("./assets/art/", document.baseURI).href;
export const MAP_NODES = {
  cinderfall: {
    x: 11,
    y: 72,
    numeral: "I",
    faction: "FREE TOWNS",
    emblem: "free-towns",
  },
  fenmere: {
    x: 23,
    y: 48,
    numeral: "II",
    faction: "FENWARDENS",
    emblem: "fenwardens",
  },
  "cael-watch": {
    x: 36,
    y: 66,
    numeral: "III",
    faction: "HOUSE CAEL",
    emblem: "house-cael",
  },
  blackbriar: {
    x: 50,
    y: 40,
    numeral: "IV",
    faction: "NO CHARTER",
    emblem: "mireborn",
  },
  "red-quarry": {
    x: 63,
    y: 62,
    numeral: "V",
    faction: "FREE TOWNS",
    emblem: "free-towns",
  },
  "iron-pass": {
    x: 76,
    y: 38,
    numeral: "VI",
    faction: "IRONBOUND",
    emblem: "ironbound",
  },
  "crowns-end": {
    x: 88,
    y: 56,
    numeral: "VII",
    faction: "FRONTIER COMPACT",
    emblem: "frontier-compact",
  },
};
export const OBJECTIVE_ART = {
  eliminate: "attack-target",
  "break-captain": "enemy-captain",
  hold: "hold-position",
  escape: "escape-zone",
  survive: "deployment",
};
export const OBJECTIVE_LABEL = {
  eliminate: "Elimination",
  "break-captain": "Captain",
  hold: "Hold",
  escape: "Escape",
  survive: "Survival",
};
export const TOPBAR_RESOURCES = [
  ["crowns", "Crowns"],
  ["food", "Food"],
  ["tools", "Tools"],
  ["medicine", "Medicine"],
  ["renown", "Renown"],
];
export const REPUTATIONS = [
  ["free-towns", "FREE TOWNS"],
  ["fenwardens", "FENWARDENS"],
  ["house-cael", "HOUSE CAEL"],
];
export const SERVICE_CHIPS = {
  market: { label: "MARKET", view: "market" },
  recruits: { label: "RECRUITS", view: "recruits" },
  healer: { label: "HEALER", view: null },
};
export function unlockRequirement(s) {
  return ["blackbriar", "red-quarry"].includes(s)
    ? 2
    : s === "iron-pass"
      ? 4
      : 6;
}
export function emberLayer() {
  return `<div class="ip-embers" aria-hidden="true">${Array.from(
    { length: 16 },
    (s, e) => {
      const t = e % 3 ? 3 : 2;
      return `<span style="left:${(e * 61) % 100}%;width:${t}px;height:${t}px;animation-duration:${14 + (e % 7) * 3}s;animation-delay:${(-(e * 1.9)).toFixed(1)}s"></span>`;
    },
  ).join("")}</div>`;
}
