---
id: H
ordre: 8
titre: "Et les autres outils"
---
Ce livre a fait un choix : Claude et Lovable, avec GitHub, Supabase, Resend et Stripe comme briques. D'autres outils existent, et vous les croiserez. Voici ce que j'en sais en septembre 2026, en quelques lignes chacun. Les prix sont en dollars, hors taxes, relevés à cette date : ce sont des ordres de grandeur, et le marché bouge chaque mois.

Une bonne nouvelle d'abord. En 2026, ces outils convergent : presque tous ont un mode plan, lisent un fichier AGENTS.md, acceptent les skills au format SKILL.md et parlent le protocole MCP. Ce que vous avez appris avec Claude et Lovable se transpose, surtout si votre code vit dans un dépôt GitHub qui vous appartient.

### Les constructeurs d'applications, cousins de Lovable

Bolt.new, de StackBlitz, génère des applications complètes qui tournent dans le navigateur. Il facture en tokens plutôt qu'en crédits : une offre gratuite avec un quota quotidien, une offre Pro à partir de 25 $ par mois.

v0, de Vercel, est né comme générateur d'interfaces et construit désormais des applications, déployées chez Vercel. Offre gratuite limitée, offre Plus à 30 $ par utilisateur et par mois.

Replit ajoute un agent à un environnement de développement en ligne qui construit, héberge et publie. L'offre Core est affichée à 18 $ par mois en facturation annuelle. Son agent est au centre de l'incident le plus cité du vibe coding, raconté au chapitre 20.

Base44, constructeur « tout compris » (base, comptes, hébergement), appartient à Wix depuis juin 2025 ; une faille d'authentification y a été trouvée et corrigée en juillet 2025. L'offre Starter est affichée à 16 $ par mois en facturation annuelle.

Google, enfin, a fait de son AI Studio un outil de vibe coding complet le 18 mars 2026, avec base et authentification Firebase intégrées ; ses quotas gratuits restent à vérifier. Firebase Studio, lui, n'accepte plus de nouveaux espaces depuis le 22 juin 2026 et fermera le 22 mars 2027.

### Les éditeurs de code augmentés

Cursor est le plus connu. C'est un éditeur dérivé de Visual Studio Code, édité par Anysphere, dont SpaceX a finalisé le rachat le 15 août 2026. Son agent lit et modifie le projet, avec des modes Ask, Plan et Agent ; il lit AGENTS.md et accepte skills et serveurs MCP. L'offre Pro coûte 20 $ par mois, mais Cursor indique lui-même qu'un usage quotidien de l'agent revient plutôt à 60 à 100 $ par mois au total. Depuis le 27 août 2026, on peut y démarrer un projet sans dépôt GitHub préalable. Si vous l'utilisez sur un projet né dans Lovable, ne travaillez jamais dans les deux outils en même temps.

GitHub Copilot, de Microsoft, s'installe dans la plupart des éditeurs et dispose d'une offre gratuite ; l'offre Pro est à 10 $ par mois. Kiro, d'Amazon, disponible pour tous depuis le 17 novembre 2025, organise le travail autour de spécifications écrites ; offre Pro à 20 $ par mois. Google propose Antigravity, un éditeur « agent d'abord », inclus dans ses abonnements Google AI.

### Les agents en terminal, cousins de Claude Code

Codex, d'OpenAI, existe en ligne de commande open source, en application de bureau, en extension d'éditeur et sur le web. Il est inclus dans les offres ChatGPT, dont Plus à 20 $ par mois. Depuis le 4 février 2026, GitHub permet d'assigner un ticket à Claude, à Codex ou à Copilot, sur certaines offres seulement.

Gemini CLI, de Google, est un agent open source annoncé en juin 2025. Il est utilisable gratuitement avec un compte Google, dans la limite d'un quota quotidien de requêtes. Comme avec tout agent, on travaille sur un dépôt sauvegardé.

Mistral, seul grand fournisseur de modèles européen, a lancé le 9 décembre 2025 Mistral Vibe CLI, agent de code en terminal open source, puis une version 2.0 le 27 janvier 2026. En mai 2026, son assistant Le Chat a été renommé Vibe, avec un mode Code. Pour qui tient à un fournisseur européen, c'est l'option à regarder ; vérifiez ses tarifs en euros au moment de vous abonner, les chiffres publiés divergent.

:::attention Changer d'outil sans perdre son projet
Avant d'essayer un autre outil sur un projet existant, vérifiez trois choses : le code est à jour sur GitHub, vos consignes sont dans un AGENTS.md que tous les outils liront, et aucun secret ne traîne dans le dépôt. Un outil se remplace ; un projet dont vous n'avez pas le code, non.
:::
