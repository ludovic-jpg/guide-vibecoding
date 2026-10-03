---
id: G
ordre: 7
titre: "Vingt-cinq trucs et astuces"
---
Un recueil d'astuces a quelque chose de suspect : il promet de gagner du temps sans rien comprendre. Le mot *astuce* vient d'ailleurs du latin *astutia*, la ruse, et il a longtemps désigné une habileté un peu douteuse. J'ai retenu ces vingt-cinq gestes pour la raison inverse : chacun repose sur un fait documenté (par Lovable, par Anthropic ou par une source tierce, quand c'est dit), et chacun montre une cause pour que l'effet ne vous surprenne plus.

Elles sont datées de septembre 2026 et centrées sur Claude et Lovable, avec GitHub en appui. Les gestes que les chapitres expliquent déjà (mode Chat avant Build, seuil de check-in, test des deux comptes, journal de décisions, .gitignore, une tâche par conversation) n'y sont pas repris : vous les trouverez aux chapitres 5 à 7, 18 et 20. Prenez-en trois, pas vingt-cinq.

### Crédits et budget dans Lovable

**1. Ne pas paniquer quand le solde tombe à zéro**

Depuis le 18 août 2026, un message interrompu faute de crédits se met en pause avec une carte dans le chat, sans rien perdre. Rechargez, puis reprenez.

**2. Surveiller le compteur pendant le build**

Depuis le 25 août 2026, le coût et la durée d'un build en cours s'affichent en temps réel. Si le compteur grimpe sur une demande que vous pensiez simple, arrêtez : l'agent a sans doute découvert un problème que vous ne soupçonniez pas, et mieux vaut le comprendre en mode Chat.

**3. Activer les recharges automatiques en production**

Solde à zéro, les fonctions d'IA de l'application publiée s'arrêtent et le backend Lovable Cloud peut se mettre en pause. Pour le site ou L'Atelier en production, les recharges automatiques évitent cette panne (chapitre 15).

### Prompts dans Lovable

**4. Structurer en quatre blocs**

Le guide de prompting de Lovable propose la structure Contexte, Tâche, Consignes, Contraintes. Quatre titres suffisent pour que l'agent sache ce qui est demandé et ce qui est interdit.

**5. Faire réécrire un prompt coûteux**

Avant un message Build ambitieux, demandez en mode Chat de réécrire votre prompt pour le rendre plus concis et plus précis. Le guide appelle cela du méta-prompting. Le texte réécrit fait souvent apparaître une ambiguïté que vous n'aviez pas vue.

**6. Poser des barrières explicites**

« Ne modifie que la page des commandes. Garde le style existant et laisse le reste de l'application inchangé » : la formule vient, en anglais, du guide officiel. Sans elle, l'agent « améliore » volontiers ce qu'on ne lui a pas demandé de toucher.

**7. Récupérer la leçon d'une séance difficile**

Après une séance laborieuse, demandez de résumer les erreurs rencontrées et de rédiger un prompt réutilisable pour la prochaine fois. Le guide appelle cela le *reverse meta-prompting*. Rangez le résultat dans la Knowledge ou transformez-le en skill.

**8. Transformer une procédure répétée en skill**

Après une tâche réussie, demander de l'enregistrer comme skill suffit, et /skill-creator guide la rédaction. Les skills se chargent à la demande, là où la Knowledge est toujours lue (chapitre 27).

### Déboguer dans Lovable

**9. Demander ce qui a déjà été essayé**

Dans une longue conversation, l'agent oublie ses propres tentatives. Demandez-lui de lister les solutions déjà essayées pour cette erreur, afin de ne pas les répéter : la liste les lui remet sous les yeux, et à vous aussi.

**10. Soupçonner la dernière correction**

Quand un écran casse juste après en avoir réparé un autre, dites-le : « Nous avons corrigé le formulaire d'inscription, et maintenant la liste des chapitres dysfonctionne. La correction a-t-elle pu le provoquer ? » Les régressions viennent presque toujours du dernier changement.

**11. Situer le bug dans le temps**

« Ça marchait hier et ça n'envoie plus rien » est une vraie piste : l'agent peut comparer avec l'historique. Précisez ce qui a changé entre-temps, même si cela vous paraît sans rapport.

**12. Faire un audit sans rien toucher**

En mode Plan, terminez votre demande d'audit (code, performances, sécurité) par une consigne explicite : rendre un rapport sans modifier le code. Vous choisissez ensuite ce qui mérite un message Build.

### Design et données dans Lovable

**13. Sélectionner plusieurs éléments d'un coup**

Avec l'outil *Select* de la barre d'aperçu, Cmd ou Ctrl + clic sélectionne plusieurs éléments. Une seule demande (« même couleur et mêmes coins arrondis pour ces trois boutons ») remplace trois messages. *Select* consomme des crédits, contrairement à *Edit text*.

**14. Dessiner plutôt que décrire**

L'outil *Draw* permet de griffonner sur l'aperçu, avec une annotation. Une flèche et « déplacer ici » sont plus clairs qu'un paragraphe sur les marges.

**15. Nommer les composants et l'ambiance**

Appelez les éléments par leur nom (cartes, badges, fenêtres modales) et donnez des mots d'ambiance. Exigez du vrai contenu : un faux texte latin cache les problèmes de longueur qu'un vrai titre de chapitre révèle aussitôt.

**16. Tester avec des données marquées**

L'aperçu partage la base de l'application publiée : créez des enregistrements reconnaissables (« TEST relecteur Martin ») et supprimez-les ensuite. Avant une migration délicate, exportez les tables concernées en CSV, car un Revert restaure le code, jamais les données.

**17. Paginer les longues listes**

L'API de Supabase, sur laquelle repose Lovable Cloud, renvoie par défaut 1 000 lignes au maximum par réponse. Au-delà, les lignes manquent sans message d'erreur. Demandez une pagination dès qu'une liste peut grandir, celle des abonnés du site par exemple.

**18. Remixer pour copier la structure, pas les données**

Un remix copie le code et le schéma de la base, sans les données, les secrets, les domaines ni les connexions, et ne se synchronise plus avec l'original. C'est la bonne base pour une variante ou un exercice, pas une sauvegarde.

### Dans Claude

**19. Retrouver une conversation plutôt que la refaire**

Sur les offres payantes, Claude sait chercher dans vos anciennes conversations. Avant de réexpliquer le modèle de données de L'Atelier pour la cinquième fois, demandez-lui de retrouver celle où vous l'aviez arrêté.

**20. Importer une skill sans terminal**

Dans Claude.ai, une skill personnelle s'ajoute par Paramètres, puis Compétences : le dossier doit être à la racine du zip et porter le nom de la skill. Au moment où nous écrivons, gardez dans l'en-tête seulement name et description, par prudence (chapitre 27).

### Dans Claude Code

**21. Poser des interdits que le mode ne lève pas**

La commande /permissions gère des règles d'autorisation, de demande et de refus, et la documentation précise que les règles de refus s'appliquent dans tous les modes. C'est l'endroit où interdire, par exemple, la lecture de votre fichier .env.

**22. Regarder le contexte avant une longue tâche**

/context montre le remplissage de la fenêtre de contexte, poste par poste (chapitre 2). Si la jauge est déjà haute, faites un /clear ou un /compact d'abord, et désactivez les serveurs MCP inutiles pour cette tâche.

**23. Faire relire par une session neuve**

La documentation de Claude Code décrit un motif « rédacteur et relecteur » : une session écrit, une autre, au contexte vierge, relit, sans préjugé favorable envers un code qu'elle n'a pas écrit. /clear, puis le prompt 24 de l'annexe E.

### Avec GitHub et dans votre organisation

**24. Ne pas compter sur la push protection pour un dépôt privé**

La push protection de GitHub bloque l'envoi de secrets reconnus, mais par défaut sur les dépôts publics. La seule protection sûre reste de ne jamais écrire de secret dans le code.

**25. Construire un vocabulaire commun**

Matt Pocock recommande un fichier CONTEXT.md qui définit le vocabulaire du projet. Dans L'Atelier, « chapitre », « version » et « commentaire » désignent trois objets distincts : écrivez-le, une définition d'une ligne pour chacun, et employez toujours les mêmes mots. Les réponses raccourcissent, les malentendus aussi.

### Par où commencer

| **Ce qui vous freine** | **Les trois astuces à essayer d'abord** |
|---|---|
| L'IA oublie ce qui a été décidé | 7, 19, 25 |
| Vous dépensez trop | 2, 5, 13 |
| Les corrections n'en sont pas | 9, 10, 23 |
| Vous avez peur de casser la production | 3, 16, 21 |
| Vous perdez le fil des séances longues | 7, 9, 22 |

Quand une astuce ne marche plus, allez voir la documentation officielle avant de chercher la suivante sur un forum : c'est le seul endroit où la date du changement est écrite.
