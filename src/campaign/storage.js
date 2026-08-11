import { migrateCampaign } from "./campaign.js";
import { localStore } from "../local-storage.js";

export const campaignCache = new Map();
export function slotKey(s) {
  return `iron-price-campaign-v2-slot-${s}`;
}
export function legacySlotKey(s) {
  return `iron-price-campaign-v1-slot-${s}`;
}
export function saveCampaign(s) {
  ((s.lastPlayed = new Date().toISOString()),
    campaignCache.set(s.slot, structuredClone(s)),
    localStore()?.setItem(slotKey(s.slot), JSON.stringify(s)));
}
export function loadCampaign(s) {
  const e = localStore(),
    t = e?.getItem(slotKey(s)) ?? e?.getItem(legacySlotKey(s));
  if (t)
    try {
      const a = migrateCampaign(JSON.parse(t));
      if (a) return (saveCampaign(a), a);
    } catch {
      return null;
    }
  return campaignCache.has(s) ? migrateCampaign(campaignCache.get(s)) : null;
}
export function loadAllCampaigns() {
  return [1, 2, 3].map(loadCampaign);
}
export function deleteCampaign(s) {
  (campaignCache.delete(s),
    localStore()?.removeItem(slotKey(s)),
    localStore()?.removeItem(legacySlotKey(s)));
}
