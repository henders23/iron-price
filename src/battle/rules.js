import {
  findPath,
  hexDistance,
  neighbors,
  pathCost,
  tileAt,
  unitAt,
} from "./hex.js";
import { randomInt } from "./random.js";
import { TERRAIN, WEAPONS, moraleIndex, weakenMorale } from "./weapons.js";

export function cloneState(s) {
  return structuredClone(s);
}
export function moraleModifier(s) {
  return (moraleIndex(s) - moraleIndex("steady")) * 5;
}
export function initiativeScore(s) {
  return s.initiative - Math.floor(s.fatigue * 0.45) + moraleModifier(s.morale);
}
export function activeUnit(s) {
  return s.units.find((e) => e.id === s.queue[0]);
}
export function livingUnits(s, e) {
  return s.units.filter((t) => t.team === e && t.alive && !t.routed);
}
export function endBattle(s, e, t) {
  s.phase === "battle" &&
    ((s.winner = t),
    (s.phase = t === "company" ? "victory" : "defeat"),
    (s.queue = []),
    e.push({ type: "battleEnded", winner: t, round: s.round }));
}
export function beginRound(s, e) {
  s.round += 1;
  for (const t of s.units)
    !t.alive ||
      t.routed ||
      ((t.ap = t.apMax),
      (t.fatigue = Math.max(0, t.fatigue - 15)),
      (t.waited = !1),
      (t.movedThisTurn = !1));
  ((s.queue = s.units
    .filter((t) => t.alive && !t.routed)
    .sort(
      (t, a) =>
        initiativeScore(a) - initiativeScore(t) || t.id.localeCompare(a.id),
    )
    .map((t) => t.id)),
    e.push({ type: "roundStarted", round: s.round }));
}
export function checkVictory(s, e) {
  const t = livingUnits(s, "company"),
    a = livingUnits(s, "enemy"),
    i = s.objective;
  if (i?.type === "break-captain") {
    const n = s.units.find((r) => r.id === i.captainId);
    if (!n || !n.alive || n.routed) return endBattle(s, e, "company");
  }
  if (
    i?.type === "escape" &&
    (s.objectiveState?.escapedCompanyIds.length ?? 0) >= (i.escapeCount ?? 3)
  )
    return endBattle(s, e, "company");
  if (t.length === 0) return endBattle(s, e, "enemy");
  if (a.length === 0) return endBattle(s, e, "company");
}
export function advanceObjective(s, e) {
  const t = s.objective,
    a = s.objectiveState;
  if (!(!t || !a || s.phase !== "battle")) {
    if (t.type === "survive" && s.round >= (t.targetRounds ?? 6)) {
      (e.push({
        type: "objectiveProgress",
        message: `The company held through round ${s.round}.`,
      }),
        endBattle(s, e, "company"));
      return;
    }
    if (t.type === "hold" && t.holdHex) {
      const i = unitAt(s.units, t.holdHex);
      ((a.heldRounds =
        i?.team === "company" && i.alive && !i.routed ? a.heldRounds + 1 : 0),
        e.push({
          type: "objectiveProgress",
          message:
            a.heldRounds > 0
              ? `Ground held: ${a.heldRounds}/${t.holdRounds ?? 2} rounds.`
              : "The objective is not held.",
        }),
        a.heldRounds >= (t.holdRounds ?? 2) && endBattle(s, e, "company"));
    }
  }
}
export function maybeAdvanceRound(s, e) {
  s.phase !== "battle" ||
    s.queue.length > 0 ||
    (advanceObjective(s, e), s.phase === "battle" && beginRound(s, e));
}
export function dropFromQueue(s, e) {
  s.queue = s.queue.filter((t) => t !== e);
}
export function commandFailure(s, e) {
  return { state: s, events: [], error: e };
}
export function surroundCount(s, e, t) {
  return neighbors(t.position).filter((a) => {
    const i = unitAt(s.units, a);
    return i?.team === e.team && i.alive && !i.routed;
  }).length;
}
export function attackForecast(s, e, t) {
  const a = WEAPONS[e.weaponId],
    i = [
      { label: "Melee skill", value: e.meleeSkill },
      { label: a.name, value: a.accuracy },
      { label: "Target defence", value: -t.meleeDefense },
    ];
  t.hasShield && i.push({ label: "Shield", value: -10 });
  const n = tileAt(s.tiles, t.position),
    r = tileAt(s.tiles, e.position);
  if (n) {
    const v = TERRAIN[n.terrain].defense;
    v !== 0 && i.push({ label: TERRAIN[n.terrain].name, value: -v });
  }
  const o = (r?.elevation ?? 0) - (n?.elevation ?? 0);
  o !== 0 &&
    i.push({ label: o > 0 ? "High ground" : "Low ground", value: o * 7 });
  const l = surroundCount(s, e, t);
  l > 1 && i.push({ label: `Surrounded ×${l}`, value: (l - 1) * 6 });
  const d = moraleModifier(e.morale);
  d !== 0 && i.push({ label: `Morale: ${e.morale}`, value: d });
  const c = moraleModifier(t.morale);
  return (
    c !== 0 && i.push({ label: "Target morale", value: -c }),
    {
      chance: Math.max(
        5,
        Math.min(
          95,
          i.reduce((v, b) => v + b.value, 0),
        ),
      ),
      modifiers: i,
      damageMin: a.damageMin,
      damageMax: a.damageMax,
      armorMultiplier: a.armorMultiplier,
      penetration: a.penetration,
    }
  );
}
export function moraleCheck(s, e, t, a, i = 0) {
  if (!e.alive || e.routed || e.morale === "fleeing") return;
  let n;
  ({ value: n, state: s.rngState } = randomInt(s.rngState, 1, 100));
  const r = e.resolve + moraleModifier(e.morale) - i;
  if (n <= r) return;
  const o = e.morale,
    l = weakenMorale(o);
  ((e.morale = l),
    a.push({
      type: "moraleChanged",
      unitId: e.id,
      from: o,
      to: l,
      reason: t,
    }));
}
export function checkRoutAndEscape(s, e, t) {
  const a = e.position.q + Math.floor(e.position.r / 2);
  if (s.objective?.type === "escape" && e.team === "company" && a >= 11) {
    ((e.routed = !0),
      (e.ap = 0),
      dropFromQueue(s, e.id),
      s.objectiveState ||
        (s.objectiveState = { heldRounds: 0, escapedCompanyIds: [] }),
      s.objectiveState.escapedCompanyIds.includes(e.id) ||
        s.objectiveState.escapedCompanyIds.push(e.id),
      t.push({ type: "unitEscaped", unitId: e.id }),
      t.push({
        type: "objectiveProgress",
        message: `${s.objectiveState.escapedCompanyIds.length}/${s.objective.escapeCount ?? 3} fighters escaped.`,
      }),
      checkVictory(s, t));
    return;
  }
  e.morale !== "fleeing" ||
    !(e.team === "company" ? a <= 0 : a >= 11) ||
    ((e.routed = !0),
    (e.ap = 0),
    dropFromQueue(s, e.id),
    t.push({ type: "unitRouted", unitId: e.id }));
}
export function requireActingUnit(s, e) {
  if (s.phase !== "battle") return "The battle has not started.";
  const t = s.units.find((a) => a.id === e);
  return !t || !t.alive || t.routed
    ? "That fighter cannot act."
    : activeUnit(s)?.id !== e
      ? "It is not that fighter's turn."
      : t;
}
export function applyCommand(s, e) {
  const t = cloneState(s),
    a = [];
  if (e.type === "deploy") {
    if (t.phase !== "deployment")
      return commandFailure(s, "Deployment is already over.");
    const r = t.units.find((c) => c.id === e.unitId && c.team === "company");
    if (!r) return commandFailure(s, "Only company fighters can be deployed.");
    const o = tileAt(t.tiles, e.destination),
      l = e.destination.q + Math.floor(e.destination.r / 2);
    if (!o || l > 3 || TERRAIN[o.terrain].moveCost >= 99)
      return commandFailure(
        s,
        "Choose an open hex inside the blue deployment zone.",
      );
    if (unitAt(t.units, e.destination))
      return commandFailure(s, "That hex is occupied.");
    const d = { ...r.position };
    return (
      (r.position = { ...e.destination }),
      (t.selectedUnitId = r.id),
      (t.commandCount += 1),
      a.push({
        type: "deployed",
        unitId: r.id,
        from: d,
        to: { ...e.destination },
      }),
      { state: t, events: a }
    );
  }
  if (e.type === "startBattle")
    return t.phase !== "deployment"
      ? commandFailure(s, "The battle is already underway.")
      : ((t.phase = "battle"),
        (t.commandCount += 1),
        a.push({ type: "battleStarted", round: 1 }),
        beginRound(t, a),
        (t.selectedUnitId = t.queue[0] ?? null),
        { state: t, events: a });
  const i = requireActingUnit(t, e.unitId);
  if (typeof i == "string") return commandFailure(s, i);
  const n = i;
  if (e.type === "move") {
    const r = e.path.at(-1);
    if (!r) return commandFailure(s, "Choose a destination.");
    const o = findPath(t.tiles, t.units, n.position, r, n.ap);
    if (!o) return commandFailure(s, "No legal path reaches that hex.");
    const l = pathCost(t.tiles, o),
      d = l * 3;
    return l <= 0 || l > n.ap
      ? commandFailure(s, "Not enough action points.")
      : n.fatigue + d > n.fatigueMax
        ? commandFailure(s, "Too exhausted to move that far.")
        : ((n.position = { ...r }),
          (n.ap -= l),
          (n.fatigue += d),
          (n.movedThisTurn = !0),
          (t.commandCount += 1),
          a.push({
            type: "moved",
            unitId: n.id,
            path: o,
            apCost: l,
            fatigueCost: d,
          }),
          checkRoutAndEscape(t, n, a),
          checkVictory(t, a),
          maybeAdvanceRound(t, a),
          { state: t, events: a });
  }
  if (e.type === "attack") {
    const r = t.units.find((x) => x.id === e.targetId);
    if (!r || !r.alive || r.routed || r.team === n.team)
      return commandFailure(s, "Choose a living enemy.");
    if (hexDistance(n.position, r.position) !== 1)
      return commandFailure(s, "The target is out of reach.");
    const o = WEAPONS[n.weaponId];
    if (n.ap < o.apCost) return commandFailure(s, "Not enough action points.");
    if (n.fatigue + o.fatigueCost > n.fatigueMax)
      return commandFailure(s, "Too exhausted to attack.");
    ((n.ap -= o.apCost), (n.fatigue += o.fatigueCost), (t.commandCount += 1));
    const l = attackForecast(t, n, r);
    let d;
    ({ value: d, state: t.rngState } = randomInt(t.rngState, 1, 100));
    const c = d <= l.chance;
    if (
      (a.push({
        type: "attackRolled",
        unitId: n.id,
        targetId: r.id,
        chance: l.chance,
        roll: d,
        hit: c,
        weaponId: o.id,
      }),
      !c)
    )
      return { state: t, events: a };
    let m;
    ({ value: m, state: t.rngState } = randomInt(t.rngState, 1, 100));
    const v = m <= 24 ? "head" : "body";
    let b;
    ({ value: b, state: t.rngState } = randomInt(
      t.rngState,
      o.damageMin,
      o.damageMax,
    ));
    const f = v === "head" ? "headArmor" : "bodyArmor",
      y = r[f],
      u = Math.max(1, Math.floor(b * o.armorMultiplier)),
      p = Math.min(y, u),
      g = Math.max(0, u - y),
      T = Math.min(
        b,
        Math.max(
          1,
          Math.floor(b * o.penetration + g / Math.max(0.5, o.armorMultiplier)),
        ),
      );
    if (
      ((r[f] = Math.max(0, y - p)),
      (r.hp = Math.max(0, r.hp - T)),
      a.push({
        type: "damaged",
        unitId: n.id,
        targetId: r.id,
        location: v,
        armorDamage: p,
        hpDamage: T,
      }),
      o.effect === "stagger" &&
        r.alive &&
        ((r.fatigue = Math.min(r.fatigueMax, r.fatigue + 12)),
        a.push({ type: "staggered", unitId: r.id, fatigue: 12 })),
      r.hp <= 0)
    ) {
      ((r.alive = !1),
        (r.ap = 0),
        dropFromQueue(t, r.id),
        (n.kills += 1),
        a.push({ type: "unitDied", unitId: r.id, killerId: n.id }));
      const x = t.units
        .filter((P) => P.team === r.team && P.alive && !P.routed)
        .sort((P, Ie) => P.id.localeCompare(Ie.id));
      for (const P of x) moraleCheck(t, P, `${r.name} fell`, a, 12);
      checkVictory(t, a);
    } else
      (T >= 15 || r.hp / r.hpMax < 0.35) &&
        moraleCheck(t, r, `struck by ${o.name}`, a, T >= 24 ? 15 : 7);
    return { state: t, events: a };
  }
  return e.type === "wait"
    ? n.waited || t.queue.length <= 1
      ? commandFailure(s, "This fighter cannot wait again.")
      : ((n.waited = !0),
        t.queue.shift(),
        t.queue.push(n.id),
        (t.selectedUnitId = t.queue[0] ?? null),
        (t.commandCount += 1),
        a.push({ type: "waited", unitId: n.id }),
        { state: t, events: a })
    : e.type === "endTurn"
      ? (n.ap >= 4 && (n.fatigue = Math.max(0, n.fatigue - 5)),
        (n.ap = 0),
        t.queue.shift(),
        (t.commandCount += 1),
        a.push({ type: "turnEnded", unitId: n.id }),
        maybeAdvanceRound(t, a),
        (t.selectedUnitId = t.queue[0] ?? null),
        { state: t, events: a })
      : commandFailure(s, "Unknown command.");
}
export function canDeployAt(s, e) {
  const t = tileAt(s.tiles, e),
    a = e.q + Math.floor(e.r / 2);
  return (
    s.phase === "deployment" &&
    !!t &&
    a <= 3 &&
    TERRAIN[t.terrain].moveCost < 99 &&
    !unitAt(s.units, e)
  );
}
