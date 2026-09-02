# Summer 2027 Internship Tracker

Application web **personnelle et 100% locale** pour piloter une recherche de
stage à l'étranger de bout en bout : opportunités, candidatures, entreprises,
contacts, networking, tâches, calendrier, documents, entretiens, offres,
analytics et bien plus — un mélange de CRM personnel, job tracker, Notion,
Airtable, Trello et dashboard analytique, pensé spécifiquement pour une
recherche **internationale** (plusieurs pays, devises, langues, visas...).

> Toutes vos données restent sur votre machine, dans un fichier SQLite local.
> Rien n'est envoyé à un service tiers.

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

### Pilotage
- **Dashboard** : compteurs clés, candidatures par semaine, répartition par
  statut/pays, deadlines à venir, pipeline, entreprises les plus prometteuses.
- **Today** : le centre de commande quotidien — deadlines urgentes, relances,
  tâches du jour, contacts à relancer, entretiens à préparer, opportunités
  prioritaires, avec un **mode focus** pour les traiter une par une.
- **Analytics** : taux de réponse / entretien / conversion, funnel complet,
  performance par pays / secteur / source / networking vs candidature directe.
- **Weekly Review** : bilan hebdomadaire semi-automatique (chiffres calculés,
  notes qualitatives éditables), avec historique.

### Candidatures
- **Tracker** : tableau complet (recherche, filtres multiples, tri, colonnes
  configurables, édition inline du statut, actions groupées, dupliquer,
  export/import CSV).
- **Kanban** : drag & drop, avec 4 vues (pipeline, priorité, pays, secteur).
- **Wishlist** : entreprises Dream / High Priority / Target / Backup /
  Exploratory, avec suivi de progression.
- **Comparateur d'offres** : pondération des critères par vous-même, score
  calculé et classement automatique.
- **Fiche candidature** : onglets Overview / Timeline / Contacts / Documents /
  Interview / Tasks / Notes, avec un **score de priorité expliqué en détail**.

### Relations
- **Entreprises** : fiche complète avec **Fit Score** calculé et détaillé,
  candidatures, contacts, documents, notes, recherches liées.
- **Contacts (CRM)** : tous types de contacts, timeline d'interactions.
- **Networking** : pipeline dédié (identifié → contacté → réponse → call →
  relation active → referral) avec métriques.

### Organisation
- **Tâches** : Today / Upcoming / Overdue / Completed, récurrence, liens vers
  candidatures/entreprises/contacts.
- **Calendrier** : vues mois / semaine / agenda, unifiant deadlines, relances,
  entretiens, événements et tâches — création directe depuis le calendrier.
- **Documents** : gestion de fichiers (CV, lettres, relevés, visa...) avec
  versions, stockés localement dans `/uploads`.
- **Lettres de motivation** : suivi de statut/version par candidature.
- **Entretiens** : planification, préparation (pourquoi cette entreprise/ce
  rôle/ce pays, questions comportementales/techniques/à poser) et banque de
  questions réutilisable.

### Exploration
- **Research Database** : programmes, articles, classements, conseils visa,
  plateformes, personnes — avec liens vers pays/entreprises.
- **Country Hub** : vos pays ciblés, notes personnelles sur le visa et le coût
  de la vie (**explicitement présentées comme des notes perso, pas un conseil
  juridique**), salaires observés.
- **Carte** : vue simplifiée par pays/ville (bulles proportionnelles au nombre
  d'opportunités), cliquable pour voir le détail par ville.

### Transverse
- **Recherche globale** (`Cmd/Ctrl+K`) : candidatures, entreprises, contacts,
  tâches, documents, recherches, entretiens + création rapide.
- **Notifications intelligentes** : deadlines proches, relances dues,
  opportunités stagnantes, contacts silencieux — calculées à la volée à
  partir de vos règles (Paramètres > Relances & scoring).
- **Scoring transparent** : le *Priority Score* et le *Fit Score* affichent
  toujours leur décomposition facteur par facteur.
- **Bouton "+ Add"** global pour créer rapidement candidature / entreprise /
  contact / tâche / événement / note depuis n'importe quelle page.
- **Dark mode / Light mode**, sidebar repliable, raccourcis clavier.

## Stack technique

| Domaine | Choix | Pourquoi |
|---|---|---|
| Framework | **Next.js 16** (App Router, Server Actions) | Un seul projet full-stack, pas d'API séparée à maintenir |
| Langage | **TypeScript** (strict) | Sécurité de types sur tout le schéma de données |
| UI | **Tailwind CSS v4** + composants **Radix UI** (style shadcn/ui) | Design system cohérent, accessible, sans dépendance à un kit fermé |
| Base de données | **SQLite** via **Prisma ORM** | Un seul fichier local, zéro serveur à installer |
| Graphiques | **Recharts** | Composants React déclaratifs, thème adaptable |
| Formulaires | **react-hook-form** + **zod** | Validation partagée client/serveur |
| Drag & drop | **@dnd-kit** | Léger, accessible, compatible React 19 |
| État global léger | **zustand** | Sidebar, command palette, quick-add — pas de Redux nécessaire |
| Icônes | **lucide-react** | Cohérent avec l'esthétique Linear/Attio |
| CSV | **papaparse** | Import/export robuste |
| Tests | **vitest** | Rapide, ESM natif, bonne intégration TypeScript |

> **Note sur le Map View** : la librairie `react-simple-maps` n'étant pas
> encore compatible React 19 au moment de l'écriture, la carte est implémentée
> comme une vue simplifiée (bulles par pays/ville) plutôt qu'une carte
> géographique réelle — pleinement fonctionnelle, mais sans fond de carte.

## Installation

Prérequis : **Node.js 20+** et npm.

```bash
npm install
```

Cela installe les dépendances et génère automatiquement le client Prisma
(`postinstall`).

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
Entités principales : `Country`, `City`, `Company`, `Contact`, `Application`,
`PipelineStage` (statuts personnalisables), `Interaction` (timeline),
`Task`, `Event`, `Document`, `CoverLetter`, `Interview`, `InterviewPrep`,
`Question`, `Offer`, `ResearchItem`, `Note`, `Tag`, `WeeklyReview`,
`SavedView`, `Setting`.

SQLite ne supportant pas les enums natifs, les champs de type "statut" sont
des chaînes validées côté application (`src/lib/constants.ts`) — ce qui permet
aussi de créer des statuts de candidature personnalisés sans migration.

Le fichier de base de données (`prisma/dev.db`) n'est **jamais commité** (voir
`.gitignore`) : chaque installation locale a ses propres données.

## Données de démonstration

Au premier `npm run db:seed`, l'application charge ~15 entreprises fictives
réparties sur plusieurs pays, avec des candidatures à différents stades du
pipeline, des contacts, tâches, entretiens, documents (de vrais petits
fichiers texte pour que le téléchargement fonctionne) et recherches.

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
  app/                   # Pages (App Router) — une route par module
    api/documents/[id]/  # Téléchargement des fichiers uploadés
  components/
    ui/                  # Primitives de design system (bouton, dialog...)
    layout/              # Sidebar, topbar, command palette, quick-add
    forms/                # Formulaires react-hook-form par entité
    <domaine>/            # Composants spécifiques à un module (kanban, tasks...)
  lib/
    actions/              # Server Actions (une "use server" par domaine)
    data/                  # Requêtes de lecture côté serveur (Prisma)
    constants.ts           # Statuts, priorités, catégories... (source de vérité)
    scoring.ts              # Priority Score, Fit Score, comparateur d'offres
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
- **Export CSV des candidatures** — depuis la page Tracker, avec import CSV
  symétrique (les entreprises/pays manquants sont créés automatiquement).
- Les documents uploadés vivent dans `/uploads` : pensez à les inclure dans
  vos propres sauvegardes de fichiers si vous changez de machine.

## Tests

```bash
npm test
```

La suite couvre :
- **Scoring** (`tests/scoring.test.ts`) : Priority Score, Fit Score,
  comparateur d'offres, détection de stagnation.
- **Utilitaires** (`tests/utils.test.ts`) : dates, devises, slugs, parsing JSON
  défensif.
- **Recherche/filtres/tri** (`tests/filters.test.ts`) : logique du tracker de
  candidatures, testée indépendamment du rendu React.
- **Workflows critiques** (`tests/actions.integration.test.ts`) : création de
  candidature, changement de statut (avec journalisation automatique),
  création/complétion de tâche, export/import JSON complet, export/import CSV
  — exécutés contre une vraie base SQLite jetable (`prisma/test.db`, jamais la
  base de développement).

## Troubleshooting

**"Environment variable not found: DATABASE_URL"**
Copiez `.env.example` en `.env` (`cp .env.example .env`) avant de lancer les
commandes Prisma.

**La page affiche des statuts/pays vides après un `npm install` frais**
Lancez `npm run db:migrate` puis `npm run db:seed` — sans base de données
migrée, l'application n'a aucune donnée à afficher (les statuts par défaut
sont toutefois recréés automatiquement au premier chargement d'une page).

**Avertissement `package.json#prisma` déprécié au lancement des commandes Prisma**
C'est un avertissement de Prisma 6 annonçant un changement de configuration
dans Prisma 7 (fichier `prisma.config.ts`). Sans impact aujourd'hui.

**Les fichiers téléchargés depuis "Documents" sont introuvables**
Vérifiez que le dossier `/uploads` existe à la racine du projet et n'a pas été
supprimé manuellement — chaque document y référence un fichier physique.

**Je veux repartir de zéro**
`npm run db:reset` supprime et recrée entièrement la base de données locale,
puis relance le seed de démonstration. Cette commande est irréversible.

---

Construit avec [Claude Code](https://claude.com/claude-code).
