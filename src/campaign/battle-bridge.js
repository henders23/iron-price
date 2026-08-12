import { createBattleState } from "../battle/state.js";
import { WEAPONS } from "../battle/weapons.js";
import {
  dailyWages,
  evaluateCampaignStatus,
  refreshOffers,
} from "./campaign.js";
import { INJURIES } from "./data.js";
import { mixSeed } from "./generation.js";

export function toBattleUnit(s, e) {
  return {
    id: s.id,
    team: "company",
    name: s.name,
    epithet: s.epithet,
    portraitSet: "company",
    weaponId: s.weaponId,
    hasShield: s.hasShield,
    position: { ...e.position },
    hp: s.hp,
    hpMax: s.hpMax,
    headArmor: s.headArmor,
    headArmorMax: s.headArmorMax,
    bodyArmor: s.bodyArmor,
    bodyArmorMax: s.bodyArmorMax,
    fatigue: 0,
    fatigueMax: 100,
    ap: 9,
    apMax: 9,
    initiative: s.initiative,
    meleeSkill: s.meleeSkill + (s.weaponQuality - 1) * 3,
    meleeDefense: s.meleeDefense,
    resolve: s.resolve,
    morale: "steady",
    alive: s.alive,
    routed: !1,
    waited: !1,
    movedThisTurn: !1,
    kills: 0,
  };
}
export function buildContractBattle(s, e, t) {
  const a = {
      type: t.battleObjective,
      title: t.objective,
      description: t.briefing,
      targetRounds:
        t.battleObjective === "survive" ? (t.objectiveRounds ?? 6) : void 0,
      holdHex: t.battleObjective === "hold" ? { q: 4, r: 5 } : void 0,
      holdRounds:
        t.battleObjective === "hold" ? (t.objectiveRounds ?? 2) : void 0,
      escapeCount: t.battleObjective === "escape" ? 3 : void 0,
      captainId: t.battleObjective === "break-captain" ? "e1" : void 0,
    },
    i = createBattleState(t.seed, {
      terrainVariant: t.terrainVariant,
      enemyPower: t.enemyPower,
      enemyFaction: t.enemyFaction,
      objective: a,
    }),
    n = i.units.filter((l) => l.team === "company"),
    r = e
      .map((l) => s.roster.find((d) => d.id === l && d.alive))
      .filter((l) => !!l)
      .slice(0, 6);
  if (r.length !== 6)
    throw new Error("A battle requires six living company fighters.");
  const o = r.map((l, d) => toBattleUnit(l, n[d]));
  return (
    (i.units = [...o, ...i.units.filter((l) => l.team === "enemy")]),
    (i.selectedUnitId = o[0].id),
    i
  );
}
export function resolveBattleOutcome(s, e, t, a) {
  const i = t.winner === "company",
    n = [],
    r = [],
    o = [],
    l = [],
    d = [],
    c = t.units.filter((u) => u.team === "company");
  for (const u of c) {
    const p = s.roster.find((g) => g.id === u.id);
    if (p) {
      if (
        ((p.battles += 1),
        (p.kills += u.kills),
        (p.xp += u.kills * 45 + (i ? 65 : 25)),
        (p.hp = u.hp),
        (p.headArmor = u.headArmor),
        (p.bodyArmor = u.bodyArmor),
        !u.alive)
      ) {
        ((p.alive = !1), (p.hp = 0), n.push(p.name));
        continue;
      }
      if ((u.routed && r.push(p.name), u.hp / u.hpMax < 0.42 || u.routed)) {
        const g =
          INJURIES[
            mixSeed(e.seed + p.id.length + p.battles * 17) % INJURIES.length
          ];
        (p.injuries.includes(g) || p.injuries.push(g),
          o.push({ name: p.name, injury: g }));
      }
      p.xp >= p.level * 180 &&
        ((p.xp -= p.level * 180),
        (p.level += 1),
        (p.hpMax += 2),
        (p.hp += 2),
        (p.perkPoints += 1),
        d.push(p.name));
    }
  }
  const m = t.units.filter(
      (u) => u.team === "enemy" && (!u.alive || u.routed),
    ).length,
    v = i ? e.reward : 0,
    b = t.units.filter((u) => u.team === "enemy" && !u.alive).length * 18,
    f = dailyWages(s) * 2,
    y = Math.min(s.food, s.roster.filter((u) => u.alive).length * 2);
  if (
    ((s.crowns = Math.max(0, s.crowns + v + b - f)),
    (s.food -= y),
    (s.day += 2),
    (s.renown = Math.max(0, s.renown + (i ? e.danger * 3 : -1))),
    (s.completedContracts += 1),
    (s.victories += i ? 1 : 0),
    (s.defeats += i ? 0 : 1),
    (s.reputations[e.reputation] += i ? e.reputationReward : -2),
    (s.threat = Math.max(
      0,
      Math.min(100, s.threat + (i ? e.threatChange : 9)),
    )),
    m >= 4)
  ) {
    const u = ["sword", "spear", "axe", "mace"],
      p = u[mixSeed(e.seed + s.day) % u.length];
    ((s.armory[p] += 1), l.push(WEAPONS[p].name));
  }
  return (
    i && m >= 5 && ((s.armory.shields += 1), l.push("Reaver shield")),
    t.units.some((u) => u.team === "enemy" && !u.alive) &&
      ((s.tools += 1), l.push("Salvaged tools")),
    s.history.push(
      i
        ? `Day ${s.day}: ${e.title} completed. ${v + b} crowns recovered; ${n.length} dead.`
        : `Day ${s.day}: the company withdrew from ${e.title}; ${n.length} dead.`,
    ),
    i &&
      e.story === "final" &&
      ((s.status = "victory"),
      (s.endingReason =
        "Crown's End fell, the Ironbound claim broke, and the frontier roads opened under the company's name.")),
    refreshOffers(s),
    evaluateCampaignStatus(s),
    (s.lastPlayed = new Date().toISOString()),
    {
      victory: i,
      contractTitle: e.title,
      reward: v,
      salvage: b,
      wages: f,
      foodSpent: y,
      renown: i ? e.danger * 3 : -1,
      casualties: n,
      routed: r,
      injuries: o,
      loot: l,
      rounds: t.round,
      hash: a,
      reputationId: e.reputation,
      reputationChange: i ? e.reputationReward : -2,
      threatChange: i ? e.threatChange : 9,
      levelUps: d,
      campaignEnded: s.status !== "active",
    }
  );
}
