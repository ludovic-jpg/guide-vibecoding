// Agent de veille quotidienne du Guide du Vibe Coding (GitHub Actions, Node 20+, sans dépendance).
// 1. Relève les nouvelles vidéos des seules chaînes actives (flux RSS YouTube, sans clé).
// 2. Relève les vues de toutes les vidéos suivies et les historise dans data/stats.json.
// 3. Propose les nouvelles vidéos pertinentes (data/propositions.json, statut "a_valider") — rien n'est publié.
// 4. Relève les visites (GoatCounter, si configuré) dans data/visites.json.
// 5. Écrit brief.md (issue GitHub) et brief.html (e-mail) avec un bouton « Publier » par proposition.
// Optionnel : ANTHROPIC_API_KEY (tri sémantique par Claude Haiku), YOUTUBE_API_KEY (vues fiables des vidéos anciennes),
// GOATCOUNTER_TOKEN (visites). Sans ces secrets, l'agent fonctionne en mode mots-clés.
import { readFileSync, writeFileSync } from "node:fs";

const lire = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
const ecrire = (p, v) => writeFileSync(p, JSON.stringify(v, null, 1) + "\n");
const AUJ = new Date().toISOString().slice(0, 10);
const DEPOT = process.env.GITHUB_REPOSITORY || lire("data/site.json", {}).depot || "ludovic-jpg/guide-vibecoding";
const UA = { "User-Agent": "Mozilla/5.0 (compatible; GuideVibeCodingBot/1.0)", "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" };

const chaines = lire("data/chaines.json", []);
const videos = lire("data/videos.json", []);
const props = lire("data/propositions.json", { propositions: [] });
const stats = lire("data/stats.json", { maj: "", videos: {} });
const visites = lire("data/visites.json", { maj: "", jours: [] });
const site = lire("data/site.json", {});
const index = lire("content/index.json", { chapitres: [] });
const connus = new Set([...videos.map(v => v.id), ...props.propositions.map(p => p.id)]);
const journal = [];

async function get(url, opts = {}) {
  for (let essai = 0; essai < 2; essai++) {
    try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000), ...opts }); if (r.ok) return r; journal.push(`HTTP ${r.status} ${url}`); }
    catch (e) { journal.push(`Réseau ${url} : ${e.message}`); }
    await new Promise(r => setTimeout(r, 1500 * (essai + 1)));
  }
  return null;
}
const decode = s => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

async function idChaine(c) {
  if (c.channelId) return c.channelId;
  const r = await get(c.urlChaine); if (!r) return null;
  const html = await r.text();
  const m = html.match(/"channelId":"(UC[\w-]{22})"/) || html.match(/"externalId":"(UC[\w-]{22})"/) || html.match(/channel\/(UC[\w-]{22})/);
  if (m) c.channelId = m[1];
  return c.channelId || null;
}

async function flux(c) {
  const id = await idChaine(c); if (!id) return [];
  const r = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`); if (!r) return [];
  const xml = await r.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
    id: (e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/) || [])[1],
    titre: decode((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ""),
    publie: ((e.match(/<published>([^<]+)<\/published>/) || [])[1] || "").slice(0, 10),
    vues: Number((e.match(/<media:statistics views="(\d+)"/) || [])[1] ?? NaN),
    description: decode((e.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || "").slice(0, 600),
    lien: (e.match(/<link rel="alternate" href="([^"]+)"/) || [])[1] || "",
  })).filter(v => v.id);
}

async function vuesPage(id) {
  const r = await get(`https://www.youtube.com/watch?v=${id}&hl=en&gl=US`, { headers: { ...UA, Cookie: "CONSENT=YES+cb; SOCS=CAI" } }); if (!r) return null;
  const html = await r.text();
  const m = html.match(/"viewCount":"(\d+)"/) || html.match(/"viewCount":\{"simpleText":"([\d,.\s]+)/) || html.match(/itemprop="interactionCount" content="(\d+)"/);
  if (!m) { journal.push(`Vues introuvables pour ${id} (page de ${html.length} caractères) : ajoutez le secret YOUTUBE_API_KEY pour des vues fiables.`); return null; }
  return Number(String(m[1]).replace(/\D/g, ""));
}
async function vuesApi(ids) {
  const cle = process.env.YOUTUBE_API_KEY, res = {};
  if (!cle) return res;
  for (let i = 0; i < ids.length; i += 50) {
    const r = await get(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.slice(i, i + 50).join(",")}&key=${cle}`);
    if (!r) continue;
    for (const it of (await r.json()).items || []) res[it.id] = Number(it.statistics.viewCount);
  }
  return res;
}

// ── Pertinence par mots-clés (mode sans clé) ──
const VIDES = new Set("le la les un une des de du et en à au aux pour par sur avec sans dans ce ces cette votre vos nous vous qui que quoi est sont the a an of to in on for with and or how what why your you is are it this that from my i".split(" "));
const mots = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9.]+/).filter(m => m.length > 2 && !VIDES.has(m));
const TRAD = { securite: "security", donnees: "database data", deploiement: "deploy deployment", abonnement: "subscription billing", memoire: "memory", competences: "skills",
  test: "testing test", tester: "testing", montage: "editing video", prix: "pricing price", cahier: "spec prd requirements", lexique: "glossary", agent: "agent agents", hooks: "hooks" };
function profilChapitre(c) {
  const base = mots([c.titre, ...(c.boite || []), ...(c.titres || [])].join(" "));
  return new Set([...base, ...base.flatMap(m => (TRAD[m] || "").split(" ").filter(Boolean)), ...Object.keys(c.outils || {}).flatMap(o => o.split("-"))]);
}
// Un candidat doit parler du sujet du livre (au moins un terme « ancre ») et partager au moins 3 notions avec le chapitre.
const ANCRES = new Set("claude lovable vibe vibecoding coding agent agents agentic mcp supabase cursor prompt prompts saas llm skills hooks anthropic bolt replit windsurf copilot nocode no-code playwright stripe deploy deployment".split(" "));
const GENERIQUES = new Set("code coder coding guide tutorial tutoriel apprendre learn lignes developpeur developer dev video videos complete complet full minutes 2025 2026 debutant beginner beginners".split(" "));
function meilleurChapitre(v, chaine) {
  const mv = new Set(mots(v.titre + " " + v.description));
  if (![...mv].some(m => ANCRES.has(m))) return null;
  let best = null;
  for (const id of chaine.chapitresCibles || []) {
    const c = index.chapitres.find(x => x.id === id); if (!c) continue;
    const pc = profilChapitre(c), commun = [...mv].filter(m => pc.has(m) && !GENERIQUES.has(m));
    const score = commun.length + commun.filter(m => ANCRES.has(m)).length * 0.5;
    if (!best || score > best.score) best = { c, score, commun };
  }
  return best && best.commun.length >= 3 ? best : null;
}

// ── Tri sémantique par Claude (si ANTHROPIC_API_KEY) : une seule requête par passage ──
async function trierAvecClaude(candidats) {
  const cle = process.env.ANTHROPIC_API_KEY;
  if (!cle || !candidats.length) return null;
  const chs = index.chapitres.map(c => `${c.id} | ${c.titre} | ${(c.boite || []).join(" ; ")}`).join("\n");
  const liste = candidats.map((v, i) => `${i}. [${v.chaine.nom} → cibles ${v.chaine.chapitresCibles.join(",")}] ${v.titre} — ${v.description.slice(0, 240)}`).join("\n");
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
    headers: { "x-api-key": cle, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.MODELE_CLAUDE || "claude-haiku-4-5-20251001", max_tokens: 2000,
      system: "Tu fais la veille vidéo d'un livre français sur le vibe coding (Claude, Lovable). Tu ne retiens une vidéo que si son sujet correspond directement à une notion d'un des chapitres ciblés par sa chaîne. Pas de short, pas de contenu hors sujet. Réponds uniquement en JSON.",
      messages: [{ role: "user", content: `Chapitres :\n${chs}\n\nVidéos candidates :\n${liste}\n\nRéponds par un tableau JSON [{"i":numéro,"chapitre":"chNN","justification":"une phrase en français qui cite la notion du chapitre"}] pour les seules vidéos retenues (tableau vide si aucune).` }] }) });
  if (!r.ok) { journal.push(`Claude : HTTP ${r.status}`); return null; }
  const t = (await r.json()).content?.[0]?.text || "[]";
  try { return JSON.parse(t.slice(t.indexOf("["), t.lastIndexOf("]") + 1)); } catch { journal.push("Claude : réponse illisible"); return null; }
}

// ── Visites (GoatCounter) ──
async function releverVisites() {
  const tok = process.env.GOATCOUNTER_TOKEN, code = site.goatcounter;
  if (!tok || !code) return null;
  const hier = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const r = await get(`https://${code}.goatcounter.com/api/v0/stats/total?start=${hier}&end=${hier}`, { headers: { ...UA, Authorization: `Bearer ${tok}`, "Content-Type": "application/json" } });
  if (!r) return null;
  const j = await r.json();
  const n = Number(j.total ?? j.total_count ?? j.count ?? 0);
  visites.jours = visites.jours.filter(x => x.date !== hier).concat({ date: hier, visites: n }).slice(-400);
  visites.maj = AUJ;
  return { hier, n, semaine: visites.jours.slice(-7).reduce((s, x) => s + x.visites, 0) };
}

// ── Programme principal ──
const nouvelles = [], vuesDuJour = {};
for (const c of chaines.filter(c => c.active)) {
  const entrees = await flux(c);
  for (const v of entrees) {
    if (Number.isFinite(v.vues)) vuesDuJour[v.id] = v.vues;
    const age = (Date.now() - Date.parse(v.publie)) / 864e5;
    if (connus.has(v.id) || age > 548 || /#shorts?\b/i.test(v.titre + " " + v.description) || v.lien.includes("/shorts/")) continue;
    nouvelles.push({ ...v, chaine: c });
  }
}
const suivies = [...new Set([...videos.filter(v => v.statut === "en_ligne").map(v => v.id), ...props.propositions.filter(p => p.statut === "a_valider").map(p => p.id)])];
const parApi = await vuesApi(suivies.filter(id => vuesDuJour[id] == null));
for (const id of suivies) {
  let n = vuesDuJour[id] ?? parApi[id];
  if (n == null) n = await vuesPage(id);
  if (n == null) continue;
  const v = videos.find(x => x.id === id) || props.propositions.find(x => x.id === id);
  const s = stats.videos[id] ||= { titre: v?.titre || id, chaine: v?.chaine || "", chapitre: v?.chapitre || "", historique: [] };
  s.historique = s.historique.filter(h => h.date !== AUJ).concat({ date: AUJ, vues: n }).slice(-365);
}
stats.maj = AUJ;

let retenues = [];
const avis = await trierAvecClaude(nouvelles);
if (avis) retenues = avis.filter(a => nouvelles[a.i] && /^ch\d{2}$/.test(a.chapitre)).map(a => ({ v: nouvelles[a.i], chapitre: a.chapitre, justification: a.justification }));
else retenues = nouvelles.map(v => ({ v, m: meilleurChapitre(v, v.chaine) })).filter(x => x.m).map(({ v, m }) => ({ v, chapitre: m.c.id,
  justification: `Correspond au chapitre ${m.c.num} (« ${m.c.titre} ») par les notions : ${m.commun.slice(0, 4).join(", ")}.` }));
const parChap = {};
retenues = retenues.filter(x => (parChap[x.chapitre] = (parChap[x.chapitre] || 0) + 1) <= 3);
for (const { v, chapitre, justification } of retenues) {
  props.propositions.push({ id: v.id, chapitre, url: `https://www.youtube.com/watch?v=${v.id}`, titre: v.titre, chaine: v.chaine.nom, chaineId: v.chaine.id,
    langue: v.chaine.langue, datePublicationVideo: v.publie, justification, statut: "a_valider", proposeeLe: AUJ, decideeLe: "" });
}
const vis = await releverVisites();
ecrire("data/chaines.json", chaines); ecrire("data/stats.json", stats); ecrire("data/propositions.json", props); ecrire("data/visites.json", visites);

// ── Brief (Markdown pour l'issue, HTML pour l'e-mail) ──
const lienPublier = p => `https://github.com/${DEPOT}/issues/new?title=${encodeURIComponent(`publier:${p.id}:${p.chapitre}`)}&body=${encodeURIComponent(`Je valide la publication de « ${p.titre} » (${p.chaine}) dans le chapitre ${p.chapitre}.`)}`;
const lienEcarter = p => `https://github.com/${DEPOT}/issues/new?title=${encodeURIComponent(`ecarter:${p.id}`)}&body=${encodeURIComponent("Vidéo écartée.")}`;
const fmt = n => n == null ? "—" : n.toLocaleString("fr-FR");
const ecart = (h, j) => h.length > 1 ? h.at(-1).vues - h[Math.max(0, h.length - 1 - j)].vues : null;
const lignes = Object.entries(stats.videos).filter(([id]) => videos.some(v => v.id === id && v.statut === "en_ligne"))
  .map(([id, s]) => ({ id, ...s, vues: s.historique.at(-1)?.vues, d1: ecart(s.historique, 1), d7: ecart(s.historique, 7) })).sort((a, b) => (b.d1 ?? 0) - (a.d1 ?? 0));
const attente = props.propositions.filter(p => p.statut === "a_valider");
const urlSite = `https://${DEPOT.split("/")[0]}.github.io/${DEPOT.split("/")[1]}/`;

let md = `## Brief de veille du ${AUJ}\n\n`;
md += `**${retenues.length} nouvelle(s) proposition(s)** · ${attente.length} en attente au total · ${lignes.length} vidéos en ligne suivies`;
md += vis ? ` · **${fmt(vis.n)} visites hier** (${fmt(vis.semaine)} sur 7 jours)\n\n` : " · visites : mesure non activée\n\n";
if (attente.length) {
  md += `### À valider\nCliquez sur **Publier**, puis sur « Submit new issue » : l'agent publicateur met la vidéo en ligne en quelques minutes.\n\n`;
  for (const p of attente) md += `- **${p.titre}** — ${p.chaine} → ${p.chapitre}${stats.videos[p.id] ? ` · ${fmt(stats.videos[p.id].historique.at(-1)?.vues)} vues` : ""}\n  ${p.justification}\n  [▶ Voir](${p.url}) · [✅ Publier](${lienPublier(p)}) · [✖ Écarter](${lienEcarter(p)})\n`;
}
md += `\n### Vidéos en ligne : vues et évolution\n| Vidéo | Chaîne | Ch. | Vues | 24 h | 7 j |\n|---|---|---|---:|---:|---:|\n`;
for (const l of lignes) md += `| [${l.titre.replace(/\|/g, "/")}](https://www.youtube.com/watch?v=${l.id}) | ${l.chaine} | ${l.chapitre} | ${fmt(l.vues)} | ${l.d1 == null ? "—" : "+" + fmt(l.d1)} | ${l.d7 == null ? "—" : "+" + fmt(l.d7)} |\n`;
md += `\n[Tableau de bord](${urlSite}#tableau) · [Site](${urlSite})\n`;
if (journal.length) md += `\n<details><summary>Journal technique (${journal.length})</summary>\n\n${journal.slice(0, 30).map(j => "- " + j).join("\n")}\n</details>\n`;
writeFileSync("brief.md", md);

const bouton = (href, txt, bg) => `<a href="${href}" style="display:inline-block;padding:10px 16px;border-radius:999px;background:${bg};color:#fff;text-decoration:none;font-weight:700;margin:4px 6px 4px 0">${txt}</a>`;
let html = `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:640px;margin:auto;color:#16161A">
<p style="font:12px monospace;color:#6D28D9;letter-spacing:.08em">GUIDE DU VIBE CODING · VEILLE</p><h1 style="margin:0 0 6px">Brief du ${AUJ}</h1>
<p>${retenues.length} nouvelle(s) proposition(s) · ${attente.length} en attente · ${lignes.length} vidéos suivies${vis ? ` · ${fmt(vis.n)} visites hier` : ""}</p>`;
for (const p of attente) html += `<div style="border:1px solid #DCD8CE;border-radius:14px;padding:14px;margin:12px 0">
<a href="${p.url}"><img src="https://i.ytimg.com/vi/${p.id}/mqdefault.jpg" width="320" height="180" alt="" style="border-radius:10px;display:block;max-width:100%"></a>
<h3 style="margin:10px 0 4px">${p.titre}</h3><p style="margin:0;color:#4A4D57">${p.chaine} → chapitre ${p.chapitre}</p><p>${p.justification}</p>
${bouton(lienPublier(p), "✅ Publier sur le site", "#6D28D9")}${bouton(lienEcarter(p), "Écarter", "#8A8D96")}</div>`;
html += `<h2>Vues des vidéos en ligne</h2><table style="border-collapse:collapse;width:100%;font-size:14px">` + lignes.slice(0, 25).map(l =>
  `<tr><td style="padding:6px;border-bottom:1px solid #eee">${l.titre}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right">${fmt(l.vues)}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right;color:#047857">${l.d1 == null ? "—" : "+" + fmt(l.d1)}</td></tr>`).join("") + `</table>
<p>${bouton(urlSite + "#tableau", "Ouvrir le tableau de bord", "#16161A")}</p></div>`;
writeFileSync("brief.html", html);
console.log(`Veille ${AUJ} : ${nouvelles.length} nouvelles vidéos vues, ${retenues.length} proposées, ${Object.keys(vuesDuJour).length} vues relevées par RSS, journal ${journal.length}.`);
