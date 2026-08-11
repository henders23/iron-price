export function localStore() {
  try {
    const s = window.localStorage,
      e = "iron-price-storage-test";
    return (s.setItem(e, "1"), s.removeItem(e), s);
  } catch {
    return null;
  }
}
