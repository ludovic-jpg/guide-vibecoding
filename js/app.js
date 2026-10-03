/* Guide du Vibe Coding — application de lecture (site statique, sans framework).
   Données : content/index.json (généré), content/**.md (un fichier par chapitre), data/*.json.
   Routes (hash) : #accueil · #chNN · #chNN-videos · #mon-guide · #videos · #lexique · #annexe-X · #tableau · #imprimer[?ch=…&prenom=…] */
(() => {
"use strict";

/* ───────── Outils de base ───────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function el(tag, attrs = {}, ...enfants) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "text") e.textContent = v;
    else if (k === "html") e.innerHTML = v; // réservé au SVG généré par Pixel et au HTML nettoyé par DOMPurify
    else if (k === "style" && typeof v === "object") for (const [p, val] of Object.entries(v)) p.startsWith("--") ? e.style.setProperty(p, val) : (e.style[p] = val);
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  e.append(...enfants.flat().filter(x => x !== null && x !== undefined && x !== false));
  return e;
}
const stock = {
  get(k, d) { try { const v = localStorage.getItem("guide-" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("guide-" + k, JSON.stringify(v)); } catch { /* stockage indisponible : on garde en mémoire */ } },
};
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtNb = n => n == null ? "—" : new Intl.NumberFormat("fr-FR", { notation: n >= 100000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
const ico = (nom, t = 20) => window.Pixel ? Pixel.icone(nom, { taille: t }) : "";
const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ───────── État ───────── */
const E = { index: null, guides: {}, outils: [], cats: [], videos: [], stats: { videos: {} }, visites: { jours: [] }, site: {}, chaines: [], propositions: [], md: new Map() };
const profil = Object.assign({ prenom: "", outils: [], objectif: "", niveau: "" }, stock.get("profil", {}));
const lus = new Set(stock.get("lus", []));
const valeurs = stock.get("valeurs-prompts", {});
const sauverProfil = () => stock.set("profil", profil);

async function json(url, defaut) {
  try { const r = await fetch(url, { cache: "no-cache" }); if (!r.ok) throw 0; return await r.json(); } catch { return defaut; }
}
async function texte(url) { const r = await fetch(url); if (!r.ok) throw new Error(url); return r.text(); }
function frontMatter(t) {
  const m = t.match(/^---\n([\s\S]*?)\n---\n?/);
  return m ? t.slice(m[0].length) : t;
}
async function contenu(dossier, id) {
  const cle = `${dossier}/${id}`;
  if (!E.md.has(cle)) E.md.set(cle, texte(`content/${dossier}/${id}.md`).then(frontMatter));
  return E.md.get(cle);
}
const scripts = {};
function charger(src) {
  if (!scripts[src]) scripts[src] = new Promise((ok, ko) => {
    if (src.endsWith(".css")) { document.head.append(el("link", { rel: "stylesheet", href: src, onload: ok, onerror: ok })); return; }
    document.head.append(el("script", { src, onload: ok, onerror: ko }));
  });
  return scripts[src];
}
async function chargerViz(num) {
  const lot = num <= 17 ? "a" : "b";
  await Promise.all([charger(`css/viz-${lot}.css`), charger(`js/viz-${lot}.js`)]);
}

/* ───────── Markdown du livre ───────── */
const LIBELLES = { prompt: ["Prompt à essayer", "bulle"], attention: ["Attention", "eclair"], checklist: ["Check-list", "check"], mot: ["Le mot et la chose", "loupe"],
  bref: ["En bref", "sommaire"], cout: ["Combien ça coûte", "piece"], astuce: ["Astuce", "ampoule"], notice: ["Notice de montage", "cle"], fiche: ["Fiche du lexique", "etoile"] };
function prepEncarts(md) {
  return (md || "").split(/(^```[\s\S]*?^```$)/m).map((part, i) => i % 2 ? part : part
    .replace(/^:::planche:::$/gm, "")
    .replace(/^:::(\w+) ?(.*)\n([\s\S]*?)\n:::$/gm, (_, t, titre, corps) =>
      `<aside class="encart encart-${esc(t)}" data-type="${esc(t)}"><p class="encart-label">${esc((LIBELLES[t] || [t])[0])}</p>` +
      (titre ? `<p class="encart-titre">${esc(titre)}</p>` : "") + `\n\n${t === "prompt" && !corps.includes("```") ? "```\n" + corps + "\n```" : corps}\n\n</aside>`)).join("");
}
const escT = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function colorer(t) {
  return String(t).split("\n").map(ligne => {
    const e = escT(ligne);
    if (/^\s*#{1,6}\s/.test(ligne)) return `<span class="tok-titre">${e}</span>`;
    if (/^\s*(\/\/|<!--)/.test(ligne)) return `<span class="tok-comm">${e}</span>`;
    let m = e.match(/^(\s*)(- |\* |\d+\. )(.*)$/), debut = "", reste = e;
    if (m) { debut = `${m[1]}<span class="tok-puce">${m[2]}</span>`; reste = m[3]; }
    else if ((m = e.match(/^(\s*)([A-Za-zÀ-ÿ_][\wÀ-ÿ\- ]{0,28}):(\s)(.*)$/))) { debut = `${m[1]}<span class="tok-cle">${m[2]}:</span>${m[3]}`; reste = m[4]; }
    reste = reste.replace(/"[^"\n]{1,200}"|«[^»\n]{1,200}»/g, x => `<span class="tok-chaine">${x}</span>`)
      .replace(/\[[^\]\n]{2,60}\]/g, x => `<span class="tok-var">${x}</span>`);
    return debut + reste;
  }).join("\n");
}

/** Valeur proposée pour une variable de prompt, d'après le profil du lecteur. */
function valeurAuto(nom) {
  const n = norm(nom);
  if (valeurs[n]) return valeurs[n];
  if (profil.prenom && /prenom|votre nom|ton nom/.test(n)) return profil.prenom;
  if (profil.outils.length && /outil|solution|stack/.test(n)) return profil.outils.map(id => E.outils.find(o => o.id === id)?.nom).filter(Boolean).join(", ");
  return "";
}
function remplir(t) { return t.replace(/\[([^\]\n]{2,60})\]/g, (x, nom) => valeurAuto(nom) || x); }
const lienClaude = t => "https://claude.ai/new?q=" + encodeURIComponent(t);
const lienLovable = t => "https://lovable.dev/?autosubmit=true#prompt=" + encodeURIComponent(t);

async function copier(t, bouton) {
  const avant = bouton?.textContent;
  try { await navigator.clipboard.writeText(t); if (bouton) bouton.textContent = "Copié ✓"; }
  catch { if (bouton) bouton.textContent = "Sélectionnez puis copiez"; }
  if (bouton) setTimeout(() => (bouton.textContent = avant), 1800);
}

/** Bloc de prompt personnalisable : champs pour chaque [variable], copie, ouverture dans Claude ou Lovable. */
function blocPrompt(source, { avecChamps = true } = {}) {
  const vars = [...new Set([...source.matchAll(/\[([^\]\n]{2,60})\]/g)].map(m => m[1]))].filter(v => !/^[ xX]$/.test(v));
  const pre = el("pre"), code = el("code"); pre.append(code);
  const rendu = () => {
    code.innerHTML = colorer(source).replace(/<span class="tok-var">\[([^\]]+)\]<\/span>/g, (x, nom) => {
      const brut = nom.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
      const v = valeurAuto(brut);
      return v ? `<span class="tok-rempli">${escT(v)}</span>` : x;
    });
  };
  rendu();
  const btnCopier = el("button", { type: "button", class: "copier", text: "Copier", onclick: e => copier(remplir(source), e.currentTarget) });
  const bloc = el("div", { class: "bloc-code" }, pre, btnCopier);
  const frag = el("div", { class: "prompt-perso" });
  if (avecChamps && vars.length) {
    frag.append(el("div", { class: "perso-prompt" }, el("p", { text: "Personnalisez avant d'essayer" }),
      ...vars.map(v => {
        const i = el("input", { type: "text", value: valeurAuto(v), placeholder: v, "data-var": norm(v) });
        i.addEventListener("input", () => { valeurs[norm(v)] = i.value.trim(); stock.set("valeurs-prompts", valeurs); document.dispatchEvent(new CustomEvent("valeurs")); });
        return el("label", {}, v, i);
      })));
  }
  frag.append(bloc, el("div", { class: "essayer" },
    el("a", { class: "bouton plein", href: "#", onclick: e => { e.preventDefault(); open(lienClaude(remplir(source)), "_blank", "noopener"); } }, el("span", { html: ico("bulle", 16) }), "Essayer dans Claude"),
    el("a", { class: "bouton", href: "#", onclick: e => { e.preventDefault(); open(lienLovable(remplir(source)), "_blank", "noopener"); } }, el("span", { html: ico("brique", 16) }), "Essayer dans Lovable")));
  document.addEventListener("valeurs", () => { rendu(); $$("input[data-var]", frag).forEach(i => { if (document.activeElement !== i) i.value = valeurs[i.dataset.var] ?? i.value; }); });
  return frag;
}

function md(source) {
  const propre = DOMPurify.sanitize(marked.parse(prepEncarts(source), { gfm: true }));
  const div = el("div", { html: propre });
  $$("table", div).forEach(t => { const w = el("div", { class: "tableau" }); t.replaceWith(w); w.append(t); });
  $$("a[href]", div).forEach(a => { if (!a.getAttribute("href").startsWith("#")) { a.target = "_blank"; a.rel = "noopener"; } });
  $$("pre > code", div).forEach(code => {
    const pre = code.parentElement, source = code.textContent.replace(/\n$/, "");
    if (pre.closest(".encart-prompt")) { pre.replaceWith(blocPrompt(source)); return; }
    code.innerHTML = colorer(source);
    const w = el("div", { class: "bloc-code" }); pre.replaceWith(w);
    w.append(pre, el("button", { type: "button", class: "copier", text: "Copier", onclick: e => copier(source, e.currentTarget) }));
  });
  $$(".encart", div).forEach(a => { const l = $(".encart-label", a), t = LIBELLES[a.dataset.type]; if (l && t) l.prepend(el("span", { html: ico(t[1], 18), "aria-hidden": "true" })); });
  return div;
}

/* ───────── Données dérivées ───────── */
const chapitres = () => E.index.chapitres;
const chap = id => chapitres().find(c => c.id === id);
const outil = id => E.outils.find(o => o.id === id);
const tuile = (o, lien = true) => el(lien ? "a" : "span", { class: "tuile", style: { "--c": o.couleur }, href: lien ? `#mon-guide?outil=${o.id}` : null, title: o.desc },
  el("span", { class: "mono", text: o.mono }), o.nom);
const guide = id => E.guides[id] || E.guides.ch01;
const perso = (id, taille = 128, anime = true) => window.Pixel ? Pixel.perso(guide(id), { taille, anime }) : "";
const videosDe = id => E.videos.filter(v => v.chapitre === id && v.statut === "en_ligne");
const vuesDe = id => { const h = E.stats.videos?.[id]?.historique; return h?.length ? h[h.length - 1].vues : null; };

/** Score de pertinence d'un chapitre pour le profil du lecteur (0 à 100). */
function pertinence(c) {
  let s = 0;
  const tot = Object.values(c.outils).reduce((a, b) => a + b, 0) || 1;
  for (const id of profil.outils) s += Math.min(40, ((c.outils[id] || 0) / tot) * 160 + (c.outils[id] ? 6 : 0));
  const parObjectif = { vitrine: [3], metier: [4], saas: [5], tout: [3, 4, 5] }[profil.objectif] || [];
  if (parObjectif.includes(c.partie)) s += 35;
  if ([1, 2].includes(c.partie)) s += profil.niveau === "avance" ? 4 : 22;
  if (["ch01", "ch02", "ch05", "ch07", "ch33"].includes(c.id)) s += 25;
  if (c.partie === 6) s += profil.niveau === "avance" ? 22 : 8;
  return Math.min(100, Math.round(s));
}
const personnalise = () => profil.outils.length || profil.objectif;
const parcours = () => chapitres().map(c => ({ c, s: pertinence(c) })).filter(x => x.s >= 30).sort((a, b) => a.c.num - b.c.num);

/* ───────── Interface commune ───────── */
function toast(t, idGuide) {
  $$(".toast").forEach(x => x.remove());
  const n = el("div", { class: "toast", role: "status" }, idGuide ? el("span", { html: perso(idGuide, 40, false) }) : null, t);
  document.body.append(n); setTimeout(() => n.remove(), 3600);
}
function surVisible(elt, fn, seuil = .25) {
  if (!("IntersectionObserver" in window)) return fn();
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.disconnect(); fn(); } }), { threshold: seuil });
  io.observe(elt);
}
let observateurs = [];
const nettoyer = () => { observateurs.forEach(o => o.disconnect()); observateurs = []; onscroll = null; $("#progression").style.width = "0"; };

function route() {
  const brut = decodeURIComponent(location.hash.slice(1)) || "accueil";
  const [chemin, q = ""] = brut.split("?");
  const params = new URLSearchParams(q);
  let m;
  if ((m = chemin.match(/^(ch\d{2})(?:-(videos))?$/))) return { vue: "ch", id: m[1], onglet: m[2] || "lire", params };
  if ((m = chemin.match(/^annexe-(.+)$/))) return { vue: "annexe", id: m[1], params };
  if (["mon-guide", "videos", "lexique", "tableau", "imprimer", "accueil"].includes(chemin)) return { vue: chemin, params };
  if ((m = chemin.match(/^(.+)--(.+)$/))) return { vue: "ch", id: m[1], ancre: m[2], params };
  return { vue: "accueil", params };
}

async function rendre() {
  nettoyer();
  const r = route(), main = $("#app");
  $$(".nav a").forEach(a => a.toggleAttribute("aria-current", a.dataset.vue === (r.vue === "ch" ? "accueil" : r.vue)));
  $$(".nav a[aria-current]").forEach(a => a.setAttribute("aria-current", "page"));
  main.replaceChildren();
  document.title = E.site.titre || "Guide du Vibe Coding";
  const vues = { accueil: vueAccueil, ch: vueChapitre, annexe: vueAnnexe, "mon-guide": vueMonGuide, videos: vueVideos, lexique: vueLexique, tableau: vueTableau, imprimer: vueImprimer };
  try { await vues[r.vue](main, r); } catch (e) { console.error(e); main.append(el("div", { class: "vide", style: { marginTop: "60px" } }, el("p", { text: "Cette page n'a pas pu s'afficher. Rechargez, ou revenez au sommaire." }), el("a", { class: "bouton", href: "#accueil", text: "Sommaire" }))); }
  if (window.goatcounter?.count && r.vue !== "imprimer") goatcounter.count({ path: location.pathname + "#" + (r.vue === "ch" ? r.id : r.vue), title: document.title });
}

/* ───────── Accueil ───────── */
function vueAccueil(main) {
  const chs = chapitres();
  const suivant = chs.find(c => !lus.has(c.id)) || chs[0];
  const salut = profil.prenom ? `Bonjour ${profil.prenom} ! ` : "";
  const g = guide(suivant.id);
  const defile = el("div", { class: "defile", "aria-hidden": "true" });
  const tous = Object.keys(E.guides).filter(k => k.startsWith("ch"));
  defile.innerHTML = [...tous, ...tous].map(k => Pixel.perso(E.guides[k], { taille: 92, anime: true })).join("");
  const nbViz = Object.keys(window.VIZ || {}).length || 35;
  main.append(
    el("section", { class: "heros" },
      el("div", {},
        el("p", { class: "pixel sur", text: "Du site vitrine au SaaS · avec Claude et Lovable" }),
        el("h1", {}, "Guide du ", el("em", { text: "Vibe Coding" })),
        el("p", { class: "chapeau", html: `${esc(salut)}Construire son site, son application et son SaaS <b>en parlant à une IA</b>. ${chs.length} chapitres, ${E.index.fiches.length} fiches de lexique, des planches animées, des laboratoires interactifs et des prompts à essayer tout de suite.` }),
        el("div", { class: "actions" },
          el("a", { class: "bouton plein", href: `#${suivant.id}` }, el("span", { html: ico("livre", 16) }), lus.size ? `Reprendre au chapitre ${suivant.num}` : "Commencer la lecture"),
          el("a", { class: "bouton", href: "#mon-guide" }, el("span", { html: ico("miroir", 16) }), personnalise() ? "Mon guide personnalisé" : "Composer mon guide"))),
      el("div", { class: "scene", "aria-label": "Les 34 guides du livre" },
        el("div", { class: "sol" }), defile,
        el("div", { class: "vedette" }, el("span", { class: "bulle-pixel" }, el("span", { class: "qui", text: `${g.nom}, ${g.role} · chapitre ${suivant.num}` }), salut + g.devise)))),
    el("div", { class: "compteurs" },
      ...[[`${lus.size}/${chs.length}`, "chapitres lus"], [chs.reduce((s, c) => s + c.prompts, 0), "prompts à personnaliser"], [nbViz, "laboratoires interactifs"], [E.videos.filter(v => v.statut === "en_ligne").length, "vidéos sélectionnées"]]
        .map(([b, s]) => el("div", { class: "compteur" }, el("b", { text: String(b) }), el("span", { text: s })))));

  main.append(el("section", { class: "miroir-carte" },
    el("span", { html: Pixel.perso(E.guides.ch28, { taille: 96 }) }),
    el("div", {}, el("p", { class: "pixel", style: { color: "var(--jaune)" }, text: "Le miroir à mille facettes" }),
      el("h2", { text: personnalise() ? `Votre guide, ${profil.prenom || "lecteur"} : ${parcours().length} chapitres choisis pour vous` : "Un guide qui se reflète dans votre projet" }),
      el("p", { text: personnalise() ? "Le sommaire signale votre parcours, les prompts sont préremplis, et vous pouvez télécharger votre édition en PDF." : "Choisissez vos outils et votre objectif : le sommaire, les prompts et le PDF s'adaptent à vous." }),
      personnalise() ? el("div", { class: "facettes" }, ...profil.outils.slice(0, 8).map(id => outil(id) && tuile(outil(id)))) : null),
    el("a", { class: "bouton plein", href: "#mon-guide", text: personnalise() ? "Modifier" : "Composer mon guide" })));

  main.append(metro(chs));
  main.append(el("section", { class: "partie" }, el("div", { class: "partie-tete" }, el("span", { class: "pixel", text: "La stack" }), el("h2", { text: "Les outils du guide : cliquez pour un parcours spécialisé" })),
    el("div", { class: "outils-ch" }, ...[...E.outils].sort((a, b) => (b.coeur ? 1 : 0) - (a.coeur ? 1 : 0)).map(o => tuile(o)))));
  const pv = new Set(personnalise() ? parcours().map(x => x.c.id) : []);
  const parties = new Map();
  chs.forEach(c => { if (!parties.has(c.partie)) parties.set(c.partie, { titre: c.titrePartie, chs: [] }); parties.get(c.partie).chs.push(c); });
  for (const [num, p] of parties) {
    main.append(el("section", { class: "partie", id: `partie-${num}` },
      el("div", { class: "partie-tete" }, el("span", { class: "pixel", text: `Partie ${num}` }), el("h2", { text: p.titre })),
      el("div", { class: "grille" }, ...p.chs.map(c => el("a", { class: `carte-ch${lus.has(c.id) ? " lu" : ""}${c.id === suivant.id ? " courante" : ""}${pv.has(c.id) ? " pour-vous" : ""}${pv.size && !pv.has(c.id) ? " estompe" : ""}`, href: `#${c.id}` },
        el("span", { class: "av", html: perso(c.id, 46, false) }),
        el("span", {}, el("span", { class: "n", text: `Chapitre ${String(c.num).padStart(2, "0")}` }), el("span", { class: "t", text: c.titre }),
          el("span", { class: "s", text: `${c.minutes} min · ${guide(c.id).nom}${videosDe(c.id).length ? ` · ${videosDe(c.id).length} vidéo${videosDe(c.id).length > 1 ? "s" : ""}` : ""}` })),
        lus.has(c.id) ? el("span", { class: "badge-lu", html: ico("check", 14) + "lu" }) : null)))));
  }
  main.append(el("section", { class: "partie" }, el("div", { class: "partie-tete" }, el("span", { class: "pixel", text: "À tout moment" }), el("h2", { text: "Annexes" })),
    el("div", { class: "annexes" }, ...E.index.annexes.map(a => el("a", { href: `#annexe-${a.id}` }, a.id.length === 1 ? el("b", { text: a.id }) : null, a.titre)))));
}

/** Plan de métro : une ligne par partie, une station par chapitre (pleine si lue). */
function metro(chs) {
  const couleurs = ["#8B5CF6", "#FBBF24", "#10B981", "#60A5FA", "#FF4F7B", "#F97316", "#A3AABB"];
  const W = 1120, pas = (W - 80) / (chs.length - 1), y = 92;
  let svg = `<svg viewBox="0 0 ${W} 150" role="img" aria-label="Plan de lecture : ${lus.size} chapitres lus sur ${chs.length}">`;
  const parties = [...new Set(chs.map(c => c.partie))];
  parties.forEach((p, i) => {
    const cs = chs.filter(c => c.partie === p), x1 = 40 + (cs[0].num - 1) * pas, x2 = 40 + (cs.at(-1).num - 1) * pas;
    svg += `<line x1="${x1 - (i ? pas / 2 : 0)}" y1="${y}" x2="${x2 + (i < parties.length - 1 ? pas / 2 : 0)}" y2="${y}" stroke="${couleurs[i]}" stroke-width="8" stroke-linecap="round"/>`;
    svg += `<text x="${(x1 + x2) / 2}" y="${y + (i % 2 ? 46 : 32)}" text-anchor="middle" style="font:400 10px var(--f-pixel);fill:${couleurs[i]};letter-spacing:.06em">${esc(cs[0].titrePartie.replace(/^Axe \d : /, "").toUpperCase().slice(0, 22))}</text>`;
  });
  chs.forEach(c => {
    const x = 40 + (c.num - 1) * pas, lu = lus.has(c.id), col = couleurs[parties.indexOf(c.partie)];
    svg += `<a class="station" href="#${c.id}" tabindex="0"><title>${c.num}. ${esc(c.titre)}${lu ? " (lu)" : ""}</title>
      <circle cx="${x}" cy="${y}" r="${lu ? 9 : 8}" fill="${lu ? col : "#0F1117"}" stroke="${lu ? "#fff" : col}" stroke-width="3"/>
      <text x="${x}" y="${y - 18}" text-anchor="start" transform="rotate(-50 ${x} ${y - 18})">${c.num}. ${esc(c.titre.length > 22 ? c.titre.slice(0, 21) + "…" : c.titre)}</text></a>`;
  });
  svg += "</svg>";
  return el("section", { class: "metro" }, el("p", { class: "pixel", style: { color: "var(--neon)", margin: "0 0 2px" }, text: "Plan de lecture" }),
    el("h2", { text: `${lus.size ? `${Math.round(lus.size / chs.length * 100)} % du voyage accompli` : "34 stations, 7 lignes"}` }), el("div", { html: svg }));
}

/* ───────── La planche : notice de montage animée ───────── */
function planche(c, { imprime = false } = {}) {
  const g = guide(c.id);
  const outilsCh = Object.entries(c.outils).sort((a, b) => b[1] - a[1]).map(([id]) => outil(id)).filter(Boolean).slice(0, 7);
  const etapes = c.titres.slice(0, 4);
  const p = el("section", { class: `planche${imprime || reduit ? "" : " anime"}`, "aria-label": `Planche du chapitre ${c.num}` },
    el("div", { class: "planche-entete" },
      el("div", { class: "titre" }, `Planche ${String(c.num).padStart(2, "0")} · présentée par ${g.nom}`, el("b", { text: c.titre })),
      el("div", { class: "pastilles" }, el("span", { text: `≈ ${c.minutes} min` }), c.prompts ? el("span", { text: `${c.prompts} prompt${c.prompts > 1 ? "s" : ""}` }) : null,
        el("span", { text: `Partie ${c.partie}` }))),
    el("div", { class: "planche-corps" },
      el("div", { class: "perso-zone" }, el("span", { html: Pixel.perso(g, { taille: 168, anime: !imprime }) }),
        el("span", { class: "bulle-pixel" }, el("span", { class: "qui", text: `${g.nom}, ${g.role}` }), g.devise)),
      el("div", {},
        el("p", { class: "bloc-titre", text: "Dans la boîte" }),
        el("div", { class: "pieces" }, ...c.boite.map((b, i) => el("div", { class: "piece", style: { "--i": i } },
          el("span", { class: "ic", html: Pixel.icone(Pixel.piece(b), { taille: 28 }) }), el("span", {}, el("span", { class: "q", text: "1×" }), el("br"), el("span", { class: "l", text: b }))))),
        etapes.length ? el("p", { class: "bloc-titre", text: "Montage" }) : null,
        el("div", { class: "etapes" }, ...etapes.map((t, i) => el("button", { type: "button", class: "etape", style: { "--i": i }, title: "Aller à cette section",
          onclick: () => { const h = $$(".lecture h3").find(h => h.textContent.trim() === t); h?.scrollIntoView({ behavior: reduit ? "auto" : "smooth" }); } }, t))))),
    outilsCh.length ? el("div", { class: "planche-pied" }, el("span", { class: "bloc-titre", style: { margin: 0 }, text: "Outils requis" }), ...outilsCh.map(o => tuile(o, !imprime))) : null);
  if (!imprime && !reduit) surVisible(p, () => {
    p.classList.add("vu");
    const es = $$(".etape", p); let k = 0;
    const t = setInterval(() => { es.forEach((e, i) => e.classList.toggle("allume", i === k % es.length)); k++; if (k > es.length * 2) { clearInterval(t); es.forEach(e => e.classList.remove("allume")); } }, 900);
  });
  return p;
}

/* ───────── Laboratoires (visualisations) ───────── */
function ctxViz(print) {
  return { print, prenom: profil.prenom, outils: profil.outils, index: E.index, copier, prompt: t => blocPrompt(t, { avecChamps: false }) };
}
async function insererViz(article, c, print = false) {
  try { await chargerViz(c.num); } catch { return; }
  const liste = Object.entries(window.VIZ || {}).filter(([, v]) => v.chapitre === c.id);
  for (const [cle, v] of liste) {
    const corps = el("div", { class: "viz-corps" });
    const cadre = el("section", { class: "viz-cadre", "data-viz": cle },
      el("header", {}, el("span", { html: ico("eclair", 30), "aria-hidden": "true" }),
        el("div", {}, el("span", { class: "pixel", text: "Laboratoire interactif" }), el("h4", { text: v.titre }), v.consigne && !print ? el("p", { text: v.consigne }) : null)), corps);
    const h = v.ancre && $$("h3", article).find(h => norm(h.textContent).includes(norm(v.ancre)));
    h ? h.before(cadre) : article.append(cadre);
    try { v.render(corps, ctxViz(print)); } catch (e) { console.error(cle, e); cadre.remove(); }
  }
}

/* ───────── Chapitre ───────── */
async function vueChapitre(main, r) {
  const c = chap(r.id);
  if (!c) return main.append(el("div", { class: "vide", style: { marginTop: "60px" } }, el("p", { text: "Chapitre introuvable." }), el("a", { class: "bouton", href: "#accueil", text: "Sommaire" })));
  document.title = `${c.num}. ${c.titre} · Guide du Vibe Coding`;
  const outilsCh = Object.entries(c.outils).sort((a, b) => b[1] - a[1]).map(([id]) => outil(id)).filter(Boolean);
  main.append(el("header", { class: "chap-tete" },
    el("div", { class: "num-grand", text: String(c.num).padStart(2, "0"), "aria-hidden": "true" }),
    el("div", {}, el("p", { class: "pixel meta", text: `Partie ${c.partie} · ${c.titrePartie} · ${c.minutes} min` }),
      el("h1", { text: c.titre }), el("p", { class: "accroche", text: c.accroche }),
      el("div", { class: "outils-ch" }, ...outilsCh.slice(0, 9).map(o => tuile(o))))));
  const vids = videosDe(c.id);
  main.append(el("nav", { class: "onglets", "aria-label": "Volets du chapitre" },
    el("a", { href: `#${c.id}`, "aria-current": r.onglet === "lire" ? "page" : null }, el("span", { html: ico("livre", 16) }), "Lire"),
    el("a", { href: `#${c.id}-videos`, "aria-current": r.onglet === "videos" ? "page" : null }, el("span", { html: ico("videos", 16) }), `Vidéos${vids.length ? ` (${vids.length})` : ""}`)));

  if (r.onglet === "videos") {
    main.append(c.video ? el("div", { style: { maxWidth: "760px", margin: "0 auto 28px" } }, carteVideo({ id: youtubeId(c.video), titre: `Le tutoriel du chapitre ${c.num}`, chaine: "Chaîne du Guide" })) : null);
    main.append(vids.length ? el("div", { class: "videos" }, ...vids.map(carteVideo))
      : el("div", { class: "vide" }, el("span", { html: perso(c.id, 72, false) }), el("p", { text: "La veille quotidienne proposera bientôt des vidéos sur ce chapitre, issues des chaînes suivies uniquement." })));
    return finChapitre(main, c);
  }
  const grille = el("div", { class: "chap-grille" });
  const article = el("article", { class: "lecture" });
  const toc = el("nav", { class: "toc", "aria-label": "Dans ce chapitre" }, el("p", { class: "pixel", text: "Dans ce chapitre" }));
  grille.append(el("div", {}, planche(c), article), toc);
  main.append(grille);
  article.append(md(await contenu("chapitres", c.id)));
  await insererViz(article, c);
  $$("h3", article).forEach((h, i) => { h.id = `${c.id}-s${i + 1}`; toc.append(el("a", { href: `#${c.id}--s${i + 1}`, text: h.textContent, onclick: e => { e.preventDefault(); h.scrollIntoView({ behavior: reduit ? "auto" : "smooth" }); } })); });
  if (r.ancre) setTimeout(() => $(`#${c.id}-${r.ancre}`)?.scrollIntoView(), 50);
  // Sommaire latéral qui suit la lecture
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { $$("a", toc).forEach(a => a.classList.toggle("actif", a.textContent === e.target.textContent)); } }), { rootMargin: "-20% 0px -70% 0px" });
  $$("h3", article).forEach(h => io.observe(h)); observateurs.push(io);
  // Barre de progression
  onscroll = () => { const b = article.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (innerHeight - b.top) / (b.height + innerHeight * .2))); $("#progression").style.width = `${p * 100}%`; };
  finChapitre(main, c);
}

/** Pied de chapitre : la lecture est cochée automatiquement quand on atteint la fin. */
function finChapitre(main, c) {
  const i = chapitres().indexOf(c), prec = chapitres()[i - 1], suiv = chapitres()[i + 1];
  const bravo = el("section", { class: `bravo${lus.has(c.id) ? " fait" : ""}`, "aria-live": "polite" });
  const majBravo = () => {
    const fait = lus.has(c.id);
    bravo.className = `bravo${fait ? " fait" : ""}`;
    bravo.replaceChildren(el("span", { html: perso(c.id, 90, true) }), el("div", {},
      el("h3", { text: fait ? `Chapitre ${c.num} terminé, bravo${profil.prenom ? " " + profil.prenom : ""} !` : "Arrivé ici, le chapitre se coche tout seul." }),
      el("p", { text: fait ? `${lus.size} chapitre${lus.size > 1 ? "s" : ""} lu${lus.size > 1 ? "s" : ""} sur ${chapitres().length}. ${suiv ? `Prochaine étape avec ${guide(suiv.id).nom} : « ${suiv.titre} ».` : "Vous avez fini le guide !"}` : "Votre progression apparaît dans le sommaire et sur le plan de lecture." })));
  };
  majBravo();
  const sentinelle = el("div", { class: "sentinelle-fin", "aria-hidden": "true" });
  main.append(el("footer", { class: "fin-chap" }, sentinelle, bravo,
    el("div", { class: "nav-chap" },
      prec ? el("a", { href: `#${prec.id}` }, el("span", { class: "pixel discret", text: "← Précédent" }), el("br"), `${prec.num}. ${prec.titre}`) : null,
      suiv ? el("a", { class: "suiv", href: `#${suiv.id}` }, el("span", { class: "pixel discret", text: "Suivant →" }), el("br"), `${suiv.num}. ${suiv.titre}`) : null)));
  if (!lus.has(c.id)) {
    const debut = Date.now();
    const io = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting) || Date.now() - debut < 4000) return;
      io.disconnect(); lus.add(c.id); stock.set("lus", [...lus]); majBravo();
      toast(`Chapitre ${c.num} coché dans le sommaire ✓`, c.id);
    });
    io.observe(sentinelle); observateurs.push(io);
  }
}

/* ───────── Vidéos ───────── */
function youtubeId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/) || String(url).match(/^([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : null;
}
function carteVideo(v) {
  const id = v.id || youtubeId(v.url);
  const vues = vuesDe(id), h = E.stats.videos?.[id]?.historique || [];
  const delta = h.length > 1 ? vues - h[Math.max(0, h.length - 8)].vues : null;
  const ecran = el("button", { type: "button", class: "ecran", "aria-label": `Lire « ${v.titre} »` },
    el("img", { src: `https://i.ytimg.com/vi_webp/${id}/mqdefault.webp`, alt: "", loading: "lazy", decoding: "async", width: 320, height: 180,
      onerror: e => { if (!e.target.dataset.repli) { e.target.dataset.repli = 1; e.target.src = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`; } } }),
    el("span", { class: "jouer" }, el("span", { html: ico("videos", 30) })));
  ecran.addEventListener("click", () => ecran.replaceWith(el("iframe", { src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`, title: v.titre,
    allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture", allowfullscreen: true, loading: "lazy" })));
  const c = v.chapitre && chap(v.chapitre);
  return el("article", { class: "video" }, ecran, el("div", { class: "corps" },
    el("h3", { text: v.titre }),
    el("div", { class: "meta" }, el("span", { text: v.chaine }), v.langue ? el("span", { text: v.langue.toUpperCase() }) : null,
      vues != null ? el("span", { class: "vues", text: `${fmtNb(vues)} vues${delta ? ` (+${fmtNb(delta)} / 7 j)` : ""}` }) : null,
      c && location.hash.startsWith("#videos") ? el("a", { href: `#${c.id}`, text: `Ch. ${c.num}` }) : null),
    v.justification ? el("p", { text: v.justification }) : null));
}
function vueVideos(main) {
  const enLigne = E.videos.filter(v => v.statut === "en_ligne");
  main.append(entete("Vidéos sélectionnées", `${enLigne.length} vidéos issues des seules chaînes suivies, rattachées aux chapitres. Une veille tourne chaque matin ; rien n'est publié sans validation de l'auteur.`, "ch32"));
  const chaines = [...new Set(enLigne.map(v => v.chaine))].sort();
  let filtre = "";
  const grille = el("div", { class: "videos" });
  const peindre = () => grille.replaceChildren(...enLigne.filter(v => !filtre || v.chaine === filtre).sort((a, b) => a.chapitre.localeCompare(b.chapitre)).map(carteVideo));
  const barre = el("div", { class: "filtres", role: "group", "aria-label": "Filtrer par chaîne" },
    ...["", ...chaines].map(ch => el("button", { type: "button", "aria-pressed": String(ch === filtre), text: ch || "Toutes",
      onclick: e => { filtre = ch; $$("button", barre).forEach(b => b.setAttribute("aria-pressed", String(b === e.currentTarget))); peindre(); } })));
  main.append(barre, grille); peindre();
}

function entete(titre, texte, idGuide) {
  return el("header", { class: "page-tete" }, el("div", {}, el("p", { class: "pixel", style: { color: "var(--neon)" }, text: "Guide du Vibe Coding" }), el("h1", { text: titre }), el("p", { text: texte })),
    idGuide ? el("span", { html: Pixel.perso(guide(idGuide), { taille: 110 }).replace("<svg", '<svg class="perso"') }) : null);
}

/* ───────── Mon guide : la Stack et le miroir ───────── */
function vueMonGuide(main, r) {
  const focus = r.params.get("outil");
  if (focus && !profil.outils.includes(focus)) { profil.outils.push(focus); sauverProfil(); }
  main.append(entete("Mon guide, ma stack", "Cliquez sur les outils que vous utilisez ou voulez apprendre. Le guide se reflète dans vos choix : parcours de lecture, sommaire signalé, prompts préremplis, et une édition PDF à votre nom.", "ch27"));
  const choix = (lib, cle, options) => el("div", { class: "choix-boutons", role: "group", "aria-label": lib }, ...options.map(([v, t]) =>
    el("button", { type: "button", "aria-pressed": String(profil[cle] === v), text: t, onclick: e => { profil[cle] = profil[cle] === v ? "" : v; sauverProfil(); $$("button", e.currentTarget.parentElement).forEach(b => b.setAttribute("aria-pressed", String(b === e.currentTarget && profil[cle] === v))); majParcours(); } })));
  const prenom = el("input", { type: "text", value: profil.prenom, placeholder: "Votre prénom", autocomplete: "given-name", maxlength: 40 });
  prenom.addEventListener("input", () => { profil.prenom = prenom.value.trim(); sauverProfil(); majParcours(); });
  main.append(el("div", { class: "etapes-perso" },
    el("div", {}, el("b", { text: "1 · Qui lit ?" }), el("label", {}, "Prénom (reste dans votre navigateur)", prenom)),
    el("div", {}, el("b", { text: "2 · Votre objectif" }), choix("Objectif", "objectif", [["vitrine", "Site vitrine"], ["metier", "Application métier"], ["saas", "SaaS"], ["tout", "Les trois"]])),
    el("div", {}, el("b", { text: "3 · Votre niveau" }), choix("Niveau", "niveau", [["debutant", "Je débute"], ["bricole", "J'ai déjà bricolé"], ["avance", "Je code déjà"]]))));
  for (const cat of E.cats) {
    const os = E.outils.filter(o => o.cat === cat.id);
    main.append(el("section", { class: "stack-cat" }, el("h3", {}, el("span", { html: ico(cat.icone, 20) }), cat.nom),
      el("div", { class: "stack-grille" }, ...os.map(o => {
        const nb = chapitres().filter(c => c.outils[o.id]).length;
        return el("button", { type: "button", class: "outil", style: { "--c": o.couleur }, "aria-pressed": String(profil.outils.includes(o.id)), "data-outil": o.id,
          onclick: e => { const i = profil.outils.indexOf(o.id); i >= 0 ? profil.outils.splice(i, 1) : profil.outils.push(o.id); sauverProfil(); e.currentTarget.setAttribute("aria-pressed", String(i < 0)); majParcours(); } },
          el("span", { class: "logo-outil", text: o.mono, "aria-hidden": "true" }), el("span", {}, el("b", { text: o.nom }), el("small", { text: o.desc })),
          el("span", { class: "nb", text: nb ? `${nb} ch.` : "annexe" }));
      }))));
  }
  const panneau = el("section", { class: "parcours", "aria-live": "polite" });
  main.append(panneau);
  function majParcours() {
    const p = parcours(), mins = p.reduce((s, x) => s + x.c.minutes, 0);
    panneau.replaceChildren(
      el("div", { class: "parcours-tete" },
        el("div", {}, el("p", { class: "pixel", style: { color: "var(--jaune)", margin: 0 }, text: "Votre parcours" }),
          el("h2", { text: personnalise() ? `${profil.prenom ? profil.prenom + ", v" : "V"}otre guide : ${p.length} chapitres · ${Math.round(mins / 60 * 10) / 10} h de lecture` : "Choisissez un objectif ou des outils pour composer votre parcours" })),
        el("div", { class: "essayer", style: { margin: 0 } },
          p.length ? el("a", { class: "bouton", href: `#${p[0].c.id}` }, "Lire dans l'ordre") : null,
          el("a", { class: "bouton plein", href: `#imprimer?ch=${(p.length ? p : chapitres().map(c => ({ c }))).map(x => x.c.id).join(",")}&prenom=${encodeURIComponent(profil.prenom)}` },
            el("span", { html: ico("pdf", 16) }), "Télécharger mon guide (PDF)"),
          el("button", { type: "button", text: "Réinitialiser", onclick: () => { Object.assign(profil, { prenom: "", outils: [], objectif: "", niveau: "" }); sauverProfil(); rendre(); } }))),
      personnalise() ? el("ol", {}, ...p.map(({ c, s }) => el("li", {}, el("a", { href: `#${c.id}` }, el("span", { class: "n", text: String(c.num).padStart(2, "0") }), el("span", { text: c.titre }),
        el("span", { class: "jauge", title: `Pertinence ${s} %` }, el("i", { style: { width: `${s}%` } })))))) : null);
  }
  majParcours();
  if (focus) setTimeout(() => $(`[data-outil="${focus}"]`)?.scrollIntoView({ block: "center" }), 60);
}

/* ───────── Lexique ───────── */
async function vueLexique(main) {
  main.append(entete("Le lexique interactif", `${E.index.fiches.length} fiches tirées de tout le guide : cherchez, filtrez par famille, puis testez-vous en mode cartes.`, "ch08"));
  await chargerViz(8);
  const v = window.VIZ?.["ch08-lexique"];
  const corps = el("div", { class: "viz-corps" });
  main.append(el("section", { class: "viz-cadre", style: { margin: "0 0 30px" } }, corps));
  if (v) v.render(corps, ctxViz(false));
}

/* ───────── Annexes ───────── */
async function vueAnnexe(main, r) {
  const a = E.index.annexes.find(x => x.id === r.id);
  if (!a) return main.append(el("div", { class: "vide" }, el("p", { text: "Annexe introuvable." })));
  main.append(el("header", { class: "chap-tete" }, el("div", { class: "num-grand", text: a.id.length === 1 ? a.id : "?", "aria-hidden": "true" }),
    el("div", {}, el("p", { class: "pixel meta", text: a.id.length === 1 ? `Annexe ${a.id}` : "Avant de commencer" }), el("h1", { text: a.titre }))),
    el("nav", { class: "onglets", "aria-label": "Annexes" }, ...E.index.annexes.map(x => el("a", { href: `#annexe-${x.id}`, text: x.id.length === 1 ? x.id : "Mode d'emploi", "aria-current": x.id === a.id ? "page" : null }))));
  const art = el("article", { class: "lecture" }); art.append(md(await contenu("annexes", a.id))); main.append(art);
}

/* ───────── Tableau de bord (auteur) ───────── */
function vueTableau(main) {
  main.append(entete("Tableau de bord", "Vues des vidéos sélectionnées, propositions de la veille et visites du site. Les données sont mises à jour chaque matin par l'agent de veille (GitHub Actions).", "ch24"));
  const vs = E.stats.videos || {};
  const ids = Object.keys(vs);
  const der = id => vs[id].historique.at(-1)?.vues ?? 0;
  const ecart = (id, j) => { const h = vs[id].historique; if (h.length < 2) return null; const ref = h[Math.max(0, h.length - 1 - j)]; return der(id) - ref.vues; };
  const total = ids.reduce((s, id) => s + der(id), 0);
  const d7 = ids.reduce((s, id) => s + (ecart(id, 7) || 0), 0);
  const visites = E.visites.jours || [];
  const v7 = visites.slice(-7).reduce((s, j) => s + j.visites, 0);
  main.append(el("div", { class: "kpis" },
    ...[["Vidéos suivies", ids.length || E.videos.length, `${E.videos.filter(v => v.statut === "en_ligne").length} en ligne`],
      ["Vues cumulées", fmtNb(total), ids.length ? `mise à jour ${E.stats.maj || "—"}` : "en attente de l'agent"],
      ["Vues sur 7 jours", d7 ? "+" + fmtNb(d7) : "—", ""],
      ["Visites sur 7 jours", visites.length ? fmtNb(v7) : "—", visites.length ? "" : "mesure à activer"]].map(([t, b, s]) => el("div", { class: "kpi" }, el("span", { text: t }), el("b", { text: String(b) }), s ? el("small", { text: s }) : null))));
  // Courbes des vues
  const top = ids.sort((a, b) => der(b) - der(a)).slice(0, 8);
  const pal = ["#8B5CF6", "#10B981", "#FBBF24", "#60A5FA", "#FF4F7B", "#F97316", "#22D3EE", "#A3AABB"];
  main.append(el("section", { class: "panneau graphe" }, el("h2", { text: "Évolution des vues (8 vidéos les plus vues)" }),
    top.length ? el("div", { html: courbes(top.map((id, i) => ({ nom: vs[id].titre, couleur: pal[i], points: vs[id].historique }))) }) : el("p", { class: "discret", text: "Aucune mesure encore : l'agent de veille relève les vues chaque matin et l'historique se construit jour après jour." }),
    top.length ? el("div", { class: "legende" }, ...top.map((id, i) => el("span", {}, el("i", { style: { background: pal[i] } }), vs[id].titre.slice(0, 48)))) : null));
  // Tableau détaillé
  const lignes = E.videos.map(v => ({ v, vues: vs[v.id] ? der(v.id) : null, d1: vs[v.id] ? ecart(v.id, 1) : null, d7: vs[v.id] ? ecart(v.id, 7) : null }));
  let tri = "vues";
  const tbody = el("tbody");
  const peindre = () => tbody.replaceChildren(...lignes.sort((a, b) => (b[tri] ?? -1) - (a[tri] ?? -1)).map(({ v, vues, d1, d7 }) => el("tr", {},
    el("td", {}, el("a", { href: `https://www.youtube.com/watch?v=${v.id}`, target: "_blank", rel: "noopener", text: v.titre })),
    el("td", { text: v.chaine }), el("td", {}, el("a", { href: `#${v.chapitre}-videos`, text: chap(v.chapitre)?.num ?? v.chapitre })),
    el("td", { class: "num", text: fmtNb(vues) }), el("td", { class: `num ${d1 > 0 ? "hausse" : ""}`, text: d1 == null ? "—" : `+${fmtNb(d1)}` }),
    el("td", { class: `num ${d7 > 0 ? "hausse" : ""}`, text: d7 == null ? "—" : `+${fmtNb(d7)}` }),
    el("td", { html: vs[v.id] ? spark(vs[v.id].historique) : "" }))));
  const th = (t, k) => el("th", { text: t + (k ? " ↕" : ""), onclick: k ? () => { tri = k; peindre(); } : null });
  main.append(el("section", { class: "panneau" }, el("h2", { text: "Vidéos en ligne" }), el("p", { text: "Cliquez sur un en-tête chiffré pour trier." }),
    el("div", { class: "tableau", style: { margin: 0 } }, el("table", { class: "table-bord" }, el("thead", {}, el("tr", {}, th("Vidéo"), th("Chaîne"), th("Ch."), th("Vues", "vues"), th("24 h", "d1"), th("7 j", "d7"), th("Tendance"))), tbody))));
  peindre();
  // Propositions en attente
  const attente = (E.propositions || []).filter(p => p.statut === "a_valider");
  const depot = E.site.depot;
  main.append(el("section", { class: "panneau" }, el("h2", { text: `Propositions de la veille (${attente.length})` }),
    el("p", { text: "Le bouton « Publier » ouvre une demande pré-remplie sur GitHub : validez-la et l'agent publicateur ajoute la vidéo au site en quelques minutes." }),
    attente.length ? el("div", { class: "videos" }, ...attente.map(p => el("div", {}, carteVideo(p),
      el("a", { class: "bouton plein", style: { marginTop: "8px" }, target: "_blank", rel: "noopener",
        href: `https://github.com/${depot}/issues/new?title=${encodeURIComponent(`publier:${p.id}:${p.chapitre}`)}&body=${encodeURIComponent(`Publication de « ${p.titre} » (${p.chaine}) dans le chapitre ${p.chapitre}.`)}` }, "Publier sur le site")))) : el("p", { class: "discret", text: "Rien à valider pour l'instant." })));
  // Visites
  main.append(el("section", { class: "panneau graphe" }, el("h2", { text: "Visites du site" }),
    visites.length ? el("div", { html: barres(visites.slice(-30)) }) : el("p", { class: "discret", html: "La mesure d'audience s'active quand le site est en ligne : créez un compte GoatCounter (gratuit, sans cookie), renseignez son code dans <code>data/site.json</code> et le secret <code>GOATCOUNTER_TOKEN</code> dans GitHub. L'agent ajoutera alors les visites au brief quotidien." })));
}
function courbes(series) {
  const W = 720, H = 260, P = 36, toutes = series.flatMap(s => s.points);
  const dates = [...new Set(toutes.map(p => p.date))].sort(), max = Math.max(1, ...toutes.map(p => p.vues));
  const x = d => P + (dates.length < 2 ? (W - 2 * P) / 2 : dates.indexOf(d) / (dates.length - 1) * (W - 2 * P)), y = v => H - P - v / max * (H - 2 * P);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbes des vues">`;
  for (let k = 0; k <= 4; k++) { const yy = P + k * (H - 2 * P) / 4; s += `<line class="axe" x1="${P}" x2="${W - P}" y1="${yy}" y2="${yy}"/><text x="${P - 6}" y="${yy + 4}" text-anchor="end">${fmtNb(Math.round(max * (1 - k / 4)))}</text>`; }
  [dates[0], dates.at(-1)].forEach((d, i) => d && (s += `<text x="${x(d)}" y="${H - 10}" text-anchor="${i ? "end" : "start"}">${d}</text>`));
  series.forEach(se => { s += `<polyline fill="none" stroke="${se.couleur}" stroke-width="2.5" stroke-linejoin="round" points="${se.points.map(p => `${x(p.date)},${y(p.vues)}`).join(" ")}"/>`; const d = se.points.at(-1); if (d) s += `<circle cx="${x(d.date)}" cy="${y(d.vues)}" r="3.5" fill="${se.couleur}"><title>${esc(se.nom)} : ${fmtNb(d.vues)}</title></circle>`; });
  return s + "</svg>";
}
function spark(h) {
  if (h.length < 2) return '<span class="discret">·</span>';
  const W = 90, H = 24, min = Math.min(...h.map(p => p.vues)), max = Math.max(...h.map(p => p.vues)) || 1;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><polyline fill="none" stroke="#10B981" stroke-width="2" points="${h.map((p, i) => `${i / (h.length - 1) * W},${H - 2 - (p.vues - min) / (max - min || 1) * (H - 4)}`).join(" ")}"/></svg>`;
}
function barres(j) {
  const W = 720, H = 200, P = 30, max = Math.max(1, ...j.map(x => x.visites)), bw = (W - 2 * P) / j.length;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Visites par jour">` + j.map((x, i) => {
    const h = x.visites / max * (H - 2 * P); return `<rect x="${P + i * bw + 2}" y="${H - P - h}" width="${bw - 4}" height="${h}" rx="3" fill="#8B5CF6"><title>${x.date} : ${x.visites} visites</title></rect>`;
  }).join("") + `<text x="${P}" y="${H - 8}">${j[0].date}</text><text x="${W - P}" y="${H - 8}" text-anchor="end">${j.at(-1).date}</text></svg>`;
}

/* ───────── Impression et PDF (guide complet ou édition personnalisée) ───────── */
async function vueImprimer(main, r) {
  document.body.dataset.pret = "0";
  const ids = (r.params.get("ch") || "").split(",").filter(id => chap(id));
  const liste = ids.length ? ids.map(chap) : chapitres();
  const complet = !ids.length;
  const prenom = r.params.get("prenom") || "";
  document.title = complet ? "Guide du Vibe Coding" : `Guide du Vibe Coding — édition de ${prenom || "lecteur"}`;
  const outilsChoisis = profil.outils.map(outil).filter(Boolean);
  main.append(el("div", { class: "sans-impression bravo fait", style: { margin: "24px 0" } }, el("span", { html: perso("ch12", 90) }),
    el("div", {}, el("h3", { text: "Votre PDF se prépare" }), el("p", { text: "La fenêtre d'impression va s'ouvrir : choisissez « Enregistrer au format PDF ». Planches et laboratoires sont figés pour le papier." }),
      el("button", { type: "button", class: "plein", style: { marginTop: "10px" }, text: "Ouvrir l'impression", onclick: () => print() }))));
  const imp = el("div", { class: "impression-flux" });
  main.append(imp);
  const tous = Object.keys(E.guides).filter(k => k.startsWith("ch"));
  imp.append(el("section", { class: "couverture" },
    el("div", {}, el("p", { class: "pixel", style: { color: "#6D28D9" }, text: E.site.version || "" }),
      el("h1", {}, "Guide du ", el("em", { text: "Vibe Coding" })),
      el("p", { style: { fontSize: "16pt", maxWidth: "30em" }, text: E.site.sousTitre }),
      !complet ? el("p", { style: { fontSize: "13pt", marginTop: "14pt" }, html: `<b>Édition personnalisée${prenom ? ` de ${esc(prenom)}` : ""}</b> · ${liste.length} chapitres${outilsChoisis.length ? ` · spécialisée ${outilsChoisis.map(o => esc(o.nom)).join(", ")}` : ""}` }) : null),
    el("div", { class: "defile-imp", html: tous.map(k => Pixel.perso(E.guides[k], { taille: 46, anime: false })).join("") }),
    el("p", { text: `${E.site.auteur} · Claude et Lovable · ${new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long" })}` })));
  imp.append(el("section", { class: "sommaire-imp" }, el("h2", { text: "Sommaire" }), el("ol", {}, ...liste.map(c => el("li", { value: c.num, text: `${c.titre} — ${guide(c.id).nom}` }))),
    complet ? el("p", { text: `Annexes : ${E.index.annexes.map(a => a.titre).join(" · ")}` }) : null));
  for (const c of liste) {
    const art = el("article", { class: "lecture" });
    imp.append(el("section", { class: "chapitre-imprime" },
      el("header", { class: "chap-tete" }, el("div", { class: "num-grand", text: String(c.num).padStart(2, "0") }),
        el("div", {}, el("p", { class: "pixel meta", text: `Partie ${c.partie} · ${c.titrePartie}` }), el("h1", { text: c.titre }), el("p", { class: "accroche", text: c.accroche }))),
      planche(c, { imprime: true }), art));
    art.append(md(await contenu("chapitres", c.id)));
    await insererViz(art, c, true);
  }
  if (complet) for (const a of E.index.annexes) {
    const art = el("article", { class: "lecture" }); art.append(md(await contenu("annexes", a.id)));
    imp.append(el("section", { class: "chapitre-imprime" }, el("header", { class: "chap-tete" }, el("div", { class: "num-grand", text: a.id.length === 1 ? a.id : "?" }), el("div", {}, el("h1", { text: a.titre }))), art));
  }
  await document.fonts?.ready;
  document.body.dataset.pret = "1";
  if (r.params.get("auto") !== "0") setTimeout(() => print(), 600);
}

/* ───────── Recherche (Ctrl+K) ───────── */
function ouvrirRecherche() {
  if ($(".recherche-fond")) return;
  const entrees = [
    ...chapitres().map(c => ({ t: `${c.num}. ${c.titre}`, s: c.accroche, h: `#${c.id}`, k: "Chapitre", txt: norm([c.titre, c.accroche, ...c.titres, ...c.boite].join(" ")) })),
    ...chapitres().flatMap(c => c.titres.map((t, i) => ({ t, s: `Chapitre ${c.num} · ${c.titre}`, h: `#${c.id}--s${i + 1}`, k: "Section", txt: norm(t) }))),
    ...E.index.fiches.map(f => ({ t: f.titre, s: f.definition, h: f.chapitre.startsWith("annexe") ? `#${f.chapitre}` : `#${f.chapitre}`, k: `Lexique · ${f.famille}`, txt: norm(f.titre + " " + f.definition) })),
    ...E.outils.map(o => ({ t: o.nom, s: o.desc, h: `#mon-guide?outil=${o.id}`, k: "Outil", txt: norm(o.nom + " " + o.desc) })),
    ...E.index.annexes.map(a => ({ t: a.titre, s: "Annexe", h: `#annexe-${a.id}`, k: "Annexe", txt: norm(a.titre) })),
  ];
  const input = el("input", { type: "search", placeholder: "Chercher un chapitre, une notion, un outil…", "aria-label": "Rechercher" });
  const ul = el("ul", { role: "listbox" });
  let sel = 0;
  const fermer = () => fond.remove();
  const peindre = () => {
    const q = norm(input.value).split(/\s+/).filter(Boolean);
    const res = q.length ? entrees.filter(e => q.every(m => e.txt.includes(m))).slice(0, 14) : entrees.slice(0, 8);
    sel = Math.min(sel, res.length - 1);
    ul.replaceChildren(...res.map((e, i) => el("li", {}, el("a", { href: e.h, class: i === sel ? "sel" : "", onclick: fermer }, el("span", { class: "pixel", text: e.k }), el("b", { text: e.t }), e.s ? el("small", { text: e.s.slice(0, 110) }) : null))));
  };
  input.addEventListener("input", () => { sel = 0; peindre(); });
  input.addEventListener("keydown", e => {
    const n = $$("a", ul).length;
    if (e.key === "ArrowDown") { sel = (sel + 1) % n; peindre(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { sel = (sel - 1 + n) % n; peindre(); e.preventDefault(); }
    else if (e.key === "Enter") { $$("a", ul)[sel]?.click(); location.hash = $$("a", ul)[sel]?.getAttribute("href") || location.hash; }
  });
  const fond = el("div", { class: "recherche-fond", onclick: e => { if (e.target === fond) fermer(); } }, el("div", { class: "recherche-boite", role: "dialog", "aria-label": "Recherche" }, input, ul));
  document.body.append(fond); peindre(); input.focus();
}

/* ───────── Démarrage ───────── */
async function demarrer() {
  const [index, guides, outils, videos, stats, visites, site, propositions] = await Promise.all([
    json("content/index.json"), json("data/guides.json", {}), json("data/outils.json", { outils: [], categories: [] }), json("data/videos.json", []),
    json("data/stats.json", { videos: {} }), json("data/visites.json", { jours: [] }), json("data/site.json", {}), json("data/propositions.json", { propositions: [] })]);
  if (!index) { $("#app").replaceChildren(el("p", { class: "chargement", text: "Le contenu du guide est introuvable (content/index.json)." })); return; }
  Object.assign(E, { index, guides, outils: outils.outils, cats: outils.categories, videos, stats, visites, site, propositions: propositions.propositions || [] });
  $("#logo").innerHTML = Pixel.icone("livre", { taille: 22, couleur: "#FBBF24" });
  $$(".nav a").forEach(a => { const s = $(".ico", a); if (s) s.innerHTML = ico(s.dataset.ico, 18); });
  $("#btn-recherche").innerHTML = ico("recherche", 16) + ' <span class="sr">Rechercher</span><kbd>Ctrl K</kbd>';
  $("#btn-recherche").addEventListener("click", ouvrirRecherche);
  addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ouvrirRecherche(); } if (e.key === "Escape") $(".recherche-fond")?.remove(); });
  if (site.goatcounter && !/localhost|127\.0\.0\.1/.test(location.hostname)) {
    window.goatcounter = { no_onload: true };
    document.head.append(el("script", { async: true, src: "https://gc.zgo.at/count.js", "data-goatcounter": `https://${site.goatcounter}.goatcounter.com/count`, onload: () => rendre() }));
  }
  addEventListener("hashchange", () => { rendre(); if (!location.hash.includes("--")) scrollTo(0, 0); });
  rendre();
}
window.GuideApp = { rendre, profil, lus };
demarrer();
})();
