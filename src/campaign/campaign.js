import { LOCATIONS, PERKS } from "./data.js";
import {
  contractsHere,
  createStartingRoster,
  mixSeed,
  rollMarket,
  rollRecruits,
  rollRoadEvent,
} from "./generation.js";
import { readDisplaySettings } from "../display-settings.js";

export function createCampaign(s, e, t, a) {
  const i = mixSeed(Date.now() + s * 10007),
    n = {
      version: 2,
      slot: s,
      id: `campaign-${i.toString(16)}`,
      baseSeed: i,
      companyName: e.trim() || "The Iron Company",
      origin: t,
      day: 1,
      crowns: t === "caravan-guard" ? 1e3 : 750,
      food: 48,
      tools: t === "caravan-guard" ? 11 : 8,
      medicine: 5,
      renown: 0,
      threat: 18,
      status: "active",
      endingReason: "",
      currentLocation: "cinderfall",
      discoveredLocations: ["cinderfall", "fenmere", "cael-watch"],
      reputations: { "free-towns": 0, fenwardens: 0, "house-cael": 0 },
      completedContracts: 0,
      victories: 0,
      defeats: 0,
      roster: createStartingRoster(i, t),
      armory: {
        sword: 1,
        spear: 1,
        axe: 1,
        mace: 1,
        shields: t === "road-wardens" ? 4 : 2,
      },
      recruits: [],
      contracts: [],
      market: [],
      pendingEvent: null,
      settings: { ...readDisplaySettings(), tutorialSeen: !1 },
      history: ["The company took its name and its first unpaid road."],
      lastPlayed: new Date().toISOString(),
    };
  return (
    (n.recruits = rollRecruits(n)),
    (n.contracts = contractsHere(n)),
    (n.market = rollMarket(n)),
    n
  );
}
export function migrateCampaign(s) {
  if (!s || typeof s != "object") return null;
  const e = structuredClone(s);
  if (e.version !== 1 && e.version !== 2) return null;
  const t = e;
  return (
    (t.version = 2),
    (t.threat ??= Math.min(72, 18 + Math.max(0, (t.day ?? 1) - 1) * 2)),
    (t.status ??= "active"),
    (t.endingReason ??= ""),
    (t.currentLocation ??= "cinderfall"),
    (t.discoveredLocations ??= ["cinderfall", "fenmere", "cael-watch"]),
    (t.reputations ??= { "free-towns": 0, fenwardens: 0, "house-cael": 0 }),
    (t.completedContracts ??= 0),
    (t.victories ??= 0),
    (t.defeats ??= 0),
    (t.pendingEvent ??= null),
    (t.settings ??= {
      reducedMotion: !1,
      highContrast: !1,
      largeText: !1,
      tutorialSeen: !1,
    }),
    (t.roster = (t.roster ?? []).map((a) => ({
      ...a,
      perkPoints: a.perkPoints ?? 0,
      perks: a.perks ?? [],
      weaponQuality: a.weaponQuality ?? 1,
      armorQuality: a.armorQuality ?? 1,
    }))),
    (t.recruits = (t.recruits ?? []).map((a) => ({
      ...a,
      perkPoints: a.perkPoints ?? 0,
      perks: a.perks ?? [],
      weaponQuality: a.weaponQuality ?? 1,
      armorQuality: a.armorQuality ?? 1,
    }))),
    (t.contracts = contractsHere(t)),
    (t.market = rollMarket(t)),
    t
  );
}
export function dailyWages(s) {
  return s.roster.filter((e) => e.alive).reduce((e, t) => e + t.wage, 0);
}
export function isLocationUnlocked(s, e) {
  return ["cinderfall", "fenmere", "cael-watch"].includes(e)
    ? !0
    : ["blackbriar", "red-quarry"].includes(e)
      ? s.completedContracts >= 2
      : e === "iron-pass"
        ? s.completedContracts >= 4
        : s.completedContracts >= 6;
}
export function evaluateCampaignStatus(s) {
  return (
    s.status !== "active" ||
      (s.roster.filter((t) => t.alive).length < 6
        ? ((s.status = "defeat"),
          (s.endingReason =
            "Fewer than six fighters remain to hold a battle line."))
        : s.threat >= 100
          ? ((s.status = "defeat"),
            (s.endingReason =
              "The Ironbound closed every road before the company could break their claim."))
          : s.day > 50
            ? ((s.status = "defeat"),
              (s.endingReason =
                "The frontier compact collapsed after fifty days of unpaid blood."))
            : s.crowns <= 0 &&
              s.food <= 0 &&
              ((s.status = "defeat"),
              (s.endingReason =
                "With no crowns and no food, the company ledger closed itself."))),
    s.status
  );
}
export function refreshOffers(s) {
  ((s.contracts = contractsHere(s)),
    (s.recruits = rollRecruits(s)),
    (s.market = rollMarket(s)),
    (s.lastPlayed = new Date().toISOString()));
}
export function travelTo(s, e) {
  const t = LOCATIONS[s.currentLocation],
    i = s.roster.filter((r) => r.alive).length * 2,
    n = dailyWages(s) * 2;
  return s.status !== "active"
    ? { success: !1, message: "This company run has ended." }
    : t.neighbors.includes(e)
      ? isLocationUnlocked(s, e)
        ? s.food < i
          ? { success: !1, message: `Travel requires ${i} food.` }
          : s.crowns < n
            ? {
                success: !1,
                message: `Travel requires ${n} crowns in wages.`,
              }
            : ((s.day += 2),
              (s.food -= i),
              (s.crowns -= n),
              (s.threat = Math.min(100, s.threat + 4)),
              (s.currentLocation = e),
              s.discoveredLocations.includes(e) ||
                s.discoveredLocations.push(e),
              (s.pendingEvent = rollRoadEvent(s)),
              s.history.push(
                `Day ${s.day}: the company reached ${LOCATIONS[e].name}.`,
              ),
              refreshOffers(s),
              evaluateCampaignStatus(s),
              {
                success: !0,
                message: `${LOCATIONS[e].name} reached. ${n} crowns and ${i} food spent.`,
              })
        : {
            success: !1,
            message: "That road is still held by the frontier threat.",
          }
      : { success: !1, message: "No direct road leads there." };
}
export function buyOffer(s, e, t) {
  const a = s.market.find((r) => r.id === e);
  if (!a) return { success: !1, message: "That offer is no longer available." };
  if (s.crowns < a.cost)
    return { success: !1, message: "The company cannot afford it." };
  const i = t ? s.roster.find((r) => r.id === t && r.alive) : void 0;
  if ((a.type === "weapon" || a.type === "armor") && !i)
    return { success: !1, message: "Choose a living fighter for the refit." };
  const n = a.quality ?? 1;
  if (a.type === "weapon" && i) {
    if (i.weaponQuality >= n)
      return {
        success: !1,
        message: `${i.name} already carries work of that quality.`,
      };
    i.weaponQuality = n;
  } else if (a.type === "armor" && i) {
    if (i.armorQuality >= n)
      return {
        success: !1,
        message: `${i.name} already wears armor of that quality.`,
      };
    const r = (n - i.armorQuality) * 18;
    ((i.armorQuality = n),
      (i.headArmorMax += Math.ceil(r * 0.35)),
      (i.bodyArmorMax += Math.floor(r * 0.65)),
      (i.headArmor = i.headArmorMax),
      (i.bodyArmor = i.bodyArmorMax));
  } else
    a.type === "shield"
      ? (s.armory.shields += a.quantity)
      : a.type === "food"
        ? (s.food += a.quantity)
        : a.type === "tools"
          ? (s.tools += a.quantity)
          : a.type === "medicine" && (s.medicine += a.quantity);
  return (
    (s.crowns -= a.cost),
    (s.market = s.market.filter((r) => r.id !== e)),
    s.history.push(
      `${a.name} purchased in ${LOCATIONS[s.currentLocation].name} for ${a.cost} crowns.`,
    ),
    { success: !0, message: `${a.name} added to company stores.` }
  );
}
export function resolveRoadEvent(s, e) {
  const t = s.pendingEvent;
  if (!t) return "No road event is waiting.";
  let a = "The road moves on.";
  if (t.id === "broken-cart" && e === "help")
    (s.tools > 0 && (s.tools -= 1),
      (s.food += 8),
      (s.reputations["free-towns"] += 3),
      (a = "The merchant pays in provisions and a useful word ahead of you."));
  else if (t.id === "broken-cart")
    ((s.crowns += 110),
      (s.reputations["free-towns"] -= 2),
      (a = "The axle is mended. Your price is remembered."));
  else if (t.id === "old-fire" && e === "take")
    ((s.medicine += 3),
      (s.threat += 4),
      (a = "The medicine is good. Whoever owned it now follows your tracks."));
  else if (t.id === "old-fire")
    ((s.day += 1),
      (s.renown += 2),
      (s.reputations[LOCATIONS[s.currentLocation].reputation] += 2),
      (a =
        "The wounded owners return before dawn and carry your name onward."));
  else if (t.id === "stone-oath" && e === "carve") {
    ((s.day += 1), (s.renown += 3));
    for (const i of s.roster.filter((n) => n.alive)) i.resolve += 1;
    a = "The company name joins the dead stone. No one laughs afterward.";
  } else if (t.id === "black-storm" && e === "shelter")
    ((s.day += 1),
      (s.food = Math.max(0, s.food - s.roster.filter((i) => i.alive).length)),
      (a = "The storm takes a day, but no blood."));
  else if (t.id === "black-storm") {
    for (const i of s.roster.filter((n) => n.alive).slice(0, 3))
      i.hp = Math.max(1, i.hp - 8);
    a = "The company reaches the road ahead, bruised and soaked through.";
  }
  return (
    (s.pendingEvent = null),
    s.history.push(`${t.title}: ${a}`),
    evaluateCampaignStatus(s),
    a
  );
}
export function choosePerk(s, e, t) {
  const a = s.roster.find((i) => i.id === e && i.alive);
  return !a || a.perkPoints <= 0 || a.perks.includes(t)
    ? !1
    : ((a.perkPoints -= 1),
      a.perks.push(t),
      t === "vanguard" && ((a.meleeSkill += 3), (a.initiative += 5)),
      t === "bulwark" &&
        ((a.meleeDefense += 2),
        (a.headArmorMax += 6),
        (a.bodyArmorMax += 12),
        (a.headArmor += 6),
        (a.bodyArmor += 12)),
      t === "slayer" &&
        ((a.meleeSkill += 2),
        (a.weaponQuality = Math.min(3, a.weaponQuality + 1))),
      t === "steadfast" && (a.resolve += 6),
      t === "pathfinder" && ((a.initiative += 10), (a.hpMax += 4), (a.hp += 4)),
      t === "quartermaster" && (a.wage = Math.max(5, a.wage - 3)),
      s.history.push(`${a.name} learned ${PERKS[t].name}.`),
      !0);
}
export function equipWeapon(s, e, t) {
  const a = s.roster.find((i) => i.id === e && i.alive);
  return !a || a.weaponId === t || s.armory[t] <= 0
    ? !1
    : ((s.armory[a.weaponId] += 1),
      (s.armory[t] -= 1),
      (a.weaponId = t),
      (s.lastPlayed = new Date().toISOString()),
      !0);
}
export function toggleShield(s, e) {
  const t = s.roster.find((a) => a.id === e && a.alive);
  return t
    ? t.hasShield
      ? ((t.hasShield = !1), (s.armory.shields += 1), !0)
      : s.armory.shields <= 0
        ? !1
        : ((t.hasShield = !0), (s.armory.shields -= 1), !0)
    : !1;
}
export function hireRecruit(s, e) {
  const t = s.recruits.find((n) => n.id === e);
  if (
    !t ||
    s.crowns < t.hireCost ||
    s.roster.filter((n) => n.alive).length >= 12
  )
    return !1;
  s.crowns -= t.hireCost;
  const { hireCost: a, ...i } = t;
  return (
    s.roster.push(i),
    (s.recruits = s.recruits.filter((n) => n.id !== e)),
    s.history.push(
      `${i.name}, ${i.background.toLowerCase()}, joined for ${t.hireCost} crowns.`,
    ),
    !0
  );
}
export function restOneDay(s) {
  const e = s.roster.filter((n) => n.alive),
    t = e.length,
    a = dailyWages(s);
  if (s.food < t)
    return {
      success: !1,
      message: "There is not enough food for a full day's rest.",
    };
  if (s.crowns < a)
    return {
      success: !1,
      message: "The company cannot cover another day's wages.",
    };
  ((s.day += 1),
    (s.threat = Math.min(100, s.threat + 2)),
    (s.food -= t),
    (s.crowns -= a));
  let i = 0;
  for (const n of e)
    ((n.hp = Math.min(n.hpMax, n.hp + 12)),
      n.injuries.length > 0 &&
        s.medicine > i &&
        (n.injuries.shift(), (i += 1)));
  return (
    (s.medicine -= i),
    refreshOffers(s),
    s.history.push(
      `Day ${s.day}: the company rested and paid ${a} crowns in wages.`,
    ),
    evaluateCampaignStatus(s),
    {
      success: !0,
      message: `The company rested. ${a} crowns and ${t} food were consumed.`,
    }
  );
}
export function repairArmor(s) {
  const e = s.roster.filter((r) => r.alive),
    t = e.reduce(
      (r, o) => r + o.headArmorMax - o.headArmor + o.bodyArmorMax - o.bodyArmor,
      0,
    );
  if (t <= 0)
    return {
      success: !1,
      message: "Every serviceable armor piece is already repaired.",
    };
  if (s.tools <= 0) return { success: !1, message: "No tools remain." };
  const a = Math.min(t, s.tools * 24),
    i = Math.ceil(a / 24);
  let n = a;
  for (const r of e) {
    const o = Math.min(n, r.bodyArmorMax - r.bodyArmor);
    ((r.bodyArmor += o), (n -= o));
    const l = Math.min(n, r.headArmorMax - r.headArmor);
    if (((r.headArmor += l), (n -= l), n <= 0)) break;
  }
  return (
    (s.tools -= i),
    s.history.push(`${i} tools restored ${a} points of armor.`),
    { success: !0, message: `${a} armor restored using ${i} tools.` }
  );
}
