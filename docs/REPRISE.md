# Kit de reprise : recréer et faire évoluer le site depuis GitHub, en dépensant peu de jetons

## Pourquoi ce dépôt coûte moins cher qu'avant
| Avant (artefact unique) | Maintenant (dépôt) | Gain |
|---|---|---|
| Un HTML de 75 Ko + une base de 700 Ko relue à chaque modification | Un fichier par chapitre (10 à 50 Ko) : Claude ne lit que celui qu'il modifie | ÷ 15 à ÷ 50 sur une retouche de texte |
| Chaque séance réexplique le projet | `CLAUDE.md` est lu automatiquement : carte du dépôt, règles, commandes | ≈ 2 000 jetons de contexte stables au lieu de longues explications |
| Consignes répétées à la main | 3 skills de projet (`.claude/skills/`) chargées seulement quand la demande y correspond | Les consignes ne coûtent rien tant qu'elles ne servent pas |
| Veille faite par Claude chaque semaine (recherches web payantes) | Veille par GitHub Actions (flux RSS, zéro jeton), Claude Haiku en option pour le tri | Coût quotidien ≈ 0 € ; ≈ 0,01 € avec Haiku |
| Images lourdes intégrées | Personnages et pictogrammes générés en SVG ; images sources converties en WebP/AVIF au build | Page d'accueil < 250 Ko compressée hors vidéos |
| Polices Google externes | Polices auto-hébergées (woff2, sous-ensemble latin) | Pas d'appel tiers, RGPD plus simple |

## Prompt 1 — Ouvrir une séance de travail (Claude, onglet Code ou application de bureau)
```
Ajoute le dépôt GitHub ludovic-jpg/guide-vibecoding à cette séance et clone-le.
Lis seulement CLAUDE.md, puis attends ma demande. Applique les règles d'économie de jetons :
un seul fichier de chapitre à la fois, Grep avant Read dans les gros fichiers, Edit ciblés.
À la fin, commit en français et push sur main (le site se redéploie tout seul).
```

## Prompt 2 — Créer de zéro un « avatar » du site (copie de travail indépendante)
```
Crée un nouveau dépôt GitHub [nom-du-nouveau-dépôt] à partir de ludovic-jpg/guide-vibecoding
(copie complète de l'historique), active GitHub Pages en mode « GitHub Actions »,
mets les permissions des workflows en lecture-écriture, modifie data/site.json
(titre, depot, goatcounter vide) et pousse. Donne-moi l'adresse du site une fois le déploiement terminé.
```

## Prompt 3 — Modifier un chapitre
```
Chapitre [numéro] du Guide du Vibe Coding : [ce que je veux changer].
Utilise la skill modifier-chapitre. Ne lis que content/chapitres/chNN.md.
```

## Prompt 4 — Nouveau laboratoire interactif
```
Utilise la skill ajouter-laboratoire pour le chapitre [numéro] : [idée de visualisation].
```

## Prompt 5 — Régénérer le PDF du guide
```
Lance python3 scripts/pdf.py et envoie-moi dist/Guide-du-Vibe-Coding.pdf.
```

## Instructions de projet à coller (projet Claude « Guide du Vibe Coding »)
```
Projet : Guide du Vibe Coding (livre + site interactif), dépôt ludovic-jpg/guide-vibecoding.
Le nom est « Guide du Vibe Coding » (jamais Manuel ni Bible). Voix : « je » auteur + « nous », vouvoiement.
Outils au premier plan : Claude et Lovable. Source unique du texte : content/chapitres/*.md du dépôt.
Pour toute modification, passe par le dépôt (Prompt 1 de docs/REPRISE.md), pas par un artefact.
Vidéos : seulement les chaînes de data/chaines.json ; l'agent propose, j'approuve par le bouton du brief.
```

## Images : la règle d'or
1. Déposez l'image source (PNG/JPG, même lourde) dans `assets/img/src/`.
2. Le build produit `nom-480|960|1600.webp` et `.avif`.
3. Dans le Markdown ou le HTML :
```html
<picture>
  <source type="image/avif" srcset="assets/img/nom-480.avif 480w, assets/img/nom-960.avif 960w, assets/img/nom-1600.avif 1600w">
  <img src="assets/img/nom-960.webp" srcset="assets/img/nom-480.webp 480w, assets/img/nom-960.webp 960w, assets/img/nom-1600.webp 1600w"
       sizes="(max-width: 760px) 100vw, 720px" width="960" height="540" loading="lazy" decoding="async" alt="Description utile">
</picture>
```
4. Captures d'écran : PNG source, recadrées sur l'essentiel ; jamais de capture plein écran 4K.
