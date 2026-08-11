import { LOCATIONS } from "../campaign/data.js";

export const STANDALONE_BATTLE_SEED = 1230131022;
export function renderBattleShell(s) {
  const e = s.contract;
  document.querySelector("#app").innerHTML = `
<main class="game-shell">
  <header class="topbar">
    <div class="brand-block">
      <div class="brand-rivet" aria-hidden="true"></div>
      <div><h1>IRON PRICE</h1><span>${e ? LOCATIONS[e.locationId].name.toUpperCase() : "THE ASH ROAD"}</span></div>
    </div>
    <div class="mission-block">
      <span class="eyebrow">${e ? `${e.employer} · ${s.companyName ?? "Iron Company"}` : "CONTRACT 01 · ROAD LEVY"}</span>
      <strong>${e?.objective ?? "Break the Thorn Reavers"}</strong>
      <span id="objective-copy">Deploy your company in the western quarter.</span>
    </div>
    <div class="battle-meta">
      <div><span>ROUND</span><strong id="round-value">—</strong></div>
      <div><span>STATE</span><strong id="hash-value">00000000</strong></div>
      <button id="help-button" class="icon-button" aria-label="Battle help">?</button>
    </div>
  </header>

  <section class="turn-rail" aria-label="Turn order">
    <span class="rail-label">TURN ORDER</span>
    <div id="turn-order" class="turn-order"></div>
  </section>

  <section class="battle-layout">
    <div class="battle-stage">
      <canvas id="battle-canvas" aria-label="Iron Price tactical battlefield"></canvas>
      <div id="phase-banner" class="phase-banner">DEPLOYMENT</div>
      <div id="toast" class="toast" role="status" aria-live="polite"></div>
      <div class="legend">
        <span><i class="legend-swatch move"></i> Reachable</span>
        <span><i class="legend-swatch path"></i> Planned path</span>
        <span><i class="legend-swatch threat"></i> Enemy</span>
      </div>
    </div>

    <aside class="side-panel">
      <section id="unit-panel" class="iron-panel unit-panel"></section>
      <section id="forecast-panel" class="iron-panel forecast-panel"></section>
      <section class="iron-panel log-panel">
        <div class="panel-heading"><span>BATTLE LEDGER</span><button id="clear-log" class="text-button">Clear</button></div>
        <div id="combat-log" class="combat-log" aria-live="polite"></div>
      </section>
    </aside>
  </section>

  <footer class="action-dock">
    <div id="active-summary" class="active-summary"></div>
    <div id="action-buttons" class="action-buttons"></div>
    <div class="dock-hint" id="dock-hint">Select a fighter, then choose a blue deployment hex.</div>
  </footer>
</main>

<div id="briefing" class="modal-layer visible" role="dialog" aria-modal="true" aria-labelledby="briefing-title">
  <div class="modal-card briefing-card">
    <div class="seal" aria-hidden="true">IP</div>
    <span class="eyebrow">CONTRACT BRIEFING</span>
    <h2 id="briefing-title">${e?.title ?? "The Ash Road Levy"}</h2>
    <p class="flavour">“${e?.briefing ?? "Six road-thieves have taken the ridge and a season's tithe with it. Bring back the iron. The bodies are your affair."}”</p>
    <div class="brief-grid">
      <div><span>OBJECTIVE</span><strong>${e?.objective ?? "Rout or kill every Thorn Reaver"}</strong></div>
      <div><span>COMPANY</span><strong>6 fighters · mixed arms</strong></div>
      <div><span>TERRAIN</span><strong>${e?.terrainLabel ?? "Mud, brush, water, central rise"}</strong></div>
      <div><span>REWARD</span><strong>${e?.reward ?? 400} crowns · road salvage</strong></div>
    </div>
    <div class="rule-strip"><span>Move</span><b>Click a blue hex</b><span>Attack</span><b>Click an adjacent enemy</b><span>End turn</span><b>E</b></div>
    <button id="briefing-close" class="primary-button">Inspect the field</button>
  </div>
</div>

<div id="help-modal" class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="help-title">
  <div class="modal-card help-card">
    <button class="modal-close" data-close="help-modal" aria-label="Close">×</button>
    <span class="eyebrow">FIELD MANUAL</span>
    <h2 id="help-title">Win with position, not luck</h2>
    <div class="help-grid">
      <div><b>Action points</b><p>Movement and attacks spend AP. Unused AP recovers a little fatigue when you end the turn.</p></div>
      <div><b>Armor</b><p>Head and body armor are separate. Axes break armor; swords finish exposed targets.</p></div>
      <div><b>Morale</b><p>Hard hits and deaths can break resolve. Fleeing fighters leave the field at their home edge.</p></div>
      <div><b>Position</b><p>High ground, brush, shields, and surrounding a target all change the visible hit chance.</p></div>
    </div>
    <p class="shortcut-line"><kbd>1</kbd> Attack adjacent target · <kbd>W</kbd> Wait · <kbd>E</kbd> End turn · <kbd>Esc</kbd> Close</p>
  </div>
</div>

<div id="result-modal" class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="result-title">
  <div class="modal-card result-card">
    <span class="eyebrow" id="result-kicker">CONTRACT COMPLETE</span>
    <h2 id="result-title">The road is yours</h2>
    <p id="result-copy"></p>
    <div id="result-stats" class="result-stats"></div>
    <div class="result-actions">
      <button id="campaign-return-button" class="primary-button">Take the consequences</button>
      <button id="replay-button" class="secondary-button">Replay this battle</button>
    </div>
  </div>
</div>
`;
}
