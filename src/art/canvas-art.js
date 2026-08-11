export const artImageCache = new Map();
export function artImage(e) {
  if (!artImageCache.has(e)) {
    const t = new Image();
    ((t.decoding = "async"),
      (t.src = `./assets/art/${e}`),
      artImageCache.set(e, t));
  }
  return artImageCache.get(e);
}
export function drawArt(e, t, a, i, n, r, o = 1) {
  const l = artImage(t);
  l.complete &&
    l.naturalWidth &&
    (e.save(), (e.globalAlpha *= o), e.drawImage(l, a, i, n, r), e.restore());
}
