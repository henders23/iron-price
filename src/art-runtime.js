(function () {
  "use strict";

  const root = "./assets/art/";
  const url = (path) => `url("${root}${path}")`;
  const setArt = (element, property, path) => {
    if (!element || element.dataset.ipArtApplied === path) return;
    element.style.setProperty(property, url(path));
    element.dataset.ipArtApplied = path;
  };
  const setIcon = (element, path) => {
    if (!element) return;
    element.classList.add("ip-art-icon");
    setArt(element, "--ip-icon", path);
  };
  const setEmblem = (element, name) => {
    if (!element) return;
    element.classList.add("ip-emblem");
    setArt(element, "--ip-emblem", `emblems/${name}.webp`);
  };

  const originScenes = {
    "road-wardens": "origin-broken-wardens",
    "caravan-guard": "origin-caravan-remnant",
    oathless: "origin-oathless",
  };
  const eventScenes = {
    road: "event-broken-cart",
    camp: "event-old-fire",
    ruin: "event-stone-oath",
    storm: "event-black-storm",
  };
  const resourceIcons = {
    crowns: "crowns",
    food: "food",
    tools: "tools",
    medicine: "medicine",
    renown: "renown",
    "frontier threat": "threat",
  };
  const factionEmblems = {
    "free towns": "free-towns",
    fenwardens: "fenwardens",
    "house cael": "house-cael",
    thorn: "thorn-reavers",
    mireborn: "mireborn",
    ironbound: "ironbound",
  };

  function endingScene(text, victory) {
    if (victory) return "ending-victory";
    const normalized = text.toLowerCase();
    if (normalized.includes("fewer than six")) return "ending-last-six";
    if (normalized.includes("closed every road"))
      return "ending-ironbound-threat";
    if (normalized.includes("fifty days")) return "ending-fifty-days";
    return "ending-starvation";
  }

  function weaponName(text) {
    const normalized = text.toLowerCase();
    return ["sword", "spear", "axe", "mace"].find((name) =>
      normalized.includes(name),
    );
  }

  function weaponTier(quality) {
    return quality >= 3 ? "masterwork" : quality === 2 ? "serviceable" : "worn";
  }

  function qualityFrom(rootElement) {
    const text =
      rootElement?.querySelector(".section-label span")?.textContent ||
      rootElement?.textContent ||
      "";
    return Number(text.match(/QUALITY\s+(\d)/i)?.[1] || 1);
  }

  function enhance() {
    document.querySelectorAll(".origin-card[data-origin]").forEach((card) => {
      const scene = originScenes[card.dataset.origin];
      if (scene) setArt(card, "--ip-scene", `scenes/${scene}.webp`);
    });

    const eventScreen = document.querySelector(".event-screen");
    if (eventScreen) {
      const kind = Object.keys(eventScenes).find((name) =>
        eventScreen.classList.contains(`event-${name}`),
      );
      const art = eventScreen.querySelector(".event-art");
      if (kind && art) {
        art.classList.add("ip-event-art");
        setArt(art, "--ip-scene", `scenes/${eventScenes[kind]}.webp`);
      }
    }

    const ending = document.querySelector(".ending-screen");
    if (ending) {
      const scene = endingScene(
        ending.querySelector(".ending-card > p")?.textContent || "",
        ending.classList.contains("victory"),
      );
      ending.classList.add("ip-ending-art");
      setArt(ending, "--ip-scene", `scenes/${scene}.webp`);
      setEmblem(
        ending.querySelector(".ending-seal"),
        ending.classList.contains("victory") ? "frontier-compact" : "company",
      );
    }

    setEmblem(
      document.querySelector(".campaign-brand .brand-rivet"),
      "company",
    );

    document.querySelectorAll(".supply-strip > div").forEach((item) => {
      const name = item.title?.toLowerCase();
      const icon = resourceIcons[name];
      if (icon)
        setIcon(item.querySelector("i"), `icons/resources/${icon}.webp`);
    });

    document.querySelectorAll(".market-card").forEach((card) => {
      const className = [...card.classList].find((name) =>
        name.startsWith("offer-"),
      );
      const type = className?.slice(6);
      const quality = Number(
        card.textContent.match(/QUALITY\s+(\d)/i)?.[1] || 1,
      );
      const icon = card.querySelector(".market-icon");
      if (type === "weapon")
        setIcon(icon, `icons/weapons/sword-${weaponTier(quality)}.webp`);
      else if (type === "armor")
        setIcon(icon, "icons/resources/body-armor.webp");
      else if (["food", "tools", "medicine"].includes(type))
        setIcon(icon, `icons/resources/${type}.webp`);
    });

    document
      .querySelectorAll(".armory-options button[data-equip-weapon]")
      .forEach((button) => {
        const quality = qualityFrom(button.closest(".loadout-section"));
        setIcon(
          button.querySelector("i"),
          `icons/weapons/${button.dataset.equipWeapon}-${weaponTier(quality)}.webp`,
        );
      });

    document.querySelectorAll(".recruit-kit").forEach((kit) => {
      const weapon = weaponName(kit.textContent);
      if (weapon)
        setIcon(kit.querySelector("span"), `icons/weapons/${weapon}-worn.webp`);
    });

    document.querySelectorAll(".contract-card").forEach((card) => {
      const normalized = card.textContent.toLowerCase();
      const faction = Object.entries(factionEmblems).find(([name]) =>
        normalized.includes(name),
      )?.[1];
      if (faction) setEmblem(card.querySelector(".contract-seal"), faction);
    });

    document.querySelectorAll(".reputation-list > div").forEach((row) => {
      const normalized = row.textContent.toLowerCase();
      const faction = Object.entries(factionEmblems).find(([name]) =>
        normalized.includes(name),
      )?.[1];
      if (faction) {
        row.classList.add("ip-faction");
        setArt(row, "--ip-emblem", `emblems/${faction}.webp`);
      }
    });

    document.querySelectorAll(".sheet-resource").forEach((row) => {
      const label = row.querySelector("span")?.textContent.trim().toLowerCase();
      const icon =
        label === "head"
          ? "head-armor"
          : label === "body"
            ? "body-armor"
            : null;
      if (icon) {
        row.classList.add("ip-resource");
        setArt(row, "--ip-icon", `icons/resources/${icon}.webp`);
      }
    });

    const shield = document.querySelector(".shield-section");
    if (shield) {
      shield.classList.add("ip-resource");
      setArt(shield, "--ip-icon", "icons/resources/shield.webp");
    }
    const injuries = document.querySelector(".injury-section");
    if (injuries) {
      injuries.classList.add("ip-resource");
      setArt(injuries, "--ip-icon", "icons/resources/injuries.webp");
    }
    document.querySelectorAll(".fighter-history span").forEach((item) => {
      const normalized = item.textContent.toLowerCase();
      if (normalized.includes("xp")) {
        item.classList.add("ip-resource");
        setArt(item, "--ip-icon", "icons/resources/xp.webp");
      } else if (normalized.includes("crowns/day")) {
        item.classList.add("ip-resource");
        setArt(item, "--ip-icon", "icons/resources/wages.webp");
      }
    });
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      enhance();
    });
  };

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", schedule)
    : schedule();
})();
