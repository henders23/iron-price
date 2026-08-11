export function normalizeSeed(s) {
  const e = s >>> 0;
  return e === 0 ? 1831565813 : e;
}
export function nextRandom(s) {
  let e = normalizeSeed(s);
  ((e ^= e << 13), (e ^= e >>> 17), (e ^= e << 5));
  const t = e >>> 0;
  return { value: t / 4294967296, state: t };
}
export function randomInt(s, e, t) {
  const a = nextRandom(s);
  return { value: Math.floor(a.value * (t - e + 1)) + e, state: a.state };
}
