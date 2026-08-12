import { artImage, drawArt } from "../art/canvas-art.js";
import { hexKey, sameHex, unitAt } from "../battle/hex.js";
import { TERRAIN } from "../battle/weapons.js";
import {
  SQRT3,
  battlefieldLayout,
  canvasBackingRatio,
} from "./battle-layout.js";
import {
  PORTRAIT_ATLASES,
  armorTint,
  drawPortraitMedallion,
  portraitAtlasPath,
  portraitIndexForUnit,
  shiftColor,
} from "./portrait.js";

const TERRAIN_TEXTURES = {
  grass: "terrain/grass.webp",
  forest: "terrain/forest.webp",
  marsh: "terrain/marsh.webp",
  desert: "terrain/desert.webp",
  mud: "terrain/mud.webp",
  road: "terrain/road.webp",
  rock: "terrain/rock.webp",
  water: "terrain/water.webp",
};

const EQUIPMENT_ART = {
  shield: "icons/resources/shield.webp",
  sword: "icons/weapons/sword-worn.webp",
  spear: "icons/weapons/spear-worn.webp",
  axe: "icons/weapons/axe-worn.webp",
  mace: "icons/weapons/mace-worn.webp",
};

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 2.5;

export { SQRT3, shiftColor };
export function easeInOutQuad(s) {
  return s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
}
export class BattleRenderer {
  canvas;
  context;
  state = null;
  view = {
    selectedUnitId: null,
    inspectedUnitId: null,
    reachable: new Set(),
    path: [],
    hovered: null,
    targetId: null,
  };
  width = 1;
  height = 1;
  pixelRatio = 1;
  size = 42;
  origin = { x: 0, y: 0 };
  baseSize = 42;
  baseOrigin = { x: 0, y: 0 };
  // The camera eases toward its target every frame, so wheel zooms and drag
  // pans glide instead of snapping between discrete steps.
  zoom = 1;
  pan = { x: 0, y: 0 };
  zoomTarget = 1;
  panTarget = { x: 0, y: 0 };
  onCameraChange = null;
  drag = null;
  lastHoverKey = "";
  lastFrameTime = 0;
  layoutTiles = 0;
  motion = null;
  floaters = [];
  particles = [];
  shakeUntil = 0;
  onHover;
  onClick;
  resizeObserver;
  terrainPatterns = new Map();
  running = !0;
  reportedFrameError = !1;
  constructor(e, t, a) {
    const i = e.getContext("2d");
    if (!i) throw new Error("Canvas 2D is unavailable.");
    ((this.canvas = e),
      (this.context = i),
      (this.onHover = t),
      (this.onClick = a),
      (this.resizeObserver = new ResizeObserver(() => this.resize())),
      [
        ...Object.values(TERRAIN_TEXTURES),
        ...Object.values(PORTRAIT_ATLASES),
        ...Object.values(EQUIPMENT_ART),
      ].forEach((n) => artImage(n)),
      this.resizeObserver.observe(e),
      e.addEventListener("pointermove", (n) => this.handlePointerMove(n)),
      e.addEventListener("pointerleave", () => {
        ((this.lastHoverKey = ""), this.onHover(null));
      }),
      e.addEventListener("pointerdown", (n) => this.handlePointerDown(n)),
      e.addEventListener("pointerup", (n) => this.handlePointerUp(n)),
      e.addEventListener("pointercancel", () => {
        ((this.drag = null), this.canvas.classList.remove("panning"));
      }),
      this.resize(),
      requestAnimationFrame((n) => this.render(n)));
  }
  destroy() {
    ((this.running = !1), this.resizeObserver.disconnect());
  }
  setState(e, t = {}) {
    const a = e.tiles.length !== this.layoutTiles;
    ((this.state = e),
      (this.view = { ...this.view, ...t }),
      a && this.resize());
  }
  setView(e) {
    this.view = { ...this.view, ...e };
  }
  async play(e) {
    const t = performance.now(),
      a = document.documentElement.classList.contains("reduced-motion"),
      i = e.find((c) => c.type === "moved"),
      n = e.find((c) => c.type === "attackRolled"),
      r = e.find((c) => c.type === "damaged");
    if (
      (i
        ? (this.motion = {
            kind: "move",
            unitId: i.unitId,
            path: i.path,
            started: t,
            duration: Math.min(720, 170 + i.path.length * 85),
          })
        : n &&
          ((this.motion = {
            kind: "attack",
            unitId: n.unitId,
            targetId: n.targetId,
            started: t,
            duration: 440,
          }),
          n.hit ||
            this.addFloater(n.targetId, "MISS", "#d8cfb6", t + 180, 820)),
      r)
    ) {
      (this.addFloater(
        r.targetId,
        `−${r.hpDamage} HP`,
        "#ffb29a",
        t + 240,
        950,
        -4,
      ),
        r.armorDamage > 0 &&
          this.addFloater(
            r.targetId,
            `−${r.armorDamage} ARMOR`,
            "#b9c4c9",
            t + 310,
            900,
            10,
          ),
        (this.shakeUntil = a ? 0 : t + 450));
      for (let c = 0; c < 10; c += 1)
        this.particles.push({
          unitId: r.targetId,
          angle: c * 0.91 + r.hpDamage * 0.07,
          distance: 14 + (c % 4) * 6,
          color: c % 3 === 0 ? "#d2c3a4" : "#8f352f",
          started: t + 210,
          duration: 520 + c * 18,
        });
    }
    const o = e.find((c) => c.type === "moraleChanged");
    o &&
      this.addFloater(
        o.unitId,
        o.to.toUpperCase(),
        "#e7c269",
        t + 420,
        1100,
        20,
      );
    const l = e.find((c) => c.type === "unitDied");
    l && this.addFloater(l.unitId, "FALLEN", "#a94f46", t + 500, 1200, 30);
    const d = i
      ? Math.min(720, 170 + i.path.length * 85)
      : n
        ? 600
        : e.some((c) => c.type === "roundStarted")
          ? 340
          : 170;
    (await new Promise((c) => window.setTimeout(c, a ? 20 : d)),
      (this.motion = null));
  }
  addFloater(e, t, a, i, n, r = 0) {
    this.floaters.push({
      unitId: e,
      text: t,
      color: a,
      started: i,
      duration: n,
      offset: r,
    });
  }
  // Measuring the canvas before the layout settles reports a box of no useful
  // size. Baking that in would leave a one-pixel battlefield that nothing ever
  // resizes again, so the last good size is kept until a real box arrives.
  resize() {
    const e = this.canvas.getBoundingClientRect();
    if (e.width < 2 || e.height < 2) return;
    ((this.width = e.width), (this.height = e.height));
    const t = canvasBackingRatio(
        this.width,
        this.height,
        window.devicePixelRatio || 1,
      ),
      a = Math.floor(this.width * t),
      i = Math.floor(this.height * t);
    // Only reallocate when the backing store actually changes: assigning
    // canvas.width clears the canvas, and a resize that lands after a frame is
    // drawn would leave the player looking at an empty battlefield.
    ((this.canvas.width === a && this.canvas.height === i) ||
      ((this.canvas.width = a), (this.canvas.height = i)),
      (this.pixelRatio = a / this.width),
      this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0));
    const n = battlefieldLayout(this.state?.tiles, this.width, this.height);
    ((this.baseSize = n.size),
      (this.baseOrigin = n.origin),
      (this.layoutTiles = this.state?.tiles.length ?? 0),
      this.applyCamera());
  }
  // The camera scales the fitted layout about the canvas origin and then
  // translates it, so hit-testing and drawing share the same numbers.
  clampPan(e, t) {
    return {
      x: Math.min(0, Math.max(this.width * (1 - t), e.x)),
      y: Math.min(0, Math.max(this.height * (1 - t), e.y)),
    };
  }
  applyCamera() {
    ((this.pan = this.clampPan(this.pan, this.zoom)),
      (this.size = this.baseSize * this.zoom),
      (this.origin = {
        x: this.baseOrigin.x * this.zoom + this.pan.x,
        y: this.baseOrigin.y * this.zoom + this.pan.y,
      }));
  }
  setZoomTarget(e, t) {
    const a = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, e));
    if (a === this.zoomTarget) return;
    const i = t ?? { x: this.width / 2, y: this.height / 2 },
      n = a / this.zoomTarget;
    ((this.panTarget = this.clampPan(
      {
        x: i.x - (i.x - this.panTarget.x) * n,
        y: i.y - (i.y - this.panTarget.y) * n,
      },
      a,
    )),
      (this.zoomTarget = a),
      this.onCameraChange?.(a));
  }
  zoomBy(e, t) {
    this.setZoomTarget(this.zoomTarget * e, t);
  }
  resetCamera() {
    ((this.zoomTarget = 1),
      (this.panTarget = { x: 0, y: 0 }),
      this.onCameraChange?.(1));
  }
  // Ease the live camera toward its target. Called once per frame; returns
  // quickly when the camera is already settled.
  advanceCamera(e) {
    const t = this.lastFrameTime
      ? Math.min(0.1, (e - this.lastFrameTime) / 1000)
      : 0.016;
    this.lastFrameTime = e;
    const a = document.documentElement.classList.contains("reduced-motion")
        ? 1
        : 1 - Math.exp(-t * 14),
      i = this.zoomTarget - this.zoom,
      n = this.panTarget.x - this.pan.x,
      r = this.panTarget.y - this.pan.y;
    if (Math.abs(i) < 0.0005 && Math.abs(n) < 0.1 && Math.abs(r) < 0.1) {
      if (this.zoom === this.zoomTarget && this.pan.x === this.panTarget.x)
        return;
      ((this.zoom = this.zoomTarget), (this.pan = { ...this.panTarget }));
    } else
      ((this.zoom += i * a),
        (this.pan = { x: this.pan.x + n * a, y: this.pan.y + r * a }));
    this.applyCamera();
  }
  pointerPoint(e) {
    const t = this.canvas.getBoundingClientRect();
    return { x: e.clientX - t.left, y: e.clientY - t.top };
  }
  hexAtPoint(e) {
    if (!this.state) return null;
    const t = this.unitAtPoint(e),
      a = t
        ? this.state.tiles.find((i) => sameHex(i, t.position))
        : this.state.tiles.find((i) => this.pointInHex(e, this.hexCenter(i)));
    return a ? { q: a.q, r: a.r } : null;
  }
  handlePointerDown(e) {
    if (!this.state || e.button > 1) return;
    ((this.drag = {
      pointerId: e.pointerId,
      start: this.pointerPoint(e),
      panStart: { ...this.panTarget },
      moved: !1,
    }),
      this.canvas.setPointerCapture?.(e.pointerId));
  }
  handlePointerMove(e) {
    if (!this.state) return;
    const t = this.pointerPoint(e);
    if (this.drag && e.pointerId === this.drag.pointerId) {
      const i = t.x - this.drag.start.x,
        n = t.y - this.drag.start.y;
      if (this.drag.moved || Math.hypot(i, n) > 4) {
        ((this.drag.moved = !0), this.canvas.classList.add("panning"));
        const r = this.clampPan(
          { x: this.drag.panStart.x + i, y: this.drag.panStart.y + n },
          this.zoomTarget,
        );
        // Dragging tracks the pointer directly — easing here would make the
        // map lag behind the hand.
        ((this.panTarget = r), (this.pan = { ...r }), this.applyCamera());
        return;
      }
    }
    const a = this.hexAtPoint(t),
      i = a ? `${a.q},${a.r}` : "";
    // Only report hover when the hex actually changes: re-running path
    // preview and panel refreshes for every pixel of pointer travel is what
    // made hovering feel jerky.
    i !== this.lastHoverKey && ((this.lastHoverKey = i), this.onHover(a));
  }
  handlePointerUp(e) {
    const t = this.drag;
    ((this.drag = null), this.canvas.classList.remove("panning"));
    if (!this.state || !t || e.pointerId !== t.pointerId) return;
    if (t.moved) return;
    const a = this.hexAtPoint(this.pointerPoint(e));
    a && this.onClick(a);
  }
  unitAtPoint(e) {
    if (!this.state) return null;
    return (
      [...this.state.units]
        .filter((t) => t.alive && !t.routed)
        .sort((t, a) => a.position.r - t.position.r || a.id.localeCompare(t.id))
        .find((t) => {
          const a = this.hexCenter(t.position),
            i = e.x - a.x,
            n = e.y - a.y;
          return (
            Math.abs(i) <= this.size * 0.79 &&
            n >= -this.size * 1.05 &&
            n <= this.size * 0.64
          );
        }) ?? null
    );
  }
  pointInHex(e, t) {
    const a = Math.abs(e.x - t.x) / this.size,
      i = Math.abs(e.y - t.y) / this.size;
    return i <= 1 && SQRT3 * a + i <= SQRT3;
  }
  hexCenter(e) {
    return {
      x: this.origin.x + this.size * SQRT3 * (e.q + e.r / 2),
      y: this.origin.y + this.size * 1.5 * e.r,
    };
  }
  drawHex(e, t) {
    const a = this.context;
    a.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const n = (Math.PI / 180) * (60 * i - 30),
        r = e.x + t * Math.cos(n),
        o = e.y + t * Math.sin(n);
      i === 0 ? a.moveTo(r, o) : a.lineTo(r, o);
    }
    a.closePath();
  }
  // One thrown frame must never end the animation loop: a battlefield that
  // stops requesting frames reads to the player as a screen that never renders.
  render(e) {
    if (!this.running) return;
    try {
      this.drawFrame(e);
    } catch (t) {
      (this.reportedFrameError ||
        ((this.reportedFrameError = !0),
        console.error("Battlefield frame failed to draw.", t)),
        // Drop any clip or transform the failed frame left behind.
        this.context.reset
          ? this.context.reset()
          : (this.context.restore(), this.context.restore()));
    }
    requestAnimationFrame((t) => this.render(t));
  }
  drawFrame(e) {
    this.advanceCamera(e);
    const t = this.context;
    (t.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0),
      t.clearRect(0, 0, this.width, this.height));
    const a = t.createRadialGradient(
      this.width * 0.5,
      this.height * 0.45,
      20,
      this.width * 0.5,
      this.height * 0.5,
      this.width * 0.7,
    );
    if (
      (a.addColorStop(0, "#31332c"),
      a.addColorStop(0.55, "#1b1e1d"),
      a.addColorStop(1, "#0d0f10"),
      (t.fillStyle = a),
      t.fillRect(0, 0, this.width, this.height),
      !this.state)
    )
      return;
    const i = e < this.shakeUntil ? Math.sin(e * 0.15) * 1.6 : 0;
    (t.save(),
      t.translate(i, 0),
      this.drawTiles(e),
      this.drawPath(),
      this.drawCorpses());
    for (const n of [...this.state.units].sort(
      (r, o) => r.position.r - o.position.r || r.id.localeCompare(o.id),
    ))
      n.alive && !n.routed && this.drawUnit(n, e);
    (this.drawParticles(e),
      this.drawFloaters(e),
      t.restore(),
      (this.floaters = this.floaters.filter((n) => e < n.started + n.duration)),
      (this.particles = this.particles.filter(
        (n) => e < n.started + n.duration,
      )));
  }
  drawTiles(e) {
    if (!this.state) return;
    const t = this.context;
    for (const a of this.state.tiles) {
      const i = this.hexCenter(a),
        n = TERRAIN[a.terrain];
      (a.elevation > 0 &&
        (this.drawHex(
          { x: i.x + 2, y: i.y + this.size * 0.18 },
          this.size * 1.01,
        ),
        (t.fillStyle = "rgba(13, 14, 12, .76)"),
        t.fill()),
        this.drawHex(i, this.size * 1.01));
      const r = t.createLinearGradient(
        i.x,
        i.y - this.size,
        i.x,
        i.y + this.size,
      );
      (r.addColorStop(0, shiftColor(n.color, a.elevation ? 20 : 10)),
        r.addColorStop(1, shiftColor(n.color, -14)),
        (t.fillStyle = r),
        t.fill(),
        this.drawTerrainTexture(a, i),
        this.drawTerrainDetails(a, i, e),
        this.drawHex(i, this.size * 0.995),
        (t.strokeStyle = "rgba(8, 10, 9, .28)"),
        (t.lineWidth = Math.max(0.55, this.size * 0.012)),
        t.stroke());
      const l = hexKey(a),
        d = a.q + Math.floor(a.r / 2);
      if (
        (this.state.phase === "deployment" &&
          d <= 3 &&
          (this.drawHex(i, this.size * 0.87),
          (t.fillStyle = "rgba(82, 132, 145, .16)"),
          t.fill(),
          (t.strokeStyle = "rgba(122, 186, 196, .6)"),
          t.setLineDash([4, 4]),
          t.stroke(),
          t.setLineDash([]),
          drawArt(
            t,
            "overlays/deployment.webp",
            i.x - this.size * 0.8,
            i.y - this.size * 0.8,
            this.size * 1.6,
            this.size * 1.6,
            0.72,
          )),
        this.view.reachable.has(l) &&
          (this.drawHex(i, this.size * 0.84),
          (t.fillStyle = "rgba(114, 166, 166, .12)"),
          t.fill(),
          (t.strokeStyle = "rgba(140, 202, 198, .45)"),
          (t.lineWidth = 1.4),
          t.stroke()),
        this.view.hovered && sameHex(a, this.view.hovered))
      ) {
        this.drawHex(i, this.size * 0.82);
        const m = unitAt(this.state.units, a)?.team === "enemy";
        ((t.strokeStyle = m ? "#d66a5d" : "#e3c477"),
          (t.lineWidth = 2),
          t.stroke());
      }
      (this.state.objective?.type === "hold" &&
        this.state.objective.holdHex &&
        sameHex(a, this.state.objective.holdHex) &&
        (this.drawHex(i, this.size * (0.7 + Math.sin(e * 0.004) * 0.04)),
        (t.fillStyle = "rgba(225, 188, 91, .13)"),
        t.fill(),
        (t.strokeStyle = "rgba(240, 205, 110, .9)"),
        (t.lineWidth = 2.2),
        t.setLineDash([6, 4]),
        t.stroke(),
        t.setLineDash([]),
        (t.fillStyle = "#f0cd73"),
        (t.font = `800 ${Math.max(10, this.size * 0.27)}px system-ui, sans-serif`),
        (t.textAlign = "center"),
        t.fillText("HOLD", i.x, i.y + 4),
        drawArt(
          t,
          "overlays/hold-position.webp",
          i.x - this.size * 0.82,
          i.y - this.size * 0.82,
          this.size * 1.64,
          this.size * 1.64,
          0.86,
        )),
        this.state.objective?.type === "escape" &&
          d >= 11 &&
          (this.drawHex(i, this.size * 0.79),
          (t.fillStyle = "rgba(224, 189, 98, .11)"),
          t.fill(),
          (t.strokeStyle = "rgba(236, 202, 112, .72)"),
          t.setLineDash([3, 4]),
          t.stroke(),
          t.setLineDash([]),
          drawArt(
            t,
            "overlays/escape-zone.webp",
            i.x - this.size * 0.8,
            i.y - this.size * 0.8,
            this.size * 1.6,
            this.size * 1.6,
            0.72,
          )));
    }
  }
  textureForTerrain(e) {
    if (e.terrain === "brush") return TERRAIN_TEXTURES.forest;
    if (e.terrain === "mud")
      return e.biome === "wetland"
        ? TERRAIN_TEXTURES.marsh
        : TERRAIN_TEXTURES.mud;
    if (e.terrain === "grass" || e.terrain === "hill")
      return e.biome === "badlands"
        ? TERRAIN_TEXTURES.desert
        : TERRAIN_TEXTURES.grass;
    return TERRAIN_TEXTURES[e.terrain] ?? TERRAIN_TEXTURES.grass;
  }
  patternForTerrain(e) {
    const t = this.textureForTerrain(e);
    if (this.terrainPatterns.has(t)) return this.terrainPatterns.get(t);
    const a = artImage(t);
    if (!a.complete || !a.naturalWidth) return null;
    const i = this.context.createPattern(a, "repeat");
    return (i && this.terrainPatterns.set(t, i), i);
  }
  drawTerrainTexture(e, t) {
    const a = this.context,
      i = this.patternForTerrain(e);
    if (!i) return;
    const n = Math.max(0.38, this.size / 105);
    (i.setTransform(new DOMMatrix().scale(n)),
      a.save(),
      this.drawHex(t, this.size * 1.012),
      a.clip(),
      (a.fillStyle = i),
      a.fillRect(
        t.x - this.size * 1.1,
        t.y - this.size * 1.1,
        this.size * 2.2,
        this.size * 2.2,
      ));
    const r = a.createLinearGradient(
      t.x - this.size * 0.45,
      t.y - this.size,
      t.x + this.size * 0.4,
      t.y + this.size,
    );
    (r.addColorStop(
      0,
      e.elevation ? "rgba(244, 225, 171, .13)" : "rgba(244, 225, 171, .05)",
    ),
      r.addColorStop(0.58, "rgba(14, 17, 15, 0)"),
      r.addColorStop(1, "rgba(7, 9, 8, .2)"),
      (a.fillStyle = r),
      a.fillRect(
        t.x - this.size * 1.1,
        t.y - this.size * 1.1,
        this.size * 2.2,
        this.size * 2.2,
      ),
      a.restore());
  }
  drawTerrainDetails(e, t, a) {
    const i = this.context,
      n = this.size;
    if (e.terrain === "water") {
      (i.save(),
        (i.strokeStyle = "rgba(210, 230, 221, .2)"),
        (i.lineWidth = Math.max(0.7, n * 0.017)),
        (i.lineCap = "round"));
      for (let r = -1; r <= 1; r += 1) {
        const o = Math.sin(a * 0.0023 + r * 2.1) * n * 0.035;
        (i.beginPath(),
          i.moveTo(t.x - n * 0.34, t.y + r * n * 0.24 + o),
          i.quadraticCurveTo(
            t.x,
            t.y + r * n * 0.24 - n * 0.035 + o,
            t.x + n * 0.34,
            t.y + r * n * 0.24 + o,
          ),
          i.stroke());
      }
      i.restore();
    }
    if (e.terrain === "hill") {
      (i.save(),
        (i.strokeStyle = "rgba(246, 226, 171, .18)"),
        (i.lineWidth = Math.max(0.8, n * 0.018)),
        i.beginPath(),
        i.arc(t.x, t.y + n * 0.14, n * 0.56, Math.PI * 1.08, Math.PI * 1.92),
        i.stroke(),
        i.restore());
    }
  }
  drawPath() {
    if (this.view.path.length < 2) return;
    const e = this.context;
    ((e.strokeStyle = "rgba(233, 204, 125, .86)"),
      (e.lineWidth = Math.max(2, this.size * 0.08)),
      (e.lineCap = "round"),
      (e.lineJoin = "round"),
      e.beginPath(),
      this.view.path.forEach((t, a) => {
        const i = this.hexCenter(t);
        a === 0 ? e.moveTo(i.x, i.y) : e.lineTo(i.x, i.y);
      }),
      e.stroke());
    for (const t of this.view.path.slice(1)) {
      const a = this.hexCenter(t);
      ((e.fillStyle = "#f0d689"),
        e.beginPath(),
        e.arc(a.x, a.y, Math.max(2, this.size * 0.07), 0, Math.PI * 2),
        e.fill());
    }
    const t = this.view.path.at(-1),
      a = t && this.hexCenter(t);
    a &&
      drawArt(
        e,
        "overlays/movement-destination.webp",
        a.x - this.size * 0.8,
        a.y - this.size * 0.8,
        this.size * 1.6,
        this.size * 1.6,
        0.86,
      );
  }
  drawCorpses() {
    if (!this.state) return;
    const e = this.context;
    for (const t of this.state.units.filter((a) => !a.alive)) {
      const a = this.hexCenter(t.position);
      (e.save(),
        e.translate(a.x, a.y + this.size * 0.22),
        e.rotate(t.team === "company" ? -0.45 : 0.45),
        (e.fillStyle = "rgba(64, 32, 29, .55)"),
        e.beginPath(),
        e.ellipse(
          0,
          this.size * 0.18,
          this.size * 0.56,
          this.size * 0.2,
          0,
          0,
          Math.PI * 2,
        ),
        e.fill(),
        (e.fillStyle = t.team === "company" ? "#50646a" : "#6c3b35"),
        e.fillRect(
          -this.size * 0.35,
          -this.size * 0.08,
          this.size * 0.7,
          this.size * 0.24,
        ),
        e.restore());
    }
  }
  animatedCenter(e, t) {
    const a = this.hexCenter(e.position),
      i = this.motion;
    if (!i || i.unitId !== e.id) return a;
    const n = Math.max(0, Math.min(1, (t - i.started) / i.duration));
    if (i.kind === "move" && i.path && i.path.length > 1) {
      const r = easeInOutQuad(n) * (i.path.length - 1),
        o = Math.min(i.path.length - 2, Math.floor(r)),
        l = r - o,
        d = this.hexCenter(i.path[o]),
        c = this.hexCenter(i.path[o + 1]);
      return {
        x: d.x + (c.x - d.x) * l,
        y: d.y + (c.y - d.y) * l - Math.sin(l * Math.PI) * this.size * 0.08,
      };
    }
    if (i.kind === "attack" && i.targetId && this.state) {
      const r = this.state.units.find((d) => d.id === i.targetId);
      if (!r) return a;
      const o = this.hexCenter(r.position),
        l = Math.sin(Math.min(1, n) * Math.PI) * 0.32;
      return { x: a.x + (o.x - a.x) * l, y: a.y + (o.y - a.y) * l };
    }
    return a;
  }
  drawUnit(e, t) {
    const a = this.context,
      i = this.animatedCenter(e, t),
      n =
        e.id === this.view.selectedUnitId || e.id === this.view.inspectedUnitId,
      r = this.state?.queue[0] === e.id,
      o = e.id === this.view.targetId,
      l =
        this.state?.objective?.type === "break-captain" &&
        this.state.objective.captainId === e.id,
      d = r
        ? Math.sin(t * 0.004) * 1.2
        : Math.sin(t * 0.002 + e.id.charCodeAt(1)) * 0.7;
    (a.save(),
      a.translate(i.x, i.y + d),
      (a.fillStyle = "rgba(0, 0, 0, .44)"),
      a.beginPath(),
      a.ellipse(
        0,
        this.size * 0.51,
        this.size * 0.68,
        this.size * 0.18,
        0,
        0,
        Math.PI * 2,
      ),
      a.fill(),
      (n || r || o) &&
        ((a.strokeStyle = o ? "#df675a" : r ? "#f0cd73" : "#b8d6d5"),
        (a.lineWidth = r ? 3 : 2),
        a.beginPath(),
        a.ellipse(
          0,
          this.size * 0.47,
          this.size * 0.67,
          this.size * 0.23,
          0,
          0,
          Math.PI * 2,
        ),
        a.stroke()),
      n &&
        !r &&
        drawArt(
          a,
          "overlays/selected-unit.webp",
          -this.size * 0.8,
          -this.size * 0.8,
          this.size * 1.6,
          this.size * 1.6,
          0.9,
        ),
      r &&
        drawArt(
          a,
          "overlays/active-turn.webp",
          -this.size * 0.84,
          -this.size * 0.84,
          this.size * 1.68,
          this.size * 1.68,
          0.94,
        ),
      o &&
        drawArt(
          a,
          "overlays/attack-target.webp",
          -this.size * 0.82,
          -this.size * 0.82,
          this.size * 1.64,
          this.size * 1.64,
          0.92,
        ),
      l &&
        ((a.strokeStyle = "#e5bd58"),
        (a.lineWidth = 2.5),
        a.setLineDash([5, 3]),
        a.beginPath(),
        a.ellipse(
          0,
          -this.size * 0.1,
          this.size * 0.75,
          this.size * 0.92,
          0,
          0,
          Math.PI * 2,
        ),
        a.stroke(),
        a.setLineDash([]),
        drawArt(
          a,
          "overlays/enemy-captain.webp",
          -this.size * 0.92,
          -this.size * 0.92,
          this.size * 1.84,
          this.size * 1.84,
          0.9,
        )));
    const c = e.team === "company" ? 1 : -1;
    (this.drawPortraitFigure(e),
      this.drawUnitEquipment(e, c),
      this.drawStatusPlinth(e),
      this.drawMoraleBadge(e),
      a.restore());
  }
  drawPortraitFigure(e) {
    const t = this.context,
      a = portraitAtlasPath(e),
      i = artImage(a);
    if (!i.complete || !i.naturalWidth) {
      this.drawFallbackPortrait(e);
      return;
    }
    const n = portraitIndexForUnit(e),
      r = i.naturalWidth / 3,
      o = i.naturalHeight / 2,
      l = (n % 3) * r,
      d = Math.floor(n / 3) * o,
      c = this.size * 1.58;
    (t.save(),
      (t.shadowColor = "rgba(0, 0, 0, .72)"),
      (t.shadowBlur = this.size * 0.1),
      (t.shadowOffsetY = this.size * 0.07),
      t.drawImage(i, l, d, r, o, -c / 2, -this.size * 1.02, c, c),
      t.restore());
  }
  drawFallbackPortrait(e) {
    const t = this.context,
      a = e.team === "company" ? "#567984" : "#813f38";
    ((t.fillStyle = "rgba(13, 16, 16, .94)"),
      (t.strokeStyle = a),
      (t.lineWidth = Math.max(2, this.size * 0.06)),
      t.beginPath(),
      t.arc(0, -this.size * 0.2, this.size * 0.48, 0, Math.PI * 2),
      t.fill(),
      t.stroke(),
      (t.fillStyle = "#e6dcc4"),
      (t.font = `700 ${this.size * 0.52}px Georgia, serif`),
      (t.textAlign = "center"),
      (t.textBaseline = "middle"),
      t.fillText(e.name.charAt(0), 0, -this.size * 0.18));
  }
  drawEquipmentSprite(e, t, a, i, n = 0, r = !1, o = 1) {
    const l = this.context,
      d = artImage(e);
    if (!d.complete || !d.naturalWidth) return;
    (l.save(),
      l.translate(t, a),
      l.rotate(n),
      l.scale(r ? -1 : 1, 1),
      (l.globalAlpha *= o),
      (l.shadowColor = "rgba(0, 0, 0, .78)"),
      (l.shadowBlur = this.size * 0.07),
      (l.shadowOffsetY = this.size * 0.05),
      l.drawImage(d, -i / 2, -i / 2, i, i),
      l.restore());
  }
  drawUnitEquipment(e, t) {
    const a = this.size;
    (e.hasShield &&
      this.drawEquipmentSprite(
        EQUIPMENT_ART.shield,
        -t * a * 0.44,
        a * 0.1,
        a * 0.8,
        -t * 0.08,
        t < 0,
        0.98,
      ),
      this.drawEquipmentSprite(
        EQUIPMENT_ART[e.weaponId] ?? EQUIPMENT_ART.sword,
        t * a * 0.47,
        -a * 0.13,
        a * 0.94,
        t * 0.12,
        t < 0,
      ));
  }
  drawStatusPlinth(e) {
    const t = this.context,
      a = this.size,
      i = a * 1.08,
      n = a * 0.34,
      r = -i / 2,
      o = a * 0.4,
      l = e.team === "company" ? "#6f9aa2" : "#a35a50",
      d = Math.max(0, e.hp / e.hpMax),
      c = Math.max(
        0,
        (e.headArmor + e.bodyArmor) / (e.headArmorMax + e.bodyArmorMax),
      );
    (t.save(),
      (t.fillStyle = "rgba(9, 12, 12, .94)"),
      (t.strokeStyle = l),
      (t.lineWidth = Math.max(1, a * 0.025)),
      t.beginPath(),
      t.roundRect(r, o, i, n, a * 0.08),
      t.fill(),
      t.stroke());
    const m = (v, b, f) => {
      ((t.fillStyle = "rgba(0, 0, 0, .8)"),
        t.fillRect(-a * 0.44, v, a * 0.88, a * 0.055),
        (t.fillStyle = f),
        t.fillRect(-a * 0.44, v, a * 0.88 * b, a * 0.055));
    };
    (m(a * 0.45, d, "#ae473d"),
      m(a * 0.53, c, "#aebcc0"),
      (t.fillStyle = "#eee4cc"),
      (t.font = `600 ${Math.max(8, a * 0.17)}px Georgia, serif`),
      (t.textAlign = "center"),
      (t.textBaseline = "middle"),
      t.fillText(e.name.split(" ")[0], 0, a * 0.66, a * 0.94),
      t.restore());
  }
  drawMoraleBadge(e) {
    if (e.morale === "steady") return;
    const t = this.context,
      a = this.size,
      i = e.morale === "confident";
    (t.save(),
      (t.fillStyle = "rgba(9, 12, 12, .94)"),
      (t.strokeStyle = i ? "#c8ad61" : "#d66a5d"),
      (t.lineWidth = Math.max(1.2, a * 0.03)),
      t.beginPath(),
      t.arc(a * 0.54, -a * 0.67, a * 0.13, 0, Math.PI * 2),
      t.fill(),
      t.stroke(),
      (t.fillStyle = i ? "#ead58e" : "#ff9d8d"),
      (t.font = `bold ${a * 0.18}px sans-serif`),
      (t.textAlign = "center"),
      (t.textBaseline = "middle"),
      t.fillText(i ? "▲" : "▼", a * 0.54, -a * 0.66),
      t.restore());
  }
  drawPortraitToken(e, t, a, i, n) {
    const r = this.context;
    (this.drawWeapon(e, t, a * 1.04),
      e.hasShield &&
        (r.save(),
        r.translate(-t * 19 * a, 1 * a),
        r.rotate(t * 0.1),
        (r.fillStyle = e.team === "company" ? "#294950" : "#5a2926"),
        (r.strokeStyle = "#c29c56"),
        (r.lineWidth = 2.2 * a),
        r.beginPath(),
        r.moveTo(-10 * a, -14 * a),
        r.lineTo(10 * a, -14 * a),
        r.lineTo(12 * a, 7 * a),
        r.quadraticCurveTo(0, 19 * a, -12 * a, 7 * a),
        r.closePath(),
        r.fill(),
        r.stroke(),
        (r.strokeStyle = "rgba(235, 204, 124, .8)"),
        (r.lineWidth = 1.2 * a),
        r.beginPath(),
        r.moveTo(0, -10 * a),
        r.lineTo(0, 10 * a),
        r.moveTo(-7 * a, -1 * a),
        r.lineTo(7 * a, -1 * a),
        r.stroke(),
        r.restore()),
      drawPortraitMedallion(r, e, a, { tint: i, armorRatio: n }));
    const f = { sword: "†", spear: "↟", axe: "⌁", mace: "●" }[e.weaponId];
    (r.save(),
      r.translate(t * 17 * a, 14 * a),
      (r.fillStyle = "rgba(12, 15, 15, .94)"),
      (r.strokeStyle = "#c5a45c"),
      (r.lineWidth = 1.5 * a),
      r.beginPath(),
      r.arc(0, 0, 7 * a, 0, Math.PI * 2),
      r.fill(),
      r.stroke(),
      (r.fillStyle = "#f0ddae"),
      (r.font = `bold ${11 * a}px Georgia, serif`),
      (r.textAlign = "center"),
      (r.textBaseline = "middle"),
      r.fillText(f, 0, 0.5 * a),
      r.restore());
  }
  drawWeapon(e, t, a) {
    const i = this.context;
    (i.save(),
      i.scale(t, 1),
      i.translate(13 * a, -1 * a),
      i.rotate(-0.35),
      (i.strokeStyle = "#3b2b22"),
      (i.lineWidth = 3 * a),
      i.beginPath(),
      i.moveTo(0, 8 * a),
      i.lineTo(0, -17 * a),
      i.stroke(),
      (i.strokeStyle = "#c1c6c2"),
      (i.fillStyle = "#aeb4b1"),
      (i.lineWidth = 2 * a),
      e.weaponId === "sword"
        ? (i.beginPath(),
          i.moveTo(0, -10 * a),
          i.lineTo(-3 * a, -31 * a),
          i.lineTo(0, -37 * a),
          i.lineTo(3 * a, -31 * a),
          i.closePath(),
          i.fill(),
          i.stroke(),
          i.beginPath(),
          i.moveTo(-7 * a, -10 * a),
          i.lineTo(7 * a, -10 * a),
          i.stroke())
        : e.weaponId === "spear"
          ? ((i.strokeStyle = "#6b4c33"),
            (i.lineWidth = 3 * a),
            i.beginPath(),
            i.moveTo(0, 10 * a),
            i.lineTo(0, -42 * a),
            i.stroke(),
            (i.fillStyle = "#bbc3c1"),
            i.beginPath(),
            i.moveTo(0, -51 * a),
            i.lineTo(-5 * a, -40 * a),
            i.lineTo(5 * a, -40 * a),
            i.closePath(),
            i.fill())
          : e.weaponId === "axe"
            ? ((i.strokeStyle = "#65452f"),
              (i.lineWidth = 4 * a),
              i.beginPath(),
              i.moveTo(0, 10 * a),
              i.lineTo(0, -34 * a),
              i.stroke(),
              (i.fillStyle = "#aeb5b1"),
              (i.strokeStyle = "#252829"),
              (i.lineWidth = 1 * a),
              i.beginPath(),
              i.moveTo(0, -32 * a),
              i.quadraticCurveTo(14 * a, -33 * a, 14 * a, -21 * a),
              i.lineTo(0, -24 * a),
              i.closePath(),
              i.fill(),
              i.stroke())
            : ((i.strokeStyle = "#65452f"),
              (i.lineWidth = 4 * a),
              i.beginPath(),
              i.moveTo(0, 10 * a),
              i.lineTo(0, -29 * a),
              i.stroke(),
              (i.fillStyle = "#899193"),
              i.fillRect(-6 * a, -38 * a, 12 * a, 12 * a)),
      i.restore());
  }
  drawFloaters(e) {
    if (!this.state) return;
    const t = this.context;
    for (const a of this.floaters) {
      if (e < a.started) continue;
      const i = this.state.units.find((l) => l.id === a.unitId);
      if (!i) continue;
      const n = (e - a.started) / a.duration,
        r = this.hexCenter(i.position);
      (t.save(),
        (t.globalAlpha = Math.max(0, 1 - Math.max(0, n - 0.65) / 0.35)),
        (t.font = `800 ${Math.max(11, this.size * 0.27)}px system-ui, sans-serif`),
        (t.textAlign = "center"),
        (t.lineWidth = 3),
        (t.strokeStyle = "rgba(15, 17, 17, .9)"));
      const o = r.y - this.size * 1.22 - n * this.size * 0.55 - a.offset;
      (t.strokeText(a.text, r.x, o),
        (t.fillStyle = a.color),
        t.fillText(a.text, r.x, o),
        t.restore());
    }
  }
  drawParticles(e) {
    if (!this.state) return;
    const t = this.context;
    for (const a of this.particles) {
      if (e < a.started) continue;
      const i = this.state.units.find((l) => l.id === a.unitId);
      if (!i) continue;
      const n = Math.min(1, (e - a.started) / a.duration),
        r = this.hexCenter(i.position),
        o = a.distance * Math.sin(n * Math.PI * 0.85);
      (t.save(),
        (t.globalAlpha = 1 - n),
        (t.fillStyle = a.color),
        t.beginPath(),
        t.arc(
          r.x + Math.cos(a.angle) * o,
          r.y - this.size * 0.15 + Math.sin(a.angle) * o + n * n * 18,
          Math.max(1.2, this.size * 0.035),
          0,
          Math.PI * 2,
        ),
        t.fill(),
        t.restore());
    }
  }
}
