import { access, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const manifest = JSON.parse(await readFile(join(root, "assets/art/manifest.json"), "utf8"));
const html = await readFile(join(root, "Iron Price.html"), "utf8");
const expected = Object.values(manifest.counts).reduce((total, count) => total + count, 0);

const files = [
  ...["origin-broken-wardens", "origin-caravan-remnant", "origin-oathless", "event-broken-cart", "event-old-fire", "event-stone-oath", "event-black-storm", "ending-victory", "ending-last-six", "ending-ironbound-threat", "ending-fifty-days", "ending-starvation"].map((name) => `scenes/${name}.webp`),
  ...manifest.weapons.flatMap((weapon) => manifest.weaponTiers.map((tier) => `icons/weapons/${weapon}-${tier}.webp`)),
  ...manifest.resources.map((name) => `icons/resources/${name}.webp`),
  ...manifest.emblems.map((name) => `emblems/${name}.webp`),
  ...manifest.overlays.map((name) => `overlays/${name}.webp`),
];

if (files.length !== expected) throw new Error(`Manifest count mismatch: expected ${expected}, listed ${files.length}`);
for (const relative of files) {
  const file = join(root, "assets/art", relative);
  await access(file);
  if ((await stat(file)).size === 0) throw new Error(`Empty asset: ${relative}`);
}

for (const required of ["assets/art/art.css", "assets/art/runtime.js", ...manifest.overlays.map((name) => `overlays/${name}.webp`)]) {
  if (!html.includes(required)) throw new Error(`Game build does not reference ${required}`);
}

console.log(`Verified ${files.length} art assets and all runtime integrations.`);
