import { offsetToAxial } from "./hex.js";

export function terrainFor(s, e, t) {
  const a = `${s},${e}`,
    n = {
      "ash-road": {
        rocks: ["5,1", "6,8", "3,5", "8,4"],
        water: ["4,7", "5,7", "5,8"],
        mud: ["6,3", "7,3", "7,4", "6,4", "4,2"],
        brush: ["3,2", "8,7", "9,6", "2,6", "9,2", "4,6"],
        hills: ["5,4", "5,5", "6,5", "6,6", "7,5"],
      },
      "fen-crossing": {
        rocks: ["3,1", "8,8", "9,3"],
        water: [
          "4,1",
          "5,1",
          "4,2",
          "5,2",
          "6,5",
          "7,5",
          "6,6",
          "7,6",
          "4,8",
          "5,8",
        ],
        mud: [
          "3,2",
          "6,1",
          "3,3",
          "5,4",
          "6,4",
          "8,5",
          "5,6",
          "8,6",
          "3,8",
          "6,8",
        ],
        brush: ["2,4", "3,5", "8,2", "9,7", "7,8"],
        hills: ["5,5", "6,5"],
      },
      "old-watch": {
        rocks: ["4,2", "7,2", "4,7", "7,7", "6,4"],
        water: [],
        mud: ["5,8", "6,8", "8,6"],
        brush: ["3,1", "8,1", "3,3", "8,3", "3,6", "8,6", "4,8", "7,8"],
        hills: [
          "5,2",
          "6,2",
          "5,3",
          "6,3",
          "5,4",
          "5,5",
          "6,5",
          "5,6",
          "6,6",
          "5,7",
          "6,7",
        ],
      },
      "cinder-streets": {
        rocks: ["3,2", "3,3", "8,1", "8,2", "4,7", "4,8", "9,6", "9,7"],
        water: [],
        mud: ["5,2", "6,2", "5,7", "6,7"],
        brush: ["2,5", "9,4"],
        hills: ["4,3", "7,3", "4,6", "7,6"],
      },
      "quarry-pit": {
        rocks: ["3,1", "4,1", "7,1", "8,1", "3,8", "4,8", "7,8", "8,8", "5,4"],
        water: ["5,7", "6,7"],
        mud: ["4,6", "5,6", "6,6", "7,6"],
        brush: ["2,4", "9,5"],
        hills: ["3,2", "8,2", "3,7", "8,7", "4,3", "7,3"],
      },
      "iron-pass": {
        rocks: [
          "3,0",
          "4,0",
          "7,0",
          "8,0",
          "3,2",
          "8,2",
          "3,7",
          "8,7",
          "3,9",
          "4,9",
          "7,9",
          "8,9",
        ],
        water: [],
        mud: ["5,4", "6,4", "5,5", "6,5"],
        brush: ["4,2", "7,2", "4,7", "7,7"],
        hills: ["3,1", "8,1", "3,3", "8,3", "3,6", "8,6", "3,8", "8,8"],
      },
      blackbriar: {
        rocks: ["5,2", "6,7"],
        water: ["4,4", "4,5", "7,4", "7,5"],
        mud: ["3,4", "3,5", "8,4", "8,5", "5,6", "6,3"],
        brush: [
          "2,1",
          "3,1",
          "8,1",
          "9,1",
          "2,3",
          "9,3",
          "2,6",
          "9,6",
          "2,8",
          "3,8",
          "8,8",
          "9,8",
        ],
        hills: ["5,4", "6,5"],
      },
    }[t],
    r = new Set(n.rocks),
    o = new Set(n.water),
    l = new Set(n.mud),
    d = new Set(n.brush),
    c = new Set(n.hills);
  return r.has(a)
    ? { terrain: "rock", elevation: 0 }
    : o.has(a)
      ? { terrain: "water", elevation: 0 }
      : c.has(a)
        ? { terrain: "hill", elevation: 1 }
        : l.has(a)
          ? { terrain: "mud", elevation: 0 }
          : d.has(a)
            ? { terrain: "brush", elevation: 0 }
            : s === 5 || s === 6
              ? { terrain: "road", elevation: 0 }
              : { terrain: "grass", elevation: 0 };
}
export function buildBattlefield(s) {
  const e = [];
  for (let t = 0; t < 10; t += 1)
    for (let a = 0; a < 12; a += 1) {
      const i = offsetToAxial(a, t);
      e.push({ ...i, ...terrainFor(a, t, s) });
    }
  return e;
}
