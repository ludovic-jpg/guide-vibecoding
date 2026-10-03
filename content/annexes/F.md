---
id: F
ordre: 6
titre: "Les skills de Matt Pocock"
---
Le chapitre 27 en commente quelques-unes et explique comment les installer, avec ou sans terminal. En voici la liste complète au 24 septembre 2026, telle que la publie le dépôt github.com/mattpocock/skills, sous licence MIT. Le dépôt évolue vite, et plusieurs noms ont déjà changé : son fichier CHANGELOG.md fait foi.

Inutile de tout installer. Pour nos trois chantiers, grill-me (avec grilling) suffit longtemps dans Claude.ai et dans Lovable ; to-spec, to-tickets et diagnosing-bugs prennent leur sens le jour où vous travaillez sur L'Atelier ou le SaaS avec Claude Code.

### Les skills que vous lancez

L'agent ne les déclenche jamais seul.

| **Skill** | **Rôle** |
|---|---|
| ask-matt | Dit quelle skill ou quel enchaînement convient à votre situation |
| setup-matt-pocock-skills | Configure le dépôt, une fois par projet |
| grill-me | Vous interroge sans relâche sur un plan, même hors code |
| grill-with-docs | Même interrogatoire, qui tient à jour CONTEXT.md |
| to-spec | Transforme la conversation en spécification, sans nouvelles questions |
| to-tickets | Découpe la spec en tickets par tranches verticales |
| implement | Construit un ticket en passant par tdd, puis code-review avant le commit |
| triage | Fait passer les tickets venus d'autres personnes par un circuit de tri |
| wayfinder | Transforme un chantier trop gros en décisions à prendre une à une |
| improve-codebase-architecture | Repère le code à consolider, puis vous interroge |
| handoff | Condense la conversation en document de passation |
| teach | Enseigne une notion sur plusieurs sessions |
| to-questionnaire | Fait d'une décision partagée un questionnaire pour qui la prendra |
| wait-what | Oblige l'agent à reformuler clairement son dernier message |

### Les skills que l'agent peut déclencher

| **Skill** | **Rôle** |
|---|---|
| grilling | La technique d'interrogatoire commune à grill-me, grill-with-docs, triage, wayfinder et improve-codebase-architecture |
| prototype | Prototype jetable : une page HTML, ou plusieurs variantes d'interface |
| research | Enquête sur des sources primaires, rend un fichier sourcé |
| domain-modeling | Glossaire du métier, cas limites, décisions |
| codebase-design | Discipline des « modules profonds » |
| tdd | Développement par les tests, une petite tranche à la fois |
| code-review | Relit selon les normes et la fidélité au ticket |
| diagnosing-bugs | Reproduire, réduire, faire des hypothèses, corriger, ajouter un test |
| resolving-merge-conflicts | Résout un conflit Git selon l'intention de chaque version |
| wizard | Vous guide dans les étapes que vous seul pouvez faire (identifiants, secrets) |
| writing-for-agents | Comment écrire des skills, un AGENTS.md ou un CLAUDE.md |

:::attention grill-me ne vient pas seule
Le fichier de grill-me se réduit à une ligne qui appelle grilling. Importée seule dans Lovable ou Claude.ai, elle ne fonctionne pas : importez les deux. La même logique vaut ailleurs : implement appelle tdd puis code-review. Avant d'importer une skill de ce dépôt, lisez son SKILL.md et repérez les noms qu'il cite.
:::

### Hors du plugin

Quatre outils divers, rarement utiles à un débutant : git-guardrails-claude-code (des hooks qui bloquent les commandes Git dangereuses, voir chapitre 27), setup-pre-commit, migrate-to-shoehorn et scaffold-exercises.

Neuf autres skills, encore en rodage, s'installent une à une ; le dépôt en tient la liste.

### Les anciens noms

Articles, vidéos et compteurs d'installations citent encore des noms disparus. Une commande introuvable se cherche ici.

| **Ancien nom** | **Aujourd'hui** |
|---|---|
| write-a-prd, to-prd | to-spec |
| prd-to-plan, to-plan, prd-to-issues, to-issues | to-tickets |
| diagnose | diagnosing-bugs |
| decision-mapping | wayfinder |
| review | code-review |
| writing-great-skills, write-a-skill | writing-for-agents |
| ubiquitous-language | remplacée par domain-modeling |
| design-an-interface | remplacée par codebase-design |
| qa | remplacée par triage et to-tickets |
| request-refactor-plan | remplacée par to-spec et improve-codebase-architecture |
| caveman, zoom-out, edit-article, obsidian-vault | supprimées sans remplaçant |
