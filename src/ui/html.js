export function escapeHtml(s) {
  return s.replace(
    /[&<>"]/g,
    (e) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[e] ?? e,
  );
}
export function readiness(s) {
  if (!s.alive) return 0;
  const e = s.hp / s.hpMax,
    t =
      (s.headArmor + s.bodyArmor) /
      Math.max(1, s.headArmorMax + s.bodyArmorMax);
  return Math.round((e * 0.6 + t * 0.4) * 100);
}
