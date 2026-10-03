---
name: ajouter-laboratoire
description: Créer ou corriger une visualisation interactive (laboratoire) d'un chapitre du Guide du Vibe Coding.
---
1. Lis `docs/CONTRAT-VIZ.md` (seul fichier nécessaire pour l'API, les jetons CSS et le mode impression).
2. Lis le chapitre concerné (`content/chapitres/chNN.md`) pour coller à ses termes et choisir une `ancre` (titre ### existant).
3. Ch01-17 : `js/viz-a.js` + `css/viz-a.css` ; ch18-34 : `js/viz-b.js` + `css/viz-b.css`. Trouve le bloc existant avec Grep `VIZ["chNN-` ; n'ouvre pas le fichier entier.
4. Classes préfixées `vz-`, mode `ctx.print` statique, animations seulement sans `prefers-reduced-motion`.
5. Vérifie : `node --check`, puis capture Playwright de `index.html#chNN` (Chromium préinstallé ou `npx playwright`), zéro erreur console.
