// Rule-level tests. These exercise the campaign and battle rules directly,
// with no DOM, so a regression in the simulation fails the build rather than
// waiting to be noticed in play.
import test from "node:test";
import assert from "node:assert/strict";

import {
  buyOffer,
  createCampaign,
  dailyWages,
  equipWeapon,
  evaluateCampaignStatus,
  hireRecruit,
  isLocationUnlocked,
  repairArmor,
  restOneDay,
  toggleShield,
  travelTo,
} from "../src/campaign/campaign.js";
import {
  contractsHere,
  rollMarket,
  rollRecruits,
} from "../src/campaign/generation.js";
import { LOCATIONS, ORIGINS } from "../src/campaign/data.js";
import {
  buildContractBattle,
  resolveBattleOutcome,
} from "../src/campaign/battle-bridge.js";
import {
  battleStateHash,
  createBattleState,
  replayBattle,
} from "../src/battle/state.js";
import { applyCommand } from "../src/battle/rules.js";
import { chooseAiCommand } from "../src/battle/ai.js";

// `createCampaign` seeds itself from the clock; pin it so every run is identical.
const FIXED_NOW = 1700000000000;
function newCampaign(
  slot = 1,
  name = "The Broken Wardens",
  origin = "road-wardens",
) {
  const realNow = Date.now;
  Date.now = () => FIXED_NOW;
  try {
    return createCampaign(slot, name, origin);
  } finally {
    Date.now = realNow;
  }
}

const living = (campaign) => campaign.roster.filter((f) => f.alive);

// Deploys the company into the left-hand zone and plays the battle out with the
// deterministic AI. Returns the final state and the full command log.
function playOut(start, limit = 4000) {
  let state = start;
  const commands = [];
  const send = (command) => {
    const result = applyCommand(state, command);
    if (result.error) return result.error;
    state = result.state;
    commands.push(command);
    return null;
  };
  state.units
    .filter((unit) => unit.team === "company")
    .slice(0, 6)
    .forEach((unit, index) => {
      const row = index + 1;
      const error = send({
        type: "deploy",
        unitId: unit.id,
        destination: { q: 1 - Math.floor(row / 2), r: row },
      });
      assert.equal(error, null, `deploy rejected: ${error}`);
    });
  assert.equal(send({ type: "startBattle" }), null);
  let steps = 0;
  while (state.phase === "battle" && steps < limit) {
    const command = chooseAiCommand(state);
    if (!command) break;
    const error = send(command);
    assert.equal(error, null, `AI issued an invalid command: ${error}`);
    steps += 1;
  }
  return { state, commands, steps };
}

test("a new company starts with the resources its origin promises", () => {
  const wardens = newCampaign(1, "The Broken Wardens", "road-wardens");
  assert.equal(wardens.roster.length, 8);
  assert.equal(living(wardens).length, 8);
  assert.equal(wardens.day, 1);
  assert.equal(wardens.crowns, 750);
  assert.equal(wardens.armory.shields, 4);
  assert.equal(wardens.currentLocation, "cinderfall");
  assert.equal(wardens.status, "active");

  const caravan = newCampaign(2, "The Oathless", "caravan-guard");
  assert.equal(caravan.crowns, 1000);
  assert.equal(caravan.tools, 11);
  assert.ok(Object.keys(ORIGINS).includes(caravan.origin));
});

test("company name falls back when it is blank", () => {
  assert.equal(newCampaign(1, "   ").companyName, "The Iron Company");
});

test("daily wages count only the living", () => {
  const campaign = newCampaign();
  const expected = campaign.roster.reduce((total, f) => total + f.wage, 0);
  assert.equal(dailyWages(campaign), expected);

  campaign.roster[0].alive = false;
  assert.equal(dailyWages(campaign), expected - campaign.roster[0].wage);
});

test("roads open as contracts are completed", () => {
  const campaign = newCampaign();
  const openRoads = () =>
    Object.keys(LOCATIONS).filter((id) => isLocationUnlocked(campaign, id));

  assert.deepEqual(openRoads().sort(), ["cael-watch", "cinderfall", "fenmere"]);
  campaign.completedContracts = 2;
  assert.ok(openRoads().includes("blackbriar"));
  assert.ok(openRoads().includes("red-quarry"));
  assert.ok(!openRoads().includes("iron-pass"));
  campaign.completedContracts = 4;
  assert.ok(openRoads().includes("iron-pass"));
  assert.ok(!openRoads().includes("crowns-end"));
  campaign.completedContracts = 6;
  assert.equal(openRoads().length, Object.keys(LOCATIONS).length);
});

test("travel refuses roads that do not exist or are still held", () => {
  const campaign = newCampaign();
  assert.equal(
    travelTo(campaign, "crowns-end").message,
    "No direct road leads there.",
  );
  campaign.currentLocation = "cael-watch";
  const held = travelTo(campaign, "red-quarry");
  assert.equal(held.success, false);
  assert.match(held.message, /still held/);
  assert.equal(campaign.currentLocation, "cael-watch");
});

test("travel refuses to leave without food or wages", () => {
  const campaign = newCampaign();
  campaign.food = 0;
  const hungry = travelTo(campaign, "fenmere");
  assert.equal(hungry.success, false);
  assert.match(hungry.message, /food/);

  campaign.food = 999;
  campaign.crowns = 0;
  const broke = travelTo(campaign, "fenmere");
  assert.equal(broke.success, false);
  assert.match(broke.message, /wages/);
  assert.equal(campaign.day, 1);
});

test("a successful march charges exactly two days of upkeep", () => {
  const campaign = newCampaign();
  const foodBefore = campaign.food;
  const crownsBefore = campaign.crowns;
  const threatBefore = campaign.threat;
  const expectedFood = living(campaign).length * 2;
  const expectedCrowns = dailyWages(campaign) * 2;

  const result = travelTo(campaign, "fenmere");
  assert.equal(result.success, true);
  assert.equal(campaign.currentLocation, "fenmere");
  assert.equal(campaign.day, 3);
  assert.equal(campaign.food, foodBefore - expectedFood);
  assert.equal(campaign.crowns, crownsBefore - expectedCrowns);
  assert.equal(campaign.threat, threatBefore + 4);
  assert.ok(campaign.discoveredLocations.includes("fenmere"));
  assert.match(campaign.history.at(-1), /reached Fenmere/);
});

test("contracts are local, deterministic, and hold the final one back", () => {
  const campaign = newCampaign();
  const offered = contractsHere(campaign);
  assert.ok(offered.length > 0);
  for (const contract of offered)
    assert.equal(contract.locationId, "cinderfall");
  assert.deepEqual(
    contractsHere(campaign).map((c) => c.id),
    offered.map((c) => c.id),
  );

  campaign.currentLocation = "crowns-end";
  assert.equal(contractsHere(campaign).length, 0);
  campaign.completedContracts = 6;
  assert.equal(contractsHere(campaign).length, 1);
});

test("danger and reward rise with threat and progress", () => {
  const calm = newCampaign();
  const dire = newCampaign();
  dire.threat = 80;
  dire.completedContracts = 3;
  const [calmFirst] = contractsHere(calm);
  const [direFirst] = contractsHere(dire);
  assert.ok(direFirst.danger > calmFirst.danger);
  assert.ok(direFirst.reward > calmFirst.reward);
});

test("market and recruit rolls are a pure function of seed and day", () => {
  const campaign = newCampaign();
  assert.deepEqual(rollMarket(campaign), rollMarket(campaign));
  assert.deepEqual(rollRecruits(campaign), rollRecruits(campaign));
  const later = { ...campaign, day: campaign.day + 1 };
  assert.notDeepEqual(rollRecruits(campaign), rollRecruits(later));
});

test("resting pays wages, eats food, heals, and advances the threat", () => {
  const campaign = newCampaign();
  campaign.roster[0].hp = 10;
  const wages = dailyWages(campaign);
  const mouths = living(campaign).length;
  const result = restOneDay(campaign);

  assert.equal(result.success, true);
  assert.equal(campaign.day, 2);
  assert.equal(campaign.threat, 20);
  assert.equal(campaign.crowns, 750 - wages);
  assert.equal(campaign.food, 48 - mouths);
  assert.equal(campaign.roster[0].hp, 22);
});

test("resting is refused when the company cannot pay for it", () => {
  const campaign = newCampaign();
  campaign.food = 0;
  assert.match(restOneDay(campaign).message, /not enough food/);
  campaign.food = 999;
  campaign.crowns = 0;
  assert.match(restOneDay(campaign).message, /cannot cover/);
  assert.equal(campaign.day, 1);
});

test("armor repair consumes tools and stops at undamaged armor", () => {
  const campaign = newCampaign();
  assert.match(repairArmor(campaign).message, /already repaired/);

  campaign.roster[0].bodyArmor -= 30;
  const tools = campaign.tools;
  const result = repairArmor(campaign);
  assert.equal(result.success, true);
  assert.equal(campaign.roster[0].bodyArmor, campaign.roster[0].bodyArmorMax);
  // One tool mends 24 points, so 30 points of damage costs two.
  assert.equal(campaign.tools, tools - 2);
  assert.match(result.message, /^30 armor restored using 2 tools\./);

  campaign.tools = 0;
  campaign.roster[0].bodyArmor -= 10;
  assert.match(repairArmor(campaign).message, /No tools remain/);
});

test("purchases, hires and loadout changes hold the company ledger straight", () => {
  const campaign = newCampaign();
  const offer = campaign.market.find((o) => o.type === "food");
  const crowns = campaign.crowns;
  const food = campaign.food;
  assert.equal(buyOffer(campaign, offer.id, null).success, true);
  assert.equal(campaign.crowns, crowns - offer.cost);
  assert.equal(campaign.food, food + offer.quantity);
  assert.equal(buyOffer(campaign, offer.id, null).success, false);

  const recruit = campaign.recruits[0];
  assert.equal(hireRecruit(campaign, recruit.id), true);
  assert.equal(living(campaign).length, 9);
  assert.equal(hireRecruit(campaign, recruit.id), false);

  const fighter = campaign.roster[0];
  campaign.armory.axe = 1;
  assert.equal(equipWeapon(campaign, fighter.id, "axe"), true);
  assert.equal(fighter.weaponId, "axe");
  assert.equal(equipWeapon(campaign, fighter.id, "axe"), false);

  const hadShield = fighter.hasShield;
  assert.equal(toggleShield(campaign, fighter.id), true);
  assert.equal(fighter.hasShield, !hadShield);
});

test("the run ends on each of its defeat conditions", () => {
  const thin = newCampaign();
  thin.roster.slice(0, 3).forEach((f) => (f.alive = false));
  assert.equal(evaluateCampaignStatus(thin), "defeat");
  assert.match(thin.endingReason, /Fewer than six/);

  const overrun = newCampaign();
  overrun.threat = 100;
  assert.equal(evaluateCampaignStatus(overrun), "defeat");
  assert.match(overrun.endingReason, /closed every road/);

  const late = newCampaign();
  late.day = 51;
  assert.equal(evaluateCampaignStatus(late), "defeat");
  assert.match(late.endingReason, /fifty days/);

  const destitute = newCampaign();
  destitute.crowns = 0;
  destitute.food = 0;
  assert.equal(evaluateCampaignStatus(destitute), "defeat");
  assert.match(destitute.endingReason, /ledger closed itself/);

  assert.equal(evaluateCampaignStatus(newCampaign()), "active");
});

test("a battle needs exactly six living fighters", () => {
  const campaign = newCampaign();
  const contract = contractsHere(campaign)[0];
  assert.throws(
    () =>
      buildContractBattle(
        campaign,
        living(campaign)
          .slice(0, 4)
          .map((f) => f.id),
        contract,
      ),
    /six living company fighters/,
  );
});

test("commands are rejected outside the deployment zone and out of turn", () => {
  const state = createBattleState(1230131022);
  const company = state.units.filter((u) => u.team === "company");

  const farSide = applyCommand(state, {
    type: "deploy",
    unitId: company[0].id,
    destination: { q: 8, r: 4 },
  });
  assert.ok(farSide.error);

  const enemyDeploy = applyCommand(state, {
    type: "deploy",
    unitId: state.units.find((u) => u.team === "enemy").id,
    destination: { q: 1, r: 1 },
  });
  assert.match(enemyDeploy.error, /Only company fighters/);

  const early = applyCommand(state, {
    type: "endTurn",
    unitId: company[0].id,
  });
  assert.ok(early.error);
});

test("a seeded battle plays out identically every time", () => {
  const first = playOut(createBattleState(1230131022));
  const second = playOut(createBattleState(1230131022));

  assert.notEqual(first.state.phase, "battle", "the battle never resolved");
  assert.ok(first.steps > 20, "the AI barely acted");
  assert.equal(battleStateHash(first.state), battleStateHash(second.state));
  assert.deepEqual(first.commands, second.commands);
});

test("a battle replays from its command log to the same final state", () => {
  const { state, commands } = playOut(createBattleState(1230131022));
  const replayed = replayBattle({ seed: state.seed, commands });
  assert.equal(battleStateHash(replayed), battleStateHash(state));
});

test("different seeds produce different battles", () => {
  const a = playOut(createBattleState(1230131022));
  const b = playOut(createBattleState(77770001));
  assert.notEqual(battleStateHash(a.state), battleStateHash(b.state));
});

test("the aftermath pays the company and records what it cost", () => {
  const campaign = newCampaign();
  const contract = contractsHere(campaign)[0];
  const squad = living(campaign).slice(0, 6);
  const { state, commands } = playOut(
    buildContractBattle(
      campaign,
      squad.map((f) => f.id),
      contract,
    ),
  );
  const crowns = campaign.crowns;
  const renown = campaign.renown;

  const aftermath = resolveBattleOutcome(campaign, contract, state, commands);

  assert.equal(campaign.completedContracts, 1);
  assert.equal(campaign.day, 3);
  assert.equal(campaign.victories + campaign.defeats, 1);
  for (const fighter of squad)
    assert.equal(campaign.roster.find((f) => f.id === fighter.id).battles, 1);

  if (state.winner === "company") {
    assert.equal(campaign.victories, 1);
    assert.ok(campaign.renown > renown);
    assert.ok(campaign.crowns > crowns - dailyWages(campaign) * 2);
    assert.equal(aftermath.reward, contract.reward);
  } else {
    assert.equal(campaign.defeats, 1);
    assert.equal(aftermath.reward, 0);
  }
  assert.equal(
    aftermath.casualties.length,
    state.units.filter((u) => u.team === "company" && !u.alive).length,
  );
});
