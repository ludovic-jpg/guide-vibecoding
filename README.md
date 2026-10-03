# Guide du Vibe Coding

Le site interactif du livre **Guide du Vibe Coding** de Ludovic Albisser : construire son site, son application et son SaaS en parlant à une IA, avec Claude et Lovable.

- 34 chapitres + 10 annexes, un fichier Markdown par chapitre (`content/`).
- Une **planche « notice de montage » animée** par chapitre, présentée par un personnage-guide original en pixel art.
- **35 laboratoires interactifs** (simulateurs, schémas cliquables, quiz, glisser-déposer).
- **Prompts personnalisables** : chaque `[variable]` devient un champ, puis « Essayer dans Claude » ou « dans Lovable ».
- **Mon guide** : choisissez vos outils, votre objectif et votre niveau → parcours de lecture, sommaire signalé, PDF à votre nom.
- Lecture cochée automatiquement en fin de chapitre, plan de lecture, recherche (Ctrl K), lexique interactif.
- **Agents** : veille vidéo quotidienne (brief par e-mail + bouton Publier), agent publicateur, tableau de bord des vues et visites.

## Démarrer en local
```bash
node scripts/build-index.mjs
python3 -m http.server 8000   # puis http://localhost:8000
```

## Mise en ligne (GitHub Pages)
1. Settings → Pages → Source : **GitHub Actions**. Le workflow `deploy.yml` publie à chaque push.
2. Settings → Actions → General → Workflow permissions : **Read and write**.
3. Le site est servi sur `https://<compte>.github.io/guide-vibecoding/`.

## Les agents
| Agent | Quand | Ce qu'il fait |
|---|---|---|
| Veille quotidienne (`veille.yml`) | 7 h (Paris, été) | Lit les flux des chaînes autorisées, relève les vues, propose les vidéos pertinentes, ouvre l'issue « Brief de veille » que GitHub vous envoie par e-mail |
| Publicateur (`publier.yml`) | Quand vous cliquez « Publier » dans le brief | Ajoute la vidéo au chapitre, ferme l'issue, redéploie le site |
| Déploiement (`deploy.yml`) | Après chaque modification ou passage d'agent | Index, minification, images WebP/AVIF, GitHub Pages |

Secrets optionnels (Settings → Secrets and variables → Actions) :
- `ANTHROPIC_API_KEY` : tri sémantique des vidéos par Claude Haiku (sinon, mots-clés).
- `YOUTUBE_API_KEY` : vues fiables des vidéos anciennes.
- `GOATCOUNTER_TOKEN` + code dans `data/site.json` : visites quotidiennes dans le brief et le tableau de bord.
- `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_TO` (et `MAIL_SERVER`) : e-mail HTML avec gros boutons, en plus de la notification GitHub.

## PDF
`python3 scripts/pdf.py` → `dist/Guide-du-Vibe-Coding.pdf` (guide complet). Édition personnalisée : `--ch ch01,ch05 --prenom Ludovic`. Les lecteurs peuvent aussi télécharger leur édition depuis « Mon guide ».

## Travailler avec Claude sur ce dépôt
Lire `CLAUDE.md` (règles d'économie de jetons) et `docs/REPRISE.md` (prompts prêts à coller).
