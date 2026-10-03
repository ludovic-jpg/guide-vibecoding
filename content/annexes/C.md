---
id: C
ordre: 3
titre: "Modèle de cahier des charges"
---
Les neuf rubriques du chapitre 10, dans le même ordre, suivies des annexes techniques du chapitre 22 pour les projets qui ont des comptes, des données et de l'argent. Pour le site vitrine du Guide, le corps suffit. Pour L'Atelier et plus encore pour le SaaS, remplissez aussi les annexes.

:::fiche GABARIT · MÉTHODE
**Définition.** Un document vide mais structuré, dont les rubriques et les questions obligent à trancher chaque point avant de le confier à l'IA.

**Analogie.** Le patron de couturière : il ne coud rien, mais il empêche d'oublier une manche.

**À ne pas confondre avec.** Un modèle rempli, qui est la réponse d'un autre à vos questions.
:::

Le gabarit se copie dans un fichier docs/CAHIER_DES_CHARGES.md à la racine du dépôt. Il sert trois fois : il clarifie votre pensée, il devient le premier message à l'IA, puis sa version condensée va dans la Knowledge de Lovable et dans les instructions du projet Claude. Une rubrique vide est une information : vous n'avez pas encore décidé.

### Le corps

```text
# Cahier des charges : [nom de l'application]
 
Version : [0.1]   Date : [jj/mm/aaaa]   Statut : [brouillon / validé]
Auteur : [nom]    Outils : [Lovable, Claude, Claude Code...]
Historique : [0.1 création ; 0.2 ajout du lot 2 ; ...]
 
## 1. Vision
- Quel problème l'application résout-elle, en deux phrases
  qu'un voisin comprendrait ?
- Quand l'avez-vous observé pour la dernière fois ?
- À quoi verra-t-on dans six mois qu'elle sert (un chiffre) ?
 
## 2. Utilisateurs
- Qui s'en sert ? Quels rôles (visiteur, client, relecteur,
  administrateur) ?
- Que fait chacun aujourd'hui, sans votre application ?
- Combien seront-ils au lancement, puis dans un an (ordre de grandeur) ?
 
## 3. Parcours
- Quelle est l'action principale, sans laquelle l'application
  ne sert à rien ?
- Pour chaque rôle : les étapes, de l'arrivée au résultat.
 
## 4. Fonctionnalités priorisées
- Must / Should / Could / Won't (MoSCoW), une ligne par fonctionnalité.
- Quels écrans, et avez-vous un croquis ou une capture d'un site
  qui vous plaît ?
 
## 5. Données
- Quelles informations l'application garde-t-elle, avec quels champs ?
- Quels liens entre elles (un chapitre a plusieurs commentaires) ?
- Données personnelles, sensibles, de mineurs, bancaires ?
- Combien de temps les garde-t-on ?
 
## 6. Règles métier
- Les règles de votre activité (délais, capacités, tarifs, statuts).
- Qui peut voir, créer, modifier, supprimer quoi, en phrases simples.
 
## 7. Contraintes
- Outils, budget mensuel maximal, échéance.
- Langue, appareils, ambiance visuelle, vouvoiement ou tutoiement.
- Obligations légales (RGPD, mentions légales, CGV, résiliation
  en ligne, transparence si l'application utilise une IA).
 
## 8. Hors périmètre
- Ce que l'application ne fera pas dans cette version, volontairement.
 
## 9. Critères d'acceptation
- Trois à cinq vérifications concrètes, lisibles par un non-spécialiste.
```

### Les annexes techniques

```text
# Annexes techniques
 
## A. Écrans
| Écran | Rôle(s) | Ce qu'on y voit | Ce qu'on y fait | Données lues / écrites |
|---|---|---|---|---|
 
## B. Données et droits
### B1. Tables
| Champ | Type (texte, nombre, date, oui/non, liste) | Obligatoire | Exemple |
|---|---|---|---|
Relations : [un chapitre a plusieurs commentaires ...]
Durée de conservation et suppression : [...]
 
### B2. Matrice des droits
| Table | Rôle | Lire | Créer | Modifier | Supprimer | Condition |
|---|---|---|---|---|---|---|
(Condition en français : « seulement ses propres lignes »)
 
## C. Intégrations et secrets
| Service | Pour quoi | Compte au nom de | Secret (nom) | Rangé où | Plafond | Si le service tombe |
|---|---|---|---|---|---|---|
 
## D. Exigences non fonctionnelles
- Sécurité : [RLS sur toutes les tables, double authentification ...]
- RGPD : [région, sous-traitants, durées, droits des personnes ...]
- Performance : [temps d'affichage, volumes attendus ...]
- Accessibilité et appareils : [...]
- Disponibilité et sauvegardes : [...]
- Coûts : [plafond mensuel par service, alertes ...]
 
## E. Critères d'acceptation détaillés
Pour chaque fonctionnalité Must :
- Étant donné [situation], quand [action], alors [résultat].
Au moins un cas d'erreur et un cas d'accès interdit.
 
## F. Plan de lots
| Lot | Contenu | Outil | Critère de sortie | Dépend de |
|---|---|---|---|---|
(Lot 0, toujours : comptes, rôles, RLS, GitHub, fichier de consignes)
 
## G. Décisions et questions ouvertes
| Date | Décision | Raison | Alternative écartée |
|---|---|---|---|
Questions ouvertes : [...]
Hypothèses faites par l'IA et non validées : [...]
```

### Remplir sans se noyer

Le chapitre 22 détaille le piège de chaque annexe. Retenez-en deux. Dans la matrice des droits, chaque case vide doit être un « non » décidé, pas un oubli, car c'est elle que l'IA traduira en règles RLS (chapitre 15). Et l'annexe G du gabarit (décisions et questions ouvertes) est la mémoire du projet : dans six mois, vous aurez oublié pourquoi vous avez fait tel choix, et l'IA l'aura oublié dès la conversation suivante.

:::astuce Faire interroger son cahier des charges
Collez le gabarit rempli dans le projet Claude du chantier et demandez à Claude de vous poser, une par une, les questions qu'il laisse ouvertes. La skill grill-me de Matt Pocock (annexe F) fait la même chose avec plus d'obstination.
:::
