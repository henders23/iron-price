# Iron Price

**Iron Price** is a browser-first, turn-based tactical company RPG about leading a mortal mercenary band through a hard low-fantasy frontier.

The current build assumes:

- Desktop web first (mouse and keyboard), with tablet support later.
- A single-player campaign with three automatic local save slots. Accounts and cloud saves are deferred.
- Deterministic, shareable battles whose rules run independently of the renderer.
- No live PvP in the MVP. It remains a possible later mode, not a foundation the campaign must carry.

## Planning documents

- [Master game and production plan](docs/IRON_PRICE_GAME_PLAN.md)
- [Screen and asset register](docs/SCREEN_ASSET_REGISTER.md)
- [Product decisions and open questions](docs/DECISIONS.md)

## Campaign Run v1

A finite mercenary-company campaign around deterministic 6-versus-6 battles. Found a company, cross a seven-location frontier, manage rising threat and local reputations, make road decisions, improve fighters and equipment, complete varied contracts, and reach victory or one of several company-ending defeats.

## Play Iron Price

Requirements: Node.js 20 or newer.

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:4173/`.

Alternatively, open `Iron Price.html` directly. The game uses the checked-in `assets/art` folder for narrative scenes, equipment and resource icons, faction emblems, and tactical overlays. Build the static deployment with:

```powershell
npm.cmd run build:html
```

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

## Verification

```powershell
npm.cmd test
npm.cmd run build
```

The repository currently contains the compiled browser game rather than its original TypeScript source tree. `npm test` verifies the 52-file art manifest and every runtime integration hook. `npm run build` copies the playable build and optimized assets into `dist/`.

## Art integration

- `assets/art/scenes`: three company origins, four road events, and five campaign endings.
- `assets/art/icons/weapons`: sword, spear, axe, and mace art across worn, serviceable, and masterwork tiers.
- `assets/art/icons/resources`: armor, supplies, economy, progression, and injury icons.
- `assets/art/emblems`: company, reputation, enemy-faction, and frontier-compact marks.
- `assets/art/overlays`: deployment, movement, selection, activation, targeting, captain, hold, and escape markers used by the Canvas battle renderer.
- `assets/art/manifest.json`: canonical asset register.

The UI integration is handled by `assets/art/runtime.js` and `assets/art/art.css`. The tactical Canvas hooks are applied to the compiled build by `scripts/integrate-art.mjs`.
