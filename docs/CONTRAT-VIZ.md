# Contrat des visualisations et du pixel art

Ce fichier suffit pour écrire ou corriger une visualisation sans lire le reste du code.

## Où vit quoi
- `js/pixel.js` : moteur de pixel art (personnages-guides, pictogrammes, objets). Expose `window.Pixel`.
- `js/viz-a.js` + `css/viz-a.css` : visualisations des chapitres 1 à 17.
- `js/viz-b.js` + `css/viz-b.css` : visualisations des chapitres 18 à 34.
- Aucun framework, aucune dépendance externe. JavaScript moderne (ES2020), pas de modules : des scripts classiques qui s'ajoutent à `window`.

## Déclarer une visualisation
```js
window.VIZ = window.VIZ || {};
VIZ["ch03-maison"] = {
  chapitre: "ch03",
  titre: "La maison interactive",            // affiché en tête de l'encart
  consigne: "Cliquez sur une pièce.",         // une phrase, affichée sous le titre
  ancre: "La façade",                         // texte (sous-chaîne, insensible à la casse) d'un titre ### du chapitre :
                                              // la viz s'insère juste AVANT ce titre. Absent ou introuvable : en fin de chapitre.
  render(el, ctx) { /* remplit el (un <div> vide) */ }
};
```
- `ctx.print` : `true` quand on génère le PDF. Rendre alors un état statique, complet et lisible (pas d'information cachée derrière un survol ou un clic, pas d'animation). Prévoir une hauteur raisonnable (< 900 px).
- `ctx.prenom` : prénom du lecteur ("" si inconnu). `ctx.outils` : ids d'outils choisis par le lecteur (ex. `["lovable","supabase"]`).
- `ctx.index.fiches` : `[{titre, famille, definition, analogie, confusion, chapitre}]` toutes les fiches du lexique du livre.
- `ctx.copier(texte, bouton)` : copie dans le presse-papiers avec retour visuel.
- `ctx.prompt(texte)` : renvoie un élément « bloc prompt » prêt à insérer (copie + bouton « Essayer dans Claude »).
- Préfixer TOUTES les classes CSS par `vz-` + nom court (ex. `.vz-maison-piece`). Jamais de style global, jamais d'id fixe (plusieurs viz peuvent coexister, y compris en impression).
- Animations : seulement si `matchMedia('(prefers-reduced-motion: no-preference)')`. Déclencher les animations à l'entrée dans l'écran (IntersectionObserver), pas au chargement.
- Accessibilité : vrais `<button>`, `aria-label` sur les éléments graphiques interactifs, contrastes suffisants.
- Largeur : fluide de 320 px à 720 px (colonne de lecture). Aucun défilement horizontal de page.
- Chiffres (prix, quotas) : toujours modifiables par le lecteur et marqués « à vérifier, tarifs de septembre 2026 » quand ils viennent d'un éditeur.

## Jetons de design (variables CSS disponibles)
Thème sombre unique, néo-notice (dark mode néo-futuriste + notice de montage suédoise + pixel art 2.0).
```
--papier #0F1117 (fond)   --papier-2 #181B24 (surface)   --papier-3 #20242F (surface relevée)
--encre #E7E9EF (texte)   --encre-2 #A3AABB (secondaire) --encre-3 #5F6678 (éteint)
--filet #2A2F3C (traits)  --accent #8B5CF6 (violet, action) --neon #10B981 (vert, code/validation)
--jaune #FBBF24 (notice, pictos) --bleu #60A5FA --alerte #F87171 --rose #FF4F7B
--f-titre "Plus Jakarta Sans"  --f-texte "Inter"  --f-code "JetBrains Mono"  --f-pixel "Silkscreen"
--rayon 14px
```
En impression (`@media print` ou `ctx.print`), le fond devient blanc : utiliser les variables, elles sont redéfinies pour l'impression.

## API Pixel (js/pixel.js)
- `Pixel.perso(guide, {taille=128, anime=true})` → chaîne SVG. `guide` = une entrée de `data/guides.json`.
- `Pixel.icone(nom, {taille=20})` → chaîne SVG pictogramme pixel (12×12). Noms : sommaire, stack, annexes, videos, tableau, miroir, lexique, recherche, pdf, check, coeur, etoile, eclair, cadenas, maison, fusee, robot, brique, engrenage, cylindre, piece, loupe, camera, livre, ampoule, cle, prise, bouclier, graphe, horloge, bulle, carte.
- `Pixel.objet(nom, {taille=48})` → un accessoire seul (mêmes noms que `accessoire` dans guides.json).
- `Pixel.piece(texte)` → nom d'icône le plus proche d'une « pièce de la boîte » (par mots-clés).
