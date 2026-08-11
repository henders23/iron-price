// Builds the deployable static game.
//
// Source is an ES module tree under src/, but the deployed game must keep
// working when index.html is opened straight off disk, and browsers refuse to
// load modules over file://. So the module tree is bundled into one classic
// script and index.html's module tag is rewritten to point at it.
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { build } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "dist");

export const MODULE_TAG = '<script type="module" src="./src/main.js"></script>';
export const BUNDLE_TAG = '<script defer src="./src/game.js"></script>';

await rm(output, { recursive: true, force: true });
await mkdir(join(output, "src"), { recursive: true });

await build({
  configFile: false,
  root,
  logLevel: "warn",
  build: {
    target: "es2022",
    minify: false,
    emptyOutDir: false,
    outDir: join(output, "src"),
    lib: {
      entry: join(root, "src/main.js"),
      formats: ["iife"],
      name: "IronPrice",
      fileName: () => "game.js",
    },
  },
});

for (const file of [
  "src/game.css",
  "src/art.css",
  "src/screens.css",
  "src/music-player.css",
  "src/art-runtime.js",
  "src/music-player.js",
]) {
  await cp(join(root, file), join(output, file));
}

await cp(join(root, "assets"), join(output, "assets"), { recursive: true });
await cp(join(root, "Iron Price.html"), join(output, "Iron Price.html"));

const indexHtml = await readFile(join(root, "index.html"), "utf8");
if (!indexHtml.includes(MODULE_TAG)) {
  throw new Error(
    "index.html no longer carries the expected module script tag.",
  );
}
await writeFile(
  join(output, "index.html"),
  indexHtml.replace(MODULE_TAG, BUNDLE_TAG),
);

console.log("Static game built to dist/ as a single classic bundle.");
