# Iron Price

**Iron Price** is a browser-first, turn-based tactical company RPG about leading a mortal mercenary band through a hard low-fantasy frontier.

The current build assumes:

- Desktop web first (mouse and keyboard), with tablet support later.
- A single-player campaign with three automatic local save slots. Accounts and cloud saves are deferred.
- Deterministic, shareable battles whose rules run independently of the renderer.
- No live PvP in the MVP. It remains a possible later mode, not a foundation the campaign must carry.

## Campaign Run v1

A finite mercenary-company campaign around deterministic 6-versus-6 battles. Found a company, cross a seven-location frontier, manage rising threat and local reputations, make road decisions, improve fighters and equipment, complete varied contracts, and reach victory or one of several company-ending defeats.

## Play Iron Price

Requirements: Node.js 20.19 or newer.

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:4173/`.

The source tree is a set of ES modules, so the development server is required
while working on it. For an offline copy, run `npm run build` and open
`dist/index.html` straight off disk — the build bundles the modules into a
single classic script for exactly that reason. `Iron Price.html` remains as a
small compatibility launcher for older links.

The theme music attempts to play when the game opens. Browsers that block audible autoplay start it on the first click or key press instead. The fixed music control turns playback on or off and remembers the preference in local storage.

Battle controls:

- During deployment, click a company fighter and then an open blue hex.
- During battle, click a highlighted hex to move.
- Hover an adjacent enemy to inspect the complete attack forecast; click to strike.
- `1` attacks an adjacent target, `W` waits, and `E` ends the activation.

## Implemented campaign

- Three local campaign slots with automatic saving and no account requirement.
- Three starting origins with distinct resources, equipment, and company character.
- Seven connected frontier locations with travel time, wages, food costs, gated roads, local services, and a final fortress.
- A rising Ironbound threat clock, three reputations, changing local contracts, road events, and campaign victory/defeat endings.
- Eight named starting fighters, persistent health and armor, injuries, experience, levels, wages, and permanent death.
- Company roster and fighter inspection, six field perks, weapon and armor quality, loadout changes, food, tools, medicine, crowns, and renown.
- Deterministic recruitment candidates, hiring, daily rest, wage payment, food use, and armor repair.
- Local markets with permanent equipment refits and consumable supplies.
- Twelve authored contracts across elimination, hold, survival, escape, and captain objectives.
- Six-fighter deployment selection and a complete battle-to-aftermath-to-company loop.
- Chronicle and grave records for company events and fallen fighters.
- Field guide, save migration, reduced-motion, high-contrast, and larger-text options.
- A full-bleed title screen and an illustrated frontier map built to the
  "Title & Frontier Map" design handoff: company banner, road network with
  faction node seals, live resource and threat strip, and a location dossier
  carrying the local contracts and the march order.

## Screen presentation

The title screen and the frontier map share one visual language, defined in
`src/screens.css`: aged gold `#c39d4f` on `#0b0d0e`, square corners
everywhere except the circular map nodes, Cinzel for headings and labels,
IM Fell English for flavour text, and Jost for the wordmark. Accessibility
options set from the title screen are stored globally under
`iron-price-display-v1`, applied to the document root, and copied into each
new company; a running campaign then keeps its own copy.

## Implemented tactical battle

- Seven hand-authored 12x10 pointy-top battlefield layouts with terrain, elevation, blockers, movement costs, and defence modifiers.
- Three enemy factions: balanced Thorn Reavers, fast Mireborn, and heavily armored Ironbound.
- Objective markers, escape zones, captain marks, hit particles, armor impacts, casualties, and faction silhouettes rendered directly in Canvas.
- Initiative rounds, action points, fatigue, waiting, recovery, and rout movement.
- Sword, spear, axe, and mace profiles with shields, accuracy, armor damage, penetration, and stagger.
- Separate head armor, body armor, health, morale states, death, and routing.
- Terrain, high-ground, shield, morale, and surround modifiers shown before attacks.
- Deterministic utility AI, typed combat events, animation, battle ledger, and result screen.
- Seeded command replay verified against a final state hash.
- Responsive campaign and battle layouts tested at 1440x900 and 1280x720.

## Development workflow

```sh
npm install          # install Vite and formatting tools
npm run dev          # local development server
npm test             # syntax, asset, audio, entry-point and rule checks
npm run format       # format source and configuration files
npm run build        # create the static dist/ deployment
npm run preview      # preview a completed build
```

The game began life as a recovered single-file browser build. That file has
been split into ES modules along its own seams, and the minifier's mangled
identifiers renamed, so the rules are readable and testable outside a browser.
`npm test` parses every module, checks the assets, and runs the rule suite in
`scripts/test-rules.mjs` — campaign economy, travel gating, defeat conditions,
command validation, and seeded battle replay.

The layers depend in one direction only: `battle/` knows nothing about the
campaign, `campaign/` knows nothing about the DOM, and only `ui/` touches the
document. That is what lets the rules run under Node.

## Repository layout

- `index.html`: canonical game entry point.
- `src/main.js`: entry point; builds the campaign application.
- `src/battle/`: hex geometry, weapons, terrain, battlefields, unit templates, battle state, command rules, and the enemy AI.
- `src/campaign/`: campaign data, deterministic generation, campaign rules, the campaign-to-battle bridge, and save storage.
- `src/ui/`: screen markup and behaviour — title, frontier map, campaign views, battle screen, and the Canvas battle renderer.
- `src/game.css`: core game presentation.
- `src/screens.css`: title screen and frontier map presentation.
- `src/art-runtime.js` and `src/art.css`: generated-art UI integration.
- `assets/fonts`: self-hosted Cinzel, IM Fell English and Jost subsets.
- `src/music-player.js` and `src/music-player.css`: theme playback and persistent toggle.
- `assets/art`: optimized narrative, equipment, faction, and tactical art.
- `assets/audio/iron-price-theme.mp3`: looping theme music.
- `scripts/build-static.mjs`: reproducible static deployment builder.
- `scripts/verify-static.mjs`: repository integrity checks.
- `scripts/test-rules.mjs`: campaign and battle rule tests.
- `scripts/check-syntax.mjs`: parses every module before the suite runs.

## Art integration

- `assets/art/scenes`: three company origins, four road events, and five campaign endings.
- `assets/art/icons/weapons`: sword, spear, axe, and mace art across worn, serviceable, and masterwork tiers.
- `assets/art/icons/resources`: armor, supplies, economy, progression, and injury icons.
- `assets/art/emblems`: company, reputation, enemy-faction, and frontier-compact marks.
- `assets/art/overlays`: deployment, movement, selection, activation, targeting, captain, hold, and escape markers used by the Canvas battle renderer.
- `assets/art/manifest.json`: canonical asset register.
