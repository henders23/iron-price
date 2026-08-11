import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "dist");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of ["index.html", "Iron Price.html"]) {
  await cp(join(root, file), join(output, file));
}

for (const directory of ["assets", "src"]) {
  await cp(join(root, directory), join(output, directory), { recursive: true });
}

console.log("Static game built to dist/.");
