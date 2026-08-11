import { WEAPONS } from "../battle/weapons.js";
import {
  buildContractBattle,
  resolveBattleOutcome,
} from "../campaign/battle-bridge.js";
import {
  buyOffer,
  choosePerk,
  createCampaign,
  dailyWages,
  equipWeapon,
  evaluateCampaignStatus,
  hireRecruit,
  isLocationUnlocked,
  repairArmor,
  resolveRoadEvent,
  restOneDay,
  roadRoute,
  toggleShield,
  travelTo,
} from "../campaign/campaign.js";
import { LOCATIONS, ORIGINS, PERKS } from "../campaign/data.js";
import { contractsAt } from "../campaign/generation.js";
import {
  deleteCampaign,
  loadAllCampaigns,
  loadCampaign,
  saveCampaign,
} from "../campaign/storage.js";
import {
  applyDisplaySettings,
  readDisplaySettings,
  writeDisplaySettings,
} from "../display-settings.js";
import { BattleScreen } from "./battle-screen.js";
import { STANDALONE_BATTLE_SEED } from "./battle-template.js";
import { escapeHtml, readiness } from "./html.js";
import {
  ART_PATH,
  MAP_NODES,
  OBJECTIVE_ART,
  OBJECTIVE_LABEL,
  REPUTATIONS,
  SERVICE_CHIPS,
  TOPBAR_RESOURCES,
  emberLayer,
  unlockRequirement,
} from "./screen-data.js";

export class CampaignApp {
  campaign = null;
  view = "company";
  selectedFighterId = null;
  selectedLocationId = null;
  pendingOrigin = "road-wardens";
  message = "";
  constructor() {
    this.showTitle();
  }
  showTitle(e = null) {
    this.campaign = null;
    const t = loadAllCampaigns(),
      a = readDisplaySettings();
    applyDisplaySettings(a);
    const i =
        t
          .map((r, o) => (r ? { save: r, slot: o + 1 } : null))
          .filter(Boolean)
          .sort((r, o) =>
            String(o.save.lastPlayed ?? "").localeCompare(
              String(r.save.lastPlayed ?? ""),
            ),
          )[0] ?? null,
      n = t.findIndex((r) => !r) + 1;
    ((document.querySelector("#app").innerHTML = `
    <main class="ip-title" data-screen-label="Title">
      <img class="ip-title-art" src="${ART_PATH}scenes/ending-victory.webp" alt="">
      <div class="ip-title-veil"></div>
      <div class="ip-title-legibility"></div>
      <div class="ip-title-vignette"></div>
      <div class="ip-title-column">
        <img class="ip-title-emblem" src="${ART_PATH}emblems/company.webp" alt="Company banner">
        <h1 class="ip-wordmark">IRON PRICE</h1>
        <div class="ip-rule-row"><span class="ip-rule"></span><span class="ip-rule-label">THE ASH ROAD</span></div>
        <p class="ip-tagline">Lead your mercenary company across a hard frontier</p>
        <div class="ip-menu">
          <button class="ip-menu-button primary" data-title-action="continue" ${i ? "" : "disabled"}>
            <span class="ip-menu-label">◆&nbsp; CONTINUE</span>
            <span class="ip-menu-sub">${
              i
                ? `${escapeHtml(i.save.companyName)} — Day ${i.save.day} — ${escapeHtml(this.ipSaveState(i.save))}`
                : "No company has signed the ledger yet"
            }</span>
          </button>
          <button class="ip-menu-button" data-title-action="new">NEW COMPANY</button>
          <button class="ip-menu-button" data-title-action="ledger">CHRONICLE</button>
          <button class="ip-menu-button" data-title-action="settings">SETTINGS</button>
        </div>
      </div>
      <div class="ip-title-footer">
        <span class="ip-footer-left"><span class="ip-build">CAMPAIGN RUN V1</span><span class="ip-music-slot" data-music-slot></span></span>
        <span class="ip-quote">“A company is only worth the names cut in its stone.”</span>
      </div>
      ${emberLayer()}
      ${e === "ledger" ? this.ipLedgerPanel(t) : e === "settings" ? this.ipSettingsPanel(a) : ""}
    </main>`),
      document.querySelectorAll("[data-title-action]").forEach((r) =>
        r.addEventListener("click", () => {
          const o = r.dataset.titleAction;
          o === "continue"
            ? i && this.openCampaign(loadCampaign(i.slot) ?? i.save)
            : o === "new"
              ? n
                ? this.showNewCampaign(n)
                : this.showTitle("ledger")
              : this.showTitle(o);
        }),
      ),
      document
        .querySelector("[data-title-close]")
        ?.addEventListener("click", () => this.showTitle()),
      document.querySelectorAll("[data-continue-slot]").forEach((r) =>
        r.addEventListener("click", () => {
          const o = loadCampaign(Number(r.dataset.continueSlot));
          o && this.openCampaign(o);
        }),
      ),
      document
        .querySelectorAll("[data-new-slot]")
        .forEach((r) =>
          r.addEventListener("click", () =>
            this.showNewCampaign(Number(r.dataset.newSlot)),
          ),
        ),
      document.querySelectorAll("[data-delete-slot]").forEach((r) =>
        r.addEventListener("click", () => {
          const o = Number(r.dataset.deleteSlot);
          window.confirm(`Delete campaign slot ${o}? This cannot be undone.`) &&
            (deleteCampaign(o), this.showTitle("ledger"));
        }),
      ),
      document.querySelectorAll("[data-display-setting]").forEach((r) =>
        r.addEventListener("click", () => {
          const o = r.dataset.displaySetting;
          ((a[o] = !a[o]), writeDisplaySettings(a), this.showTitle("settings"));
        }),
      ),
      document
        .querySelector("#quick-battle")
        ?.addEventListener(
          "click",
          () => new BattleScreen({ seed: STANDALONE_BATTLE_SEED }),
        ));
  }
  ipSaveState(e) {
    return e.status === "active"
      ? LOCATIONS[e.currentLocation].name
      : e.status.toUpperCase();
  }
  ipLedgerPanel(e) {
    return `<aside class="ip-title-panel">
      <div class="ip-panel-head"><span class="ip-panel-eyebrow">CAMPAIGN LEDGER</span><button class="ip-panel-close" data-title-close>CLOSE</button></div>
      <p class="ip-panel-note">Three local slots. Saving is automatic and no account is required.</p>
      <div class="ip-slot-list">
        ${e
          .map((t, a) =>
            t
              ? `<article class="ip-slot">
          <header><span class="ip-slot-number">SLOT ${a + 1}</span><span class="ip-slot-state">${escapeHtml(this.ipSaveState(t).toUpperCase())}</span></header>
          <h3>${escapeHtml(t.companyName)}</h3>
          <p>${escapeHtml(ORIGINS[t.origin].name)} · Day ${t.day} of 50</p>
          <div class="ip-slot-facts"><span>${t.roster.filter((i) => i.alive).length} LIVING</span><span>${t.crowns} CROWNS</span><span>${t.threat}% THREAT</span></div>
          <div class="ip-slot-actions"><button class="ip-panel-button" data-continue-slot="${a + 1}">CONTINUE</button><button class="ip-panel-button danger" data-delete-slot="${a + 1}">DELETE</button></div>
        </article>`
              : `<article class="ip-slot">
          <header><span class="ip-slot-number">SLOT ${a + 1}</span><span class="ip-slot-state">EMPTY</span></header>
          <h3>Empty ledger</h3>
          <p>No oath. No debts. No graves.</p>
          <div class="ip-slot-actions"><button class="ip-panel-button quiet" data-new-slot="${a + 1}">FOUND A COMPANY</button></div>
        </article>`,
          )
          .join("")}
      </div>
      <div class="ip-panel-foot"><button id="quick-battle" class="ip-panel-button quiet">PLAY A STANDALONE BATTLE</button></div>
    </aside>`;
  }
  ipSettingsPanel(e) {
    const t = [
      [
        "reducedMotion",
        "Reduced motion",
        "Stops the drifting art, embers and most battlefield animation.",
      ],
      [
        "highContrast",
        "High contrast",
        "Strengthens text, borders and battlefield highlights.",
      ],
      [
        "largeText",
        "Larger interface text",
        "Increases campaign and battle text sizing.",
      ],
    ];
    return `<aside class="ip-title-panel">
      <div class="ip-panel-head"><span class="ip-panel-eyebrow">OPTIONS &amp; ACCESSIBILITY</span><button class="ip-panel-close" data-title-close>CLOSE</button></div>
      <p class="ip-panel-note">These apply everywhere and are copied into each new company. A running campaign keeps its own copy, changed from the campaign settings screen.</p>
      <div class="ip-option-list">
        ${t
          .map(
            ([a, i, n]) =>
              `<button class="ip-option ${e[a] ? "enabled" : ""}" data-display-setting="${a}"><span><b>${i}</b><small>${n}</small></span><i>${e[a] ? "ON" : "OFF"}</i></button>`,
          )
          .join("")}
      </div>
    </aside>`;
  }
  showNewCampaign(e) {
    ((this.pendingOrigin = "road-wardens"),
      (document.querySelector("#app").innerHTML = `
    <main class="new-campaign-screen">
      <section class="new-campaign-card">
        <button id="back-to-title" class="back-button">← Campaign ledger</button>
        <span class="eyebrow">NEW COMPANY · SLOT ${e}</span>
        <h1>Name the people who will pay</h1>
        <label class="company-name-field"><span>COMPANY NAME</span><input id="company-name" maxlength="28" value="The Iron Company" autocomplete="off"></label>
        <div class="origin-grid">
          ${Object.entries(ORIGINS)
            .map(
              ([t, a], i) =>
                `<button class="origin-card ${i === 0 ? "selected" : ""}" data-origin="${t}"><span>ORIGIN 0${i + 1}</span><h2>${a.name}</h2><p>${a.description}</p><strong>${a.effect}</strong></button>`,
            )
            .join("")}
        </div>
        <div class="new-summary"><div><span>STARTING ROSTER</span><b>8 named fighters</b></div><div><span>FIELD LIMIT</span><b>6 fighters</b></div><div><span>DEATH</span><b>Permanent</b></div><div><span>SAVE</span><b>Automatic</b></div></div>
        <button id="create-company" class="primary-button create-company-button">Sign the company ledger</button>
      </section>
    </main>`),
      document
        .querySelector("#back-to-title")
        ?.addEventListener("click", () => this.showTitle()),
      document.querySelectorAll("[data-origin]").forEach((t) =>
        t.addEventListener("click", () => {
          ((this.pendingOrigin = t.dataset.origin),
            document
              .querySelectorAll(".origin-card")
              .forEach((a) => a.classList.remove("selected")),
            t.classList.add("selected"));
        }),
      ),
      document
        .querySelector("#create-company")
        ?.addEventListener("click", () => {
          const t = document.querySelector("#company-name"),
            a = createCampaign(e, t.value, this.pendingOrigin);
          (saveCampaign(a), this.openCampaign(a));
        }));
  }
  openCampaign(e, t = "map", a = "") {
    if (
      ((this.campaign = e),
      evaluateCampaignStatus(e),
      this.applyCampaignSettings(e),
      e.status !== "active")
    ) {
      (saveCampaign(e), this.showCampaignEnding());
      return;
    }
    ((this.view = t),
      (this.message = a),
      LOCATIONS[this.selectedLocationId] ||
        (this.selectedLocationId = e.currentLocation),
      (!this.selectedFighterId ||
        !e.roster.some((i) => i.id === this.selectedFighterId)) &&
        (this.selectedFighterId =
          e.roster.find((i) => i.alive)?.id ?? e.roster[0]?.id ?? null),
      saveCampaign(e),
      this.renderCampaign(),
      e.settings.tutorialSeen || this.showTutorial());
  }
  applyCampaignSettings(e) {
    (document.documentElement.classList.toggle(
      "reduced-motion",
      e.settings.reducedMotion,
    ),
      document.documentElement.classList.toggle(
        "high-contrast",
        e.settings.highContrast,
      ),
      document.documentElement.classList.toggle(
        "large-text",
        e.settings.largeText,
      ));
  }
  renderCampaign() {
    const e = this.campaign;
    if (!e) return;
    const t = e.roster.filter((n) => n.alive),
      a = t.reduce(
        (n, r) =>
          n + r.headArmorMax - r.headArmor + r.bodyArmorMax - r.bodyArmor,
        0,
      ),
      i = t.filter((n) => n.hp < n.hpMax || n.injuries.length > 0).length;
    const r = Math.max(0, Math.min(10, Math.round(e.threat / 10)));
    ((document.querySelector("#app").innerHTML = `
    <main class="campaign-shell ip-shell">
      <header class="campaign-topbar ip-topbar">
        <button class="ip-brand" id="ip-brand" title="Save and return to the campaign ledger">
          <img src="${ART_PATH}emblems/company.webp" alt="">
          <span><span class="ip-brand-name">IRON PRICE</span><span class="ip-brand-company">${escapeHtml(e.companyName)}</span></span>
        </button>
        <span class="ip-topbar-rule"></span>
        <div class="ip-resources">
          ${TOPBAR_RESOURCES.map(
            ([o, l]) =>
              `<div class="ip-resource" title="${l}" style="--ip-icon:url('${ART_PATH}icons/resources/${o}.webp')"><i role="img" aria-label="${l}"></i><b>${e[o]}</b></div>`,
          ).join("")}
        </div>
        <div class="ip-topbar-right">
          <div class="ip-threat" title="Ironbound threat ${e.threat}%">
            <img src="${ART_PATH}icons/resources/threat.webp" alt="">
            <span>THREAT</span>
            <div class="ip-ticks">${Array.from({ length: 10 }, (o, l) => `<i class="${l < r ? "filled" : ""}"></i>`).join("")}</div>
          </div>
          <span class="ip-topbar-rule"></span>
          <span class="ip-day">DAY ${e.day} / 50</span>
          <span class="ip-topbar-rule"></span>
          <div class="campaign-top-actions" data-music-slot><button id="settings-button" class="campaign-menu-button">SETTINGS</button><button id="save-and-title" class="campaign-menu-button">LEDGER</button></div>
        </div>
      </header>
      <div class="campaign-body">
        <aside class="campaign-sidebar">
          <nav class="campaign-nav">
            <button data-view="map" class="${this.view === "map" ? "active" : ""}"><i>⌖</i><span>Frontier</span><small>${LOCATIONS[e.currentLocation].name}</small></button>
            <button data-view="company" class="${this.view === "company" ? "active" : ""}"><i>♟</i><span>Company</span><small>${t.length} living</small></button>
            <button data-view="contracts" class="${this.view === "contracts" ? "active" : ""}"><i>☷</i><span>Contracts</span><small>${e.contracts.length} available</small></button>
            <button data-view="market" class="${this.view === "market" ? "active" : ""}"><i>¤</i><span>Market</span><small>${e.market.length} offers</small></button>
            <button data-view="recruits" class="${this.view === "recruits" ? "active" : ""}"><i>＋</i><span>Recruitment</span><small>${e.recruits.length} candidates</small></button>
            <button data-view="chronicle" class="${this.view === "chronicle" ? "active" : ""}"><i>¶</i><span>Chronicle</span><small>${e.history.length} entries</small></button>
          </nav>
          <section class="camp-actions">
            <span class="eyebrow">CAMP ORDERS</span>
            <button id="rest-company"><b>Rest one day</b><small>−${dailyWages(e)} crowns · −${t.length} food</small></button>
            <button id="repair-company"><b>Repair armor</b><small>${a} damage · ${e.tools} tools</small></button>
            <div class="readiness-summary"><span>${i}</span><small>wounded</small><span>${a}</span><small>armor damage</small></div>
          </section>
        </aside>
        <section class="campaign-content ${this.view === "map" ? "ip-map-content" : ""}">
          ${this.message ? `<div class="campaign-message">${escapeHtml(this.message)}</div>` : ""}
          ${this.renderCurrentView()}
        </section>
      </div>
    </main>`),
      this.bindCampaignControls());
  }
  renderCurrentView() {
    return this.view === "map"
      ? this.renderFrontierMap()
      : this.view === "contracts"
        ? this.renderContracts()
        : this.view === "market"
          ? this.renderMarket()
          : this.view === "recruits"
            ? this.renderRecruitment()
            : this.view === "chronicle"
              ? this.renderChronicle()
              : this.renderCompanyView();
  }
  ipLocationStatus(e) {
    const t = this.campaign;
    return e === t.currentLocation
      ? "current"
      : isLocationUnlocked(t, e)
        ? LOCATIONS[t.currentLocation].neighbors.includes(e)
          ? "open"
          : "secured"
        : "gated";
  }
  ipStatusTag(e, t) {
    return e === "current"
      ? "YOU ARE HERE"
      : e === "open"
        ? "OPEN ROAD"
        : e === "secured"
          ? "KNOWN ROAD"
          : t === "crowns-end"
            ? "THE FINAL TOLL"
            : "ROAD GATED";
  }
  renderFrontierMap() {
    const campaign = this.campaign;
    const here = LOCATIONS[campaign.currentLocation];
    const selected = LOCATIONS[this.selectedLocationId] ?? here;
    const status = this.ipLocationStatus(selected.id);
    const node = MAP_NODES[selected.id];
    const foodCost = campaign.roster.filter((f) => f.alive).length * 2;
    const wageCost = dailyWages(campaign) * 2;

    // The chain of open roads to the selection, so a distant town can be
    // marched toward one leg at a time instead of only being looked at.
    const route = roadRoute(campaign, selected.id);
    const legs = route ? [here.id, ...route] : [];
    const routeEdges = new Set(
      legs.slice(1).map((id, index) => [legs[index], id].sort().join(">")),
    );

    const roads = Object.values(LOCATIONS).flatMap((location) =>
      location.neighbors
        .filter((other) => location.id < other)
        .map((other) => {
          const open =
            isLocationUnlocked(campaign, location.id) &&
            isLocationUnlocked(campaign, other);
          const onRoute = routeEdges.has([location.id, other].sort().join(">"));
          const ends = `x1="${MAP_NODES[location.id].x}" y1="${MAP_NODES[location.id].y}" x2="${MAP_NODES[other].x}" y2="${MAP_NODES[other].y}"`;
          return `<line class="road-glow ${onRoute ? "on-route" : ""}" ${ends}></line><line class="road ${open ? "" : "held"} ${onRoute ? "on-route" : ""}" ${ends}></line>`;
        }),
    );

    const nodes = Object.values(LOCATIONS)
      .map((location) => {
        const state = this.ipLocationStatus(location.id);
        const art = MAP_NODES[location.id];
        const step = legs.indexOf(location.id);
        return `<button class="ip-node ${state} ${location.id === selected.id ? "selected" : ""}" style="left:${art.x}%;top:${art.y}%" data-location="${location.id}" aria-pressed="${location.id === selected.id}">
          <span class="ip-node-disc">
            ${state === "current" ? '<span class="ip-node-pulse"></span>' : ""}
            <span class="ip-node-ring"></span>
            <span class="ip-node-emblem" style="--ip-emblem:url('${ART_PATH}emblems/${art.emblem}.webp')"></span>
            ${step > 0 ? `<span class="ip-node-step">${step}</span>` : ""}
          </span>
          <span class="ip-node-name">${escapeHtml(location.name.toUpperCase())}</span>
          <span class="ip-node-tag">${this.ipStatusTag(state, location.id)}</span>
        </button>`;
      })
      .join("");

    const affordable = campaign.food >= foodCost && campaign.crowns >= wageCost;
    const shortfall =
      campaign.food < foodCost
        ? `The march needs ${foodCost} food; the company carries ${campaign.food}.`
        : `The march needs ${wageCost} crowns in wages; the company holds ${campaign.crowns}.`;
    let marchLabel = "";
    let marchNote = "";
    let marchTo = null;

    if (status === "current") {
      marchLabel = "THE COMPANY IS HERE";
      marchNote = "Rest, resupply, or take a contract.";
    } else if (status === "gated") {
      const required = unlockRequirement(selected.id);
      marchLabel =
        selected.id === "crowns-end"
          ? "SECURE SIX CONTRACTS FIRST"
          : `ROAD GATED — ${required} CONTRACTS REQUIRED`;
      marchNote =
        selected.id === "crowns-end"
          ? "No road reaches the fortress while the frontier still owes six contracts."
          : `The frontier threat holds that road until ${required} contracts are settled.`;
    } else if (!route || route.length === 0) {
      marchLabel = "NO OPEN ROAD";
      marchNote = `No chain of open roads reaches ${escapeHtml(selected.name)} yet.`;
    } else if (route.length === 1) {
      marchTo = affordable ? selected.id : null;
      marchLabel = "MARCH — 2 DAYS";
      marchNote = affordable
        ? `${wageCost} crowns · ${foodCost} food · threat rises by 4`
        : shortfall;
    } else {
      const first = LOCATIONS[route[0]];
      marchTo = affordable ? first.id : null;
      marchLabel = `MARCH TO ${escapeHtml(first.name.toUpperCase())}`;
      marchNote = affordable
        ? `Leg 1 of ${route.length} to ${escapeHtml(selected.name)} · 2 days · ${wageCost} crowns · ${foodCost} food`
        : shortfall;
    }

    const services = selected.services
      .map((service) => SERVICE_CHIPS[service])
      .filter(Boolean)
      .map((chip) =>
        chip.view && selected.id === here.id
          ? `<button class="ip-service" data-service-view="${chip.view}">${chip.label}</button>`
          : `<span class="ip-service">${chip.label}</span>`,
      );

    const standing = REPUTATIONS.map(
      ([id, label]) =>
        `<div class="ip-standing ${id === selected.reputation ? "local" : ""}">
          <span class="ip-standing-seal" style="--ip-emblem:url('${ART_PATH}emblems/${id}.webp')"></span>
          <span class="ip-standing-name">${label}</span>
          <b>${campaign.reputations[id] > 0 ? "+" : ""}${campaign.reputations[id]}</b>
        </div>`,
    ).join("");

    const atHome = selected.id === here.id;
    const offered = atHome
      ? campaign.contracts
      : contractsAt(campaign, selected.id);
    const contractCard = (contract) => {
      const body = `<span class="ip-contract-seal" style="--ip-emblem:url('${ART_PATH}emblems/${contract.enemyFaction}.webp')"></span>
        <span class="ip-contract-text">
          <span class="ip-contract-title">${escapeHtml(contract.title)}</span>
          <span class="ip-contract-meta">
            <i style="background-image:url('${ART_PATH}overlays/${OBJECTIVE_ART[contract.battleObjective]}.webp')"></i>
            <span>${OBJECTIVE_LABEL[contract.battleObjective]}</span>
            <em>·</em>
            <img src="${ART_PATH}icons/resources/crowns.webp" alt="crowns">
            <span>${contract.reward}</span>
            <em>·</em>
            <img src="${ART_PATH}icons/resources/renown.webp" alt="renown">
            <span>+${contract.danger * 3}</span>
          </span>
        </span>`;
      return atHome
        ? `<button class="ip-contract" data-accept-contract="${contract.id}">${body}</button>`
        : `<div class="ip-contract distant">${body}</div>`;
    };

    return `<div class="ip-map" data-screen-label="Frontier Map">
      <div class="ip-map-stage" aria-label="Frontier travel map">
        <img class="ip-map-art" src="${ART_PATH}scenes/event-black-storm.webp" alt="">
        <div class="ip-map-veil"></div>
        <div class="ip-map-vignette"></div>
        <div class="ip-map-heading"><b>THE FRONTIER</b><span>Choose where the company marches next.</span></div>
        <svg class="ip-roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${roads.join("")}</svg>
        ${nodes}
      </div>
      <aside class="ip-dossier">
        <div class="ip-dossier-head">
          <div class="ip-dossier-eyebrow">LOCATION ${node.numeral} — ${node.faction}</div>
          <h2>${escapeHtml(selected.name.toUpperCase())}</h2>
          <p class="ip-dossier-desc">${escapeHtml(selected.description)}</p>
          <div class="ip-services">${services.length ? services.join("") : '<span class="ip-service">NO SERVICES</span>'}</div>
        </div>
        <div class="ip-dossier-divider"></div>
        <div class="ip-dossier-body">
          <div class="ip-dossier-label">${atHome ? "CONTRACTS OFFERED" : "CONTRACTS POSTED"}</div>
          ${
            offered.length
              ? `<div class="ip-contract-list">${offered.map(contractCard).join("")}</div>
                 ${atHome ? "" : '<p class="ip-dossier-footnote">Terms are settled when the company arrives.</p>'}`
              : `<p class="ip-dossier-empty">${
                  atHome
                    ? "No work is posted here today. Rest a day or settle a contract elsewhere."
                    : "Nothing is posted here yet."
                }</p>`
          }
          <div class="ip-dossier-label standing-label">STANDING</div>
          <div class="ip-standing-list">${standing}</div>
        </div>
        <div class="ip-dossier-foot">
          <button class="ip-march" ${marchTo ? `data-travel="${marchTo}"` : "disabled"}>${marchLabel}</button>
          <div class="ip-march-note">${marchNote}</div>
        </div>
      </aside>
    </div>`;
  }
  renderMarket() {
    const e = this.campaign,
      t = LOCATIONS[e.currentLocation],
      a = e.roster.filter((i) => i.alive);
    return t.services.includes("market")
      ? `<div class="content-heading"><div><span class="eyebrow">MARKET · ${escapeHtml(t.name.toUpperCase())}</span><h2>Steel, provisions and necessary lies</h2></div><div class="heading-stat"><span>COMPANY BALANCE</span><b>${e.crowns} crowns</b></div></div>
    <div class="market-target"><label><span>FIGHTER FOR EQUIPMENT REFITS</span><select id="market-fighter">${a.map((i) => `<option value="${i.id}">${escapeHtml(i.name)} · Q${i.weaponQuality} weapon · Q${i.armorQuality} armor</option>`).join("")}</select></label></div>
    <div class="market-grid">${e.market.length ? e.market.map((i) => `<article class="market-card offer-${i.type}"><div class="market-icon">${i.type === "weapon" ? "†" : i.type === "armor" ? "▣" : i.type === "food" ? "▰" : i.type === "tools" ? "⌁" : "✚"}</div><span class="eyebrow">${i.type.toUpperCase()}${i.quality ? ` · QUALITY ${i.quality}` : ""}</span><h2>${escapeHtml(i.name)}</h2><p>${escapeHtml(i.description)}</p><div><b>${i.cost} crowns</b><button class="primary-button" data-buy-offer="${i.id}" ${e.crowns < i.cost ? "disabled" : ""}>Purchase</button></div></article>`).join("") : '<div class="empty-state"><h2>The useful stock is gone.</h2><p>Travel or wait for the market to change.</p></div>'}</div>`
      : `<div class="content-heading"><div><span class="eyebrow">LOCAL MARKET</span><h2>No chartered trade in ${escapeHtml(t.name)}</h2></div></div><div class="empty-state"><h2>Only quiet bargains are made here.</h2><p>Travel to a settlement with a market to buy supplies and equipment refits.</p></div>`;
  }
  renderCompanyView() {
    const e = this.campaign,
      t = e.roster.find((a) => a.id === this.selectedFighterId) ?? e.roster[0];
    return `<div class="content-heading"><div><span class="eyebrow">COMPANY ROSTER</span><h2>${e.roster.filter((a) => a.alive).length} blades under contract</h2></div><div class="heading-stat"><span>DAILY WAGES</span><b>${dailyWages(e)} crowns</b></div></div>
    <div class="company-workspace">
      <section class="roster-grid">
        ${e.roster
          .map(
            (
              a,
            ) => `<button class="roster-card ${a.id === t?.id ? "selected" : ""} ${a.alive ? "" : "dead"}" data-fighter="${a.id}">
          <div class="roster-portrait">${
            a.alive
              ? a.name
                  .split(" ")
                  .map((i) => i[0])
                  .join("")
                  .slice(0, 2)
              : "†"
          }</div>
          <div class="roster-copy"><span>LEVEL ${a.level} · ${escapeHtml(a.background)}</span><strong>${escapeHtml(a.name)}</strong><small>${a.alive ? escapeHtml(a.epithet) : "Fallen in company service"}</small></div>
          <div class="readiness-ring" style="--ready:${readiness(a)}"><b>${readiness(a)}</b><small>READY</small></div>
          <div class="mini-bars"><i class="hp" style="--fill:${a.hp / a.hpMax}"></i><i class="armor" style="--fill:${(a.headArmor + a.bodyArmor) / Math.max(1, a.headArmorMax + a.bodyArmorMax)}"></i></div>
          ${a.injuries.length ? `<em>${a.injuries.length} injur${a.injuries.length === 1 ? "y" : "ies"}</em>` : ""}
        </button>`,
          )
          .join("")}
      </section>
      ${t ? this.renderFighterDetail(t) : ""}
    </div>`;
  }
  renderFighterDetail(e) {
    const t = this.campaign,
      a = WEAPONS[e.weaponId];
    return `<aside class="fighter-sheet ${e.alive ? "" : "dead"}">
    <div class="fighter-sheet-head"><div class="large-portrait">${
      e.alive
        ? e.name
            .split(" ")
            .map((i) => i[0])
            .join("")
            .slice(0, 2)
        : "†"
    }</div><div><span class="eyebrow">${escapeHtml(e.background)} · LEVEL ${e.level}</span><h2>${escapeHtml(e.name)}</h2><p>${escapeHtml(e.epithet)}</p></div></div>
    <div class="fighter-history"><span>${e.battles} battles</span><span>${e.kills} kills</span><span>${e.wage} crowns/day</span><span>${e.xp}/${e.level * 180} XP</span></div>
    <div class="sheet-resource"><span>HEALTH</span><div><i class="hp" style="width:${(e.hp / e.hpMax) * 100}%"></i></div><b>${e.hp}/${e.hpMax}</b></div>
    <div class="sheet-resource"><span>HEAD</span><div><i class="armor" style="width:${(e.headArmor / e.headArmorMax) * 100}%"></i></div><b>${e.headArmor}/${e.headArmorMax}</b></div>
    <div class="sheet-resource"><span>BODY</span><div><i class="armor" style="width:${(e.bodyArmor / e.bodyArmorMax) * 100}%"></i></div><b>${e.bodyArmor}/${e.bodyArmorMax}</b></div>
    <div class="fighter-stats"><div><span>SKILL</span><b>${e.meleeSkill}</b></div><div><span>DEFENCE</span><b>${e.meleeDefense + (e.hasShield ? 10 : 0)}</b></div><div><span>RESOLVE</span><b>${e.resolve}</b></div><div><span>INIT.</span><b>${e.initiative}</b></div></div>
    <section class="loadout-section"><div class="section-label"><span>WEAPON · QUALITY ${e.weaponQuality}</span><b>${a.name}</b></div><div class="armory-options">${Object.keys(
      WEAPONS,
    )
      .map((i) => {
        const n = WEAPONS[i],
          r = t.armory[i];
        return `<button data-equip-weapon="${i}" data-equip-fighter="${e.id}" class="${e.weaponId === i ? "equipped" : ""}" ${!e.alive || (e.weaponId !== i && r <= 0) ? "disabled" : ""}><i>${n.icon}</i><span>${n.name}<small>${e.weaponId === i ? "Equipped" : `${r} in armory`}</small></span></button>`;
      })
      .join("")}</div></section>
    <section class="shield-section"><div><span>OFF HAND</span><b>${e.hasShield ? "Kite shield" : "Empty"}</b><small>${e.hasShield ? "+10 melee defence" : `${t.armory.shields} shields in armory`}</small></div><button data-toggle-shield="${e.id}" ${!e.alive || (!e.hasShield && t.armory.shields <= 0) ? "disabled" : ""}>${e.hasShield ? "Stow shield" : "Equip shield"}</button></section>
    <section class="injury-section"><span>INJURIES · ARMOR QUALITY ${e.armorQuality}</span>${e.injuries.length ? e.injuries.map((i) => `<b>${escapeHtml(i)}</b>`).join("") : `<small>${e.alive ? "Fit for service" : "No treatment can be given"}</small>`}</section>
    <section class="perk-section"><div class="section-label"><span>FIELD PERKS</span><b>${e.perkPoints} point${e.perkPoints === 1 ? "" : "s"} available</b></div><div class="perk-list">${e.perks.map((i) => `<span title="${escapeHtml(PERKS[i].description)}">${escapeHtml(PERKS[i].name)}</span>`).join("") || "<small>No field specialisation chosen.</small>"}</div>${
      e.perkPoints > 0
        ? `<div class="perk-choices">${Object.keys(PERKS)
            .filter((i) => !e.perks.includes(i))
            .map(
              (i) =>
                `<button data-choose-perk="${i}" data-perk-fighter="${e.id}"><b>${PERKS[i].name}</b><small>${PERKS[i].description}</small></button>`,
            )
            .join("")}</div>`
        : ""
    }</section>
  </aside>`;
  }
  renderContracts() {
    const e = this.campaign;
    return `<div class="content-heading"><div><span class="eyebrow">CONTRACT BOARD · ${LOCATIONS[e.currentLocation].name.toUpperCase()}</span><h2>Work offered where the company stands</h2></div><div class="heading-stat"><span>THREAT / RENOWN</span><b>${e.threat}% / ${e.renown}</b></div></div>
    <div class="contract-grid">${e.contracts
      .map(
        (t) => `<article class="contract-card danger-${t.danger}">
      <div class="contract-seal">${t.danger}</div><span class="eyebrow">${escapeHtml(t.employer)} · EXPIRES DAY ${t.expiresDay}</span><h2>${escapeHtml(t.title)}</h2><p>${escapeHtml(t.briefing)}</p>
      <div class="contract-facts"><div><span>OBJECTIVE · ${t.battleObjective.toUpperCase()}</span><b>${escapeHtml(t.objective)}</b></div><div><span>TERRAIN</span><b>${escapeHtml(t.terrainLabel)}</b></div><div><span>ENEMY / DANGER</span><b>${t.enemyFaction.replace("-", " ")} · ${"◆".repeat(t.danger)}${"◇".repeat(3 - t.danger)}</b></div><div><span>PAYMENT</span><b>${t.reward} crowns</b></div></div>
      <button class="primary-button" data-accept-contract="${t.id}">Review company deployment</button>
    </article>`,
      )
      .join("")}</div>`;
  }
  renderRecruitment() {
    const e = this.campaign,
      t = e.roster.filter((a) => a.alive).length;
    return `<div class="content-heading"><div><span class="eyebrow">HIRING GROUND</span><h2>People with reasons not to stay</h2></div><div class="heading-stat"><span>ROSTER CAPACITY</span><b>${t}/12 living</b></div></div>
    <div class="recruit-grid">${
      e.recruits.length
        ? e.recruits
            .map(
              (a) => `<article class="recruit-card">
      <div class="recruit-portrait">${a.name
        .split(" ")
        .map((i) => i[0])
        .join("")
        .slice(
          0,
          2,
        )}</div><span class="eyebrow">${escapeHtml(a.background)}</span><h2>${escapeHtml(a.name)}</h2><p>${escapeHtml(a.epithet)}</p>
      <div class="recruit-stats"><div><span>HP</span><b>${a.hpMax}</b></div><div><span>SKILL</span><b>${a.meleeSkill}</b></div><div><span>DEF</span><b>${a.meleeDefense + (a.hasShield ? 10 : 0)}</b></div><div><span>RESOLVE</span><b>${a.resolve}</b></div></div>
      <div class="recruit-kit"><span>${WEAPONS[a.weaponId].icon}</span><b>${WEAPONS[a.weaponId].name}${a.hasShield ? " + shield" : ""}</b></div>
      <div class="hire-line"><div><span>HIRE</span><b>${a.hireCost} crowns</b><small>${a.wage}/day</small></div><button class="primary-button" data-hire-recruit="${a.id}" ${e.crowns < a.hireCost || t >= 12 ? "disabled" : ""}>Hire</button></div>
    </article>`,
            )
            .join("")
        : '<div class="empty-state"><h2>No one else will sign today.</h2><p>Rest or return from a contract to refresh the hiring ground.</p></div>'
    }</div>`;
  }
  renderChronicle() {
    const e = this.campaign,
      t = e.roster.filter((a) => !a.alive);
    return `<div class="content-heading"><div><span class="eyebrow">COMPANY CHRONICLE</span><h2>Debts, victories and names</h2></div><div class="heading-stat"><span>GRAVES</span><b>${t.length}</b></div></div>
    <div class="chronicle-layout"><section class="chronicle-list">${e.history
      .slice()
      .reverse()
      .map(
        (a, i) =>
          `<article><span>${String(e.history.length - i).padStart(2, "0")}</span><p>${escapeHtml(a)}</p></article>`,
      )
      .join("")}</section>
    <aside class="grave-ledger"><span class="eyebrow">THE DEAD</span>${t.length ? t.map((a) => `<div><b>${escapeHtml(a.name)}</b><span>${escapeHtml(a.background)} · ${a.battles} battles · ${a.kills} kills</span></div>`).join("") : "<p>No names entered. The page will not remain clean.</p>"}</aside></div>`;
  }
  bindCampaignControls() {
    const e = this.campaign;
    (document.querySelectorAll("#save-and-title, #ip-brand").forEach((t) =>
      t.addEventListener("click", () => {
        (saveCampaign(e), this.showTitle());
      }),
    ),
      document
        .querySelector("#settings-button")
        ?.addEventListener("click", () => this.showSettings()),
      document.querySelectorAll("[data-location]").forEach((t) =>
        t.addEventListener("click", () => {
          ((this.selectedLocationId = t.dataset.location),
            this.openCampaign(e, "map"));
        }),
      ),
      document
        .querySelectorAll("[data-service-view]")
        .forEach((t) =>
          t.addEventListener("click", () =>
            this.openCampaign(e, t.dataset.serviceView),
          ),
        ),
      document
        .querySelectorAll("[data-view]")
        .forEach((t) =>
          t.addEventListener("click", () =>
            this.openCampaign(e, t.dataset.view),
          ),
        ),
      document.querySelectorAll("[data-fighter]").forEach((t) =>
        t.addEventListener("click", () => {
          ((this.selectedFighterId = t.dataset.fighter ?? null),
            this.openCampaign(e, "company"));
        }),
      ),
      document.querySelectorAll("[data-equip-weapon]").forEach((t) =>
        t.addEventListener("click", () => {
          const a = equipWeapon(
            e,
            t.dataset.equipFighter,
            t.dataset.equipWeapon,
          );
          this.openCampaign(
            e,
            "company",
            a
              ? "Loadout changed and recorded."
              : "That weapon is not available.",
          );
        }),
      ),
      document.querySelectorAll("[data-toggle-shield]").forEach((t) =>
        t.addEventListener("click", () => {
          const a = toggleShield(e, t.dataset.toggleShield);
          this.openCampaign(
            e,
            "company",
            a ? "Off-hand loadout changed." : "No shield is available.",
          );
        }),
      ),
      document.querySelectorAll("[data-choose-perk]").forEach((t) =>
        t.addEventListener("click", () => {
          const a = choosePerk(e, t.dataset.perkFighter, t.dataset.choosePerk);
          this.openCampaign(
            e,
            "company",
            a
              ? "A new field specialisation was entered in the ledger."
              : "That perk cannot be chosen.",
          );
        }),
      ),
      document.querySelectorAll("[data-travel]").forEach((t) =>
        t.addEventListener("click", () => {
          const a = travelTo(e, t.dataset.travel);
          (saveCampaign(e),
            a.success && e.pendingEvent
              ? this.showCampaignEvent(a.message)
              : this.openCampaign(e, "map", a.message));
        }),
      ),
      document.querySelectorAll("[data-buy-offer]").forEach((t) =>
        t.addEventListener("click", () => {
          const a = document.querySelector("#market-fighter")?.value,
            i = buyOffer(e, t.dataset.buyOffer, a);
          this.openCampaign(e, "market", i.message);
        }),
      ),
      document.querySelectorAll("[data-hire-recruit]").forEach((t) =>
        t.addEventListener("click", () => {
          const a = t.dataset.hireRecruit,
            i = e.recruits.find((r) => r.id === a),
            n = hireRecruit(e, a);
          this.openCampaign(
            e,
            "recruits",
            n && i
              ? `${i.name} signed the ledger.`
              : "The company cannot make that hire.",
          );
        }),
      ),
      document.querySelectorAll("[data-accept-contract]").forEach((t) =>
        t.addEventListener("click", () => {
          const a = e.contracts.find((i) => i.id === t.dataset.acceptContract);
          a && this.showSquadSelection(a);
        }),
      ),
      document.querySelector("#rest-company")?.addEventListener("click", () => {
        const t = restOneDay(e);
        this.openCampaign(e, this.view, t.message);
      }),
      document
        .querySelector("#repair-company")
        ?.addEventListener("click", () => {
          const t = repairArmor(e);
          this.openCampaign(e, this.view, t.message);
        }));
  }
  showCampaignEvent(e = "") {
    const t = this.campaign,
      a = t.pendingEvent;
    if (!a) return this.openCampaign(t, "map", e);
    ((document.querySelector("#app").innerHTML =
      `<main class="event-screen event-${a.illustration}"><div class="event-vignette"><div class="event-art"><span>${a.illustration === "road" ? "⌁" : a.illustration === "camp" ? "△" : a.illustration === "ruin" ? "▥" : "ϟ"}</span><i></i></div><section class="event-paper"><span class="eyebrow">ROAD EVENT · DAY ${t.day}</span><h1>${escapeHtml(a.title)}</h1><p>${escapeHtml(a.body)}</p>${e ? `<small class="travel-arrival">${escapeHtml(e)}</small>` : ""}<div class="event-choices">${a.choices.map((i) => `<button data-event-choice="${i.id}"><b>${escapeHtml(i.label)}</b><span>${escapeHtml(i.detail)}</span></button>`).join("")}</div></section></div></main>`),
      document.querySelectorAll("[data-event-choice]").forEach((i) =>
        i.addEventListener("click", () => {
          const n = resolveRoadEvent(t, i.dataset.eventChoice);
          (saveCampaign(t), this.openCampaign(t, "map", n));
        }),
      ));
  }
  showSettings() {
    const e = this.campaign,
      t = e.settings;
    ((document.querySelector("#app").innerHTML =
      `<main class="settings-screen"><section class="settings-card"><button id="close-settings" class="back-button">← Return to campaign</button><span class="eyebrow">OPTIONS & ACCESSIBILITY</span><h1>Make the ledger readable</h1><p>These settings are stored with this campaign slot.</p><div class="settings-list"><button data-setting="reducedMotion" class="${t.reducedMotion ? "enabled" : ""}"><span><b>Reduced motion</b><small>Removes camera shake, sliding panels and most battlefield animation.</small></span><i>${t.reducedMotion ? "ON" : "OFF"}</i></button><button data-setting="highContrast" class="${t.highContrast ? "enabled" : ""}"><span><b>High contrast</b><small>Strengthens text, borders and battlefield highlights.</small></span><i>${t.highContrast ? "ON" : "OFF"}</i></button><button data-setting="largeText" class="${t.largeText ? "enabled" : ""}"><span><b>Larger interface text</b><small>Increases campaign and battle text sizing.</small></span><i>${t.largeText ? "ON" : "OFF"}</i></button></div><button id="reopen-tutorial" class="secondary-button">Read the field guide</button></section></main>`),
      document
        .querySelector("#close-settings")
        ?.addEventListener("click", () => this.openCampaign(e, this.view)),
      document.querySelectorAll("[data-setting]").forEach((a) =>
        a.addEventListener("click", () => {
          const i = a.dataset.setting;
          ((e.settings[i] = !e.settings[i]),
            this.applyCampaignSettings(e),
            writeDisplaySettings(e.settings),
            saveCampaign(e),
            this.showSettings());
        }),
      ),
      document
        .querySelector("#reopen-tutorial")
        ?.addEventListener("click", () => this.showTutorial(!0)));
  }
  showTutorial(e = !1) {
    const t = this.campaign;
    ((document.querySelector("#app").innerHTML =
      `<main class="tutorial-screen"><section class="tutorial-book"><span class="eyebrow">FIELD GUIDE · CAMPAIGN RUN</span><h1>The company survives between battles</h1><div class="tutorial-grid"><article><i>01</i><h2>Choose the road</h2><p>Travel costs two days, wages and food. New roads open after completed contracts.</p></article><article><i>02</i><h2>Watch the threat</h2><p>Rest and travel let the Ironbound advance. At 100% threat, the frontier is lost.</p></article><article><i>03</i><h2>Read the contract</h2><p>Eliminate, hold, survive, escape and captain objectives demand different formations.</p></article><article><i>04</i><h2>Keep people alive</h2><p>Damage, armor loss, injuries and death persist. Fewer than six living fighters ends the run.</p></article><article><i>05</i><h2>Spend for tomorrow</h2><p>Markets sell supplies and permanent equipment upgrades. Levelled fighters earn perk choices.</p></article><article><i>06</i><h2>Reach Crown's End</h2><p>Complete six contracts, open the Iron Pass and settle the final Iron Price.</p></article></div><div class="tutorial-controls"><span>Battle: click to move or attack · 1 attack · W wait · E end turn</span><button id="close-tutorial" class="primary-button">Enter the frontier</button></div></section></main>`),
      document
        .querySelector("#close-tutorial")
        ?.addEventListener("click", () => {
          ((t.settings.tutorialSeen = !0),
            saveCampaign(t),
            e ? this.showSettings() : this.openCampaign(t, "map"));
        }));
  }
  showCampaignEnding() {
    const e = this.campaign,
      t = e.status === "victory";
    ((document.querySelector("#app").innerHTML =
      `<main class="ending-screen ${t ? "victory" : "defeat"}"><section class="ending-card"><div class="ending-seal">${t ? "IP" : "†"}</div><span class="eyebrow">${t ? "THE FRONTIER REMEMBERS" : "THE LEDGER CLOSES"}</span><h1>${t ? "The road bears your name" : "Iron paid, company broken"}</h1><p>${escapeHtml(e.endingReason)}</p><div class="ending-stats"><div><span>DAYS</span><b>${e.day}</b></div><div><span>VICTORIES</span><b>${e.victories}</b></div><div><span>DEAD</span><b>${e.roster.filter((a) => !a.alive).length}</b></div><div><span>RENOWN</span><b>${e.renown}</b></div><div><span>CROWNS</span><b>${e.crowns}</b></div></div><blockquote>“Every road has a toll. Every victory names it.”</blockquote><button id="ending-ledger" class="primary-button">Return to campaign ledger</button></section></main>`),
      document
        .querySelector("#ending-ledger")
        ?.addEventListener("click", () => this.showTitle()));
  }
  showSquadSelection(e) {
    const t = this.campaign,
      a = t.roster
        .filter((r) => r.alive && r.hp > 0)
        .sort((r, o) => readiness(o) - readiness(r)),
      i = new Set(a.slice(0, 6).map((r) => r.id)),
      n = () => {
        ((document.querySelector("#app").innerHTML =
          `<main class="squad-screen">
      <header class="squad-header"><button id="back-to-contracts" class="back-button">← Contract board</button><div><span class="eyebrow">DEPLOYMENT ROSTER</span><h1>${escapeHtml(e.title)}</h1></div><div class="squad-count"><span>SELECTED</span><b>${i.size}/6</b></div></header>
      <section class="squad-brief"><div><span>EMPLOYER</span><b>${escapeHtml(e.employer)}</b></div><div><span>OBJECTIVE</span><b>${escapeHtml(e.objective)}</b></div><div><span>TERRAIN</span><b>${escapeHtml(e.terrainLabel)}</b></div><div><span>PAYMENT</span><b>${e.reward} crowns</b></div><div><span>DANGER</span><b>${"◆".repeat(e.danger)}${"◇".repeat(3 - e.danger)}</b></div></section>
      <section class="squad-list">${a
        .map(
          (
            r,
          ) => `<button class="squad-fighter ${i.has(r.id) ? "selected" : ""}" data-squad-fighter="${r.id}">
        <div class="squad-check">${i.has(r.id) ? "✓" : ""}</div><div class="roster-portrait">${r.name
          .split(" ")
          .map((o) => o[0])
          .join("")
          .slice(
            0,
            2,
          )}</div><div><span>LEVEL ${r.level} · ${escapeHtml(r.background)}</span><strong>${escapeHtml(r.name)}</strong><small>${WEAPONS[r.weaponId].name}${r.hasShield ? " + shield" : ""}</small></div><div class="squad-vitals"><span>HP <b>${r.hp}/${r.hpMax}</b></span><span>ARMOR <b>${r.headArmor + r.bodyArmor}/${r.headArmorMax + r.bodyArmorMax}</b></span><span>READY <b>${readiness(r)}%</b></span></div>${r.injuries.length ? `<em>${r.injuries.join(" · ")}</em>` : ""}
      </button>`,
        )
        .join("")}</section>
      <footer class="squad-footer"><div><span>EXPECTED WAGES</span><b>${[...i].reduce((r, o) => r + (t.roster.find((l) => l.id === o)?.wage ?? 0), 0)} crowns/day</b></div><p>${i.size === 6 ? "The formation is ready. Battle damage and death will persist." : "Select exactly six living fighters."}</p><button id="launch-contract" class="primary-button" ${i.size !== 6 ? "disabled" : ""}>March to battle</button></footer>
    </main>`),
          document
            .querySelector("#back-to-contracts")
            ?.addEventListener("click", () =>
              this.openCampaign(t, "contracts"),
            ),
          document.querySelectorAll("[data-squad-fighter]").forEach((r) =>
            r.addEventListener("click", () => {
              const o = r.dataset.squadFighter;
              (i.has(o) ? i.delete(o) : i.size < 6 && i.add(o), n());
            }),
          ),
          document
            .querySelector("#launch-contract")
            ?.addEventListener("click", () => {
              if (i.size !== 6) return;
              const r = buildContractBattle(t, [...i], e);
              new BattleScreen({
                seed: e.seed,
                initialState: r,
                contract: e,
                companyName: t.companyName,
                onComplete: (o, l) => {
                  const d = resolveBattleOutcome(t, e, o, l);
                  (saveCampaign(t), this.showAftermath(d));
                },
              });
            }));
      };
    n();
  }
  showAftermath(e) {
    const t = this.campaign;
    ((document.querySelector("#app").innerHTML =
      `<main class="aftermath-screen ${e.victory ? "victory" : "defeat"}">
    <section class="aftermath-paper">
      <span class="eyebrow">${e.victory ? "CONTRACT SETTLED" : "CONTRACT FAILED"}</span><h1>${escapeHtml(e.contractTitle)}</h1><p class="aftermath-lead">${e.victory ? "The employer's seal is set. Count what was earned, then count what it cost." : "No payment is due. The company carries its losses back to the road."}</p>
      <div class="aftermath-numbers"><div><span>CONTRACT PAY</span><b>${e.reward}</b></div><div><span>SALVAGE</span><b>${e.salvage}</b></div><div><span>WAGES</span><b>−${e.wages}</b></div><div><span>FOOD</span><b>−${e.foodSpent}</b></div><div><span>RENOWN</span><b>${e.renown >= 0 ? "+" : ""}${e.renown}</b></div><div><span>THREAT</span><b>${e.threatChange >= 0 ? "+" : ""}${e.threatChange}</b></div><div><span>REPUTATION</span><b>${e.reputationChange >= 0 ? "+" : ""}${e.reputationChange}</b></div><div><span>ROUNDS</span><b>${e.rounds}</b></div></div>
      <div class="aftermath-columns">
        <section><h2>People</h2>${e.casualties.length ? e.casualties.map((a) => `<p class="casualty"><b>† ${escapeHtml(a)}</b><span>Killed in company service</span></p>`).join("") : '<p class="clean-result">No company dead.</p>'}${e.routed.map((a) => `<p><b>${escapeHtml(a)}</b><span>Routed but returned</span></p>`).join("")}${e.injuries.map((a) => `<p><b>${escapeHtml(a.name)}</b><span>${escapeHtml(a.injury)}</span></p>`).join("")}${e.levelUps.map((a) => `<p class="level-up"><b>${escapeHtml(a)}</b><span>Level gained · perk choice available</span></p>`).join("")}</section>
        <section><h2>Salvage</h2>${e.loot.length ? e.loot.map((a) => `<p><b>${escapeHtml(a)}</b><span>Added to company stores</span></p>`).join("") : '<p class="clean-result">Nothing worth carrying.</p>'}<p><b>Replay verified</b><span>State ${e.hash}</span></p></section>
      </div>
      <div class="aftermath-balance"><span>COMPANY BALANCE</span><b>${t.crowns} crowns · ${t.roster.filter((a) => a.alive).length} living · Day ${t.day}</b></div>
      <button id="return-to-company" class="primary-button">${e.campaignEnded ? "Read the final ledger" : "Return to company"}</button>
    </section>
  </main>`),
      document
        .querySelector("#return-to-company")
        ?.addEventListener("click", () =>
          this.openCampaign(
            t,
            "company",
            e.casualties.length
              ? `${e.casualties.length} name${e.casualties.length === 1 ? "" : "s"} entered in the grave ledger.`
              : "The company returned without a death.",
          ),
        ));
  }
}
