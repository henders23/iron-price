// The two launchers.
//
// `Iron Price.html` in the repository root points at ./dist/index.html: the
// source entry loads ES modules, which browsers refuse to run over file://, so
// a launcher aimed at it opens a blank page for anyone opening the game off
// disk. Inside dist/ the built game is the sibling index.html, so the launcher
// shipped with a build redirects there instead.
export const ROOT_LAUNCHER_TARGET = "./dist/index.html";

export const BUILT_LAUNCHER = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="refresh" content="0; url=./index.html" />
    <title>Launch Iron Price</title>
  </head>
  <body>
    <p><a href="./index.html">Launch Iron Price</a></p>
  </body>
</html>
`;
