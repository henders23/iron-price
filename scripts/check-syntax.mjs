// Parses every JavaScript file in src/ and scripts/ so a syntax error fails
// the test run before anything tries to load the game.
import { readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, extname } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));

async function collect(directory) {
  const found = [];
  for (const entry of await readdir(join(root, directory), {
    withFileTypes: true,
  })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await collect(relative)));
    else if (extname(entry.name) === ".js" || extname(entry.name) === ".mjs")
      found.push(relative);
  }
  return found;
}

const files = [...(await collect("src")), ...(await collect("scripts"))].sort();
if (files.length < 20) {
  throw new Error(
    `Only found ${files.length} source files; the tree looks wrong.`,
  );
}

for (const file of files) {
  try {
    await run(process.execPath, ["--check", join(root, file)]);
  } catch (error) {
    throw new Error(
      `Syntax error in ${file}:\n${error.stderr ?? error.message}`,
    );
  }
}

console.log(`Parsed ${files.length} JavaScript files.`);
