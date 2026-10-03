---
id: B
ordre: 2
titre: "Check-lists"
---
Les pilotes de ligne déroulent leur liste à chaque décollage, même après des milliers de vols : la mémoire flanche précisément quand tout semble sous contrôle. Les listes qui suivent reprennent les réflexes du chapitre 7 et les vérifications des parties 3 à 5. Recopiez-les dans le dépôt de chaque application et datez chaque case cochée.

:::checklist Le premier jour, une fois pour toutes
☐  La mémoire de Claude est réglée, et je sais où relire et corriger ce qu'elle retient (chapitre 5).

☐  Chaque application a son projet Claude, avec ses instructions et ses documents (« Guide, site », « Guide, Atelier », « Guide, Audit »).

☐  Mon compte Lovable a une Knowledge d'espace de travail (langue, vouvoiement, style) et chaque projet a la sienne.

☐  Mon compte GitHub est protégé par la double authentification.

☐  Chaque projet Lovable est relié à un dépôt GitHub dès sa création (chapitre 6).

☐  J'ai fixé un budget mensuel et réglé un seuil de check-in bas dans Lovable.

☐  Chaque projet a son journal de décisions (decisions.md), et je tiens mon carnet de bord.
:::

:::checklist Avant de coder
☐  Je sais décrire le problème en une phrase, sans parler de la solution.

☐  J'ai interrogé au moins cinq personnes concernées sur ce qu'elles font aujourd'hui, pas sur ce qu'elles feraient.

☐  J'ai rempli les neuf rubriques du cahier des charges (annexe C).

☐  Ma colonne « Must » compte une dizaine de lignes au plus.

☐  J'ai décidé du backend : Lovable Cloud ou mon propre Supabase (chapitres 15 et 19).

☐  J'ai choisi une région européenne si l'application stocke des données personnelles.

☐  J'ai demandé un plan en mode Plan, je l'ai lu, et l'IA m'a posé ses questions avant de construire.
:::

:::checklist Avant chaque séance de travail
☐  Je relis la dernière entrée de mon carnet de bord et le journal de décisions du projet.

☐  Je sais quelle est la seule chose que je veux obtenir aujourd'hui.

☐  La dernière version qui fonctionne est marquée (signet dans Lovable ou commit).

☐  Je commence en mode Chat ou Plan, pas en Build.

☐  Je sais combien de crédits il me reste et à quel seuil je m'arrête.

☐  En fin de séance, j'écris trois lignes au carnet de bord (fait, en cours, appris) et je reporte chaque décision au journal de décisions.
:::

:::checklist Avant de publier
☐  J'ai déroulé mon plan de recette, saisies absurdes comprises (chapitre 18).

☐  J'ai créé deux comptes et vérifié que l'un ne voit pas les données de l'autre, ni dans l'interface ni en changeant un identifiant dans l'adresse.

☐  J'ai lancé le scan de sécurité de Lovable et corrigé les alertes critiques.

☐  Le dépôt GitHub est privé et à jour.

☐  Les paiements fonctionnent en mode test (carte 4242 4242 4242 4242) avant le passage aux clés réelles.

☐  Les e-mails partent de mon domaine vérifié (SPF, DKIM, DMARC).

☐  Mentions légales, politique de confidentialité et, en cas de vente, conditions générales de vente sont en ligne (chapitre 26).

☐  J'ai marqué la version publiée (signet dans l'historique, étiquette Git si le dépôt est relié).
:::

:::checklist Sécurité
☐  Aucune clé secrète dans le code du navigateur ni dans GitHub (chercher sk_, sb_secret, service_role, re_).

☐  Toute clé exposée une fois a été révoquée et remplacée, pas seulement effacée.

☐  Les secrets sont rangés dans le coffre de la plateforme ou dans un .env listé dans .gitignore.

☐  La RLS est activée sur toutes les tables, avec une politique par opération.

☐  Aucune politique using (true) ajoutée « pour que ça marche ».

☐  Les droits d'administration sont vérifiés côté serveur, pas seulement en cachant un bouton.

☐  Un plafond de requêtes protège la connexion, l'inscription, les e-mails et les appels à une IA payante.

☐  Les webhooks Stripe sont signés et leur signature est vérifiée.

☐  Dependabot et la push protection sont activés sur le dépôt.

☐  La double authentification protège mes comptes GitHub, Supabase, Stripe, Anthropic et mon registrar.

☐  J'ai déjà restauré une sauvegarde au moins une fois.
:::

:::checklist Avant de mettre Claude dans l'application
☐  La clé Anthropic vit dans les secrets du backend, jamais dans le code du navigateur (chapitre 16).

☐  L'appel passe par une fonction serveur qui vérifie que l'utilisateur est connecté et qu'il a le bon rôle.

☐  La longueur des textes envoyés est limitée, un quota mensuel borne le nombre d'appels et max_tokens borne la réponse.

☐  La consommation est enregistrée dans une table protégée par RLS (relectures_ia au chapitre 16).

☐  Une limite de dépense est réglée dans la console d'Anthropic.

☐  Les utilisateurs savent qu'ils ont affaire à une IA, selon mon rôle de fournisseur ou de déployeur (AI Act, article 50).
:::

:::checklist Avant d'installer une skill ou un serveur MCP
☐  Il vient de l'éditeur officiel ou d'une source connue.

☐  J'ai lu chaque fichier de la skill, scripts compris, et les permissions demandées par le serveur.

☐  Le mode lecture seule est activé quand il existe.

☐  L'accès est limité à un projet, jamais à la production.

☐  Le jeton a les droits minimaux et n'est écrit dans aucun fichier partagé.

☐  Je valide moi-même chaque action qui modifie quelque chose.
:::

:::checklist RGPD et obligations françaises
☐  Je ne collecte que les données nécessaires, et je sais pourquoi.

☐  J'ai fixé une durée de conservation pour chaque type de donnée.

☐  La politique de confidentialité indique finalités, base légale, durées, sous-traitants et droits.

☐  Les sous-traitants (hébergeur, Supabase, Resend, Stripe, Anthropic) sont listés et leur DPA vérifié.

☐  Un utilisateur peut accéder à ses données, les corriger et supprimer son compte.

☐  Le bandeau cookies propose « Tout refuser » aussi visiblement que « Tout accepter ».

☐  Si je vends des abonnements à des consommateurs, ils se résilient en ligne en quelques clics (chapitres 23 et 26).

☐  Si l'application envoie des données à une IA, la politique de confidentialité le dit.

☐  Si elle intègre un assistant conversationnel ou génère des contenus, les utilisateurs savent qu'ils ont affaire à une IA (AI Act, article 50, selon mon rôle de fournisseur ou de déployeur ; applicable en principe depuis le 2 août 2026, sous réserve du report envisagé par l'omnibus numérique).

☐  Je sais qu'une fuite de données personnelles se notifie à la CNIL sous 72 heures.
:::
