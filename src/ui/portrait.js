// Fighter portraits.
//
// Each fighter's face is hashed from their identity, so the same person is
// recognisable everywhere they appear — the battlefield medallion, the turn
// rail and the inspection panel — and stays the same across frames, battles and
// saved campaigns. Equipment-driven details (helmet, armor tint, armor damage)
// are read from live unit state so the portrait still carries battle
// information rather than being pure decoration.
//
// When the painted portrait atlases are available they are the face of record:
// the battlefield, the turn rail, the deployment roster and the inspection
// panel all crop the same atlas cell, so a fighter looks the same everywhere.
// The procedural face below stays as the fallback while the atlas loads.

import { artImage } from "../art/canvas-art.js";

export const PORTRAIT_ATLASES = {
  company: "portraits/company.webp",
  "thorn-reavers": "portraits/thorn-reavers.webp",
  mireborn: "portraits/mireborn.webp",
  ironbound: "portraits/ironbound.webp",
};

export const COMPANY_PORTRAIT_INDEX = new Map([
  ["Mara Venn", 0],
  ["Osric Vale", 1],
  ["Toman Rusk", 2],
  ["Elia Fen", 3],
  ["Bram Coal", 4],
  ["Iven Pike", 5],
]);

export function portraitAtlasPath(unit) {
  return (
    PORTRAIT_ATLASES[
      unit.team === "company"
        ? "company"
        : (unit.portraitSet ?? "thorn-reavers")
    ] ?? PORTRAIT_ATLASES["thorn-reavers"]
  );
}

export function portraitIndexForUnit(unit) {
  if (unit.team === "company" && COMPANY_PORTRAIT_INDEX.has(unit.name))
    return COMPANY_PORTRAIT_INDEX.get(unit.name);
  const slot = unit.team === "enemy" ? unit.id.match(/^e([1-6])$/) : null;
  if (slot) return Number(slot[1]) - 1;
  let hash = 2166136261;
  for (const char of `${unit.id}|${unit.name}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 6;
}

// Fires the callback once for every portrait atlas that finishes loading after
// this call, so panels drawn with the procedural fallback can repaint with the
// real faces.
export function whenPortraitArtLoaded(callback) {
  if (typeof document === "undefined") return;
  for (const path of Object.values(PORTRAIT_ATLASES)) {
    const image = artImage(path);
    if (!image.complete)
      image.addEventListener("load", callback, { once: true });
  }
}

export function shiftColor(hex, amount) {
  const value = Number.parseInt(hex.slice(1), 16),
    red = Math.max(0, Math.min(255, (value >> 16) + amount)),
    green = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount)),
    blue = Math.max(0, Math.min(255, (value & 255) + amount));
  return `rgb(${red}, ${green}, ${blue})`;
}

const SKIN_TONES = [
  "#c99a72",
  "#a97a54",
  "#e0b48c",
  "#8c5e3f",
  "#b9855f",
  "#6f4630",
];
const HAIR_COLORS = [
  "#241c17",
  "#4a3524",
  "#6d4a25",
  "#8a7043",
  "#9c9a92",
  "#7a3a22",
];
const HAIR_STYLES = ["crop", "long", "topknot", "braids", "bald"];
const BEARDS = ["none", "stubble", "full", "forked"];

const MIRE_WORDS = ["mire", "bog", "reed", "fen"];
const IRON_WORDS = ["iron", "plate", "marshal"];

function hashIdentity(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(list, hash, salt) {
  return list[(Math.imul(hash ^ salt, 2654435761) >>> 8) % list.length];
}

export function portraitSignature(unit) {
  return `${unit.id}|${unit.name}|${unit.epithet ?? ""}|${unit.team}`;
}

// The tint of a fighter's armor and backdrop: company blue-steel, or an enemy
// palette read from the epithet so each warband keeps its own colour.
export function armorTint(unit) {
  if (unit.team === "company") return "#4f737d";
  const epithet = (unit.epithet ?? "").toLowerCase();
  if (MIRE_WORDS.some((word) => epithet.includes(word))) return "#52624a";
  if (IRON_WORDS.some((word) => epithet.includes(word))) return "#555a5d";
  return "#7c3c35";
}

export function portraitTraits(unit) {
  const hash = hashIdentity(portraitSignature(unit)),
    headArmor = unit.headArmorMax ?? unit.headArmor ?? 0;
  return {
    hash,
    skin: pick(SKIN_TONES, hash, 17),
    hair: pick(HAIR_COLORS, hash, 91),
    hairStyle: pick(HAIR_STYLES, hash, 233),
    beard:
      unit.team === "company"
        ? pick(BEARDS, hash, 401)
        : pick(BEARDS, hash, 733),
    eye: (hash >> 5) % 3 === 0 ? "#3f5a52" : "#2b2119",
    scar: (hash >> 9) % 5 === 0,
    warpaint: unit.team === "enemy" && (hash >> 13) % 3 === 0,
    helmet:
      headArmor >= 44
        ? "great-helm"
        : headArmor >= 30
          ? "nasal"
          : headArmor >= 16
            ? "cap"
            : "none",
  };
}

// Draws the face inside an already-clipped medallion. One unit of `scale` is
// one pixel at the reference medallion radius of 22.
export function drawPortraitFace(context, unit, scale, options = {}) {
  const traits = options.traits ?? portraitTraits(unit),
    tint = options.tint ?? armorTint(unit),
    armorRatio = options.armorRatio ?? 1,
    skin = traits.skin,
    hair = traits.hair,
    covered = traits.helmet === "great-helm";

  const backdrop = context.createLinearGradient(0, -20 * scale, 0, 20 * scale);
  backdrop.addColorStop(0, shiftColor(tint, 12));
  backdrop.addColorStop(0.58, shiftColor(tint, -10));
  backdrop.addColorStop(1, "#181d1c");
  context.fillStyle = backdrop;
  context.fillRect(-22 * scale, -22 * scale, 44 * scale, 44 * scale);

  // Shoulders. The gradient brightens with the armor a fighter still has, so a
  // battered fighter visibly dulls as the battle goes on.
  const plate = context.createLinearGradient(0, 2 * scale, 0, 22 * scale);
  plate.addColorStop(0, shiftColor(tint, Math.floor(armorRatio * 28)));
  plate.addColorStop(1, shiftColor(tint, -26));
  context.fillStyle = plate;
  context.strokeStyle = "#151817";
  context.lineWidth = 1.3 * scale;
  context.beginPath();
  context.ellipse(
    0,
    17 * scale,
    20 * scale,
    14 * scale,
    0,
    Math.PI,
    Math.PI * 2,
  );
  context.lineTo(20 * scale, 23 * scale);
  context.lineTo(-20 * scale, 23 * scale);
  context.closePath();
  context.fill();
  context.stroke();
  context.strokeStyle = "rgba(225, 216, 190, .38)";
  context.lineWidth = 1 * scale;
  for (let row = 6; row <= 18; row += 4) {
    context.beginPath();
    context.moveTo(-13 * scale, row * scale);
    context.lineTo(13 * scale, row * scale);
    context.stroke();
  }

  // Neck and head.
  context.fillStyle = shiftColor(skin, -14);
  context.fillRect(-4 * scale, 3 * scale, 8 * scale, 8 * scale);
  context.fillStyle = skin;
  context.beginPath();
  context.ellipse(0, -5 * scale, 9.2 * scale, 11.5 * scale, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = shiftColor(skin, -10);
  for (const side of [-9.5, 9.5]) {
    context.beginPath();
    context.arc(side * scale, -4 * scale, 2.1 * scale, 0, Math.PI * 2);
    context.fill();
  }

  // Cheekbone shading, so a face still has depth at token size.
  context.fillStyle = "rgba(24, 18, 14, .18)";
  context.beginPath();
  context.ellipse(
    4.6 * scale,
    -3 * scale,
    4.4 * scale,
    8.4 * scale,
    0.12,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.fillStyle = "rgba(255, 244, 224, .12)";
  context.beginPath();
  context.ellipse(
    -3.4 * scale,
    -8 * scale,
    3.4 * scale,
    4.2 * scale,
    -0.2,
    0,
    Math.PI * 2,
  );
  context.fill();

  if (!covered) drawHair(context, traits, scale, hair);
  drawHelmet(context, traits, scale, tint);

  // Brows, eyes, nose and mouth.
  context.strokeStyle = shiftColor(hair, -18);
  context.lineWidth = 1 * scale;
  context.lineCap = "round";
  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(side * 1.9 * scale, -7.1 * scale);
    context.quadraticCurveTo(
      side * 4 * scale,
      -7.9 * scale,
      side * 5.7 * scale,
      -7 * scale,
    );
    context.stroke();
  }
  context.fillStyle = "#efe6d6";
  context.beginPath();
  context.ellipse(
    -3.6 * scale,
    -4.6 * scale,
    1.35 * scale,
    0.82 * scale,
    0,
    0,
    Math.PI * 2,
  );
  context.ellipse(
    3.6 * scale,
    -4.6 * scale,
    1.35 * scale,
    0.82 * scale,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.fillStyle = traits.eye;
  context.beginPath();
  context.ellipse(
    -3.5 * scale,
    -4.5 * scale,
    0.8 * scale,
    0.78 * scale,
    0,
    0,
    Math.PI * 2,
  );
  context.ellipse(
    3.5 * scale,
    -4.5 * scale,
    0.8 * scale,
    0.78 * scale,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.strokeStyle = shiftColor(skin, -46);
  context.lineWidth = 0.7 * scale;
  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(side * 2.2 * scale, -5.2 * scale);
    context.quadraticCurveTo(
      side * 3.6 * scale,
      -6 * scale,
      side * 5 * scale,
      -5.1 * scale,
    );
    context.stroke();
  }
  context.strokeStyle = shiftColor(skin, -38);
  context.lineWidth = 0.85 * scale;
  context.beginPath();
  context.moveTo(0.2 * scale, -3 * scale);
  context.lineTo(-0.7 * scale, 0.8 * scale);
  context.lineTo(1.2 * scale, 1.1 * scale);
  context.stroke();
  context.strokeStyle = shiftColor(skin, -52);
  context.lineWidth = 1 * scale;
  context.beginPath();
  context.moveTo(-2.8 * scale, 4 * scale);
  context.quadraticCurveTo(0, 5.6 * scale, 2.8 * scale, 3.9 * scale);
  context.stroke();

  drawBeard(context, traits, scale, hair);

  if (traits.scar) {
    context.strokeStyle = "rgba(198, 142, 126, .85)";
    context.lineWidth = 0.9 * scale;
    context.beginPath();
    context.moveTo(-6.4 * scale, -9 * scale);
    context.lineTo(-2.4 * scale, -1 * scale);
    context.stroke();
  }
  if (traits.warpaint) {
    context.fillStyle = "rgba(28, 24, 22, .58)";
    context.fillRect(-8.4 * scale, -5.6 * scale, 16.8 * scale, 2.4 * scale);
  }
}

function drawHair(context, traits, scale, hair) {
  if (traits.hairStyle === "bald") return;
  context.fillStyle = hair;
  if (traits.hairStyle === "long") {
    context.beginPath();
    context.ellipse(
      0,
      -4 * scale,
      10.6 * scale,
      12.4 * scale,
      0,
      Math.PI,
      Math.PI * 2,
    );
    context.fill();
    for (const side of [-1, 1]) {
      context.beginPath();
      context.moveTo(side * 9.4 * scale, -8 * scale);
      context.quadraticCurveTo(
        side * 12.4 * scale,
        1 * scale,
        side * 8.6 * scale,
        8 * scale,
      );
      context.lineTo(side * 5.4 * scale, 6 * scale);
      context.quadraticCurveTo(
        side * 9 * scale,
        0,
        side * 7.4 * scale,
        -7 * scale,
      );
      context.closePath();
      context.fill();
    }
    return;
  }
  context.beginPath();
  context.arc(0, -9 * scale, 9.3 * scale, Math.PI, Math.PI * 2);
  context.lineTo(8 * scale, -6 * scale);
  context.quadraticCurveTo(1 * scale, -10 * scale, -8.5 * scale, -5.5 * scale);
  context.closePath();
  context.fill();
  if (traits.hairStyle === "topknot") {
    context.beginPath();
    context.ellipse(
      0,
      -17.4 * scale,
      3.4 * scale,
      3 * scale,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
  } else if (traits.hairStyle === "braids") {
    for (const side of [-1, 1]) {
      context.beginPath();
      context.ellipse(
        side * 9 * scale,
        1 * scale,
        1.9 * scale,
        5.4 * scale,
        side * 0.2,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }
}

function drawHelmet(context, traits, scale, tint) {
  if (traits.helmet === "none") return;
  if (traits.helmet === "great-helm") {
    context.fillStyle = shiftColor(tint, 27);
    context.strokeStyle = "#181b1b";
    context.lineWidth = 1.3 * scale;
    context.beginPath();
    context.arc(0, -9 * scale, 10.4 * scale, Math.PI, Math.PI * 2);
    context.lineTo(9.4 * scale, -3 * scale);
    context.lineTo(6.6 * scale, -0.4 * scale);
    context.lineTo(5.6 * scale, -6.6 * scale);
    context.lineTo(-5.6 * scale, -6.6 * scale);
    context.lineTo(-6.6 * scale, -0.4 * scale);
    context.lineTo(-9.4 * scale, -3 * scale);
    context.closePath();
    context.fill();
    context.stroke();
    context.strokeStyle = "#d0b16b";
    context.lineWidth = 0.9 * scale;
    context.beginPath();
    context.moveTo(-7.6 * scale, -6.8 * scale);
    context.lineTo(7.6 * scale, -6.8 * scale);
    context.stroke();
    return;
  }
  if (traits.helmet === "nasal") {
    context.fillStyle = shiftColor(tint, 22);
    context.strokeStyle = "#191c1c";
    context.lineWidth = 1.1 * scale;
    context.beginPath();
    context.arc(0, -9.4 * scale, 9.8 * scale, Math.PI, Math.PI * 2);
    context.lineTo(9.4 * scale, -8.2 * scale);
    context.lineTo(-9.4 * scale, -8.2 * scale);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillRect(-0.9 * scale, -8.6 * scale, 1.8 * scale, 5.4 * scale);
    return;
  }
  context.fillStyle = "#5a4630";
  context.strokeStyle = "#241d16";
  context.lineWidth = 1 * scale;
  context.beginPath();
  context.arc(0, -8.6 * scale, 9.6 * scale, Math.PI, Math.PI * 2);
  context.lineTo(9.2 * scale, -7 * scale);
  context.lineTo(-9.2 * scale, -7 * scale);
  context.closePath();
  context.fill();
  context.stroke();
}

function drawBeard(context, traits, scale, hair) {
  if (traits.beard === "none") return;
  if (traits.beard === "stubble") {
    context.fillStyle = `${hair}55`;
    context.beginPath();
    context.moveTo(-6 * scale, 1.6 * scale);
    context.quadraticCurveTo(0, 8.4 * scale, 6 * scale, 1.6 * scale);
    context.quadraticCurveTo(0, 5.2 * scale, -6 * scale, 1.6 * scale);
    context.fill();
    return;
  }
  context.fillStyle = hair;
  context.beginPath();
  context.moveTo(-5.5 * scale, 2.5 * scale);
  context.quadraticCurveTo(0, 5.5 * scale, 5.5 * scale, 2.5 * scale);
  if (traits.beard === "forked") {
    context.quadraticCurveTo(5 * scale, 9 * scale, 2.4 * scale, 12 * scale);
    context.lineTo(0, 7.4 * scale);
    context.lineTo(-2.4 * scale, 12 * scale);
    context.quadraticCurveTo(-5 * scale, 9 * scale, -5.5 * scale, 2.5 * scale);
  } else {
    context.quadraticCurveTo(4 * scale, 10 * scale, 0, 10.5 * scale);
    context.quadraticCurveTo(-4 * scale, 10 * scale, -5.5 * scale, 2.5 * scale);
  }
  context.fill();
}

// The full medallion: rim, clipped face and highlight.
export function drawPortraitMedallion(context, unit, scale, options = {}) {
  const traits = options.traits ?? portraitTraits(unit),
    tint = options.tint ?? armorTint(unit),
    rim = options.rim ?? (unit.team === "company" ? "#6f9aa2" : "#a35a50");
  context.save();
  context.fillStyle = "#111615";
  context.strokeStyle = rim;
  context.lineWidth = 3.2 * scale;
  context.beginPath();
  context.arc(0, 0, 22 * scale, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.beginPath();
  context.arc(0, 0, 19.5 * scale, 0, Math.PI * 2);
  context.clip();
  drawPortraitFace(context, unit, scale, { ...options, traits, tint });
  context.restore();
  context.strokeStyle = "rgba(241, 226, 190, .45)";
  context.lineWidth = 1 * scale;
  context.beginPath();
  context.arc(0, 0, 18.4 * scale, Math.PI * 1.08, Math.PI * 1.82);
  context.stroke();
}

// Painted portrait badges for the HTML panels: a circular head-and-shoulders
// crop of the fighter's atlas cell with a team-coloured rim. Returns "" until
// the atlas has loaded, so callers fall back to the procedural badge.
const photoBadgeCache = new Map();

export function portraitPhotoBadge(unit, pixels = 34) {
  if (typeof document === "undefined") return "";
  const path = portraitAtlasPath(unit),
    image = artImage(path);
  if (!image.complete || !image.naturalWidth) return "";
  const index = portraitIndexForUnit(unit),
    rim = unit.team === "company" ? "#6f9aa2" : "#a35a50",
    key = `${path}|${index}|${rim}|${pixels}`;
  const cached = photoBadgeCache.get(key);
  if (cached) return cached;
  const ratio = Math.min(
      typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
      2,
    ),
    canvas = document.createElement("canvas");
  canvas.width = Math.round(pixels * ratio);
  canvas.height = Math.round(pixels * ratio);
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const cellWidth = image.naturalWidth / 3,
    cellHeight = image.naturalHeight / 2,
    cellX = (index % 3) * cellWidth,
    cellY = Math.floor(index / 3) * cellHeight,
    // The faces sit in the upper middle of their cells, so the badge crops
    // there instead of squeezing the whole bust into a small circle.
    crop = cellWidth * 0.74,
    sourceX = cellX + (cellWidth - crop) / 2,
    sourceY = cellY + cellHeight * 0.03,
    center = pixels / 2,
    rimWidth = Math.max(1.4, pixels * 0.06);
  context.beginPath();
  context.arc(center, center, center - rimWidth / 2, 0, Math.PI * 2);
  context.fillStyle = "#111615";
  context.fill();
  context.save();
  context.clip();
  context.drawImage(image, sourceX, sourceY, crop, crop, 0, 0, pixels, pixels);
  context.restore();
  context.strokeStyle = rim;
  context.lineWidth = rimWidth;
  context.beginPath();
  context.arc(center, center, center - rimWidth / 2, 0, Math.PI * 2);
  context.stroke();
  const url = canvas.toDataURL("image/png");
  photoBadgeCache.set(key, url);
  return url;
}

// Portraits for the HTML panels. Rendering to an offscreen canvas once and
// caching the data URL keeps the turn rail cheap to rebuild every refresh.
const badgeCache = new Map();

export function portraitBadge(unit, pixels = 34) {
  if (typeof document === "undefined") return "";
  const traits = portraitTraits(unit),
    key = `${portraitSignature(unit)}|${traits.helmet}|${pixels}`;
  const cached = badgeCache.get(key);
  if (cached) return cached;
  const ratio = Math.min(
      typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
      2,
    ),
    canvas = document.createElement("canvas");
  canvas.width = Math.round(pixels * ratio);
  canvas.height = Math.round(pixels * ratio);
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.translate(pixels / 2, pixels / 2);
  drawPortraitMedallion(context, unit, pixels / 46, { traits, armorRatio: 1 });
  const url = canvas.toDataURL("image/png");
  badgeCache.set(key, url);
  return url;
}
