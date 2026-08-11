import { TERRAIN } from "./weapons.js";

export const HEX_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];
export function hexKey(s) {
  return `${s.q},${s.r}`;
}
export function sameHex(s, e) {
  return s.q === e.q && s.r === e.r;
}
export function addHex(s, e) {
  return { q: s.q + e.q, r: s.r + e.r };
}
export function neighbors(s) {
  return HEX_DIRECTIONS.map((e) => addHex(s, e));
}
export function hexDistance(s, e) {
  const t = -s.q - s.r - (-e.q - e.r);
  return (Math.abs(s.q - e.q) + Math.abs(s.r - e.r) + Math.abs(t)) / 2;
}
export function tileAt(s, e) {
  return s.find((t) => sameHex(t, e));
}
export function unitAt(s, e, t = !1) {
  return s.find((a) => (t || (a.alive && !a.routed)) && sameHex(a.position, e));
}
export function findPath(s, e, t, a, i = Number.POSITIVE_INFINITY) {
  if (sameHex(t, a)) return [t];
  const n = tileAt(s, a);
  if (!n || TERRAIN[n.terrain].moveCost >= 99) return null;
  const r = unitAt(e, a);
  if (r && !sameHex(r.position, t)) return null;
  const o = [{ hex: t, cost: 0 }],
    l = new Map([[hexKey(t), null]]),
    d = new Map([[hexKey(t), 0]]),
    c = new Map([[hexKey(t), t]]);
  for (; o.length > 0;) {
    o.sort(
      (y, u) =>
        y.cost + hexDistance(y.hex, a) - (u.cost + hexDistance(u.hex, a)),
    );
    const f = o.shift();
    if (!f || sameHex(f.hex, a)) break;
    for (const y of neighbors(f.hex)) {
      const u = tileAt(s, y);
      if (
        !u ||
        TERRAIN[u.terrain].moveCost >= 99 ||
        (unitAt(e, y) && !sameHex(y, a))
      )
        continue;
      const g =
          TERRAIN[u.terrain].moveCost +
          Math.max(0, u.elevation - (tileAt(s, f.hex)?.elevation ?? 0)),
        T = f.cost + g;
      if (T > i) continue;
      const x = hexKey(y);
      T < (d.get(x) ?? Number.POSITIVE_INFINITY) &&
        (d.set(x, T),
        c.set(x, y),
        l.set(x, hexKey(f.hex)),
        o.push({ hex: y, cost: T }));
    }
  }
  const m = hexKey(a);
  if (!l.has(m)) return null;
  const v = [];
  let b = m;
  for (; b;) {
    const f = c.get(b);
    if (!f) return null;
    (v.push(f), (b = l.get(b) ?? null));
  }
  return v.reverse();
}
export function pathCost(s, e) {
  let t = 0;
  for (let a = 1; a < e.length; a += 1) {
    const i = tileAt(s, e[a]),
      n = tileAt(s, e[a - 1]);
    if (!i) return 999;
    t +=
      TERRAIN[i.terrain].moveCost +
      Math.max(0, i.elevation - (n?.elevation ?? 0));
  }
  return t;
}
export function reachableHexes(s, e, t) {
  const a = new Map();
  for (const i of s) {
    const n = findPath(s, e, t.position, i, t.ap);
    n && a.set(hexKey(i), n);
  }
  return a;
}
export function offsetToAxial(s, e) {
  return { q: s - Math.floor(e / 2), r: e };
}
