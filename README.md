# Stage Copilot

Application web **personnelle et 100% locale** pour piloter une recherche de
stage à l'étranger, organisée autour d'une seule logique simple :

**Trouver → Comprendre le fit → Préparer → Postuler → Suivre.**

Pas de CRM, pas d'ERP, pas quinze modules à maintenir à jour : une barre pour
coller le lien d'une offre, un score de correspondance explicable, un
assistant IA qui connaît vraiment votre profil, et un tableau de suivi. Moins
de fonctionnalités, mais faites pour être utilisées tous les jours.

> Toutes vos données restent sur votre machine, dans un fichier SQLite local.
> Rien n'est envoyé à un service tiers, hormis — si vous choisissez de
> configurer une clé — les appels à l'API DeepSeek décrits plus bas.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Sources de données (Discover)](#sources-de-données-discover)
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
le bouton **+ Add** global : collez l'URL d'une offre (LinkedIn, Indeed,
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
7. propose trois actions : **Save for later**, **I already applied**
   (formulaire minimal — date, note, source, prochaine action, moins de 30
   secondes) ou **Prepare application** (ouvre directement la fiche de
   l'opportunité pour continuer).

Si la page ne peut pas être lue automatiquement (LinkedIn bloque souvent les
robots), l'app le dit clairement et propose de **coller la description** à la
place — le reste du traitement (extraction, score, sauvegarde) est identique.
Les doublons (même URL, ou même entreprise + intitulé) sont détectés avant
sauvegarde. Le score reste associé à l'analyse et à la version du profil
utilisée : si le profil change ensuite, une bannière **"Ton profil a changé
depuis cette analyse"** apparaît sur la fiche, avec un bouton **Recalculer le
match** — jamais de recalcul automatique en masse.

### 🔭 Discover
Une vraie centralisation d'offres — pas une simulation. Discover agrège des
offres depuis des **sources réelles et vérifiées** (voir
[Sources de données](#sources-de-données-discover) plus bas), les normalise,
détecte les doublons entre sources, et calcule le même Match Score
déterministe que le reste de l'app pour chacune.

- **Recherche plein texte** (mots-clés multiples, ex. *"finance london
  summer"*) sur titre/entreprise/description/compétences/secteur/ville/pays,
  via un index SQLite FTS5 réel — rapide même à plusieurs milliers d'offres.
- **Filtres** : pays, ville, secteur, remote/hybride/sur site, source, visa/
  sponsorship, plus des filtres rapides (*Match > 80 %*, *Posted this week*,
  *Visa friendly*, *Remote*, *Saved*).
- **Tri** : meilleur match (par défaut), plus récentes, deadline, salaire,
  entreprise.
- **Recherches sauvegardées** et **watchlist** (mot-clé/pays/ville/secteur à
  suivre, marqué "nouveau" après une synchronisation).
- **Recherche en langage naturel** (optionnelle, IA) : décris ce que tu
  cherches en une phrase, l'IA la traduit en filtres structurés — elle ne
  fait jamais que réorganiser tes propres mots, jamais inventer une offre.
- **Sauvegarde en un clic** vers Opportunities, sans ressaisie et sans
  doublon (une offre déjà suivie, retrouvée à nouveau plus tard sur une autre
  source, se relie à la même candidature).

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
Archivée, modifiable directement depuis le tableau ou la fiche.

### 📄 Fiche opportunité
Une seule page, pas d'onglets :
- **Header** — entreprise, poste, lien original, statut, match %, suppression ;
- **Aperçu** — champs éditables (poste, lieu, salaire, durée, dates) ;
- **Compatibilité** — le Match Score détaillé facteur par facteur, points
  forts, points de vigilance, compétences manquantes, recommandation, et un
  bouton pour recalculer ;
- **Candidature** — date d'envoi, CV utilisé (celui de ton profil), prochaine
  action, notes, et un **générateur de lettre de motivation IA** (ton :
  professionnel / naturel / concis / très personnalisé ; langue : français /
  anglais) avec des actions d'affinage (plus courte, plus naturelle, plus
  spécifique, focus expérience) ;
- **Actions IA** — ré-analyser l'offre, améliorer son CV pour ce poste
  précis, préparer l'entretien (contexte, points à mettre en avant, questions
  probables, points faibles à anticiper, questions à poser), ou continuer la
  conversation avec l'assistant.

### 👤 Profil
Informations personnelles (dont LinkedIn/GitHub/portfolio), formation,
expériences, compétences, langues, préférences/disponibilité, et le CV — le
tout utilisé pour le Match Score, les lettres de motivation et l'assistant.
**Import de CV** : dépose un fichier (PDF/DOCX/TXT), l'IA en extrait les
champs, tu coches ceux que tu veux appliquer — rien n'écrase ton profil sans
confirmation explicite, champ par champ. Les liens LinkedIn/GitHub/portfolio
réapparaissent avec un bouton de copie sur chaque fiche opportunité, dans la
section Candidature — pratique quand un formulaire externe les redemande.

### 💬 Assistant IA
Une conversation qui connaît réellement ton profil, ton CV et toutes tes
opportunités enregistrées (statuts, matchs, deadlines) — pour répondre à
"quelles sont mes meilleures pistes ?", "sur quoi dois-je progresser ?", etc.
Ne persiste pas entre les sessions : une conversation fraîche à chaque
ouverture.

### ⚙️ Paramètres
- **Général** — identité, période de recherche, pays/secteurs/devises suivis ;
- **Sources** — ajouter/activer-désactiver/supprimer une source Discover,
  synchroniser (une par une ou toutes), importer une liste CSV/JSON ;
- **IA** — clé API DeepSeek (enregistrer / tester la connexion / afficher-
  masquer / supprimer), stockée dans la base de données locale, jamais dans
  le code ni journalisée, avec repli automatique sur la variable d'environnement
  `DEEPSEEK_API_KEY` si aucune clé n'est enregistrée ;
- **Matching** — pondération des 6 dimensions du Match Score ;
- **Apparence** — thème clair/sombre/système ;
- **Données & backup** — export/import JSON complet, export/import CSV,
  suppression des données de démo.

### Transverse
- **Recherche globale** (`Cmd/Ctrl+K`) : opportunités + navigation + création
  rapide.
- **Notifications intelligentes** : deadlines proches, prochaines actions en
  retard, candidatures sans réponse depuis trop longtemps — calculées à la
  volée, jamais stockées.
- **Dark mode / Light mode**, sidebar repliable.

## Sources de données (Discover)

Chaque source est réelle, vérifiée à l'ajout (un `healthCheck()` doit réussir
avant qu'elle soit enregistrée), et le code ne prétend jamais qu'une source
fonctionne quand elle est en panne — une source en erreur est marquée comme
telle sur sa propre ligne, sans jamais faire échouer les autres.

| Source | Ce que c'est réellement | Limite honnête |
|---|---|---|
| **Greenhouse** | L'API publique (sans clé) du job board d'**une** entreprise — [developers.greenhouse.io](https://developers.greenhouse.io/job-board.html) | Une entreprise à la fois : Greenhouse n'expose aucune recherche globale multi-entreprises |
| **Lever** | L'API publique (sans clé) des offres d'**une** entreprise — [github.com/lever/postings-api](https://github.com/lever/postings-api) | Même limite : une entreprise à la fois |
| **Adzuna** *(clé API)* | Vraie recherche par mots-clés, agrégée, sur 15+ pays — [developer.adzuna.com](https://developer.adzuna.com/) | Un pays + une recherche par source ; palier gratuit 250 requêtes/jour |
| **JSearch** *(clé API, RapidAPI)* | Revendeur **licencié** de données Google for Jobs (qui agrège lui-même LinkedIn, Indeed, Glassdoor...) — la voie légale pour cette donnée, contrairement au scraping direct | Palier gratuit limité (~500 requêtes/mois selon RapidAPI) |
| **Reed.co.uk** *(clé API)* | Vraie recherche par mots-clés, très complète | Royaume-Uni uniquement |
| **Jooble** *(clé API)* | Vraie recherche par mots-clés, agrégée, internationale | Documentation/fiabilité un peu en retrait par rapport à Adzuna |
| **Flux RSS** | Un vrai flux RSS/Atom (page carrières, job board) que tu renseignes | Fonctionne seulement si l'entreprise/le site publie effectivement un flux |
| **Endpoint JSON** | Une URL que tu contrôles, retournant un tableau JSON d'offres | Aucune convention de champs imposée au-delà d'un mapping tolérant (title/company/location/url/description) |
| **CSV (URL)** | Un CSV hébergé (ex. Google Sheet publié en CSV), re-téléchargé à chaque sync | Idem, mapping de colonnes tolérant mais pas magique |
| **Import manuel** | Un CSV ou JSON collé/uploadé une fois | Pas de re-synchronisation automatique — c'est un import, pas une source live |

**Ce qui n'est délibérément pas construit** : un scraper générique de pages
carrières, ou un accès direct (non officiel) à LinkedIn/Indeed — ces
plateformes n'offrent pas d'API publique pour de la recherche d'offres, et
scraper leurs pages directement violerait leurs conditions d'utilisation.
JSearch (ci-dessus) est la voie légale pour atteindre une partie de cette
donnée, via un revendeur qui en a le droit. Ajouter un jour un autre vrai
partenaire/agrégateur reste possible sans rien réécrire ailleurs : il suffit
d'implémenter l'interface `JobSourceProvider`
(`src/lib/discover/types.ts` — `searchJobs()` / `healthCheck()`) et
d'enregistrer le nouveau type dans `src/lib/discover/providers/registry.ts`.

### Obtenir une clé API

Aucune de ces clés n'est requise pour utiliser Discover (Greenhouse/Lever/
RSS/CSV/JSON/import manuel n'en ont pas besoin) — elles ouvrent simplement
une recherche par mots-clés plus large. Chaque clé saisie dans **Paramètres
> Sources** est stockée uniquement dans ta base de données locale (jamais
dans le code, jamais renvoyée à l'interface après l'ajout), suivant le même
principe que la clé DeepSeek.

**Adzuna** (recommandé)
1. Va sur [developer.adzuna.com](https://developer.adzuna.com/) → "Register".
2. Crée un compte gratuit (email + mot de passe).
3. Une fois connecté, ton **App ID** et ta **App Key** apparaissent sur ton
   tableau de bord ("My applications").
4. Dans l'app, **Paramètres > Sources > Ajouter une source > Adzuna** :
   renseigne `app_id`, `app_key`, le pays (code 2 lettres — `gb`, `fr`, `us`,
   `de`, `sg`, `nl`...) et la recherche (`internship` par défaut).

**JSearch (RapidAPI)**
1. Va sur [rapidapi.com](https://rapidapi.com/) → crée un compte (gratuit).
2. Cherche "JSearch" dans le RapidAPI Hub, ou va directement sur
   [rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch).
3. Clique "Subscribe to Test" et choisis le plan **Basic (gratuit)**.
4. Dans l'onglet "Endpoints", ta clé apparaît dans les en-têtes de la requête
   d'exemple (`X-RapidAPI-Key`).
5. Dans l'app : **Paramètres > Sources > Ajouter une source > JSearch**,
   colle la clé, et écris ta recherche en langage naturel (ex : *"software
   engineering internship in London"*).

**Reed.co.uk**
1. Va sur [reed.co.uk/developers/jobseeker](https://www.reed.co.uk/developers/jobseeker).
2. Renseigne le formulaire d'inscription (email professionnel/personnel).
3. La clé API arrive par email.
4. Dans l'app : **Paramètres > Sources > Ajouter une source > Reed.co.uk**,
   colle la clé et tes mots-clés.

**Jooble**
1. Va sur [jooble.org/api/about](https://jooble.org/api/about).
2. Remplis le formulaire de demande de clé (nom, email, usage prévu — décris
   simplement "recherche de stage personnelle").
3. La clé arrive par email, généralement rapidement.
4. Dans l'app : **Paramètres > Sources > Ajouter une source > Jooble**,
   colle la clé, tes mots-clés, et optionnellement un lieu.

Chaque offre ingérée passe par le même pipeline, quelle que soit sa source :
normalisation (`src/lib/discover/normalize.ts`, qui réutilise les heuristiques
d'extraction déjà éprouvées par le workflow "coller un lien"), classification
stage/non-stage par mots-clés à limites de mot réelles (pas de faux positifs
du style "intern**al**" ou "back**stage**" — voir `classify.ts`),
déduplication inter-sources par URL canonique et par (entreprise + intitulé +
localisation) (`dedup.ts`), puis pré-scoring local déterministe
(`scoring.ts`, qui appelle directement `computeJobMatch`/`computeEligibility`
— jamais l'IA) avant indexation dans le moteur de recherche plein texte
(`search-index.ts`).

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
| CSV | **papaparse** | Import/export robuste, réutilisé pour les sources/imports Discover |
| Extraction de CV | **pdf-parse**, **mammoth** | Texte brut à partir d'un PDF ou d'un DOCX |
| Flux RSS | **rss-parser** | Parsing RSS/Atom réel pour les sources Discover de type flux |
| Recherche plein texte | **SQLite FTS5** (via requêtes brutes Prisma) | Index réel, natif, pas de service de recherche externe à faire tourner |
| Tests | **vitest** | Rapide, ESM natif, bonne intégration TypeScript |
| IA (optionnelle) | **DeepSeek** (API compatible OpenAI), derrière une interface `AiProvider` | Extraction avancée, lettres de motivation, analyse de CV, assistant — jamais requise, l'app reste 100 % fonctionnelle sans clé |

> **Note sur l'IA** : le *Match Score* n'est **jamais** calculé par l'IA — il
> reste une formule pondérée et explicable, pour rester reproductible et
> vérifiable. L'IA n'intervient que pour des tâches de texte (extraction,
> lettres, analyse de CV, entretien, assistant), chacune avec son propre
> prompt et des règles strictes de non-invention. Le code parle à une
> interface `AiProvider` (`src/lib/ai/types.ts`) plutôt qu'à DeepSeek
> directement : ajouter un autre fournisseur (OpenAI, Anthropic, Gemini) est
> une question d'un nouveau fichier dans `src/lib/ai/providers/`, pas d'une
> réécriture de la logique métier.

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

Le schéma conserve aussi quelques tables historiques (`Contact`, `Task`,
`Event`, `Interview`, `Offer`, `ResearchItem`...) issues d'une version
antérieure plus chargée de l'application, aujourd'hui sans UI dédiée — elles
ne sont ni lues ni écrites par le produit actuel, et n'ont volontairement pas
été supprimées du schéma pour ne jamais risquer de perdre des données d'une
installation existante.

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
**Paramètres > Données & backup > "Supprimer les données de démo"**.

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
    discover/               # Recherche/filtres/tri sur les offres agrégées
    opportunities/          # Liste + fiche détail
    profile/                # Profil candidat + import CV
    assistant/              # Chat IA
    settings/               # Général / Sources / IA / Matching / Apparence / Données
    api/documents/[id]/     # Téléchargement des fichiers uploadés (CV inclus)
  components/
    ui/                  # Primitives de design system (bouton, dialog...)
    layout/              # Sidebar, topbar, command palette, quick-add
    job-import/            # Workflow "coller un lien" (widget, flow, score card)
    discover/               # Barre de recherche, filtres, carte d'offre, détail
    opportunities/          # Tableau + sections de la fiche opportunité
    profile/                # Formulaire profil, import/review de CV
    assistant/              # Interface de chat
    settings/               # Formulaires de chaque onglet Paramètres (dont Sources)
  lib/
    actions/              # Server Actions (une "use server" par domaine)
    data/                  # Requêtes de lecture côté serveur (Prisma)
    discover/
      types.ts               # Interface JobSourceProvider — chaque source l'implémente
      providers/              # Greenhouse, Lever, RSS, JSON endpoint, CSV URL, manuel
      normalize.ts            # Source brute -> forme persistée (réutilise job-extraction.ts)
      classify.ts             # Stage ou non, secteur — mots-clés à limites de mot réelles
      dedup.ts                # Déduplication inter-sources (URL canonique + entreprise/titre/lieu)
      scoring.ts              # Pré-score local — appelle computeJobMatch, jamais l'IA
      search-index.ts         # Index plein texte SQLite FTS5
      sync.ts                 # Orchestrateur : fetch -> normalize -> dedup -> score -> index
      import.ts               # Import CSV/JSON ponctuel (même pipeline que sync.ts)
    ai/
      types.ts               # Interface AiProvider — le code métier ne connaît qu'elle
      provider.ts             # Résolution du fournisseur configuré + clé
      providers/deepseek.ts   # Implémentation DeepSeek
      prompts/                # Un module par tâche IA (extraction, lettre, CV, entretien, assistant, recherche Discover)
    cv-file-text.ts        # Extraction de texte PDF/DOCX/texte brut
    job-extraction.ts        # Parsing HTML/texte → données structurées (pur, testé)
    job-matching.ts           # Match Score + Eligibility (pur, testé)
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

- **Backup complet (JSON)** — Paramètres > Données & backup > "Exporter tout".
  Réimportable à l'identique (remplace les données actuelles, après
  confirmation explicite).
- **Export CSV des opportunités** — avec import CSV symétrique (les
  entreprises/pays manquants sont créés automatiquement).
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
- **Match Score & Eligibility** (`tests/job-matching.test.ts`) : chaque
  dimension du score, respect des pondérations personnalisées, détection
  d'une fenêtre de date de diplôme incompatible.
- **Discover** (`tests/discover.test.ts`) : classification stage/non-stage
  sur des titres réels (y compris les pièges "Internal"/"International" —
  trouvés en testant contre le vrai board Greenhouse de GitLab), détection
  de secteur, découpage de localisation, canonicalisation d'URL pour la
  déduplication, mapping tolérant CSV/JSON, construction des requêtes FTS5.
- **Workflows critiques** (`tests/actions.integration.test.ts`) : mise à jour
  d'une opportunité, changement de statut, export/import JSON complet,
  export/import CSV — exécutés contre une vraie base SQLite jetable
  (`prisma/test.db`, jamais la base de développement).

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

**Les fonctionnalités IA (lettre, analyse de CV, assistant) sont grisées**
Configurez une clé API DeepSeek dans **Paramètres > IA**, ou définissez
`DEEPSEEK_API_KEY` dans `.env`. Sans clé, l'app reste pleinement utilisable :
l'extraction retombe sur l'analyse heuristique, et les lettres de motivation
sur un modèle simple à personnaliser soi-même.

**Discover est vide**
C'est normal tant qu'aucune source n'est configurée — voir
[Sources de données](#sources-de-données-discover). Va dans **Paramètres >
Sources > Ajouter une source**, renseigne le board token Greenhouse ou le
company token Lever d'une entreprise qui t'intéresse (visible dans l'URL de
sa page carrières), ou importe un CSV/JSON. Rien n'apparaît par défaut —
l'app ne simule jamais des offres qu'elle n'a pas réellement récupérées.

**"boardToken manquant" / "companyToken manquant" en ajoutant une source**
Le token Greenhouse ou Lever d'une entreprise correspond au segment
d'URL de sa page carrières : `job-boards.greenhouse.io/<token>` ou
`jobs.lever.co/<token>`. Certaines entreprises n'utilisent ni Greenhouse ni
Lever — dans ce cas, cherche plutôt un flux RSS ou un endpoint JSON, ou
ajoute leurs offres via import manuel.

**Une source Greenhouse/Lever ramène 0 offre alors que l'entreprise recrute**
Discover ne garde que ce qui ressemble à un stage (mots-clés comme intern/
stagiaire/co-op/apprenti/graduate program — voir `src/lib/discover/
classify.ts`) parmi *tous* les postes listés par l'entreprise. Si elle n'a
actuellement aucun poste correspondant à ces mots-clés ouvert, c'est un vrai
zéro, pas un bug — beaucoup d'entreprises n'ouvrent leurs stages Été 2027 que
plus tard dans l'année.

---

Construit avec [Claude Code](https://claude.com/claude-code).
