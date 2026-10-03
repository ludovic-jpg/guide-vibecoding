---
name: modifier-chapitre
description: Modifier, réécrire ou enrichir le texte d'un chapitre ou d'une annexe du Guide du Vibe Coding (content/chapitres/chNN.md). À utiliser pour toute demande portant sur le contenu du livre.
---
1. Identifie le chapitre (numéro ou titre ; au besoin, lis `content/index.json`, champ `chapitres[].titre`). Ne lis que `content/chapitres/chNN.md`.
2. Respecte la voix : « je » auteur + « nous », vouvoiement, phrases nettes, étymologie bienvenue, Claude et Lovable au premier plan.
3. Garde la syntaxe des encarts (`:::type Titre` … `:::`). Un prompt contient des `[variables]` personnalisables.
4. Modifie par `Edit` ciblés. Si tu changes un titre `###`, vérifie avec Grep qu'aucune visualisation n'utilise ce titre comme `ancre` (`grep -n "ancre:" js/viz-*.js`).
5. Lance `node scripts/build-index.mjs`, puis résume la modification en 3 lignes maximum.
