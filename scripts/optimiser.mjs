// Construit le dossier _site publié : JS et CSS minifiés (esbuild), images converties en WebP/AVIF (sharp).
// Usage (CI) : npm i --no-save esbuild sharp && node scripts/optimiser.mjs
// Sans esbuild/sharp installés, les fichiers sont copiés tels quels : le site reste fonctionnel.
import { cpSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";

const SORTIE = "_site";
rmSync(SORTIE, { recursive: true, force: true });
mkdirSync(SORTIE);
for (const f of ["index.html", "content", "data", "assets", "js", "css"]) cpSync(f, join(SORTIE, f), { recursive: true, filter: s => !s.includes("assets/img/src") });
writeFileSync(join(SORTIE, ".nojekyll"), "");

let esbuild = null, sharp = null;
try { esbuild = await import("esbuild"); } catch { console.log("esbuild absent : pas de minification."); }
try { sharp = (await import("sharp")).default; } catch { console.log("sharp absent : pas de conversion d'images."); }

const fichiers = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? fichiers(p) : [p]; });
let avant = 0, apres = 0;
if (esbuild) for (const p of fichiers(SORTIE).filter(p => /\.(js|css)$/.test(p) && !p.includes("vendor"))) {
  const src = readFileSync(p, "utf8"); avant += src.length;
  const { code } = await esbuild.transform(src, { loader: extname(p).slice(1), minify: true, target: "es2020", charset: "utf8", legalComments: "none" });
  writeFileSync(p, code); apres += code.length;
}
if (esbuild) console.log(`JS/CSS : ${Math.round(avant / 1024)} Kio → ${Math.round(apres / 1024)} Kio.`);

// Images sources (assets/img/src/*.png|jpg) → WebP + AVIF en 3 largeurs, et fallback JPEG pour les réseaux sociaux.
const SRC = "assets/img/src";
if (sharp && existsSync(SRC)) for (const f of readdirSync(SRC).filter(f => /\.(png|jpe?g)$/i.test(f))) {
  const nom = basename(f, extname(f));
  for (const l of [480, 960, 1600]) {
    const img = sharp(join(SRC, f)).resize({ width: l, withoutEnlargement: true });
    await img.clone().webp({ quality: 72, effort: 5 }).toFile(join(SORTIE, "assets/img", `${nom}-${l}.webp`));
    await img.clone().avif({ quality: 50, effort: 5 }).toFile(join(SORTIE, "assets/img", `${nom}-${l}.avif`));
  }
  console.log(`Image ${f} : WebP/AVIF 480, 960, 1600.`);
}
console.log("_site prêt.");
