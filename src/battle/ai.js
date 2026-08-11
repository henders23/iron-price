import {
  hexDistance,
  neighbors,
  reachableHexes,
  tileAt,
  unitAt,
} from "./hex.js";
import { activeUnit, attackForecast } from "./rules.js";
import { TERRAIN, WEAPONS } from "./weapons.js";

export function enemiesOf(s, e) {
  return s.units.filter((t) => t.team !== e.team && t.alive && !t.routed);
}
export function adjacentEnemies(s, e) {
  return enemiesOf(s, e).filter(
    (t) => hexDistance(e.position, t.position) === 1,
  );
}
export function attackValue(s, e, t) {
  const a = attackForecast(s, e, t),
    i = ((a.damageMin + a.damageMax) / 2) * (a.chance / 100),
    n = (1 - t.hp / t.hpMax) * 25,
    r = t.hp <= a.damageMax * a.penetration + 8 ? 30 : 0,
    o = t.morale === "wavering" || t.morale === "breaking" ? 12 : 0;
  return i + n + r + o - t.meleeDefense * 0.2;
}
export function chooseAttack(s, e) {
  const t = WEAPONS[e.weaponId];
  if (e.ap < t.apCost || e.fatigue + t.fatigueCost > e.fatigueMax) return null;
  const a = adjacentEnemies(s, e);
  return a.length === 0
    ? null
    : (a.sort(
        (i, n) =>
          attackValue(s, e, n) - attackValue(s, e, i) ||
          i.id.localeCompare(n.id),
      ),
      { type: "attack", unitId: e.id, targetId: a[0].id });
}
export function adjacentEnemyCount(s, e, t) {
  return neighbors(t).reduce((a, i) => {
    const n = unitAt(s.units, i);
    return a + (n && n.team !== e.team ? 1 : 0);
  }, 0);
}
export function adjacentAllyCount(s, e, t) {
  return neighbors(t).reduce((a, i) => {
    const n = unitAt(s.units, i);
    return a + (n && n.team === e.team ? 1 : 0);
  }, 0);
}
export function chooseAdvance(s, e) {
  const t = enemiesOf(s, e),
    a = Math.floor((e.fatigueMax - e.fatigue) / 3),
    i = Math.min(e.ap, a);
  if (t.length === 0 || i <= 0 || e.movedThisTurn) return null;
  const n = WEAPONS[e.weaponId],
    r = i >= n.apCost + 1 ? n.apCost : 0;
  let o = reachableHexes(s.tiles, s.units, { ...e, ap: i - r });
  o.size <= 1 &&
    r > 0 &&
    (o = reachableHexes(s.tiles, s.units, { ...e, ap: i }));
  const d = [...o.entries()]
    .map(([c, m]) => {
      const v = tileAt(s.tiles, m.at(-1) ?? e.position),
        b = m.at(-1) ?? e.position,
        f = Math.min(...t.map((x) => hexDistance(b, x.position))),
        y = adjacentEnemyCount(s, e, b),
        u = adjacentAllyCount(s, e, b),
        p = v ? TERRAIN[v.terrain] : TERRAIN.grass,
        g = v?.elevation ?? 0,
        T =
          -f * 25 +
          g * 7 +
          p.defense * 1.2 +
          u * 2 -
          Math.max(0, y - 1) * 11 -
          m.length * 0.05;
      return { key: c, path: m, score: T };
    })
    .filter((c) => c.path.length > 1)
    .sort((c, m) => m.score - c.score || c.key.localeCompare(m.key))[0];
  return d ? { type: "move", unitId: e.id, path: d.path } : null;
}
export function chooseFlight(s, e) {
  const t = enemiesOf(s, e),
    a = Math.min(e.ap, Math.floor((e.fatigueMax - e.fatigue) / 3)),
    n = [...reachableHexes(s.tiles, s.units, { ...e, ap: a }).entries()]
      .map(([r, o]) => {
        const l = o.at(-1) ?? e.position,
          d = l.q + Math.floor(l.r / 2),
          c = e.team === "company" ? -d : d,
          m =
            t.length > 0
              ? Math.min(...t.map((v) => hexDistance(l, v.position)))
              : 0;
        return { key: r, path: o, score: c * 20 + m * 6 };
      })
      .filter((r) => r.path.length > 1)
      .sort((r, o) => o.score - r.score || r.key.localeCompare(o.key))[0];
  return n ? { type: "move", unitId: e.id, path: n.path } : null;
}
export function chooseAiCommand(s) {
  const e = activeUnit(s);
  if (!e) return null;
  if (e.morale === "fleeing")
    return chooseFlight(s, e) ?? { type: "endTurn", unitId: e.id };
  const t = chooseAttack(s, e);
  if (t) return t;
  const a = chooseAdvance(s, e);
  return a || { type: "endTurn", unitId: e.id };
}
