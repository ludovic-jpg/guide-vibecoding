---
id: E
ordre: 5
titre: "Bibliothèque de prompts"
---
Vingt-cinq prompts, classés dans l'ordre d'un projet : imaginer, concevoir, construire, intégrer, déboguer, sécuriser et produire, relire. Remplacez les crochets, gardez la structure, et envoyez un seul changement significatif par message. Les exemples entre crochets viennent de nos trois chantiers : le site du Guide, L'Atelier et le SaaS « Audit Vibe Coding » (nom de travail). Le vingt-deuxième, trop lié à vos services pour tenir ici en entier, renvoie au chapitre 24.

Deux conseils d'usage. Les prompts de réflexion (imaginer, concevoir, relire) se lancent dans le projet Claude du chantier, où les instructions et les documents sont déjà chargés. Les prompts de construction se lancent dans Lovable, de préférence en mode Plan d'abord : on lit le plan, puis on le fait exécuter.

:::astuce Ranger ses prompts favoris
Un prompt que vous réutilisez chaque semaine mérite mieux qu'un copier-coller : transformez-le en skill (chapitre 27), ou rangez-le dans les instructions du projet Claude concerné. Une bibliothèque de prompts qui ne vit que dans un livre finit par ne plus servir.
:::

### Imaginer et valider

:::prompt 1. Cadrer Claude avant tout brainstorming
Tu vas m'aider à réfléchir à une idée d'application. Règles pour toute la conversation : ne me flatte pas, ne qualifie jamais une idée d'« excellente » ou de « prometteuse ».

Quand tu n'as pas d'information fiable (taille de marché, concurrents, prix), dis-le au lieu d'inventer. Après chaque série d'idées, ajoute trois objections sérieuses qu'un client sceptique pourrait faire. Pose-moi des questions si mon idée est floue.

Le problème que j'ai observé : [la situation, la personne concernée et ce qu'elle fait aujourd'hui, par exemple : un indépendant qui a construit son application avec Lovable et ne sait pas si ses données clients sont protégées].
:::

:::prompt 2. Préparer un entretien sans parler de son idée
Je vais interroger des [public précis, par exemple : porteurs de projet qui ont publié une application vibecodée] sur le problème suivant : [problème]. Aide-moi à préparer l'entretien selon les principes de The Mom Test de Rob Fitzpatrick.

Propose dix questions portant uniquement sur des faits passés et sur ce que la personne fait aujourd'hui, sans jamais mentionner mon idée. Pour chaque question, indique ce que je cherche à apprendre et la réponse qui devrait m'inquiéter.
:::

:::prompt 3. Pré-mortem
Nous sommes dans un an. Mon application [description en deux phrases] a été lancée, puis abandonnée faute d'utilisateurs. Donne les dix raisons les plus probables de cet échec, de la plus probable à la moins probable.

Pour chacune, indique un test simple, sans écrire de code, que j'aurais pu faire avant de construire, et combien de temps il m'aurait pris.
:::

### Concevoir

:::prompt 4. Faire émerger le cahier des charges
Je veux créer une application et j'ai besoin d'un cahier des charges court. Mon idée en quelques lignes : [idée].

Avant de rédiger quoi que ce soit, pose-moi des questions, une à la fois, pour clarifier : la vision, les utilisateurs et leurs droits, leurs parcours, les fonctionnalités, les données, les règles de mon activité, les contraintes (budget, outil, appareils, RGPD), ce qui est hors périmètre et les critères d'acceptation.

Quand tu auras assez d'éléments, rédige le cahier des charges en neuf rubriques, dans cet ordre, en classant les fonctionnalités selon la méthode MoSCoW. Signale en fin de document tout ce que tu as supposé sans que je le dise.
:::

:::prompt 5. Relire parcours et modèle de données
Voici mon cahier des charges, mes parcours utilisateurs et mon modèle de données : [coller].

Ne code rien. Vérifie la cohérence de l'ensemble : un écran a-t-il besoin d'une information absente du modèle ? Une donnée est-elle stockée à deux endroits ? Un rôle a-t-il des droits imprécis ?

Pour chaque table, propose en phrases simples les règles d'accès : qui peut lire, créer, modifier, supprimer, et à quelle condition. Termine par la liste de tes questions.
:::

:::prompt 6. Condenser le cahier des charges en consignes permanentes
Voici mon cahier des charges : [coller].

Transforme-le en une page de consignes permanentes pour l'IA qui va construire l'application, à placer dans la Knowledge de Lovable et dans un fichier AGENTS.md. Garde : le but en deux phrases, les rôles, le vocabulaire métier avec une définition d'une ligne par terme, les règles métier, les règles d'accès aux données, le style visuel, la langue et la liste de ce qui est hors périmètre.

Écris des phrases courtes et impératives. Ne dépasse pas 60 lignes. Une règle vague ne sert à rien : « les montants sont stockés en centimes » vaut mieux que « gère bien les montants ».
:::

:::prompt 7. Trois maquettes jetables pour choisir
Avant de construire la page [nom, par exemple : l'accueil du site du Guide], propose trois variantes radicalement différentes (mise en page, hiérarchie, ton), dans un seul fichier HTML jetable avec un bouton pour passer de l'une à l'autre.

Pas de base de données, du vrai contenu en français plutôt que du texte de remplissage. Pour chaque variante, dis en deux phrases à quel visiteur elle convient le mieux. Je choisirai, puis nous jetterons ce fichier.
:::

### Construire avec Lovable

:::prompt 8. Premier prompt d'une application
Crée [type d'application] pour [public]. L'action principale est : [action]. Écrans de la première version : [liste].

Utilise du vrai contenu en français, pas de texte de remplissage. Style : [deux ou trois mots d'ambiance], couleurs [couleurs]. Pensée d'abord pour le téléphone. Hors périmètre pour l'instant : [liste].

Avant de construire, pose-moi toutes les questions nécessaires pour bien comprendre ce que je veux.
:::

:::prompt 9. Ajouter une fonctionnalité par étapes
Ajoute [fonctionnalité, par exemple : le changement de statut d'un chapitre de Brouillon à Relecture] par étapes, et attends ma confirmation après chacune :

**1.** crée la page ou l'emplacement ;

**2.** ajoute l'interface avec des données d'exemple ;

**3.** branche les vraies données ;

**4.** ajoute la logique et les cas particuliers.

Critères d'acceptation : [liste]. Ne touche à rien d'autre.
:::

:::prompt 10. Modifier sans casser
Modifie uniquement [page ou composant] : [changement souhaité].

Conserve le style existant et ne touche pas au reste de l'application. Si tu penses qu'un autre fichier doit changer, demande-moi d'abord et explique pourquoi.
:::

:::prompt 11. Ajouter des comptes et des rôles
Ajoute des comptes utilisateurs : pages d'inscription, de connexion et de mot de passe oublié, dans le style actuel de l'application. La connexion est obligatoire pour accéder à [pages].

Il existe [nombre] rôles : [rôles, par exemple : auteur et relecteur]. [Rôle 1] peut [droits] ; [rôle 2] peut [droits]. Chaque utilisateur ne voit et ne modifie que ce que son rôle autorise, et les rôles sont stockés dans une table séparée, jamais dans le profil modifiable par l'utilisateur.

Traduis ces droits en règles RLS, montre-les-moi en français simple, et pose-moi les questions nécessaires avant de construire.
:::

:::prompt 12. Estimer la taille d'une demande
Ne modifie rien. Voici ce que je veux ajouter : [demande].

Découpe-la en étapes, et pour chacune indique les fichiers et les tables touchés, le risque de casser autre chose et si elle peut être faite seule.

Classe l'ensemble en petit, moyen ou gros chantier, et propose un découpage en demandes courtes, une par message.
:::

Envoyez ce dernier prompt en mode Chat ou Plan. Lovable n'affiche pas d'estimation fiable avant un message Build : l'IA donne la taille du chantier, pas un nombre de crédits.

### Intégrer

:::prompt 13. Mettre Claude dans l'application
Crée une fonction serveur relire-chapitre qui appelle l'API Messages d'Anthropic avec le secret ANTHROPIC_API_KEY, modèle claude-sonnet-5, max_tokens 2000.

Vérifie que l'utilisateur est connecté et qu'il a le rôle auteur, refuse les textes de plus de 60 000 caractères, enregistre les tokens consommés et le coût dans la table relectures_ia protégée par RLS, et refuse toute demande au-delà de 30 relectures par mois.

N'appelle jamais l'API depuis le navigateur. Si le secret n'existe pas encore, demande-le-moi par la fenêtre sécurisée prévue pour cela, jamais dans le chat.
:::

Les valeurs (modèle, plafond, longueur, quota mensuel) sont celles de L'Atelier au chapitre 16 ; adaptez-les à votre budget.

:::prompt 14. Écrire une migration prudente
Je veux ajouter à la table [table] une colonne [nom] ([type], [obligatoire ou non], valeur par défaut [valeur]).

Écris une migration SQL rétrocompatible : n'efface ni ne renomme aucune colonne existante, ajoute l'index nécessaire si la colonne sert dans un filtre, et prévois les règles RLS s'il en faut.

Montre-moi le SQL et explique ligne par ligne ce qu'il fait avant de l'appliquer. N'applique rien sans mon accord.
:::

### Déboguer et vérifier

:::prompt 15. Chercher la cause avant la correction
Voici l'erreur qui apparaît quand je [action précise] : [message exact, ou ligne copiée depuis les journaux].

Avant de corriger quoi que ce soit, explique-moi en français simple la cause profonde, montre-moi le code concerné et dis-moi ce que nous avons déjà essayé sur ce problème dans cette conversation. Propose ensuite une correction. N'applique rien tant que je n'ai pas validé.
:::

:::prompt 16. Montrer que c'est corrigé
Ne me dis pas que c'est corrigé : montre-le. Donne-moi le test que tu as lancé et son résultat, ou la séquence exacte d'actions à refaire dans le navigateur avec ce que je dois voir à chaque étape.

Si tu n'as pas pu vérifier, dis-le clairement.
:::

:::prompt 17. Plan de recette
Voici mon cahier des charges : [coller]. Rédige un plan de recette sous forme de tableau à quatre colonnes : scénario, saisie, résultat attendu, résultat obtenu. Laisse la dernière colonne vide, je la remplirai.

Couvre chaque critère d'acceptation, puis ajoute les saisies absurdes : champ vide, texte très long, date passée, caractères spéciaux, double clic sur le bouton d'envoi, deux comptes différents sur la même donnée.
:::

:::prompt 18. Tester un parcours dans le navigateur
Utilise les tests dans le navigateur pour vérifier ce parcours : connecte-toi avec le compte de test [adresse], [étape 1], [étape 2], [étape 3], puis vérifie que [résultat attendu].

Rends compte de chaque étape (réussie ou échouée), avec une capture d'écran de tout échec. Ne modifie aucun code.
:::

### Sécuriser et mettre en production

:::prompt 19. Chasse aux secrets
Passe en revue tout le projet à la recherche de clés ou de mots de passe écrits dans le code, en particulier dans les fichiers envoyés au navigateur. Cherche notamment sk_, sb_secret, service_role et re_. Liste chaque occurrence avec le fichier et la ligne.

Ne corrige rien : dis-moi seulement où ranger chaque secret et lesquels je dois révoquer.
:::

:::prompt 20. Audit des règles d'accès
Liste toutes les tables de la base. Pour chacune, indique si la RLS est activée, quelles politiques existent pour la lecture, l'ajout, la modification et la suppression, et explique en français simple ce que chacune autorise.

Dis-moi si un utilisateur connecté pourrait lire ou modifier les données d'un autre, et si une vérification de droits n'est faite que dans l'interface. Signale toute politique trop permissive, par ordre de gravité, sans rien corriger.
:::

:::prompt 21. L'attaquant
Mets-toi à la place d'une personne malveillante qui connaît l'adresse de mon application et lit son code dans le navigateur. Quelles cinq attaques simples tenterait-elle (données des autres, formulaires, envoi massif d'e-mails, appels à l'IA payante, pages d'administration) ?

Pour chacune, dis si mon application y résiste et comment je peux le vérifier moi-même, sans outil de développeur.
:::

**22. Préparer son runbook.** Le prompt complet est au chapitre 24 : il fait rédiger par Claude un RUNBOOK.md en cinq sections (J-14 à J+7), adapté à vos services, sur le modèle de l'annexe D, avec un retour arrière qui distingue le code, la base et les variables d'environnement.

### Relire, comprendre, passer la main

:::prompt 23. Comprendre ce que l'IA vient de faire
Avant que je valide : explique ce que tu viens de modifier, bloc par bloc, en français simple et sans jargon. Quels fichiers, pourquoi, et ce qui pourrait casser ailleurs à cause de ce changement.

Puis pose-moi deux questions dont les réponses prouveraient que je l'ai compris (par exemple : que se passe-t-il si l'utilisateur n'est pas connecté ?).
:::

:::prompt 24. Relecteur à contexte vierge
Tu relis une modification que tu n'as pas écrite. Voici le cahier des charges du projet : [extrait]. Voici la modification : [diff, ou nom de la branche].

Ne signale que ce qui touche à la correction : bugs, failles, règles d'accès trop larges, secrets exposés, migrations non rétrocompatibles, données personnelles dans les journaux, écarts avec les critères d'acceptation. Ignore le style.

Pour chaque point : le fichier, la ligne, le risque en une phrase, la correction proposée. Si tu ne trouves rien de sérieux, dis-le simplement.
:::

:::prompt 25. Résumé de passation vers une nouvelle conversation
Je vais ouvrir une nouvelle conversation. Rédige un résumé que je collerai en premier message : le but du projet en deux phrases, ce qui fonctionne déjà, la tâche en cours, ce que nous avons essayé sans succès et pourquoi, les décisions à ne pas remettre en cause, les fichiers concernés.

Pas plus de quinze lignes. N'invente rien : si tu n'es pas sûr d'un point, écris « à vérifier ». Termine par une ligne à copier dans mon carnet de bord.
:::
