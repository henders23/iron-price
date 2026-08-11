// Fits the hex battlefield inside the canvas.
//
// The board is measured from the tiles themselves rather than from constants,
// so every row and column stays on screen: the viewport only scrolls once the
// player zooms past 100%, and anything the fit misses would be unreachable.
export const SQRT3 = Math.sqrt(3);
export const HEX_MIN_SIZE = 14;
export const HEX_MAX_SIZE = 122;
export const MAP_PADDING = { x: 22, y: 18 };

// A pointy-top hex at axial (q, r) sits at x = SQRT3 * size * (q + r / 2) and
// y = 1.5 * size * r, so the horizontal span is measured in hex widths and the
// vertical span in hex radii.
export function battlefieldBounds(tiles) {
  if (!tiles || tiles.length === 0)
    return { minAxis: 0, maxAxis: 11.5, minRow: 0, maxRow: 9 };
  let minAxis = Number.POSITIVE_INFINITY,
    maxAxis = Number.NEGATIVE_INFINITY,
    minRow = Number.POSITIVE_INFINITY,
    maxRow = Number.NEGATIVE_INFINITY;
  for (const tile of tiles) {
    const axis = tile.q + tile.r / 2;
    if (axis < minAxis) minAxis = axis;
    if (axis > maxAxis) maxAxis = axis;
    if (tile.r < minRow) minRow = tile.r;
    if (tile.r > maxRow) maxRow = tile.r;
  }
  return { minAxis, maxAxis, minRow, maxRow };
}

export function battlefieldLayout(tiles, width, height) {
  const bounds = battlefieldBounds(tiles);
  const columns = bounds.maxAxis - bounds.minAxis + 1;
  const rows = 1.5 * (bounds.maxRow - bounds.minRow) + 2;
  const size = Math.max(
    HEX_MIN_SIZE,
    Math.min(
      HEX_MAX_SIZE,
      (width - MAP_PADDING.x * 2) / (SQRT3 * columns),
      (height - MAP_PADDING.y * 2) / rows,
    ),
  );
  const mapWidth = SQRT3 * size * columns;
  const mapHeight = size * rows;
  return {
    size,
    origin: {
      x: (width - mapWidth) / 2 + SQRT3 * size * (0.5 - bounds.minAxis),
      y: (height - mapHeight) / 2 + size - 1.5 * size * bounds.minRow,
    },
    mapWidth,
    mapHeight,
  };
}
