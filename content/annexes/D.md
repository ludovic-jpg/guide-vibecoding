---
id: D
ordre: 4
titre: "Modèle de mise en production"
---
Les check-lists du chapitre 24, à recopier dans un fichier RUNBOOK.md à la racine du dépôt et à cocher en datant chaque case. Les explications, le modèle de postmortem et le prompt qui adapte ce runbook à vos services sont au chapitre 24. Si votre application vit entièrement sur Lovable Cloud, laissez de côté ce qui concerne un staging séparé et un serveur SMTP : Lovable s'en charge ou ne le permet pas. Gardez en revanche les recharges automatiques de crédits et la prudence avec les liens d'aperçu, qui montrent les vraies données.

Dans Lovable, l'aperçu isole le code mais partage la base de l'application publiée. Un vrai staging demande une seconde base ou une branche Supabase (chapitres 19 et 24).

:::checklist J-14 : poser le décor
☐  Le périmètre de la version est gelé : plus de nouvelle fonction, seulement des corrections.

☐  Les environnements existent, avec des clés distinctes (Stripe test et live, deux bases ou deux branches).

☐  Une surveillance des erreurs reçoit déjà les erreurs de l'aperçu ou du staging.

☐  Une surveillance de disponibilité interroge l'adresse de l'application.

☐  Trois à cinq tests de bout en bout couvrent les parcours qui comptent : inscription, connexion, action principale, paiement.

☐  Un éventuel test de charge a tourné contre le staging, jamais contre la production (chapitre 25).

☐  Une sauvegarde a été restaurée pour de vrai, au moins une fois, sur un projet de test.

☐  Les migrations en attente ont été relues : aucune ne supprime ni ne renomme une colonne encore utilisée.
:::

:::checklist J-7 : fermer les portes
☐  Les check-lists « Sécurité » et « RGPD » de l'annexe B sont cochées.

☐  Avec votre propre Supabase : un serveur d'envoi personnalisé (Resend, par exemple) remplace celui de Supabase pour les e-mails d'authentification.

☐  Les limites de débit de l'authentification ont été relues et ajustées à l'audience attendue.

☐  Le scan de sécurité de Lovable est propre.

☐  Des alertes de budget sont réglées chez chaque prestataire (Lovable, Supabase, Anthropic, hébergeur).

☐  Les recharges automatiques de crédits Lovable sont activées si le backend est sur Lovable Cloud.

☐  Une page de statut existe, et un modèle d'e-mail d'incident est prêt.
:::

:::notice J-1 : la veille
1. Faites une sauvegarde manuelle de la base de production et rangez le fichier hors du projet.
2. Notez l'identifiant de la version actuellement en ligne : c'est votre point de retour.
3. Relisez une à une les variables de production et comparez-les à votre fichier .env.example.
4. Déroulez les tests de bout en bout sur la version finale.
5. Gelez tout : plus aucun changement jusqu'au lancement.
6. Prévenez les personnes concernées de l'heure et du canal où vous joindre.
:::

:::notice Jour J : lancer, puis regarder
1. Lancez en début de semaine et en journée, jamais un vendredi soir.
2. Publiez la version validée (bouton Publish dans Lovable, ou promotion chez l'hébergeur).
3. Créez un compte avec une adresse e-mail neuve et suivez tout le parcours, confirmation comprise.
4. Faites un paiement réel de 1 €, vérifiez sa trace dans Stripe, puis remboursez-le.
5. Refaites le test des deux comptes sur la production.
6. Gardez ouverts, pendant une heure, la surveillance des erreurs et les journaux du backend.
7. Notez au runbook l'heure du lancement et tout ce qui vous a surpris.
:::

:::checklist J+7 : faire les comptes
☐  Les erreurs de la semaine sont triées : corrigées, planifiées ou acceptées.

☐  Les factures et compteurs de chaque service correspondent aux prévisions.

☐  Les journaux ne contiennent ni e-mail, ni mot de passe, ni jeton.

☐  Tout incident a donné lieu à un postmortem (modèle au chapitre 24).

☐  Les accès temporaires ouverts pour le lancement sont refermés.

☐  Le gel est levé, et la prochaine version a son propre J-14.
:::

### Le retour arrière

Le code revient en arrière en un clic, la base presque jamais (chapitre 24). Deux règles en découlent : n'écrire que des migrations rétrocompatibles (on ajoute la nouvelle colonne, on ne retire l'ancienne qu'une version plus tard), et noter ensemble la version du code et l'état des variables d'environnement.

:::notice En cas d'incident
1. Constatez : une alerte, une rafale d'erreurs, un message d'utilisateur. Notez l'heure.
2. Stabilisez avant de comprendre : revenez à la dernière version saine, désactivez la fonction en cause ou affichez une page de maintenance.
3. Communiquez : mettez à jour la page de statut et prévenez les utilisateurs touchés.
4. Corrigez à l'écart, vérifiez, puis republiez.
5. Si des données personnelles ont fuité, préparez la notification à la CNIL dans les 72 heures (chapitre 26).
6. Écrivez le postmortem dans la semaine (chapitre 24). Pendant l'incident, aucun agent n'écrit sur la production : Claude lit et propose, vous exécutez (chapitre 20).
:::
