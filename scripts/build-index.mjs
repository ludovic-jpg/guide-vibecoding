// Construit content/index.json à partir des fichiers Markdown : métadonnées, outils cités, fiches du lexique, titres.
// Sans dépendance : `node scripts/build-index.mjs`. Lancé aussi par la GitHub Action de déploiement.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const lire = p => readFileSync(join(RACINE, p), "utf8");

/** Front matter YAML minimal : clés simples, chaînes entre guillemets, listes « - ». */
export function frontMatter(texte) {
  const m = texte.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, corps: texte };
  const meta = {}; let liste = null;
  for (const ligne of m[1].split("\n")) {
    const item = ligne.match(/^\s+-\s+(.*)$/);
    if (item && liste) { meta[liste].push(valeur(item[1])); continue; }
    const kv = ligne.match(/^([\wÀ-ÿ]+):\s*(.*)$/);
    if (!kv) continue;
    if (kv[2] === "") { meta[kv[1]] = []; liste = kv[1]; }
    else { meta[kv[1]] = valeur(kv[2]); liste = null; }
  }
  return { meta, corps: texte.slice(m[0].length) };
}
function valeur(v) {
  v = v.trim();
  if (/^".*"$/.test(v)) return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

const echapper = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const { outils } = JSON.parse(lire("data/outils.json"));

/** Nombre de mentions de chaque outil dans un texte (mots entiers, en retirant les expressions exclues). */
function mentions(texte) {
  const res = {};
  for (const o of outils) {
    let t = texte;
    for (const ex of o.exclure || []) t = t.replace(new RegExp(echapper(ex), "g"), " ");
    let n = 0;
    for (const mot of o.mots) n += (t.match(new RegExp(`(?<![\\wÀ-ÿ])${echapper(mot)}(?![\\wÀ-ÿ])`, "g")) || []).length;
    if (n) res[o.id] = n;
  }
  return res;
}

function fiches(corps, chapitre) {
  const res = [];
  for (const m of corps.matchAll(/^:::fiche (.*)\n([\s\S]*?)\n:::$/gm)) {
    const [titre, famille = ""] = m[1].split(/\s+·\s+/);
    const champ = nom => (m[2].match(new RegExp(`\\*\\*${nom}[^*]*\\*\\*\\s*([^\\n]+)`)) || [])[1]?.trim() || "";
    res.push({ titre: titre.trim(), famille: famille.trim(), definition: champ("Définition"), analogie: champ("Analogie"),
      confusion: champ("À ne pas confondre"), chapitre });
  }
  return res;
}

const chapitres = [], toutesFiches = [];
for (const f of readdirSync(join(RACINE, "content/chapitres")).filter(f => f.endsWith(".md")).sort()) {
  const { meta, corps } = frontMatter(lire(`content/chapitres/${f}`));
  const mots = corps.split(/\s+/).filter(Boolean).length;
  chapitres.push({
    id: meta.id, num: meta.num, partie: meta.partie, titrePartie: meta.titrePartie, titre: meta.titre, accroche: meta.accroche,
    boite: meta.boite || [], video: meta.video || "", datePublication: meta.datePublication || "",
    minutes: Math.max(1, Math.round(mots / 230)), mots,
    titres: [...corps.matchAll(/^### (.+)$/gm)].map(m => m[1].trim()),
    prompts: (corps.match(/^:::prompt/gm) || []).length,
    outils: mentions(corps),
  });
  toutesFiches.push(...fiches(corps, meta.id));
}
const annexes = readdirSync(join(RACINE, "content/annexes")).filter(f => f.endsWith(".md")).map(f => {
  const { meta, corps } = frontMatter(lire(`content/annexes/${f}`));
  toutesFiches.push(...fiches(corps, `annexe-${meta.id}`));
  return { id: String(meta.id), ordre: meta.ordre, titre: meta.titre, outils: mentions(corps) };
}).sort((a, b) => a.ordre - b.ordre);

const index = { genereLe: new Date().toISOString().slice(0, 10), chapitres, annexes, fiches: toutesFiches,
  totalMots: chapitres.reduce((s, c) => s + c.mots, 0) };
writeFileSync(join(RACINE, "content/index.json"), JSON.stringify(index));
console.log(`index.json : ${chapitres.length} chapitres, ${annexes.length} annexes, ${toutesFiches.length} fiches, ${index.totalMots} mots.`);
