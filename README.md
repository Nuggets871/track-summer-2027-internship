# Stage Copilot

Application web **personnelle et 100% locale** pour piloter une recherche de
stage à l'étranger, organisée autour d'une seule logique simple :

**Trouver → Comprendre le fit → Préparer → Postuler → Suivre.**

Pas de CRM, pas d'ERP, pas quinze modules à maintenir à jour : une barre pour
coller le lien d'une offre, un score de correspondance explicable, un coach IA
qui connaît vraiment votre profil, et un tableau de suivi. Moins de
fonctionnalités, mais faites pour être utilisées tous les jours.

> Toutes vos données restent sur votre machine, dans un fichier SQLite local.
> Rien n'est envoyé à un service tiers, hormis — si vous choisissez de
> configurer une clé — les appels à l'API DeepSeek décrits plus bas.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Installation](#installation)
- [Lancement](#lancement)
- [Base de données](#base-de-données)
- [Données de démonstration](#données-de-démonstration)
- [Commandes](#commandes)
- [Structure du projet](#structure-du-projet)
- [Backup et export](#backup-et-export)
- [Tests](#tests)
- [Troubleshooting](#troubleshooting)

## Fonctionnalités

### 🔗 Coller un lien — le workflow central
L'action principale de l'app, disponible sur **Accueil**, **Opportunités** et
le bouton **+ Ajouter** global : collez l'URL d'une offre (LinkedIn, Indeed,
Welcome to the Jungle, site carrières d'une entreprise...). L'application :

1. récupère la page et en extrait le texte lisible ;
2. lit en priorité les données structurées `schema.org/JobPosting` quand la
   page les expose (zéro coût, zéro IA) ;
3. complète les champs encore manquants avec une IA (DeepSeek, optionnelle)
   strictement contrainte à ne jamais inventer une information absente du
   texte, sinon avec des règles heuristiques (mots-clés, regex) ;
4. calcule un **Match Score** explicable et déterministe — jamais généré par
   l'IA — pondéré par défaut ainsi : compétences 30 %, expérience 25 %,
   formation 15 %, langues 10 %, localisation/disponibilité 10 %, préférences
   personnelles 10 % (pondérable dans Paramètres > Matching) ;
5. évalue une **Eligibility** séparée du Match (langage toujours prudent,
   jamais une certitude — ex. fenêtre de date de diplôme incompatible) ;
6. affiche un écran **"Voici ce que nous avons détecté"**, entièrement
   éditable, avant toute sauvegarde — un champ non détecté reste marqué
   "Non renseigné", jamais deviné ;
7. propose trois actions : **Sauvegarder**, **J'ai déjà candidaté**
   (formulaire minimal — date, note, source, prochaine action, moins de 30
   secondes) ou **Préparer** (ouvre directement la fiche de l'opportunité).

Si la page ne peut pas être lue automatiquement (LinkedIn bloque souvent les
robots), l'app le dit clairement et propose de **coller la description** à la
place — le reste du traitement (extraction, score, sauvegarde) est identique.
Les doublons (même URL, ou même entreprise + intitulé) sont détectés avant
sauvegarde. Le score reste associé à l'analyse et à la version du profil
utilisée : si le profil change ensuite, une bannière **"Ton profil a changé
depuis cette analyse"** apparaît sur la fiche, avec un bouton **Recalculer le
match** — jamais de recalcul automatique en masse.

### 🏠 Accueil
Une seule action évidente (coller un lien), tes meilleurs matches, tes
candidatures actives, et tes actions à faire (deadlines, relances) — sans
graphiques ni statistiques décoratives.

### 📋 Opportunités
Un tableau unique — Entreprise / Poste / Localisation / Match / Statut /
Deadline / Prochaine action — avec recherche, filtres rapides (*Match > 80 %*,
*Match > 70 %*, *Deadline proche*, *Non analysées*) et tri (*meilleur match*,
deadline, entreprise, dernière mise à jour). Le pipeline tient en 7 statuts :
Sauvegardée → En préparation → Envoyée → Entretien → Offre / Refusée /
Archivée, modifiable directement depuis le tableau ou la fiche. Export et
import **CSV** des candidatures depuis cette page.

### 📄 Fiche opportunité
Une seule page, pas d'onglets :
- **Header** — entreprise, poste, lien original, statut, match %, suppression ;
- **Aperçu** — champs éditables (poste, lieu, salaire, durée, dates) ;
- **Compatibilité** — le Match Score détaillé facteur par facteur, points
  forts, points de vigilance, compétences manquantes, recommandation, et un
  bouton pour recalculer ;
- **Candidature** — date d'envoi, CV utilisé (celui de ton profil), prochaine
  action, notes, et un bouton **Préparer ma lettre** qui ouvre le studio dédié
  décrit ci-dessous ;
- **Actions IA** — ré-analyser l'offre, améliorer son CV pour ce poste
  précis, préparer l'entretien (contexte, points à mettre en avant, questions
  probables, points faibles à anticiper, questions à poser) ;
- **Coach de cette opportunité** — une conversation IA scoping la
  candidature en cours (annonce, brouillon de lettre, dossier profil), dont
  l'historique reste attaché à l'opportunité.

### ✉️ Studio de lettre de motivation
Depuis la fiche d'une opportunité, le bouton **Préparer ma lettre** ouvre un
espace dédié à cette candidature — la lettre reste liée à l'offre :

- **Générer** un premier brouillon avec l'IA (ton et langue au choix), ancré
  sur ton profil **et sur ta lettre de motivation de référence** (voir Profil) ;
- **Itérer** : demandes libres (« raccourcis le 2e paragraphe ») ou actions
  rapides (plus courte, plus naturelle, plus spécifique, focus expérience) ;
- **Modifier à la main** dans l'éditeur, avec un **contrôle de naturel** qui
  signale tirets cadratins, clichés, phrases trop longues, et l'absence du nom
  de l'entreprise ;
- **Télécharger en Word (.docx) et en PDF**, mis en page avec ton en-tête
  (nom, coordonnées, date, destinataire, objet) ;
- **Restaurer la version précédente** à tout moment.

### 👤 Profil
Informations personnelles (dont LinkedIn/GitHub/portfolio), formation,
expériences, compétences, langues, préférences/disponibilité, et le CV — le
tout utilisé pour le Match Score, les lettres de motivation et les actions IA.
**Import de CV** : dépose un fichier (PDF/DOCX/TXT), l'IA en extrait les
champs, tu coches ceux que tu veux appliquer — rien n'écrase ton profil sans
confirmation explicite, champ par champ. Les liens LinkedIn/GitHub/portfolio
réapparaissent avec un bouton de copie sur chaque fiche opportunité, dans la
section Candidature — pratique quand un formulaire externe les redemande.

**Lettre de motivation de référence** : importe l'une de tes propres lettres
(PDF/DOCX/TXT) ou colle son texte. Elle sert de modèle de voix et de structure
lors de la génération, sans jamais remplacer ton profil. Comme le CV, elle
reste stockée localement (fichier dans `/uploads`, ignoré par Git).

### ⚙️ Paramètres
- **IA** — clé API DeepSeek (enregistrer / tester la connexion / afficher-
  masquer / supprimer), stockée dans la base de données locale, jamais dans
  le code ni journalisée, avec repli automatique sur la variable d'environnement
  `DEEPSEEK_API_KEY` si aucune clé n'est enregistrée ;
- **Apparence** — thème clair/sombre/système ;
- **Confidentialité & données** — export/import JSON complet, suppression des
  données de démo.

### Transverse
- **Recherche globale** (`Cmd/Ctrl+K`) : opportunités + navigation + création
  rapide.
- **Notifications intelligentes** : deadlines proches, prochaines actions en
  retard, candidatures sans réponse depuis trop longtemps — calculées à la
  volée, jamais stockées.
- **Dark mode / Light mode**, sidebar repliable.

## Stack technique

| Domaine | Choix | Pourquoi |
|---|---|---|
| Framework | **Next.js 16** (App Router, Server Actions) | Un seul projet full-stack, pas d'API séparée à maintenir |
| Langage | **TypeScript** (strict) | Sécurité de types sur tout le schéma de données |
| UI | **Tailwind CSS v4** + composants **Radix UI** (style shadcn/ui) | Design system cohérent, accessible, sans dépendance à un kit fermé |
| Base de données | **SQLite** via **Prisma ORM** | Un seul fichier local, zéro serveur à installer |
| Formulaires | **zod** | Validation partagée client/serveur |
| État global léger | **zustand** | Sidebar, command palette, dialogue d'ajout — pas de Redux nécessaire |
| Icônes | **lucide-react** | Cohérent avec l'esthétique Linear/Attio/Raycast |
| CSV | **papaparse** | Import/export robuste du backup et des candidatures |
| Extraction de CV | **pdf-parse**, **mammoth** | Texte brut à partir d'un PDF ou d'un DOCX |
| Génération Word | **docx** | Produit un vrai `.docx` à partir du texte de la lettre |
| Génération PDF | **pdf-lib** | Met en page un PDF A4, sans dépendance native |
| Tests | **vitest** | Rapide, ESM natif, bonne intégration TypeScript |
| IA (optionnelle) | **DeepSeek** (API compatible OpenAI), derrière une interface `AiProvider` | Extraction avancée, lettres de motivation, analyse de CV, préparation d'entretien — jamais requise, l'app reste 100 % fonctionnelle sans clé |

> **Note sur l'IA** : le *Match Score* n'est **jamais** calculé par l'IA — il
> reste une formule pondérée et explicable, pour rester reproductible et
> vérifiable. L'IA n'intervient que pour des tâches de texte (extraction,
> lettres, analyse de CV, entretien, coach d'opportunité), chacune avec son
> propre prompt et des règles strictes de non-invention. Le code parle à une
> interface `AiProvider` (`src/lib/ai/types.ts`) plutôt qu'à DeepSeek
> directement : ajouter un autre fournisseur (OpenAI, Anthropic, Gemini)
> implique un nouveau fichier dans `src/lib/ai/providers/` et une entrée dans
> le registre (`src/lib/ai/provider.ts`).

## Installation

Prérequis : **Node.js 20+** et npm.

```bash
npm install
cp .env.example .env
```

Cela installe les dépendances et génère automatiquement le client Prisma
(`postinstall`). Le `.env` créé fonctionne tel quel (SQLite local, aucune clé
requise) — ouvrez-le seulement si vous voulez activer les fonctionnalités IA
en renseignant `DEEPSEEK_API_KEY` (vous pouvez aussi la renseigner plus tard,
sans toucher au code, depuis **Paramètres > IA** dans l'application).

Créez ensuite la base de données locale et appliquez le schéma :

```bash
npm run db:migrate
```

Puis chargez des données de démonstration (fortement recommandé pour explorer
l'application) :

```bash
npm run db:seed
```

## Lancement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

Pour un build de production :

```bash
npm run build
npm start
```

## Base de données

Le schéma relationnel complet vit dans [`prisma/schema.prisma`](prisma/schema.prisma).
Entités actives : `Country`, `City`, `Company`, `Application`, `PipelineStage`
(les 7 statuts du pipeline), `JobAnalysis` (Match Score, éligibilité,
extraction — une par opportunité), `CoverLetter`, `Profile` (singleton),
`Setting` (singleton, y compris la clé IA), `Document` (fichiers uploadés,
CV compris).

SQLite ne supportant pas les enums natifs, les champs de type "statut" sont
des chaînes validées côté application (`src/lib/constants.ts`).

Le fichier de base de données (`prisma/dev.db`) n'est **jamais commité** (voir
`.gitignore`) : chaque installation locale a ses propres données.

## Données de démonstration

Au premier `npm run db:seed`, l'application charge un profil candidat de
démonstration et une poignée d'opportunités fictives à différents stades du
pipeline (dont deux avec une analyse de match complète), pour explorer
immédiatement le Match Score, la fiche opportunité et les actions IA.

Ces données sont **clairement fictives** et marquées `isDemo: true` en base.
Elles ne sont jamais présentées comme vos vraies candidatures. Pour les
supprimer une fois que vous commencez à suivre votre propre recherche :
**Paramètres > Confidentialité & données > "Supprimer les données de démo"**.

## Commandes

| Commande | Description |
|---|---|
| `npm run dev` | Lance le serveur de développement |
| `npm run build` | Build de production |
| `npm start` | Sert le build de production |
| `npm run lint` | Lint ESLint |
| `npm test` | Lance la suite de tests (vitest) |
| `npm run test:watch` | Tests en mode watch |
| `npm run db:migrate` | Crée/applique les migrations Prisma en dev |
| `npm run db:generate` | Régénère le client Prisma |
| `npm run db:studio` | Ouvre Prisma Studio (explorateur de données) |
| `npm run db:seed` | Charge les données de démonstration |
| `npm run db:reset` | Réinitialise la base (⚠️ destructif) et reseed |

## Structure du projet

```
prisma/
  schema.prisma          # Schéma relationnel complet
  migrations/            # Historique des migrations
  seed.ts                # Données de démonstration
src/
  app/                   # Pages (App Router)
    page.tsx               # Accueil
    opportunities/          # Liste + fiche détail
    opportunities/[id]/letter/ # Studio de lettre de motivation
    profile/                # Profil candidat + import CV + lettre de référence
    settings/               # IA / Apparence / Confidentialité & données
    api/documents/[id]/     # Téléchargement des fichiers uploadés (CV inclus)
    api/cover-letter/[id]/  # Export Word/PDF d'une lettre
  components/
    ui/                  # Primitives de design system (bouton, dialog...)
    layout/              # Sidebar, topbar, command palette, quick-add
    job-import/            # Workflow "coller un lien" (widget, flow, score card)
    opportunities/          # Tableau + sections de la fiche + studio de lettre
    profile/                # Formulaire profil, import CV, lettre de référence
    settings/               # Formulaires de chaque onglet Paramètres
  lib/
    actions/              # Server Actions (une "use server" par domaine)
    data/                  # Requêtes de lecture côté serveur (Prisma)
    ai/
      types.ts               # Interface AiProvider — le code métier ne connaît qu'elle
      provider.ts            # Résolution du fournisseur configuré + clé
      providers/deepseek.ts   # Implémentation DeepSeek
      prompts/                # Un module par tâche IA (extraction, lettre, CV, entretien)
    cv-file-text.ts        # Extraction de texte PDF/DOCX/texte brut
    cover-letter-export.ts   # Rendu d'une lettre en .docx et .pdf
    job-extraction.ts        # Parsing HTML/texte → données structurées (pur, testé)
    job-matching.ts           # Match Score + Eligibility (pur, testé)
    url-safety.ts            # Garde-fou SSRF pour les URLs fetchées
    constants.ts           # Statuts, niveaux, catégories... (source de vérité)
    filters.ts               # Logique pure de recherche/filtre/tri (testée)
    utils.ts                  # Formatage dates/devises, helpers divers
  store/                    # État UI léger (zustand)
uploads/                    # Fichiers uploadés (jamais commités)
tests/                       # Tests vitest (unitaires + intégration)
```

## Backup et export

Une mauvaise manipulation ne doit jamais pouvoir effacer plusieurs mois de
suivi :

- **Backup complet (JSON)** — Paramètres > Confidentialité & données >
  "Exporter tout". Réimportable à l'identique (remplace les données actuelles,
  après confirmation explicite). La clé API IA n'y figure jamais.
- **Export/import CSV des opportunités** — directement depuis la page
  Opportunités (les entreprises/pays manquants sont créés automatiquement).
- Les fichiers uploadés (CV compris) vivent dans `/uploads` : pensez à les
  inclure dans vos propres sauvegardes de fichiers si vous changez de machine.

## Déploiement Docker

Le projet inclut un `Dockerfile`, un `docker-compose.yml` prévu pour le réseau
Traefik externe `web`, et un script `deploy.sh`. En production, la base SQLite
et les documents uploadés sont conservés dans des volumes Docker nommés.

Avant le premier lancement, créez un fichier `.env` sur le serveur avec une
entrée Basic Auth générée par `htpasswd` (ne commitez jamais ce fichier) :

```bash
htpasswd -nbB candidate 'un-mot-de-passe-fort'
```

Copiez la ligne produite dans `.env` sous la forme
`BASIC_AUTH_USERS='candidate:$2y$...'`, puis lancez :

```bash
FORCE_DEPLOY=1 ./deploy.sh
```

Le conteneur exécute automatiquement `prisma migrate deploy` avant de démarrer
Next.js. Le service n'ouvre aucun port hôte : toutes les requêtes passent par
Traefik, qui applique HTTPS et l'authentification à l'ensemble du sous-domaine.

> L'authentification applicative n'existe pas : le Basic Auth Traefik est la
> seule barrière en production. Ne déployez pas l'app sans lui.

### Lettre de motivation de référence en production

La lettre de référence est une donnée personnelle : elle n'est **jamais**
committée (le dépôt est public) ni intégrée à l'image Docker. Le conteneur la
lit depuis `local-assets/`, monté en lecture seule par `docker-compose.yml`.
Pour l'activer sur le serveur, une seule fois :

```bash
# depuis votre machine
scp local-assets/reference-cover-letter.pdf deploy@51.91.156.194:~/track-summer-2027-internship/local-assets/
```

Puis redéployez (`FORCE_DEPLOY=1 ./deploy.sh`) : au démarrage, le conteneur
importe automatiquement le fichier dans la base s'il n'y a pas déjà de lettre
de référence (ok pour PDF, DOCX ou TXT). Vous pouvez aussi l'importer à tout
moment depuis **Profil > Lettre de motivation de référence**. Les données
(base + fichiers) vivent dans les volumes Docker nommés et survivent aux
redéploiements.

## Tests

```bash
npm test
```

La suite couvre :
- **Utilitaires** (`tests/utils.test.ts`) : dates, devises, slugs, parsing JSON
  défensif.
- **Recherche/filtres/tri** (`tests/filters.test.ts`) : logique du tableau
  Opportunités, testée indépendamment du rendu React.
- **Extraction d'offres** (`tests/job-extraction.test.ts`) : parsing des
  données structurées `schema.org/JobPosting`, heuristiques (compétences,
  salaire, remote, deadline...), et garantie qu'aucun champ absent n'est
  inventé.
- **Extraction IA** (`tests/job-extraction-ai.test.ts`) : garde-fous de
  non-invention et d'ancrage (preuve par citation exacte) sur les sorties du
  modèle.
- **Contexte profil** (`tests/profile-context.test.ts`) : construction du
  contexte candidat transmis aux prompts.
- **Match Score & Eligibility** (`tests/job-matching.test.ts`) : chaque
  dimension du score, respect des pondérations personnalisées, détection
  d'une fenêtre de date de diplôme incompatible.
- **Workflows critiques** (`tests/actions.integration.test.ts`) : mise à jour
  d'une opportunité, changement de statut, export/import JSON complet,
  export/import CSV — exécutés contre une vraie base SQLite jetable
  (`prisma/test.db`, jamais la base de développement). Ces tests nécessitent
  le binaire `sqlite3` ; sans lui, ils sont ignorés.

## Troubleshooting

**"Environment variable not found: DATABASE_URL"**
Copiez `.env.example` en `.env` (`cp .env.example .env`) avant de lancer les
commandes Prisma.

**La page affiche des statuts vides après un `npm install` frais**
Lancez `npm run db:migrate` puis `npm run db:seed` — sans base de données
migrée, l'application n'a aucune donnée à afficher (les 7 statuts par défaut
sont toutefois recréés automatiquement au premier chargement d'une page, y
compris pour une base migrée depuis une version antérieure de l'app).

**Avertissement `package.json#prisma` déprécié au lancement des commandes Prisma**
C'est un avertissement de Prisma 6 annonçant un changement de configuration
dans Prisma 7 (fichier `prisma.config.ts`). Sans impact aujourd'hui.

**Le CV téléchargé depuis le profil est introuvable**
Vérifiez que le dossier `/uploads` existe à la racine du projet et n'a pas été
supprimé manuellement.

**La génération de lettre ne reprend pas ma lettre de référence**
Importe-la dans **Profil > Lettre de motivation de référence** (fichier
PDF/DOCX/TXT ou texte collé). Elle n'est jamais requise : sans elle, la
génération s'appuie uniquement sur ton profil.

**Je veux repartir de zéro**
`npm run db:reset` supprime et recrée entièrement la base de données locale,
puis relance le seed de démonstration. Cette commande est irréversible.

**"Impossible de lire automatiquement cette page" apparaît souvent**
Normal pour LinkedIn et certains sites qui bloquent la récupération
automatique côté serveur. Collez la description de l'offre dans la zone de
texte proposée — l'extraction, le score et la sauvegarde fonctionnent à
l'identique. Les sites basés sur un ATS (Greenhouse, Lever, Workday...) et la
plupart des pages carrières d'entreprise fonctionnent généralement bien avec
la récupération automatique.

**Le Match Score semble incomplet ou neutre sur toutes les offres**
Renseignez votre profil (compétences, formation, langues, expérience) sur la
page **Profil** — sans profil, chaque dimension retombe sur une valeur
neutre faute de données à comparer.

**Les fonctionnalités IA (lettre, analyse de CV, entretien) sont grisées**
Configurez une clé API DeepSeek dans **Paramètres > IA**, ou définissez
`DEEPSEEK_API_KEY` dans `.env`. Sans clé, l'app reste pleinement utilisable :
l'extraction retombe sur l'analyse heuristique, et les lettres de motivation
sur un modèle simple à personnaliser soi-même.

---

Construit avec [Claude Code](https://claude.com/claude-code).
