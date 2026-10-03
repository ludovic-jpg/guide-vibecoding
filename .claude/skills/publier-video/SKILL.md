---
name: publier-video
description: Ajouter, retirer ou rattacher une vidéo YouTube à un chapitre du Guide du Vibe Coding, ou ajouter une chaîne à la veille.
---
- Sources autorisées : seulement les chaînes `active: true` de `data/chaines.json`.
- Publier : ajoute un objet dans `data/videos.json` (`id` = identifiant YouTube à 11 caractères, `chapitre`, `url`, `titre`, `chaine`, `chaineId`, `langue`, `justification` en une phrase française qui cite la notion du chapitre, `statut: "en_ligne"`, `ajouteeLe`).
- Proposer sans publier : même objet dans `data/propositions.json` avec `statut: "a_valider"`. L'auteur valide par le bouton du brief (issue `publier:<id>:<chNN>`).
- Ajouter une chaîne : entrée dans `data/chaines.json` (`id`, `nom`, `urlChaine` en @handle, `langue`, `specialite`, `chapitresCibles`, `active`).
- Ne lis jamais `data/stats.json` en entier.
