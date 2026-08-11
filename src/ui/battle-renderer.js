import { drawArt } from "../art/canvas-art.js";
import { hexKey, sameHex, unitAt } from "../battle/hex.js";
import { TERRAIN } from "../battle/weapons.js";

export const SQRT3 = Math.sqrt(3);
export function shiftColor(s, e) {
  const t = Number.parseInt(s.slice(1), 16),
    a = Math.max(0, Math.min(255, (t >> 16) + e)),
    i = Math.max(0, Math.min(255, ((t >> 8) & 255) + e)),
    n = Math.max(0, Math.min(255, (t & 255) + e));
  return `rgb(${a}, ${i}, ${n})`;
}
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
  motion = null;
  floaters = [];
  particles = [];
  shakeUntil = 0;
  onHover;
  onClick;
  resizeObserver;
  running = !0;
  constructor(e, t, a) {
    const i = e.getContext("2d");
    if (!i) throw new Error("Canvas 2D is unavailable.");
    ((this.canvas = e),
      (this.context = i),
      (this.onHover = t),
      (this.onClick = a),
      (this.resizeObserver = new ResizeObserver(() => this.resize())),
      this.resizeObserver.observe(e),
      e.addEventListener("pointermove", (n) => this.handlePointer(n, !1)),
      e.addEventListener("pointerleave", () => this.onHover(null)),
      e.addEventListener("pointerdown", (n) => this.handlePointer(n, !0)),
      requestAnimationFrame((n) => this.render(n)));
  }
  destroy() {
    ((this.running = !1), this.resizeObserver.disconnect());
  }
  setState(e, t = {}) {
    ((this.state = e), (this.view = { ...this.view, ...t }));
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
  resize() {
    const e = this.canvas.getBoundingClientRect();
    ((this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2)),
      (this.width = Math.max(1, e.width)),
      (this.height = Math.max(1, e.height)),
      (this.canvas.width = Math.floor(this.width * this.pixelRatio)),
      (this.canvas.height = Math.floor(this.height * this.pixelRatio)),
      this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0));
    const t = (this.width - 54) / (12.5 * SQRT3),
      a = (this.height - 58) / 14.3;
    this.size = Math.max(25, Math.min(122, t, a));
    const i = SQRT3 * this.size * 12.5,
      n = this.size * 14.5;
    this.origin = {
      x: (this.width - i) / 2 + this.size * SQRT3 * 0.5,
      y: (this.height - n) / 2 + this.size,
    };
  }
  handlePointer(e, t) {
    if (!this.state) return;
    const a = this.canvas.getBoundingClientRect(),
      i = { x: e.clientX - a.left, y: e.clientY - a.top },
      n = this.state.tiles.find((r) => this.pointInHex(i, this.hexCenter(r)));
    t && n
      ? this.onClick({ q: n.q, r: n.r })
      : t || this.onHover(n ? { q: n.q, r: n.r } : null);
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
  render(e) {
    if (!this.running) return;
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
    ) {
      requestAnimationFrame((n) => this.render(n));
      return;
    }
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
      )),
      requestAnimationFrame((n) => this.render(n)));
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
          this.size * 0.98,
        ),
        (t.fillStyle = "#34342d"),
        t.fill()),
        this.drawHex(i, this.size * 0.96));
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
        (t.strokeStyle = "rgba(11, 13, 13, .7)"),
        (t.lineWidth = 1),
        t.stroke());
      const o = Math.abs(a.q * 31 + a.r * 17);
      t.fillStyle = "rgba(230, 215, 180, .09)";
      for (let c = 0; c < 3; c += 1) {
        const m = (((o + c * 73) % 360) * Math.PI) / 180,
          v = this.size * (0.18 + ((o + c * 11) % 42) / 100);
        (t.beginPath(),
          t.arc(
            i.x + Math.cos(m) * v,
            i.y + Math.sin(m) * v,
            Math.max(0.7, this.size * 0.025),
            0,
            Math.PI * 2,
          ),
          t.fill());
      }
      if (a.terrain === "road")
        ((t.strokeStyle = "rgba(43, 34, 25, .26)"),
          (t.lineWidth = Math.max(1, this.size * 0.05)),
          t.beginPath(),
          t.moveTo(i.x - this.size * 0.5, i.y - this.size * 0.34),
          t.lineTo(i.x + this.size * 0.55, i.y + this.size * 0.25),
          t.stroke());
      else if (a.terrain === "water") {
        ((t.strokeStyle = "rgba(180, 210, 205, .2)"), (t.lineWidth = 1));
        for (let c = -1; c <= 1; c += 1)
          (t.beginPath(),
            t.moveTo(i.x - this.size * 0.4, i.y + c * this.size * 0.25),
            t.quadraticCurveTo(
              i.x,
              i.y + c * this.size * 0.25 + Math.sin(e * 0.002 + c) * 2,
              i.x + this.size * 0.4,
              i.y + c * this.size * 0.25,
            ),
            t.stroke());
      } else
        a.terrain === "rock" &&
          ((t.fillStyle = "#353936"),
          (t.strokeStyle = "#858477"),
          (t.lineWidth = 1),
          t.beginPath(),
          t.moveTo(i.x - this.size * 0.45, i.y + this.size * 0.35),
          t.lineTo(i.x - this.size * 0.25, i.y - this.size * 0.35),
          t.lineTo(i.x + this.size * 0.32, i.y - this.size * 0.48),
          t.lineTo(i.x + this.size * 0.48, i.y + this.size * 0.28),
          t.closePath(),
          t.fill(),
          t.stroke());
      this.drawTerrainDetails(a, i, e, o);
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
  terrainRandom(e, t = 0) {
    let a = Math.imul(e.q + 131 + t * 17, 374761393);
    return (
      (a = Math.imul(a ^ (e.r + 197 + t * 31), 668265263)),
      (a = (a ^ (a >>> 13)) >>> 0),
      a / 4294967295
    );
  }
  drawTerrainDetails(e, t, a, i) {
    const n = this.context,
      r = this.size;
    if (e.terrain === "grass" || e.terrain === "hill") {
      (n.save(),
        (n.lineCap = "round"),
        (n.lineWidth = Math.max(0.7, r * 0.018)));
      for (let o = 0; o < 10; o += 1) {
        const l = this.terrainRandom(e, o + 4),
          d = this.terrainRandom(e, o + 42),
          c = (l * Math.PI * 2 + o) % (Math.PI * 2),
          m = r * (0.12 + d * 0.47),
          v = t.x + Math.cos(c) * m,
          b = t.y + Math.sin(c) * m * 0.72,
          f = r * (0.07 + this.terrainRandom(e, o + 81) * 0.08);
        ((n.strokeStyle =
          o % 3 === 0 ? "rgba(202, 190, 121, .38)" : "rgba(30, 53, 30, .48)"),
          n.beginPath(),
          n.moveTo(v, b + f * 0.45),
          n.quadraticCurveTo(v - f * 0.22, b, v - f * 0.08, b - f),
          n.moveTo(v, b + f * 0.45),
          n.quadraticCurveTo(v + f * 0.3, b, v + f * 0.55, b - f * 0.65),
          n.stroke());
      }
      (n.restore(),
        e.terrain === "hill" &&
          (n.save(),
          (n.strokeStyle = "rgba(50, 46, 29, .28)"),
          (n.lineWidth = Math.max(1, r * 0.025)),
          n.beginPath(),
          n.arc(t.x, t.y + r * 0.15, r * 0.56, Math.PI * 1.08, Math.PI * 1.92),
          n.stroke(),
          n.restore()));
      return;
    }
    if (e.terrain === "brush") {
      for (let o = 0; o < 3; o += 1) {
        const l = this.terrainRandom(e, o + 5),
          d = this.terrainRandom(e, o + 27),
          c = t.x + (l - 0.5) * r * 0.86,
          m = t.y + (d - 0.5) * r * 0.62 + r * 0.06;
        this.drawTree(
          c,
          m,
          r * (0.24 + this.terrainRandom(e, o + 63) * 0.08),
          o + i,
        );
      }
      return;
    }
    if (e.terrain === "water") {
      (n.save(),
        (n.lineCap = "round"),
        (n.lineWidth = Math.max(0.8, r * 0.025)));
      for (let o = 0; o < 5; o += 1) {
        const l = this.terrainRandom(e, o + 13),
          d = this.terrainRandom(e, o + 39),
          c = t.x + (l - 0.5) * r * 0.9,
          m = t.y + (d - 0.5) * r * 0.96,
          v = r * (0.08 + this.terrainRandom(e, o + 72) * 0.12),
          b = Math.sin(a * 0.0025 + o + i * 0.02) * r * 0.025;
        ((n.strokeStyle =
          o % 2 ? "rgba(191, 224, 219, .28)" : "rgba(19, 45, 48, .46)"),
          n.beginPath(),
          n.moveTo(c - v, m + b),
          n.quadraticCurveTo(c, m - r * 0.035 + b, c + v, m + b),
          n.stroke());
      }
      for (let o = 0; o < 2; o += 1) {
        const l = o ? 0.34 : -0.36,
          d = t.x + r * l,
          c = t.y + r * (o ? 0.38 : -0.34);
        ((n.strokeStyle = "rgba(93, 106, 60, .72)"),
          (n.lineWidth = Math.max(1, r * 0.025)),
          n.beginPath(),
          n.moveTo(d, c + r * 0.1),
          n.lineTo(d - r * 0.02, c - r * 0.12),
          n.moveTo(d + r * 0.04, c + r * 0.1),
          n.lineTo(d + r * 0.08, c - r * 0.09),
          n.stroke());
      }
      n.restore();
      return;
    }
    if (e.terrain === "road") {
      (n.save(),
        (n.strokeStyle = "rgba(42, 31, 22, .35)"),
        (n.lineWidth = Math.max(1, r * 0.045)),
        (n.lineCap = "round"));
      for (const o of [-0.18, 0.18]) {
        (n.beginPath(),
          n.moveTo(t.x - r * 0.48, t.y - r * (0.28 - o)),
          n.quadraticCurveTo(
            t.x,
            t.y + r * o,
            t.x + r * 0.5,
            t.y + r * (0.28 + o),
          ),
          n.stroke());
      }
      n.restore();
      return;
    }
    if (e.terrain === "mud") {
      (n.save(), (n.fillStyle = "rgba(25, 26, 22, .34)"));
      for (let o = 0; o < 4; o += 1) {
        const l = t.x + (this.terrainRandom(e, o + 8) - 0.5) * r * 0.85,
          d = t.y + (this.terrainRandom(e, o + 55) - 0.5) * r * 0.75;
        (n.beginPath(),
          n.ellipse(
            l,
            d,
            r * (0.08 + o * 0.015),
            r * 0.045,
            0.3,
            0,
            Math.PI * 2,
          ),
          n.fill());
      }
      n.restore();
      return;
    }
    if (e.terrain === "rock") {
      (n.save(),
        (n.strokeStyle = "rgba(202, 202, 181, .34)"),
        (n.lineWidth = Math.max(0.8, r * 0.02)),
        n.beginPath(),
        n.moveTo(t.x - r * 0.22, t.y - r * 0.25),
        n.lineTo(t.x - r * 0.05, t.y - r * 0.04),
        n.lineTo(t.x + r * 0.14, t.y - r * 0.13),
        n.moveTo(t.x - r * 0.05, t.y - r * 0.04),
        n.lineTo(t.x + r * 0.08, t.y + r * 0.27),
        n.stroke(),
        n.restore());
    }
  }
  drawTree(e, t, a, i) {
    const n = this.context,
      r = i % 2 === 0;
    (n.save(),
      (n.fillStyle = "rgba(6, 12, 8, .36)"),
      n.beginPath(),
      n.ellipse(
        e + a * 0.08,
        t + a * 0.62,
        a * 0.82,
        a * 0.28,
        0,
        0,
        Math.PI * 2,
      ),
      n.fill(),
      (n.strokeStyle = r ? "#4a3925" : "#3d3323"),
      (n.lineWidth = Math.max(1.3, a * 0.16)),
      (n.lineCap = "round"),
      n.beginPath(),
      n.moveTo(e, t + a * 0.5),
      n.lineTo(e, t - a * 0.28),
      n.moveTo(e, t - a * 0.08),
      n.lineTo(e - a * 0.36, t - a * 0.42),
      n.moveTo(e, t - a * 0.16),
      n.lineTo(e + a * 0.36, t - a * 0.52),
      n.stroke());
    const o = n.createRadialGradient(
      e - a * 0.2,
      t - a * 0.62,
      a * 0.08,
      e,
      t - a * 0.42,
      a,
    );
    (o.addColorStop(0, r ? "#829062" : "#707e56"),
      o.addColorStop(0.45, r ? "#52633f" : "#48593b"),
      o.addColorStop(1, "#263326"),
      (n.fillStyle = o));
    for (const [l, d, c] of [
      [-0.38, -0.42, 0.58],
      [0.34, -0.5, 0.62],
      [0, -0.78, 0.72],
      [0.02, -0.25, 0.72],
    ]) {
      (n.beginPath(),
        n.arc(e + a * l, t + a * d, a * c, 0, Math.PI * 2),
        n.fill());
    }
    n.restore();
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
      n = this.size / 42,
      r =
        e.id === this.view.selectedUnitId || e.id === this.view.inspectedUnitId,
      o = this.state?.queue[0] === e.id,
      l = e.id === this.view.targetId,
      d =
        this.state?.objective?.type === "break-captain" &&
        this.state.objective.captainId === e.id,
      c = o
        ? Math.sin(t * 0.004) * 1.2
        : Math.sin(t * 0.002 + e.id.charCodeAt(1)) * 0.7;
    (a.save(),
      a.translate(i.x, i.y + c),
      (a.fillStyle = "rgba(0, 0, 0, .44)"),
      a.beginPath(),
      a.ellipse(
        0,
        this.size * 0.48,
        this.size * 0.55,
        this.size * 0.2,
        0,
        0,
        Math.PI * 2,
      ),
      a.fill(),
      (r || o || l) &&
        ((a.strokeStyle = l ? "#df675a" : o ? "#f0cd73" : "#b8d6d5"),
        (a.lineWidth = o ? 3 : 2),
        a.beginPath(),
        a.ellipse(
          0,
          this.size * 0.42,
          this.size * 0.56,
          this.size * 0.25,
          0,
          0,
          Math.PI * 2,
        ),
        a.stroke()),
      r &&
        !o &&
        drawArt(
          a,
          "overlays/selected-unit.webp",
          -this.size * 0.8,
          -this.size * 0.8,
          this.size * 1.6,
          this.size * 1.6,
          0.9,
        ),
      o &&
        drawArt(
          a,
          "overlays/active-turn.webp",
          -this.size * 0.84,
          -this.size * 0.84,
          this.size * 1.68,
          this.size * 1.68,
          0.94,
        ),
      l &&
        drawArt(
          a,
          "overlays/attack-target.webp",
          -this.size * 0.82,
          -this.size * 0.82,
          this.size * 1.64,
          this.size * 1.64,
          0.92,
        ),
      d &&
        ((a.strokeStyle = "#e5bd58"),
        (a.lineWidth = 2.5),
        a.setLineDash([5, 3]),
        a.beginPath(),
        a.arc(0, 0, this.size * 0.72, 0, Math.PI * 2),
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
    const m = e.team === "company" ? 1 : -1,
      v =
        e.team === "company"
          ? "#4f737d"
          : e.epithet.toLowerCase().includes("mire") ||
              e.epithet.toLowerCase().includes("bog") ||
              e.epithet.toLowerCase().includes("reed") ||
              e.epithet.toLowerCase().includes("fen")
            ? "#52624a"
            : e.epithet.toLowerCase().includes("iron") ||
                e.epithet.toLowerCase().includes("plate") ||
                e.epithet.toLowerCase().includes("marshal")
              ? "#555a5d"
              : "#7c3c35",
      b = e.bodyArmorMax > 0 ? e.bodyArmor / e.bodyArmorMax : 0;
    this.drawPortraitToken(e, m, n, v, b);
    const u = 37 * n,
      p = (g, T, x) => {
        ((a.fillStyle = "rgba(8, 10, 10, .82)"),
          a.fillRect(-u / 2 - 1, g - 1, u + 2, 4 * n + 2),
          (a.fillStyle = x),
          a.fillRect(-u / 2, g, u * Math.max(0, T), 4 * n));
      };
    (p(-40 * n, e.hp / e.hpMax, "#9d3f36"),
      p(
        -35 * n,
        (e.headArmor + e.bodyArmor) / (e.headArmorMax + e.bodyArmorMax),
        "#94a4a8",
      ),
      (a.font = `600 ${Math.max(9, 9.5 * n)}px Georgia, serif`),
      (a.textAlign = "center"),
      (a.textBaseline = "top"),
      (a.fillStyle = "rgba(8, 10, 10, .82)"),
      a.fillText(e.name.split(" ")[0], 1, 41 * n + 1),
      (a.fillStyle = "#e5ddca"),
      a.fillText(e.name.split(" ")[0], 0, 41 * n),
      e.morale !== "steady" &&
        ((a.fillStyle = e.morale === "confident" ? "#c4aa5f" : "#d66a5d"),
        (a.font = `bold ${10 * n}px sans-serif`),
        a.fillText(e.morale === "confident" ? "▲" : "▼", 18 * n, -39 * n)),
      a.restore());
  }
  drawPortraitToken(e, t, a, i, n) {
    const r = this.context,
      o = e.id.charCodeAt(1) + e.name.length,
      l = o % 3 === 0 ? "#b98563" : o % 3 === 1 ? "#d1a078" : "#8e614c",
      d = ["#34251f", "#6d5032", "#292a27", "#8a6a42"][o % 4],
      c = e.team === "company" ? "#6f9aa2" : "#a35a50";
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
      r.save(),
      (r.fillStyle = "#111615"),
      (r.strokeStyle = c),
      (r.lineWidth = 3.2 * a),
      r.beginPath(),
      r.arc(0, 0, 22 * a, 0, Math.PI * 2),
      r.fill(),
      r.stroke(),
      r.beginPath(),
      r.arc(0, 0, 19.5 * a, 0, Math.PI * 2),
      r.clip());
    const m = r.createLinearGradient(0, -20 * a, 0, 20 * a);
    (m.addColorStop(0, shiftColor(i, 12)),
      m.addColorStop(0.58, shiftColor(i, -10)),
      m.addColorStop(1, "#181d1c"),
      (r.fillStyle = m),
      r.fillRect(-22 * a, -22 * a, 44 * a, 44 * a));
    const v = r.createLinearGradient(0, 2 * a, 0, 22 * a);
    (v.addColorStop(0, shiftColor(i, Math.floor(n * 28))),
      v.addColorStop(1, shiftColor(i, -26)),
      (r.fillStyle = v),
      (r.strokeStyle = "#151817"),
      (r.lineWidth = 1.3 * a),
      r.beginPath(),
      r.ellipse(0, 17 * a, 20 * a, 14 * a, 0, Math.PI, Math.PI * 2),
      r.lineTo(20 * a, 23 * a),
      r.lineTo(-20 * a, 23 * a),
      r.closePath(),
      r.fill(),
      r.stroke(),
      (r.strokeStyle = "rgba(225, 216, 190, .38)"),
      (r.lineWidth = 1 * a));
    for (let b = 6; b <= 18; b += 4)
      (r.beginPath(),
        r.moveTo(-13 * a, b * a),
        r.lineTo(13 * a, b * a),
        r.stroke());
    ((r.fillStyle = shiftColor(l, -14)),
      r.fillRect(-4 * a, 3 * a, 8 * a, 8 * a),
      (r.fillStyle = l),
      r.beginPath(),
      r.ellipse(0, -5 * a, 9.2 * a, 11.5 * a, 0, 0, Math.PI * 2),
      r.fill(),
      (r.fillStyle = shiftColor(l, -10)));
    for (const b of [-9.5, 9.5])
      (r.beginPath(), r.arc(b * a, -4 * a, 2.1 * a, 0, Math.PI * 2), r.fill());
    if (e.headArmorMax >= 42) {
      ((r.fillStyle = shiftColor(i, 27)),
        (r.strokeStyle = "#181b1b"),
        (r.lineWidth = 1.3 * a),
        r.beginPath(),
        r.arc(0, -8 * a, 10.5 * a, Math.PI, Math.PI * 2),
        r.lineTo(9.5 * a, -3.5 * a),
        r.lineTo(6.8 * a, -1 * a),
        r.lineTo(5.7 * a, -5 * a),
        r.lineTo(-5.7 * a, -5 * a),
        r.lineTo(-6.8 * a, -1 * a),
        r.lineTo(-9.5 * a, -3.5 * a),
        r.closePath(),
        r.fill(),
        r.stroke(),
        (r.strokeStyle = "#d0b16b"),
        r.beginPath(),
        r.moveTo(-8 * a, -5.2 * a),
        r.lineTo(8 * a, -5.2 * a),
        r.stroke());
    } else {
      ((r.fillStyle = d),
        r.beginPath(),
        r.arc(0, -9 * a, 9.3 * a, Math.PI, Math.PI * 2),
        r.lineTo(8 * a, -6 * a),
        r.quadraticCurveTo(1 * a, -10 * a, -8.5 * a, -5.5 * a),
        r.closePath(),
        r.fill());
    }
    ((r.fillStyle = "#171514"),
      r.beginPath(),
      r.ellipse(-3.7 * a, -4.5 * a, 1.05 * a, 0.75 * a, 0, 0, Math.PI * 2),
      r.ellipse(3.7 * a, -4.5 * a, 1.05 * a, 0.75 * a, 0, 0, Math.PI * 2),
      r.fill(),
      (r.strokeStyle = shiftColor(l, -30)),
      (r.lineWidth = 0.9 * a),
      r.beginPath(),
      r.moveTo(0, -3 * a),
      r.lineTo(-0.8 * a, 1 * a),
      r.lineTo(1.4 * a, 1.2 * a),
      r.stroke(),
      r.beginPath(),
      r.moveTo(-3 * a, 4.2 * a),
      r.quadraticCurveTo(0, 5.4 * a, 3 * a, 4.1 * a),
      r.stroke());
    if (o % 3 === 0)
      ((r.fillStyle = d),
        r.beginPath(),
        r.moveTo(-5.5 * a, 2.5 * a),
        r.quadraticCurveTo(0, 5.5 * a, 5.5 * a, 2.5 * a),
        r.quadraticCurveTo(4 * a, 10 * a, 0, 10.5 * a),
        r.quadraticCurveTo(-4 * a, 10 * a, -5.5 * a, 2.5 * a),
        r.fill());
    (r.restore(),
      (r.strokeStyle = "rgba(241, 226, 190, .45)"),
      (r.lineWidth = 1 * a),
      r.beginPath(),
      r.arc(0, 0, 18.4 * a, Math.PI * 1.08, Math.PI * 1.82),
      r.stroke());
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
      const o = r.y - this.size * 1.05 - n * this.size * 0.55 - a.offset;
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
