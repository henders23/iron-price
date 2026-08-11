import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  logLevel: "silent",
  server: {
    host: "127.0.0.1",
    port: 0,
  },
});

try {
  await server.listen();
  const address = server.httpServer?.address();
  assert(address && typeof address !== "string", "Vite did not open a port.");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const indexResponse = await fetch(`${baseUrl}/`);
  assert.equal(indexResponse.status, 200);
  const indexHtml = await indexResponse.text();
  assert(indexHtml.includes("./src/game.js"));
  assert(indexHtml.includes("./src/music-player.js"));

  for (const path of [
    "/src/game.js",
    "/src/music-player.js",
    "/assets/audio/iron-price-theme.mp3",
  ]) {
    const response = await fetch(`${baseUrl}${path}`, { method: "HEAD" });
    assert.equal(response.status, 200, `${path} was not served.`);
  }

  console.log("Verified the development server and runtime asset routes.");
} finally {
  await server.close();
}
