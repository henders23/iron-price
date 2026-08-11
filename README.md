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

You can also open `index.html` directly. `Iron Price.html` remains as a small compatibility launcher for older links.

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
npm test             # syntax, asset, audio, and entry-point checks
npm run format       # format source and configuration files
npm run build        # create the static dist/ deployment
npm run preview      # preview a completed build
```

The repository contains a formatted JavaScript recovery of the previous self-contained browser build rather than its original TypeScript module tree. Core game logic currently lives in `src/game.js`; it can be split into domain modules incrementally without changing the asset or music runtimes.

## Repository layout

- `index.html`: canonical game entry point.
- `src/game.js`: campaign and tactical game runtime.
- `src/game.css`: core game presentation.
- `src/art-runtime.js` and `src/art.css`: generated-art UI integration.
- `src/music-player.js` and `src/music-player.css`: theme playback and persistent toggle.
- `assets/art`: optimized narrative, equipment, faction, and tactical art.
- `assets/audio/iron-price-theme.mp3`: looping theme music.
- `scripts/build-static.mjs`: reproducible static deployment builder.
- `scripts/verify-static.mjs`: repository integrity checks.

## Art integration

- `assets/art/scenes`: three company origins, four road events, and five campaign endings.
- `assets/art/icons/weapons`: sword, spear, axe, and mace art across worn, serviceable, and masterwork tiers.
- `assets/art/icons/resources`: armor, supplies, economy, progression, and injury icons.
- `assets/art/emblems`: company, reputation, enemy-faction, and frontier-compact marks.
- `assets/art/overlays`: deployment, movement, selection, activation, targeting, captain, hold, and escape markers used by the Canvas battle renderer.
- `assets/art/manifest.json`: canonical asset register.
