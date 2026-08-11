import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../Iron Price.html", import.meta.url);
let html = await readFile(file, "utf8");

function replaceOnce(search, replacement, label) {
  const count = html.split(search).length - 1;
  if (count === 0 && html.includes(replacement)) return;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  html = html.replace(search, replacement);
}

replaceOnce(
  "    <script type=\"module\">",
  "    <link rel=\"stylesheet\" href=\"./assets/art/art.css\" />\n    <script defer src=\"./assets/art/runtime.js\"></script>\n    <script type=\"module\">",
  "art stylesheet and runtime",
);

replaceOnce(
  "})();const k={",
  '})();const ipArtCache=new Map;function ipArtImage(e){if(!ipArtCache.has(e)){const t=new Image;t.decoding="async",t.src=`./assets/art/${e}`,ipArtCache.set(e,t)}return ipArtCache.get(e)}function ipDrawArt(e,t,a,i,n,r,o=1){const l=ipArtImage(t);l.complete&&l.naturalWidth&&(e.save(),e.globalAlpha*=o,e.drawImage(l,a,i,n,r),e.restore())}const k={',
  "canvas art loader",
);

replaceOnce(
  't.setLineDash([])),this.view.reachable.has(l)&&',
  't.setLineDash([]),ipDrawArt(t,"overlays/deployment.webp",i.x-this.size*.8,i.y-this.size*.8,this.size*1.6,this.size*1.6,.72)),this.view.reachable.has(l)&&',
  "deployment overlay",
);

replaceOnce(
  't.fillText("HOLD",i.x,i.y+4)),this.state.objective?.type==="escape"',
  't.fillText("HOLD",i.x,i.y+4),ipDrawArt(t,"overlays/hold-position.webp",i.x-this.size*.82,i.y-this.size*.82,this.size*1.64,this.size*1.64,.86)),this.state.objective?.type==="escape"',
  "hold overlay",
);

replaceOnce(
  't.setLineDash([]))}}drawPath(){',
  't.setLineDash([]),ipDrawArt(t,"overlays/escape-zone.webp",i.x-this.size*.8,i.y-this.size*.8,this.size*1.6,this.size*1.6,.72))}}drawPath(){',
  "escape overlay",
);

replaceOnce(
  'e.arc(a.x,a.y,Math.max(2,this.size*.07),0,Math.PI*2),e.fill()}}drawCorpses(){',
  'e.arc(a.x,a.y,Math.max(2,this.size*.07),0,Math.PI*2),e.fill()}const t=this.view.path.at(-1),a=t&&this.hexCenter(t);a&&ipDrawArt(e,"overlays/movement-destination.webp",a.x-this.size*.8,a.y-this.size*.8,this.size*1.6,this.size*1.6,.86)}drawCorpses(){',
  "movement overlay",
);

replaceOnce(
  'a.stroke()),d&&(a.strokeStyle="#e5bd58"',
  'a.stroke()),r&&!o&&ipDrawArt(a,"overlays/selected-unit.webp",-this.size*.8,-this.size*.8,this.size*1.6,this.size*1.6,.9),o&&ipDrawArt(a,"overlays/active-turn.webp",-this.size*.84,-this.size*.84,this.size*1.68,this.size*1.68,.94),l&&ipDrawArt(a,"overlays/attack-target.webp",-this.size*.82,-this.size*.82,this.size*1.64,this.size*1.64,.92),d&&(a.strokeStyle="#e5bd58"',
  "unit state overlays",
);

replaceOnce(
  'a.stroke(),a.setLineDash([]));const m=e.team',
  'a.stroke(),a.setLineDash([]),ipDrawArt(a,"overlays/enemy-captain.webp",-this.size*.92,-this.size*.92,this.size*1.84,this.size*1.84,.9));const m=e.team',
  "captain overlay",
);

await writeFile(file, html);
console.log("Iron Price art integration applied.");
