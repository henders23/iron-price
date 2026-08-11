// Battlefield presentation tests. The board fit and the fighter portraits are
// pure functions of state, so a battlefield that would render off-screen — or a
// fighter whose face changes between frames — fails the build instead of being
// spotted mid-battle.
import test from "node:test";
import assert from "node:assert/strict";

import { buildBattlefield } from "../src/battle/battlefields.js";
import { createBattleState } from "../src/battle/state.js";
import {
  HEX_MIN_SIZE,
  MAX_CANVAS_PIXELS,
  MAX_CANVAS_SIDE,
  SQRT3,
  battlefieldBounds,
  battlefieldLayout,
  canvasBackingRatio,
} from "../src/ui/battle-layout.js";
import { armorTint, portraitTraits } from "../src/ui/portrait.js";

const VIEWPORTS = [
  [1609, 846],
  [1129, 666],
  [969, 512],
  [743, 562],
  [679, 494],
  [1440, 1600],
];

function hexCenter(layout, tile) {
  return {
    x: layout.origin.x + layout.size * SQRT3 * (tile.q + tile.r / 2),
    y: layout.origin.y + layout.size * 1.5 * tile.r,
  };
}

test("every hex of every battlefield fits inside the canvas", () => {
  for (const variant of ["ash-road", "fen-crossing", "old-watch"]) {
    const tiles = buildBattlefield(variant);
    for (const [width, height] of VIEWPORTS) {
      const layout = battlefieldLayout(tiles, width, height);
      assert.ok(
        layout.size >= HEX_MIN_SIZE,
        `${variant} collapsed the hex size`,
      );
      for (const tile of tiles) {
        const center = hexCenter(layout, tile);
        const half = (layout.size * SQRT3) / 2;
        assert.ok(
          center.x - half >= -0.001 && center.x + half <= width + 0.001,
          `${variant} ${width}x${height}: hex ${tile.q},${tile.r} is off the horizontal edge`,
        );
        assert.ok(
          center.y - layout.size >= -0.001 &&
            center.y + layout.size <= height + 0.001,
          `${variant} ${width}x${height}: hex ${tile.q},${tile.r} is off the vertical edge`,
        );
      }
    }
  }
});

test("the battlefield is centred in the canvas", () => {
  const tiles = buildBattlefield("ash-road");
  const [width, height] = [1129, 666];
  const layout = battlefieldLayout(tiles, width, height);
  const centers = tiles.map((tile) => hexCenter(layout, tile));
  const half = (layout.size * SQRT3) / 2;
  const left = Math.min(...centers.map((point) => point.x)) - half;
  const right = width - (Math.max(...centers.map((point) => point.x)) + half);
  const top = Math.min(...centers.map((point) => point.y)) - layout.size;
  const bottom =
    height - (Math.max(...centers.map((point) => point.y)) + layout.size);
  assert.ok(Math.abs(left - right) < 0.001, "horizontally off centre");
  assert.ok(Math.abs(top - bottom) < 0.001, "vertically off centre");
});

test("bounds cover the whole grid and survive an empty board", () => {
  const bounds = battlefieldBounds(buildBattlefield("ash-road"));
  assert.deepEqual(bounds, { minAxis: 0, maxAxis: 11.5, minRow: 0, maxRow: 9 });
  const fallback = battlefieldLayout([], 1129, 666);
  assert.ok(fallback.size > HEX_MIN_SIZE);
});

test("the canvas backing store stays inside what browsers will paint", () => {
  const boards = [
    [1679, 696, 1],
    [1679, 696, 2],
    [2249, 846, 2],
    [3129, 1206, 2],
    [4809, 1206, 2],
    [7680, 2160, 3],
  ];
  for (const [width, height, deviceRatio] of boards) {
    const ratio = canvasBackingRatio(width, height, deviceRatio);
    const backing = [Math.floor(width * ratio), Math.floor(height * ratio)];
    assert.ok(
      backing[0] <= MAX_CANVAS_SIDE && backing[1] <= MAX_CANVAS_SIDE,
      `${width}x${height}@${deviceRatio} exceeds the per-side limit: ${backing}`,
    );
    assert.ok(
      backing[0] * backing[1] <= MAX_CANVAS_PIXELS,
      `${width}x${height}@${deviceRatio} exceeds the area limit: ${backing}`,
    );
    assert.ok(ratio > 0, "the board would have no backing store at all");
  }
  assert.equal(
    canvasBackingRatio(1129, 666, 1),
    1,
    "a plain display lost crispness",
  );
  assert.equal(
    canvasBackingRatio(1129, 666, 2),
    2,
    "a retina display lost crispness",
  );
  assert.equal(
    canvasBackingRatio(1129, 666, 4),
    2,
    "the ratio is not capped at 2",
  );
});

test("a fighter's portrait is stable and personal", () => {
  const state = createBattleState(1230131022);
  const first = state.units.map((unit) => portraitTraits(unit));
  const again = structuredClone(state).units.map((unit) =>
    portraitTraits(unit),
  );
  assert.deepEqual(first, again, "portraits changed between reads");

  const wounded = structuredClone(state.units[0]);
  ((wounded.hp = 3), (wounded.morale = "wavering"), (wounded.fatigue = 90));
  assert.deepEqual(
    portraitTraits(wounded),
    first[0],
    "damage rewrote a fighter's face",
  );

  const faces = new Set(
    first.map(
      (traits) =>
        `${traits.skin}|${traits.hair}|${traits.hairStyle}|${traits.beard}`,
    ),
  );
  assert.ok(
    faces.size >= 6,
    `only ${faces.size} distinct faces in twelve fighters`,
  );
});

test("portrait helmets and tints follow equipment and allegiance", () => {
  const state = createBattleState(1230131022);
  const captain = state.units.find((unit) => unit.id === "c1");
  assert.equal(portraitTraits(captain).helmet, "great-helm");
  assert.equal(
    portraitTraits({ ...captain, headArmorMax: 0 }).helmet,
    "none",
    "a bare head still drew a helmet",
  );
  assert.equal(armorTint(captain), "#4f737d");
  assert.notEqual(
    armorTint(state.units.find((unit) => unit.team === "enemy")),
    "#4f737d",
    "the enemy wears company colours",
  );
});
