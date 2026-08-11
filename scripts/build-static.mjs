import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("Iron Price.html", "dist/index.html");
await cp("assets", "dist/assets", { recursive: true });
console.log("Static game built to dist/.");
