import {
  CONTRACTS,
  RECRUIT_POOL,
  ROAD_EVENTS,
  STARTING_FIGHTERS,
} from "./data.js";

export function mixSeed(s) {
  let e = s >>> 0;
  return (
    (e ^= e >>> 16),
    (e = Math.imul(e, 2146121005)),
    (e ^= e >>> 15),
    (e = Math.imul(e, 2221713035)),
    (e ^= e >>> 16),
    e >>> 0 || 1
  );
}
export function fighterId(s, e) {
  return `f-${mixSeed(s + e * 7919).toString(16)}`;
}
export function createStartingRoster(s, e) {
  return STARTING_FIGHTERS.map((t, a) => {
    const i = e === "road-wardens" ? 8 : 0,
      n = e === "oathless" ? 4 : 0,
      r = e === "oathless" ? 2 : 0;
    return {
      ...t,
      id: fighterId(s, a),
      headArmor: t.headArmor + i,
      headArmorMax: t.headArmorMax + i,
      bodyArmor: t.bodyArmor + i,
      bodyArmorMax: t.bodyArmorMax + i,
      resolve: t.resolve + n,
      wage: t.wage + r,
      level: 1,
      xp: 0,
      alive: !0,
      injuries: [],
      kills: 0,
      battles: 0,
      perkPoints: 0,
      perks: [],
      weaponQuality: 1,
      armorQuality: 1,
    };
  });
}
export function createRecruit(s, e) {
  const t = RECRUIT_POOL[mixSeed(s + e * 101) % RECRUIT_POOL.length],
    a = ["spear", "sword", "mace", "axe"],
    i = a[mixSeed(s + e * 211) % a.length],
    n = mixSeed(s + e * 307) % 12;
  return {
    id: fighterId(s + 2748, e),
    name: t[0],
    epithet: t[1],
    background: t[2],
    level: 1,
    xp: 0,
    hp: 62 + n,
    hpMax: 62 + n,
    headArmor: 18 + n,
    headArmorMax: 18 + n,
    bodyArmor: 44 + n * 2,
    bodyArmorMax: 44 + n * 2,
    initiative: 94 + (mixSeed(s + e * 401) % 24),
    meleeSkill: 58 + (mixSeed(s + e * 503) % 9),
    meleeDefense: 2 + (mixSeed(s + e * 601) % 6),
    resolve: 43 + (mixSeed(s + e * 701) % 15),
    weaponId: i,
    hasShield: i === "spear" || i === "sword",
    wage: 10 + (mixSeed(s + e * 809) % 7),
    hireCost: 135 + (mixSeed(s + e * 907) % 130),
    alive: !0,
    injuries: [],
    kills: 0,
    battles: 0,
    perkPoints: 0,
    perks: [],
    weaponQuality: 1,
    armorQuality: 1,
  };
}
export function contractsHere(s) {
  return contractsAt(s, s.currentLocation);
}

// The board as it stands today at any location. Only the company's own town
// posts contracts it can accept; elsewhere this is a planning preview, and the
// terms are re-rolled on arrival because they move with the day and the
// company's record.
export function contractsAt(s, location) {
  return CONTRACTS.filter((e) => e.locationId === location)
    .filter((e) => e.story !== "final" || s.completedContracts >= 6)
    .map((e, t) => {
      const { baseDanger: a, baseReward: i, ...n } = e,
        r = Math.min(3, a + (s.threat >= 65 ? 1 : 0));
      return {
        ...n,
        id: `contract-${location}-${s.day}-${t}`,
        seed: mixSeed(
          s.baseSeed + s.day * 4099 + t * 65537 + s.completedContracts * 313,
        ),
        expiresDay: s.day + 4 + t,
        danger: r,
        reward: i + s.completedContracts * 22 + r * 20,
        enemyPower: 0.82 + r * 0.07 + s.threat * 0.0025,
      };
    });
}
export function rollRecruits(s) {
  return Array.from({ length: 3 }, (e, t) =>
    createRecruit(s.baseSeed + s.day * 1297, t),
  );
}
export function rollMarket(s) {
  const e = Math.min(3, 2 + Math.floor(s.completedContracts / 4)),
    t = mixSeed(s.baseSeed + s.day * 1999 + s.currentLocation.length * 811),
    a = ["sword", "spear", "axe", "mace"],
    i = a[t % a.length];
  return [
    {
      id: `market-${s.day}-weapon`,
      type: "weapon",
      name:
        e === 1
          ? "Honed weapon service"
          : e === 2
            ? "Veteran's weapon refit"
            : "Masterwork edge and balance",
      description: `Upgrade one fighter's equipped weapon to quality ${e}.`,
      cost: 150 + e * 115,
      quantity: 1,
      weaponId: i,
      quality: e,
    },
    {
      id: `market-${s.day}-armor`,
      type: "armor",
      name:
        e === 1
          ? "Padded reinforcement"
          : e === 2
            ? "Riveted mail refit"
            : "Frontier plate harness",
      description: `Upgrade one fighter's armor to quality ${e}.`,
      cost: 190 + e * 140,
      quantity: 1,
      quality: e,
    },
    {
      id: `market-${s.day}-food`,
      type: "food",
      name: "Road provisions",
      description: "Twelve food packed for wet roads.",
      cost: 72,
      quantity: 12,
    },
    {
      id: `market-${s.day}-tools`,
      type: "tools",
      name: "Smith's tool roll",
      description: "Four tools for field armor repairs.",
      cost: 108,
      quantity: 4,
    },
    {
      id: `market-${s.day}-medicine`,
      type: "medicine",
      name: "Surgeon's satchel",
      description: "Three measures of medicine.",
      cost: 165,
      quantity: 3,
    },
  ];
}
export function rollRoadEvent(s) {
  return structuredClone(
    ROAD_EVENTS[
      mixSeed(s.baseSeed + s.day * 3571 + s.currentLocation.length) %
        ROAD_EVENTS.length
    ],
  );
}
