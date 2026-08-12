import { chooseAiCommand } from "../battle/ai.js";
import {
  findPath,
  hexDistance,
  pathCost,
  reachableHexes,
  tileAt,
  unitAt,
} from "../battle/hex.js";
import {
  activeUnit,
  applyCommand,
  attackForecast,
  canDeployAt,
} from "../battle/rules.js";
import {
  battleStateHash,
  buildReplay,
  createBattleState,
  replayBattle,
} from "../battle/state.js";
import { MORALE_LADDER, TERRAIN, WEAPONS } from "../battle/weapons.js";
import { BattleRenderer, MAX_ZOOM, MIN_ZOOM } from "./battle-renderer.js";
import { renderBattleShell } from "./battle-template.js";
import {
  portraitBadge,
  portraitPhotoBadge,
  whenPortraitArtLoaded,
} from "./portrait.js";

export class BattleScreen {
  state;
  renderer;
  commands = [];
  inspectedUnitId = null;
  selectedDeploymentUnitId = "c1";
  hoveredHex = null;
  previewPath = [];
  locked = !1;
  logEntries = ["The Thorn Reavers hold the eastern rise."];
  seed;
  options;
  initialState;
  keyHandler;
  mapKeyHandler;
  mapWheelHandler;
  mapViewport;
  constructor(e) {
    ((this.options = e),
      (this.seed = e.seed >>> 0),
      (this.initialState = structuredClone(
        e.initialState ?? createBattleState(this.seed),
      )),
      (this.state = structuredClone(this.initialState)),
      (this.selectedDeploymentUnitId =
        this.state.units.find((a) => a.team === "company" && a.alive)?.id ??
        "c1"),
      renderBattleShell(e));
    const t = document.querySelector("#battle-canvas");
    ((this.renderer = new BattleRenderer(
      t,
      (a) => this.onHover(a),
      (a) => {
        this.onBoardClick(a);
      },
    )),
      (this.keyHandler = (a) => {
        if (
          (a.key === "Escape" &&
            document
              .querySelectorAll(
                ".modal-layer.visible:not(#briefing):not(#result-modal)",
              )
              .forEach((n) => n.classList.remove("visible")),
          this.locked || this.state.phase !== "battle")
        )
          return;
        const i = activeUnit(this.state);
        if (
          !(!i || i.team !== "company" || i.morale === "fleeing") &&
          (a.key.toLowerCase() === "e" &&
            this.playerCommand({ type: "endTurn", unitId: i.id }),
          a.key.toLowerCase() === "w" &&
            !i.waited &&
            this.playerCommand({ type: "wait", unitId: i.id }),
          a.key === "1")
        ) {
          const n = this.state.units.find(
            (r) =>
              r.team === "enemy" &&
              r.alive &&
              !r.routed &&
              hexDistance(i.position, r.position) === 1,
          );
          n &&
            this.playerCommand({
              type: "attack",
              unitId: i.id,
              targetId: n.id,
            });
        }
      }),
      this.setupMapViewport(),
      this.bindControls(),
      whenPortraitArtLoaded(() => this.refresh()),
      this.refresh());
  }
  setupMapViewport() {
    const e = document.querySelector("#battle-viewport");
    if (!e) return;
    ((this.mapViewport = e),
      // A plain wheel spin zooms the battlefield, centred on the cursor. No
      // modifier is needed; Ctrl/trackpad-pinch wheels behave the same way.
      (this.mapWheelHandler = (a) => {
        a.preventDefault();
        const i = this.renderer.canvas.getBoundingClientRect();
        this.renderer.zoomBy(Math.exp(-a.deltaY * 0.0016), {
          x: a.clientX - i.left,
          y: a.clientY - i.top,
        });
      }),
      (this.mapKeyHandler = (a) => {
        if (a.key === "+" || a.key === "=") {
          (a.preventDefault(),
            this.setMapZoom(this.renderer.zoomTarget + 0.25));
        } else if (a.key === "-") {
          (a.preventDefault(),
            this.setMapZoom(this.renderer.zoomTarget - 0.25));
        } else if (a.key === "0") {
          (a.preventDefault(), this.renderer.resetCamera());
        }
      }),
      e.addEventListener("wheel", this.mapWheelHandler, { passive: !1 }),
      e.addEventListener("keydown", this.mapKeyHandler),
      document
        .querySelector("#map-zoom-in")
        ?.addEventListener("click", () =>
          this.setMapZoom(this.renderer.zoomTarget + 0.25),
        ),
      document
        .querySelector("#map-zoom-out")
        ?.addEventListener("click", () =>
          this.setMapZoom(this.renderer.zoomTarget - 0.25),
        ),
      document
        .querySelector("#map-zoom-fit")
        ?.addEventListener("click", () => this.renderer.resetCamera()),
      (this.renderer.onCameraChange = (a) => this.refreshZoomDisplay(a)),
      this.refreshZoomDisplay(this.renderer.zoomTarget));
  }
  setMapZoom(e) {
    this.renderer.setZoomTarget(Math.round(e * 20) / 20);
  }
  refreshZoomDisplay(e) {
    const t = document.querySelector("#map-zoom-value"),
      a = document.querySelector("#map-zoom-out"),
      i = document.querySelector("#map-zoom-in");
    (t && (t.textContent = `${Math.round(e * 100)}%`),
      a && (a.disabled = e <= MIN_ZOOM),
      i && (i.disabled = e >= MAX_ZOOM));
  }
  bindControls() {
    (document
      .querySelector("#briefing-close")
      ?.addEventListener("click", () =>
        document.querySelector("#briefing")?.classList.remove("visible"),
      ),
      document
        .querySelector("#help-button")
        ?.addEventListener("click", () =>
          document.querySelector("#help-modal")?.classList.add("visible"),
        ),
      document
        .querySelectorAll("[data-close]")
        .forEach((e) =>
          e.addEventListener("click", () =>
            document
              .querySelector(`#${e.dataset.close}`)
              ?.classList.remove("visible"),
          ),
        ),
      document.querySelector("#clear-log")?.addEventListener("click", () => {
        ((this.logEntries = []), this.refreshLog());
      }),
      document
        .querySelector("#replay-button")
        ?.addEventListener("click", () => this.reset(this.seed)),
      document
        .querySelector("#campaign-return-button")
        ?.addEventListener("click", () => {
          if (this.options.onComplete) {
            const e = battleStateHash(this.state);
            (this.dispose(), this.options.onComplete(this.state, e));
          } else this.reset(this.seed);
        }),
      document.addEventListener("keydown", this.keyHandler));
  }
  reset(e) {
    ((this.seed = e >>> 0),
      (this.state =
        e === this.seed
          ? structuredClone(this.initialState)
          : createBattleState(e)),
      (this.commands = []),
      (this.inspectedUnitId = null),
      (this.selectedDeploymentUnitId = "c1"),
      (this.hoveredHex = null),
      (this.previewPath = []),
      (this.locked = !1),
      (this.logEntries = ["The Thorn Reavers hold the eastern rise."]),
      document.querySelector("#result-modal")?.classList.remove("visible"),
      document.querySelector("#briefing")?.classList.add("visible"),
      this.refresh());
  }
  dispose() {
    (document.removeEventListener("keydown", this.keyHandler),
      this.mapViewport?.removeEventListener("wheel", this.mapWheelHandler),
      this.mapViewport?.removeEventListener("keydown", this.mapKeyHandler),
      this.renderer.destroy());
  }
  onHover(e) {
    if (
      ((this.hoveredHex = e),
      (this.previewPath = []),
      e && !this.locked && this.state.phase === "battle")
    ) {
      const t = activeUnit(this.state);
      t?.team === "company" &&
        !unitAt(this.state.units, e) &&
        (this.previewPath =
          findPath(this.state.tiles, this.state.units, t.position, e, t.ap) ??
          []);
    }
    this.refresh(!1);
  }
  async onBoardClick(e) {
    if (this.locked) return;
    const t = unitAt(this.state.units, e, !0);
    if (this.state.phase === "deployment") {
      if (t?.team === "company" && t.alive) {
        ((this.selectedDeploymentUnitId = t.id),
          (this.inspectedUnitId = t.id),
          this.refresh());
        return;
      }
      canDeployAt(this.state, e) &&
        (await this.playerCommand({
          type: "deploy",
          unitId: this.selectedDeploymentUnitId,
          destination: e,
        }));
      return;
    }
    if (this.state.phase !== "battle") return;
    const a = activeUnit(this.state);
    if (!(!a || a.team !== "company" || a.morale === "fleeing"))
      if (
        t?.team === "enemy" &&
        t.alive &&
        hexDistance(a.position, t.position) === 1
      )
        await this.playerCommand({
          type: "attack",
          unitId: a.id,
          targetId: t.id,
        });
      else if (t) ((this.inspectedUnitId = t.id), this.refresh());
      else {
        const i = findPath(
          this.state.tiles,
          this.state.units,
          a.position,
          e,
          a.ap,
        );
        i &&
          i.length > 1 &&
          (await this.playerCommand({ type: "move", unitId: a.id, path: i }));
      }
  }
  async playerCommand(e) {
    if (this.locked) return;
    this.locked = !0;
    if ((await this.execute(e)) && this.state.phase === "battle") {
      // A fighter with no action points left has nothing more to do, so the
      // activation passes on without demanding an explicit end-turn click.
      if (e.type === "move" || e.type === "attack") {
        const t = activeUnit(this.state);
        t &&
          t.id === e.unitId &&
          t.team === "company" &&
          t.morale !== "fleeing" &&
          t.ap <= 0 &&
          (await this.execute({ type: "endTurn", unitId: t.id }));
      }
      this.state.phase === "battle" && (await this.runAiTurns());
    }
    ((this.locked = !1), this.refresh());
  }
  async execute(e) {
    const t = applyCommand(this.state, e);
    return t.error
      ? (this.showToast(t.error), !1)
      : ((this.state = t.state),
        this.commands.push(structuredClone(e)),
        (this.previewPath = []),
        (this.inspectedUnitId = null),
        this.consumeEvents(t.events),
        this.refresh(),
        await this.renderer.play(t.events),
        (this.state.phase === "victory" || this.state.phase === "defeat") &&
          this.showResult(),
        !0);
  }
  async runAiTurns() {
    let e = 0;
    for (; this.state.phase === "battle" && e < 120;) {
      const t = activeUnit(this.state);
      if (!t || (t.team === "company" && t.morale !== "fleeing")) break;
      await new Promise((n) => window.setTimeout(n, 170));
      const a = chooseAiCommand(this.state);
      if (!a) break;
      ((await this.execute(a)) ||
        (await this.execute({ type: "endTurn", unitId: t.id })),
        (e += 1));
    }
    e >= 120 &&
      this.showToast("The enemy turn was halted by the safety limit.");
  }
  consumeEvents(e) {
    for (const t of e) {
      const a =
        "unitId" in t
          ? this.state.units.find((i) => i.id === t.unitId)
          : void 0;
      if (
        (t.type === "battleStarted" &&
          this.logEntries.push("Steel drawn. The battle begins."),
        t.type === "roundStarted" &&
          this.logEntries.push(`— Round ${t.round} —`),
        t.type === "moved" &&
          a &&
          this.logEntries.push(
            `${a.name} moves ${t.path.length - 1} hex${t.path.length === 2 ? "" : "es"}.`,
          ),
        t.type === "attackRolled")
      ) {
        const i = this.state.units.find((r) => r.id === t.unitId),
          n = this.state.units.find((r) => r.id === t.targetId);
        i &&
          n &&
          this.logEntries.push(
            `${i.name} ${WEAPONS[t.weaponId].verb.toLowerCase()}s at ${n.name}: ${t.roll} vs ${t.chance}% — ${t.hit ? "hit" : "miss"}.`,
          );
      }
      if (t.type === "damaged") {
        const i = this.state.units.find((n) => n.id === t.targetId);
        i &&
          this.logEntries.push(
            `${i.name}'s ${t.location}: ${t.armorDamage} armor, ${t.hpDamage} health lost.`,
          );
      }
      (t.type === "moraleChanged" &&
        a &&
        this.logEntries.push(`${a.name} is ${t.to}: ${t.reason}.`),
        t.type === "unitDied" && a && this.logEntries.push(`${a.name} falls.`),
        t.type === "unitRouted" &&
          a &&
          this.logEntries.push(`${a.name} escapes the field.`),
        t.type === "unitEscaped" &&
          a &&
          this.logEntries.push(`${a.name} crosses the escape line.`),
        t.type === "objectiveProgress" &&
          this.logEntries.push(`OBJECTIVE: ${t.message}`),
        t.type === "waited" &&
          a &&
          this.logEntries.push(`${a.name} holds their action.`),
        t.type === "battleEnded" &&
          this.logEntries.push(
            t.winner === "company"
              ? "The contract objective is secured."
              : "The company line collapses.",
          ));
    }
    this.logEntries = this.logEntries.slice(-80);
  }
  refresh(e = !0) {
    const t = activeUnit(this.state);
    let a = new Set();
    t?.team === "company" &&
      this.state.phase === "battle" &&
      !this.locked &&
      (a = new Set(
        reachableHexes(this.state.tiles, this.state.units, t).keys(),
      ));
    const i = this.hoveredHex
        ? unitAt(this.state.units, this.hoveredHex, !0)
        : void 0,
      n =
        this.state.phase === "deployment"
          ? this.selectedDeploymentUnitId
          : (t?.id ?? null);
    if (
      (this.renderer.setState(this.state, {
        selectedUnitId: n,
        inspectedUnitId: this.inspectedUnitId,
        reachable: a,
        path: this.previewPath,
        hovered: this.hoveredHex,
        targetId: i?.team === "enemy" ? i.id : null,
      }),
      !e)
    ) {
      this.refreshForecast();
      return;
    }
    ((document.querySelector("#round-value").textContent =
      this.state.round > 0 ? String(this.state.round) : "—"),
      (document.querySelector("#hash-value").textContent = battleStateHash(
        this.state,
      )));
    let r = this.options.contract?.objective ?? "Rout or kill every enemy.";
    (this.state.objective?.type === "hold" &&
      (r = `${this.state.objective.title} · ${this.state.objectiveState?.heldRounds ?? 0}/${this.state.objective.holdRounds ?? 2} rounds held`),
      this.state.objective?.type === "survive" &&
        (r = `${this.state.objective.title} · round ${this.state.round}/${this.state.objective.targetRounds ?? 6}`),
      this.state.objective?.type === "escape" &&
        (r = `${this.state.objective.title} · ${this.state.objectiveState?.escapedCompanyIds.length ?? 0}/${this.state.objective.escapeCount ?? 3} escaped`),
      this.state.objective?.type === "break-captain" &&
        (r = `${this.state.objective.title} · enemy captain marked in gold`),
      (document.querySelector("#objective-copy").textContent =
        this.state.phase === "deployment" ? `Deploy for: ${r}` : r),
      this.refreshTurnOrder(),
      this.refreshUnitPanel(),
      this.refreshForecast(),
      this.refreshActions(),
      this.refreshLog());
    const o = document.querySelector("#phase-banner");
    ((o.textContent =
      this.state.phase === "deployment"
        ? "DEPLOYMENT"
        : this.state.phase === "battle"
          ? `ROUND ${this.state.round}`
          : this.state.phase.toUpperCase()),
      o.classList.toggle("quiet", this.state.phase === "battle"));
  }
  unitBadge(e, t) {
    return portraitPhotoBadge(e, t) || portraitBadge(e, t);
  }
  refreshTurnOrder() {
    const e = document.querySelector("#turn-order");
    if (this.state.phase === "deployment") {
      // The company roster stands in for the turn order while deploying, so
      // every fighter's face is visible and clickable before the line forms.
      ((e.innerHTML = this.state.units
        .filter((t) => t.team === "company" && t.alive)
        .map((t) => {
          const a = this.unitBadge(t, 28);
          return `<button class="turn-token deploy company ${t.id === this.selectedDeploymentUnitId ? "selected" : ""}" data-deploy="${t.id}" title="${t.name} · ${t.epithet}">
      <span class="token-initial"${a ? ` style="background-image:url('${a}')"` : ""}>${a ? "" : t.name.charAt(0)}</span><span class="token-name">${t.name.split(" ")[0]}</span>
    </button>`;
        })
        .join("")),
        e.querySelectorAll("[data-deploy]").forEach((t) =>
          t.addEventListener("click", () => {
            ((this.selectedDeploymentUnitId = t.dataset.deploy ?? "c1"),
              (this.inspectedUnitId = t.dataset.deploy ?? null),
              this.refresh());
          }),
        ));
      return;
    }
    ((e.innerHTML = this.state.queue
      .slice(0, 12)
      .map((t, a) => {
        const i = this.state.units.find((r) => r.id === t),
          n = (i.headArmor + i.bodyArmor) / (i.headArmorMax + i.bodyArmorMax);
        const o = this.unitBadge(i, 28);
        return `<button class="turn-token ${i.team} ${a === 0 ? "active" : ""}" data-inspect="${i.id}" title="${i.name}">
      <span class="token-initial"${o ? ` style="background-image:url('${o}')"` : ""}>${o ? "" : i.name.charAt(0)}</span><span class="token-bars"><i style="--fill:${i.hp / i.hpMax}"></i><i style="--fill:${n}"></i></span><small>${a + 1}</small>
    </button>`;
      })
      .join("")),
      e.querySelectorAll("[data-inspect]").forEach((t) =>
        t.addEventListener("click", () => {
          ((this.inspectedUnitId = t.dataset.inspect ?? null), this.refresh());
        }),
      ));
  }
  unitForPanel() {
    if (this.inspectedUnitId)
      return this.state.units.find((e) => e.id === this.inspectedUnitId);
    if (this.hoveredHex) {
      const e = unitAt(this.state.units, this.hoveredHex, !0);
      if (e) return e;
    }
    return this.state.phase === "deployment"
      ? this.state.units.find((e) => e.id === this.selectedDeploymentUnitId)
      : activeUnit(this.state);
  }
  refreshUnitPanel() {
    const e = this.unitForPanel(),
      t = document.querySelector("#unit-panel");
    if (!e) {
      t.innerHTML = '<div class="empty-panel">No fighter selected.</div>';
      return;
    }
    const a = WEAPONS[e.weaponId],
      i = MORALE_LADDER.indexOf(e.morale),
      n = this.unitBadge(e, 54);
    t.innerHTML = `
    <div class="unit-heading"><div class="portrait-seal ${e.team}"${n ? ` style="background-image:url('${n}')"` : ""}>${
      n
        ? ""
        : e.name
            .split(" ")
            .map((r) => r[0])
            .join("")
            .slice(0, 2)
    }</div><div><span class="eyebrow">${e.team === "company" ? "IRON COMPANY" : (this.options.contract?.enemyFaction ?? "THORN REAVERS").replace("-", " ").toUpperCase()}</span><h2>${e.name}</h2><p>${e.epithet}</p></div></div>
    <div class="resource-row"><span>Health</span><div class="meter health"><i style="width:${(e.hp / e.hpMax) * 100}%"></i></div><b>${e.hp}/${e.hpMax}</b></div>
    <div class="resource-row"><span>Head</span><div class="meter armor"><i style="width:${(e.headArmor / e.headArmorMax) * 100}%"></i></div><b>${e.headArmor}/${e.headArmorMax}</b></div>
    <div class="resource-row"><span>Body</span><div class="meter armor"><i style="width:${(e.bodyArmor / e.bodyArmorMax) * 100}%"></i></div><b>${e.bodyArmor}/${e.bodyArmorMax}</b></div>
    <div class="resource-row"><span>Fatigue</span><div class="meter fatigue"><i style="width:${(e.fatigue / e.fatigueMax) * 100}%"></i></div><b>${e.fatigue}/${e.fatigueMax}</b></div>
    <div class="morale-track" aria-label="Morale: ${e.morale}">${MORALE_LADDER.slice()
      .reverse()
      .map(
        (n, r) =>
          `<i class="${n === e.morale ? "current" : ""} ${4 - r <= i ? "filled" : ""}" title="${n}"></i>`,
      )
      .join("")}<span>${e.morale}</span></div>
    <div class="equipment-row"><span class="weapon-icon">${a.icon}</span><div><strong>${a.name}</strong><small>${e.hasShield ? "Shielded · " : ""}${a.description}</small></div></div>
    <div class="stat-grid"><div><span>SKILL</span><b>${e.meleeSkill}</b></div><div><span>DEFENCE</span><b>${e.meleeDefense + (e.hasShield ? 10 : 0)}</b></div><div><span>RESOLVE</span><b>${e.resolve}</b></div><div><span>INITIATIVE</span><b>${e.initiative}</b></div></div>
  `;
  }
  refreshForecast() {
    const e = document.querySelector("#forecast-panel"),
      t = activeUnit(this.state),
      a = this.hoveredHex
        ? unitAt(this.state.units, this.hoveredHex, !0)
        : void 0;
    if (this.state.phase === "deployment") {
      const i = this.hoveredHex
        ? tileAt(this.state.tiles, this.hoveredHex)
        : void 0;
      e.innerHTML = `<div class="panel-heading"><span>FIELD READ</span></div>${i ? `<div class="terrain-read"><strong>${TERRAIN[i.terrain].name}</strong><span>Move ${TERRAIN[i.terrain].moveCost} AP · Defence ${TERRAIN[i.terrain].defense >= 0 ? "+" : ""}${TERRAIN[i.terrain].defense}${i.elevation ? " · High ground" : ""}</span></div>` : '<p class="muted">Hover a hex to inspect terrain.</p>'}`;
      return;
    }
    if (
      t &&
      a &&
      t.team !== a.team &&
      a.alive &&
      hexDistance(t.position, a.position) === 1
    ) {
      const i = attackForecast(this.state, t, a);
      e.innerHTML = `<div class="panel-heading"><span>ATTACK FORECAST</span><strong>${i.chance}%</strong></div>
      <div class="forecast-target"><span>${WEAPONS[t.weaponId].verb}</span><b>${a.name}</b></div>
      <div class="forecast-band"><div><span>DAMAGE</span><b>${i.damageMin}–${i.damageMax}</b></div><div><span>ARMOR</span><b>×${i.armorMultiplier.toFixed(2)}</b></div><div><span>PEN.</span><b>${Math.round(i.penetration * 100)}%</b></div></div>
      <details><summary>Chance breakdown</summary>${i.modifiers.map((n) => `<div class="modifier"><span>${n.label}</span><b class="${n.value < 0 ? "negative" : "positive"}">${n.value >= 0 ? "+" : ""}${n.value}</b></div>`).join("")}</details>`;
      return;
    }
    if (t && this.previewPath.length > 1) {
      const i = pathCost(this.state.tiles, this.previewPath);
      e.innerHTML = `<div class="panel-heading"><span>MOVE FORECAST</span><strong>${i} AP</strong></div><div class="forecast-band"><div><span>HEXES</span><b>${this.previewPath.length - 1}</b></div><div><span>FATIGUE</span><b>+${i * 3}</b></div><div><span>AP LEFT</span><b>${t.ap - i}</b></div></div><p class="muted">Click to commit this route.</p>`;
      return;
    }
    e.innerHTML =
      '<div class="panel-heading"><span>TACTICAL READ</span></div><p class="muted">Hover a reachable hex for movement cost, or an adjacent enemy for the complete attack calculation.</p>';
  }
  refreshActions() {
    const e = document.querySelector("#action-buttons"),
      t = document.querySelector("#active-summary"),
      a = document.querySelector("#dock-hint");
    if (this.state.phase === "deployment") {
      const l = this.state.units.find(
        (d) => d.id === this.selectedDeploymentUnitId,
      );
      ((t.innerHTML = `<span class="eyebrow">SELECTED FOR DEPLOYMENT</span><strong>${l.name}</strong><small>${WEAPONS[l.weaponId].name}${l.hasShield ? " + shield" : ""}</small>`),
        (e.innerHTML =
          '<button id="start-battle" class="primary-button action-wide">Commit formation <kbd>↵</kbd></button>'),
        e.querySelector("#start-battle")?.addEventListener("click", () => {
          this.playerCommand({ type: "startBattle" });
        }),
        (a.textContent =
          "Click a company fighter, then any open blue hex to reposition them."));
      return;
    }
    const i = activeUnit(this.state);
    if (!i) {
      ((t.innerHTML = ""), (e.innerHTML = ""));
      return;
    }
    const n = WEAPONS[i.weaponId];
    if (
      ((t.innerHTML = `<span class="eyebrow">${i.team === "company" ? "YOUR ACTIVATION" : "ENEMY ACTIVATION"}</span><strong>${i.name}</strong><small>${i.ap} AP · ${i.fatigue}/${i.fatigueMax} fatigue</small>`),
      i.team !== "company" || i.morale === "fleeing")
    ) {
      ((e.innerHTML = `<div class="enemy-thinking"><i></i><span>${i.morale === "fleeing" ? "Fleeing" : "Enemy planning"}</span></div>`),
        (a.textContent =
          i.morale === "fleeing"
            ? `${i.name} has broken and is trying to escape.`
            : "The Thorn Reavers are choosing their move."));
      return;
    }
    const r = this.state.units.filter(
        (l) =>
          l.team === "enemy" &&
          l.alive &&
          !l.routed &&
          hexDistance(i.position, l.position) === 1,
      ),
      o =
        r.length > 0 &&
        i.ap >= n.apCost &&
        i.fatigue + n.fatigueCost <= i.fatigueMax;
    ((e.innerHTML = `
    <button class="action-button" id="attack-action" ${o ? "" : "disabled"}><span class="action-icon">${n.icon}</span><span><b>${n.verb}</b><small>${n.apCost} AP · +${n.fatigueCost} FAT</small></span><kbd>1</kbd></button>
    <button class="action-button" id="wait-action" ${i.waited || this.state.queue.length <= 1 ? "disabled" : ""}><span class="action-icon">◷</span><span><b>Wait</b><small>Act later this round</small></span><kbd>W</kbd></button>
    <button class="action-button end" id="end-action"><span class="action-icon">◆</span><span><b>End turn</b><small>${i.ap >= 4 ? "Recover 5 fatigue" : "Pass activation"}</small></span><kbd>E</kbd></button>`),
      e.querySelector("#attack-action")?.addEventListener("click", () => {
        const l = r.sort((d, c) => d.hp - c.hp || d.id.localeCompare(c.id))[0];
        l &&
          this.playerCommand({
            type: "attack",
            unitId: i.id,
            targetId: l.id,
          });
      }),
      e.querySelector("#wait-action")?.addEventListener("click", () => {
        this.playerCommand({ type: "wait", unitId: i.id });
      }),
      e.querySelector("#end-action")?.addEventListener("click", () => {
        this.playerCommand({ type: "endTurn", unitId: i.id });
      }),
      (a.textContent = o
        ? "Click an adjacent enemy to inspect and strike, or choose the attack action."
        : "Click any highlighted hex to move. Terrain changes AP cost."));
  }
  refreshLog() {
    const e = document.querySelector("#combat-log");
    ((e.innerHTML = this.logEntries
      .map(
        (t, a) =>
          `<p class="${t.startsWith("—") ? "round-entry" : ""}"><span>${String(a + 1).padStart(2, "0")}</span>${t}</p>`,
      )
      .join("")),
      (e.scrollTop = e.scrollHeight));
  }
  showToast(e) {
    const t = document.querySelector("#toast");
    ((t.textContent = e),
      t.classList.add("visible"),
      window.setTimeout(() => t.classList.remove("visible"), 1800));
  }
  showResult() {
    const e = this.state.phase === "victory",
      t = this.state.units.filter((l) => l.team === "company"),
      a = this.state.units.filter((l) => l.team === "enemy"),
      i = t.filter((l) => !l.alive || l.routed).length,
      n = a.filter((l) => !l.alive || l.routed).length,
      r = buildReplay(this.seed, this.commands, this.state),
      o = battleStateHash(replayBattle(r)) === r.finalHash;
    ((document.querySelector("#result-kicker").textContent = e
      ? "CONTRACT COMPLETE"
      : "COMPANY BROKEN"),
      (document.querySelector("#result-title").textContent = e
        ? `${this.options.contract?.title ?? "The road"} is settled`
        : "Iron paid in blood"),
      (document.querySelector("#result-copy").textContent = e
        ? "The objective is secured. Count what the enemy carried, then count who survived to carry it home."
        : "The frontier keeps its tithe. Those who escaped will remember the cost."),
      (document.querySelector("#result-stats").innerHTML =
        `<div><span>ROUNDS</span><b>${this.state.round}</b></div><div><span>COMPANY LOST</span><b>${i}/6</b></div><div><span>ENEMY BROKEN</span><b>${n}/6</b></div><div><span>REPLAY</span><b class="${o ? "verified" : "failed"}">${o ? "VERIFIED" : "FAILED"}</b></div><small>Seed ${this.seed.toString(16).toUpperCase()} · ${this.commands.length} commands · state ${battleStateHash(this.state)}</small>`),
      document.querySelector("#result-modal")?.classList.add("visible"));
  }
}
