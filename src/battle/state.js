import { buildBattlefield } from "./battlefields.js";
import { normalizeSeed } from "./random.js";
import { applyCommand } from "./rules.js";
import {
  COMPANY_UNIT_TEMPLATES,
  ENEMY_FACTIONS,
  ENEMY_UNIT_TEMPLATES,
  createUnit,
} from "./units.js";

export function createBattleState(s = 439041101, e = {}) {
  const t = normalizeSeed(s),
    a = e.terrainVariant ?? "ash-road",
    i = e.enemyPower ?? 1,
    n = e.enemyFaction ?? "thorn-reavers",
    r = [...COMPANY_UNIT_TEMPLATES, ...ENEMY_UNIT_TEMPLATES].map(createUnit),
    o = r.filter((l) => l.team === "enemy");
  for (const [l, d] of o.entries()) {
    const c = ENEMY_FACTIONS[n][l];
    ((d.name = c.name),
      (d.epithet = c.epithet),
      (d.portraitSet = n),
      (d.weaponId = c.weaponId ?? d.weaponId),
      (d.hasShield = c.hasShield ?? d.hasShield));
    const m = n === "ironbound" ? 1.12 : n === "mireborn" ? 0.88 : 1,
      v = n === "ironbound" ? 1.25 : n === "mireborn" ? 0.68 : 1,
      b = n === "mireborn" ? 12 : n === "ironbound" ? -10 : 0;
    ((d.hp = d.hpMax = Math.round(d.hpMax * i * m)),
      (d.headArmor = d.headArmorMax = Math.round(d.headArmorMax * i * v)),
      (d.bodyArmor = d.bodyArmorMax = Math.round(d.bodyArmorMax * i * v)),
      (d.initiative += b),
      (d.meleeSkill = Math.round(d.meleeSkill + (i - 1) * 30)),
      (d.resolve = Math.round(d.resolve + (i - 1) * 20)));
  }
  return {
    version: 1,
    seed: t,
    rngState: t,
    phase: "deployment",
    round: 0,
    tiles: buildBattlefield(a),
    units: r,
    queue: [],
    selectedUnitId: "c1",
    winner: null,
    commandCount: 0,
    objective: e.objective,
    objectiveState: { heldRounds: 0, escapedCompanyIds: [] },
  };
}
export function serializeBattleState(s) {
  const e = [...s.units]
    .sort((t, a) => t.id.localeCompare(a.id))
    .map((t) => ({
      id: t.id,
      position: t.position,
      hp: t.hp,
      headArmor: t.headArmor,
      bodyArmor: t.bodyArmor,
      fatigue: t.fatigue,
      ap: t.ap,
      morale: t.morale,
      alive: t.alive,
      routed: t.routed,
      waited: t.waited,
      movedThisTurn: t.movedThisTurn,
      kills: t.kills,
    }));
  return JSON.stringify({
    version: s.version,
    seed: s.seed,
    rngState: s.rngState,
    phase: s.phase,
    round: s.round,
    queue: s.queue,
    winner: s.winner,
    commandCount: s.commandCount,
    units: e,
  });
}
export function battleStateHash(s) {
  const e = serializeBattleState(s);
  let t = 2166136261;
  for (let a = 0; a < e.length; a += 1)
    ((t ^= e.charCodeAt(a)), (t = Math.imul(t, 16777619)));
  return (t >>> 0).toString(16).padStart(8, "0");
}
export function replayBattle(s) {
  let e = createBattleState(s.seed);
  for (const t of s.commands) {
    const a = applyCommand(e, t);
    if (a.error)
      throw new Error(`Invalid replay command ${t.type}: ${a.error}`);
    e = a.state;
  }
  return e;
}
export function buildReplay(s, e, t) {
  return {
    version: 1,
    seed: s,
    commands: structuredClone(e),
    finalHash: t ? battleStateHash(t) : void 0,
  };
}
