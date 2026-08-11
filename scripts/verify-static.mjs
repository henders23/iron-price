import { access, open, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const artRoot = join(root, "assets/art");
const manifest = JSON.parse(
  await readFile(join(artRoot, "manifest.json"), "utf8"),
);
const indexHtml = await readFile(join(root, "index.html"), "utf8");
const legacyHtml = await readFile(join(root, "Iron Price.html"), "utf8");
const gameScript = await readFile(join(root, "src/game.js"), "utf8");
const artRuntime = await readFile(join(root, "src/art-runtime.js"), "utf8");
const musicPlayer = await readFile(join(root, "src/music-player.js"), "utf8");

const scenes = [
  "origin-broken-wardens",
  "origin-caravan-remnant",
  "origin-oathless",
  "event-broken-cart",
  "event-old-fire",
  "event-stone-oath",
  "event-black-storm",
  "ending-victory",
  "ending-last-six",
  "ending-ironbound-threat",
  "ending-fifty-days",
  "ending-starvation",
];
const artFiles = [
  ...scenes.map((name) => `scenes/${name}.webp`),
  ...manifest.weapons.flatMap((weapon) =>
    manifest.weaponTiers.map((tier) => `icons/weapons/${weapon}-${tier}.webp`),
  ),
  ...manifest.resources.map((name) => `icons/resources/${name}.webp`),
  ...manifest.emblems.map((name) => `emblems/${name}.webp`),
  ...manifest.overlays.map((name) => `overlays/${name}.webp`),
];
const expectedArtCount = Object.values(manifest.counts).reduce(
  (total, count) => total + count,
  0,
);

if (artFiles.length !== expectedArtCount) {
  throw new Error(
    `Manifest count mismatch: expected ${expectedArtCount}, listed ${artFiles.length}`,
  );
}

for (const relativePath of artFiles) {
  const file = join(artRoot, relativePath);
  await access(file);
  if ((await stat(file)).size === 0) {
    throw new Error(`Empty asset: ${relativePath}`);
  }
}

const fontFiles = [
  "cinzel-latin-var.woff2",
  "im-fell-english-latin.woff2",
  "im-fell-english-italic-latin.woff2",
  "jost-latin-var.woff2",
];
const screensCss = await readFile(join(root, "src/screens.css"), "utf8");
for (const font of fontFiles) {
  const file = join(root, "assets/fonts", font);
  await access(file);
  if ((await stat(file)).size === 0) {
    throw new Error(`Empty font: ${font}`);
  }
  if (!screensCss.includes(font)) {
    throw new Error(`screens.css does not reference ${font}.`);
  }
}

const entryReferences = [
  "./src/game.css",
  "./src/art.css",
  "./src/screens.css",
  "./src/music-player.css",
  "./src/game.js",
  "./src/art-runtime.js",
  "./src/music-player.js",
];
for (const reference of entryReferences) {
  if (!indexHtml.includes(reference)) {
    throw new Error(`index.html does not reference ${reference}`);
  }
}

if (!legacyHtml.includes("./index.html")) {
  throw new Error("The legacy launcher does not redirect to index.html.");
}

for (const overlay of manifest.overlays) {
  if (!gameScript.includes(`overlays/${overlay}.webp`)) {
    throw new Error(`Game runtime does not reference overlay ${overlay}.`);
  }
}

for (const required of ["MutationObserver", "assets/art/"]) {
  if (!artRuntime.includes(required)) {
    throw new Error(`Art runtime is missing ${required}.`);
  }
}

for (const required of [
  "iron-price-theme.mp3",
  "iron-price-music-enabled",
  "audio.loop = true",
  "startPlayback()",
]) {
  if (!musicPlayer.includes(required)) {
    throw new Error(`Music player is missing ${required}.`);
  }
}

const musicPath = join(root, "assets/audio/iron-price-theme.mp3");
const musicStats = await stat(musicPath);
if (musicStats.size < 1_000_000) {
  throw new Error("The music file is unexpectedly small.");
}

const musicFile = await open(musicPath, "r");
try {
  const header = Buffer.alloc(3);
  await musicFile.read(header, 0, header.length, 0);
  if (header.toString("ascii") !== "ID3") {
    throw new Error(
      "The music file does not have the expected MP3/ID3 header.",
    );
  }
} finally {
  await musicFile.close();
}

console.log(
  `Verified ${artFiles.length} art assets, ${fontFiles.length} fonts, the music track, and all runtime entry points.`,
);
