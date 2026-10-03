// Agent publicateur : appelé par la GitHub Action quand l'auteur valide une proposition.
// Usage : node scripts/publier.mjs "publier:<idVideo>:<chNN>"   ou   "ecarter:<idVideo>"
// Déplace la proposition dans data/videos.json (statut en_ligne) ou la marque écartée. Écrit le résultat dans resultat.txt.
import { readFileSync, writeFileSync } from "node:fs";
const lire = p => JSON.parse(readFileSync(p, "utf8"));
const ecrire = (p, v) => writeFileSync(p, JSON.stringify(v, null, 1) + "\n");
const AUJ = new Date().toISOString().slice(0, 10);

const ordre = (process.argv[2] || "").trim();
const m = ordre.match(/^(publier|ecarter):([\w-]{11})(?::(ch\d{2}))?$/);
if (!m) { writeFileSync("resultat.txt", `Commande non reconnue : « ${ordre} ». Formats : publier:<id>:<chNN> ou ecarter:<id>.`); process.exit(1); }
const [, action, id, chapitre] = m;
const videos = lire("data/videos.json"), props = lire("data/propositions.json"), index = lire("content/index.json");
const p = props.propositions.find(x => x.id === id);

if (action === "ecarter") {
  if (p) { p.statut = "ecartee"; p.decideeLe = AUJ; }
  else props.propositions.push({ id, statut: "ecartee", decideeLe: AUJ });
  ecrire("data/propositions.json", props);
  writeFileSync("resultat.txt", `Vidéo ${id} écartée : elle ne sera plus proposée.`);
  process.exit(0);
}
if (videos.some(v => v.id === id && v.statut === "en_ligne")) { writeFileSync("resultat.txt", `La vidéo ${id} est déjà en ligne.`); process.exit(0); }
const ch = chapitre || p?.chapitre;
if (!index.chapitres.some(c => c.id === ch)) { writeFileSync("resultat.txt", `Chapitre inconnu : ${ch}.`); process.exit(1); }
const base = p || { id, url: `https://www.youtube.com/watch?v=${id}`, titre: id, chaine: "", langue: "", justification: "" };
videos.push({ id, chapitre: ch, url: base.url, titre: base.titre, chaine: base.chaine, chaineId: base.chaineId || "", langue: base.langue,
  datePublicationVideo: base.datePublicationVideo || "", justification: base.justification, statut: "en_ligne", ajouteeLe: AUJ });
if (p) { p.statut = "en_ligne"; p.decideeLe = AUJ; p.chapitre = ch; }
ecrire("data/videos.json", videos); ecrire("data/propositions.json", props);
const c = index.chapitres.find(x => x.id === ch);
writeFileSync("resultat.txt", `✅ « ${base.titre} » est publiée dans le chapitre ${c.num} (${c.titre}). Le site se met à jour dans quelques minutes.`);
