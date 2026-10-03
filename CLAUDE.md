# Guide du Vibe Coding — consignes pour Claude

Site statique (GitHub Pages) du livre « Guide du Vibe Coding » de Ludovic Albisser. Français, voix « je » auteur + « nous », vouvoiement du lecteur.
Le nom est **Guide du Vibe Coding** (jamais « Manuel », jamais « Bible »).

## Économie de jetons : règles de lecture
- Ne lis JAMAIS tout le dépôt. Lis seulement le fichier concerné par la demande.
- Un chapitre = `content/chapitres/chNN.md` (front matter + Markdown). Pour modifier le texte d'un chapitre, ne lis que ce fichier.
- Pour une vue d'ensemble (titres, outils cités, fiches), lis `content/index.json` (généré) plutôt que les 34 chapitres.
- Ne lis pas `js/viz-a.js` / `js/viz-b.js` en entier (≈ 350 Ko) : cherche avec Grep `VIZ["chNN-` puis lis seulement ce bloc. Le contrat est dans `docs/CONTRAT-VIZ.md`.
- N'ouvre jamais `js/vendor/`, `assets/fonts/`, `data/stats.json` (historique volumineux) sauf demande explicite.
- Modifie par `Edit` ciblé, jamais en réécrivant un fichier entier.

## Carte du dépôt
| Chemin | Rôle |
|---|---|
| `index.html`, `css/guide.css`, `js/app.js` | Coquille, charte, application (routes, lecture, planches, Mon guide, vidéos, tableau de bord, PDF) |
| `js/pixel.js` | Personnages-guides et pictogrammes en pixel art (SVG générés, zéro image) |
| `js/viz-a.js` `js/viz-b.js` + `css/viz-*.css` | Laboratoires interactifs ch01-17 / ch18-34 (chargés à la demande) |
| `content/chapitres/*.md`, `content/annexes/*.md` | Le texte du livre, source unique |
| `data/guides.json` | Un personnage original par chapitre (nom, rôle, chapeau, accessoire, couleurs, devise) |
| `data/outils.json` | Catalogue de la stack (catégories, couleurs, mots-clés de détection) |
| `data/chaines.json` | Chaînes YouTube autorisées pour la veille (seules sources permises) |
| `data/videos.json` | Vidéos en ligne sur le site · `data/propositions.json` : propositions de la veille |
| `data/stats.json`, `data/visites.json` | Écrits par l'agent de veille, ne pas éditer à la main |
| `scripts/` | `build-index.mjs` (index), `veille.mjs` (agent quotidien), `publier.mjs` (agent publicateur), `optimiser.mjs` (build), `pdf.py` (PDF) |
| `.github/workflows/` | `deploy.yml` (Pages), `veille.yml` (7 h chaque jour), `publier.yml` (sur validation) |

## Commandes
- `node scripts/build-index.mjs` après toute modification de `content/` ou `data/outils.json`.
- Aperçu local : `python3 -m http.server 8000` puis http://localhost:8000.
- PDF du guide complet : `python3 scripts/pdf.py` (Playwright + Chromium) → `dist/Guide-du-Vibe-Coding.pdf`.

## Syntaxe du contenu
- Encarts : `:::type Titre` … `:::` (types : prompt, attention, checklist, mot, bref, cout, astuce, notice, fiche).
- Dans un `:::prompt`, chaque `[variable entre crochets]` devient un champ personnalisable par le lecteur.
- Fiche du lexique : `:::fiche MOT · FAMILLE` puis `**Définition.**`, `**Analogie.**`, `**À ne pas confondre avec.**`.
- Faits datés (prix, versions) : écrire « à vérifier, septembre 2026 » et rester modifiable dans les laboratoires.

## Règles
- Images : jamais de PNG/JPG lourd dans le site. Déposer la source dans `assets/img/src/` : le build produit WebP + AVIF (480/960/1600). Toujours `loading="lazy"`, `decoding="async"`, `width`/`height`.
- Personnages : archétypes originaux uniquement, aucun personnage de fiction existant, aucun logo de marque redessiné (tuiles monogrammes colorées).
- Vidéos : uniquement des chaînes de `data/chaines.json` avec `active: true`. L'agent propose, l'auteur valide.
- Thème sombre unique ; l'impression bascule en clair (`@media print`).
- Commits en français, petits et nommés.
